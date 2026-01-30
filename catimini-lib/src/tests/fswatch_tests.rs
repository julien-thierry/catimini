use ntest::timeout;
use crate::{fswatch::{self, FSCreateFileEvent, FSDeleteFileEvent}, file_utils::FolderContent};

#[test]
#[timeout(60000)]
fn start_stop_watch() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let callback = Box::new(|_| {});

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));
    assert!(watcher.unwatch_directory(&work_dir));
}

#[test]
#[timeout(60000)]
fn try_watch_non_existing() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let fake_dir = work_dir.path().join("non_existing");
    let callback = Box::new(|_| {});

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(!watcher.watch_directory(&fake_dir));
}

struct EventQueuer {
    events: std::sync::Mutex<Vec<fswatch::FSEvent>>,
    cond: std::sync::Condvar
}

impl EventQueuer {
    fn new() -> std::sync::Arc<EventQueuer> {
        return std::sync::Arc::new(EventQueuer{
            events: std::sync::Mutex::new(vec![]),
            cond: std::sync::Condvar::new()
        })
    }

    fn queue(self: &EventQueuer, ev: fswatch::FSEvent) {
        if let Ok(mut events) = self.events.lock() {
            events.push(ev);
        }
        self.cond.notify_one();
    }

    fn wait_for_events(self: &EventQueuer, n: usize, timeout: std::time::Duration) -> Vec<fswatch::FSEvent> {
        let Ok(events) = self.events.lock() else {
            return vec![]
        };

        let Ok(wait_result) = self.cond.wait_timeout_while(events, timeout, |events| events.len() < n) else {
            return vec![]
        };

        if wait_result.1.timed_out() {
            eprintln!("Queuer timed out");
        }

        let events = wait_result.0;
        let mut res = vec![];
        for ev in events.iter() {
            res.push(ev.clone());
        }

        res
    }
}

#[test]
#[timeout(60000)]
fn receive_create_event() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();

    let fsevents = ev_queuer.wait_for_events(1, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir));

    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn receive_create_image_event() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));

    let new_image = work_dir.path().join("new_image.png");
    std::fs::File::create(&new_image).unwrap();

    let fsevents = ev_queuer.wait_for_events(1, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir));

    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![],
                                    images: vec![new_image.display().to_string()],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn create_directory_between_watch_and_unwatch() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));
    // Ensure the creation event is seen
    std::thread::sleep(std::time::Duration::from_millis(10));

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();

    assert!(watcher.unwatch_directory(&work_dir));

    std::fs::create_dir(&work_dir.path().join("missed_dir")).unwrap();

    assert!(watcher.watch_directory(&work_dir));
    let new_dir2 = work_dir.path().join("new_dir2");
    std::fs::create_dir(&new_dir2).unwrap();

    let fsevents = ev_queuer.wait_for_events(2, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir));

    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir2.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn watch_multiple_folders() {
    let work_dir1 = tempfile::TempDir::new().unwrap();
    let work_dir2 = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir1));
    assert!(watcher.watch_directory(&work_dir2));

    let new_dir1 = work_dir1.path().join("new_dir");
    std::fs::create_dir(&new_dir1).unwrap();

    let new_dir2 = work_dir2.path().join("new_dir");
    std::fs::create_dir(&new_dir2).unwrap();

    let fsevents = ev_queuer.wait_for_events(2, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir1));
    assert!(watcher.unwatch_directory(&work_dir2));

    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir1.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir1.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir2.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir2.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
fn watch_directory_and_subdirectory() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();
    assert!(watcher.watch_directory(&new_dir));

    let new_subdir = new_dir.join("new_subdir");
    std::fs::create_dir(&new_subdir).unwrap();

    assert!(watcher.unwatch_directory(&work_dir));

    let new_subdir2 = new_dir.join("new_subdir2");
    std::fs::create_dir(&new_subdir2).unwrap();

    let fsevents = ev_queuer.wait_for_events(3, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&new_dir));
    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: new_dir.display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_subdir.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: new_dir.display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_subdir2.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
fn watch_twice_unwatch_once() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    assert!(watcher.watch_directory(&work_dir));
    assert!(watcher.watch_directory(&work_dir));

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();
    // Ensure the creation event is seen
    std::thread::sleep(std::time::Duration::from_millis(10));

    assert!(watcher.unwatch_directory(&work_dir));

    let new_dir2 = work_dir.path().join("new_dir2");
    std::fs::create_dir(&new_dir2).unwrap();

    assert!(watcher.watch_directory(&work_dir));
    let new_dir3 = work_dir.path().join("new_dir3");
    std::fs::create_dir(&new_dir3).unwrap();

    let fsevents = ev_queuer.wait_for_events(2, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir));
    let expected = vec![
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                created_content: FolderContent{
                                    folders: vec![new_dir3.display().to_string()],
                                    images: vec![],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn delete_watched_item() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    let new_image = work_dir.path().join("new_image.png");
    std::fs::File::create(&new_image).unwrap();

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();

    assert!(watcher.watch_directory(&new_dir));
    std::fs::remove_dir(&new_dir).unwrap();

    std::fs::create_dir(&new_dir).unwrap();
    assert!(watcher.watch_directory(&new_dir));
    let new_image = new_dir.join("new_image.png");
    std::fs::File::create(&new_image).unwrap();

    let fsevents = ev_queuer.wait_for_events(2, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&new_dir));

    let expected = vec![
        fswatch::FSEvent::Delete(
            FSDeleteFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                filepath: new_dir.display().to_string()
            }
        ),
        fswatch::FSEvent::Create(
            FSCreateFileEvent{
                parent_dir: new_dir.display().to_string(),
                created_content: FolderContent{
                                    folders: vec![],
                                    images: vec![new_image.display().to_string()],
                                    others: vec![]
                }
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn delete_non_watched_item() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();

    let new_dir2 = work_dir.path().join("new_dir2");
    std::fs::create_dir(&new_dir2).unwrap();

    assert!(watcher.watch_directory(&new_dir));

    std::fs::remove_dir(&new_dir2).unwrap();

    let subdir = new_dir.join("subdir");
    std::fs::create_dir(&subdir).unwrap();

    let fsevents = ev_queuer.wait_for_events(1, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&new_dir));

    let expected = vec![
        fswatch::FSEvent::Create({ FSCreateFileEvent {
            parent_dir: new_dir.display().to_string(),
            created_content: FolderContent { folders: vec![subdir.display().to_string()], images: vec![], others: vec![] }
        }})
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn delete_multiple_watched_items() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    let new_image = work_dir.path().join("new_image.png");
    std::fs::File::create(&new_image).unwrap();

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();

    assert!(watcher.watch_directory(&new_dir));
    assert!(watcher.watch_directory(&work_dir));

    std::fs::remove_dir(&new_dir).unwrap();
    std::fs::remove_file(&new_image).unwrap();

    let fsevents = ev_queuer.wait_for_events(3, std::time::Duration::from_millis(500));
    assert!(watcher.unwatch_directory(&work_dir));

    let expected = vec![
        fswatch::FSEvent::Delete(
            FSDeleteFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                filepath: new_dir.display().to_string()
            }
        ),
        // Second event for new dir because we are watching the parent
        fswatch::FSEvent::Delete(
            FSDeleteFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                filepath: new_dir.display().to_string()
            }
        ),
        fswatch::FSEvent::Delete(
            FSDeleteFileEvent{
                parent_dir: work_dir.path().display().to_string(),
                filepath: new_image.display().to_string()
            }
        )
    ];
    assert_eq!(fsevents, expected);
}

#[test]
#[timeout(60000)]
fn delete_parent_of_watched_items() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let ev_queuer = EventQueuer::new();
    let ev_queuer_closure = ev_queuer.clone();
    let callback = Box::new(move |e| {
        ev_queuer_closure.queue(e);
    });

    let Ok(watcher) = fswatch::SyncedFolderWatcher::new(callback) else {
        assert!(false);
        return
    };

    let new_dir = work_dir.path().join("new_dir");
    std::fs::create_dir(&new_dir).unwrap();
    let subdir = new_dir.join("subdir");
    std::fs::create_dir(&subdir).unwrap();

    let _ = watcher.watch_directory(&subdir);

    let _ = std::fs::remove_dir_all(&new_dir);

    let fsevents = ev_queuer.wait_for_events(1, std::time::Duration::from_millis(500));

    let expected = vec![
        fswatch::FSEvent::Delete(
            FSDeleteFileEvent{
                parent_dir: new_dir.display().to_string(),
                filepath: subdir.display().to_string()
            }
        )
    ];
    assert_eq!(fsevents, expected);
}
