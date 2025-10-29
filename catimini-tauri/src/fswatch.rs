use std::collections::{HashMap};

use crate::types;

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FSCreateFileEvent {
    pub parent_dir: String,
    pub created_content: types::FolderContent
}

fn udpate_content<P: AsRef<std::path::Path>>(content: &mut types::FolderContent, p: P, kind: &notify::event::CreateKind) {
    match kind {
        notify::event::CreateKind::Folder => content.folders.push(p.as_ref().display().to_string()),
        _ => content.add_path(p, None)
    }
}

fn handle_create(create_paths: &Vec<std::path::PathBuf>, kind: &notify::event::CreateKind) -> Vec<FSCreateFileEvent> {
    let mut events_map : HashMap<String, FSCreateFileEvent> = HashMap::new();

    for p in create_paths {
        let parent = if let Some(parent) = p.parent() { parent.display().to_string() } else { String::new() };
        if let Some(event) = events_map.get_mut(&parent) {
            udpate_content(&mut event.created_content, p, kind)
        } else {
            let mut new_event = FSCreateFileEvent{ parent_dir: parent.clone(), created_content: types::FolderContent{folders: vec![], images: vec![], others: vec![]} };
            udpate_content(&mut new_event.created_content, p, kind);
            events_map.insert(parent.clone(), new_event);
        }
    }

    events_map.into_values().collect()
}

#[derive(Clone, Debug, PartialEq)]
pub enum FSEvent {
    Create(FSCreateFileEvent)
}

fn convert_event(event: notify::Event) -> Vec<FSEvent> {
    match event.kind {
        notify::EventKind::Create(create_kind) => {
            let create_events = handle_create(&event.paths, &create_kind);
            create_events.into_iter().map(|e| FSEvent::Create(e)).collect()
        },
        _ => vec![]
    }
}

struct FolderUpdateHandler {
    event_callback: Box<dyn Fn(notify::Event) + Send>
}

impl FolderUpdateHandler {
    pub fn new(event_callback: Box<dyn Fn(notify::Event) + Send>) -> FolderUpdateHandler {
        FolderUpdateHandler{event_callback}
    }
}

impl notify::EventHandler for FolderUpdateHandler {
    fn handle_event(&mut self, event: notify::Result<notify::Event>) {
        let Ok(event) = event else {
            return;
        };

        (self.event_callback)(event);
    }
}

struct FolderWatcher {
    watcher: Option<notify::RecommendedWatcher>,

    // Unfortunately, cannot use the same lock as the one allowing mutability of watcher because creating the watcher
    // will move the closure that will use this lock
    watcher_lock: std::sync::Arc<std::sync::Mutex<()>>,

    handler_thread: Option<std::thread::JoinHandle<()>>,
    pending_event_cond: std::sync::Arc<std::sync::Condvar>,
    pending_event_count: std::sync::Arc<std::sync::atomic::AtomicUsize>
}

impl Drop for FolderWatcher {
    fn drop(&mut self) {
        if let Some(watcher) = self.watcher.take() {
            drop(watcher);
        }

        if let Some(join_handle) = self.handler_thread.take() {
            let _ = join_handle.join();
        }
    }
}

impl FolderWatcher {
    pub fn new(event_callback: Box<dyn Fn(FSEvent) + Send>) -> Result<FolderWatcher, ()> {
        let (tx, rx) = std::sync::mpsc::channel::<FSEvent>();

        let event_counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let event_counter_sender = event_counter.clone();
        let event_counter_receiver = event_counter.clone();

        let pending_event_cond = std::sync::Arc::new(std::sync::Condvar::new());
        let pending_event_cond_callback = pending_event_cond.clone();
        let pending_event_cond_thread = pending_event_cond.clone();

        let send_to_thread = Box::new(move |e| {
            event_counter_sender.fetch_add(1, std::sync::atomic::Ordering::Acquire);
            let events = convert_event(e);

            if events.len() > 0 {
                event_counter_sender.fetch_add(events.len() - 1, std::sync::atomic::Ordering::Acquire);
            } else if event_counter_sender.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                pending_event_cond_callback.notify_all();
            }

            for ev in events.into_iter() {
                let _ = tx.send(ev);
            }
        });

        let thread_handle = std::thread::spawn(move || {
            loop {
                let Ok(event) = rx.recv() else {
                    break;
                };

                event_callback(event);

                if event_counter_receiver.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                    pending_event_cond_thread.notify_all();
                }
            }
        });

        if let Ok(watcher) = notify::recommended_watcher(FolderUpdateHandler::new(send_to_thread)) {
            return Ok(FolderWatcher {
                watcher: Some(watcher),
                watcher_lock: std::sync::Arc::new(std::sync::Mutex::new(())),
                handler_thread: Some(thread_handle),
                pending_event_cond: pending_event_cond,
                pending_event_count: event_counter
            })
        }
        Err(())
    }

    pub fn watch_directory<P: AsRef<std::path::Path>>(self: &mut Self, path: P) -> bool {
        use notify::Watcher;

        let Ok(guard) = self.watcher_lock.lock() else {
            return false;
        };

        let Ok(_lock) = self.pending_event_cond.wait_while(guard, |_| {self.pending_event_count.load(std::sync::atomic::Ordering::Acquire) > 0}) else {
            return false;
        };

        let Some(watcher) = self.watcher.as_mut() else {
            return false;
        };

        // Ensure given path is not already watched otherwise we will receive all events twice.
        // A solution could be to have a map of watched files, however there would be race condition:
        // If a watched file gets deleted, recreated and then rewatched, it is possible to do the
        // rewatch before the deletion event is seen. This would cause the map to inform that the
        // file is already being watched, confusing the deleted file with the new file.
        let _ = watcher.unwatch(path.as_ref());

        match watcher.watch(path.as_ref(), notify::RecursiveMode::NonRecursive) {
            Ok(_) => true,
            Err(_) => false
        }
    }

    pub fn unwatch_directory<P: AsRef<std::path::Path>>(self: &mut Self, path: P) -> bool {
        use notify::Watcher;

        let Ok(guard) = self.watcher_lock.lock() else {
            return false;
        };

        let Ok(_lock) = self.pending_event_cond.wait_while(guard, |_| {self.pending_event_count.load(std::sync::atomic::Ordering::Acquire) > 0}) else {
            return false;
        };

        let Some(watcher) = self.watcher.as_mut() else {
            return false;
        };

        let _ = watcher.unwatch(path.as_ref());

        return true;
    }
}

pub struct SyncedFolderWatcher {
    folder_watcher: std::sync::Mutex<FolderWatcher>,
}

impl SyncedFolderWatcher {
    pub fn new(event_callback: Box<dyn Fn(FSEvent) + Send>) -> Result<SyncedFolderWatcher, ()> {
        return Ok(SyncedFolderWatcher{ folder_watcher: std::sync::Mutex::new(FolderWatcher::new(event_callback)?) });
    }

    pub fn watch_directory<P: AsRef<std::path::Path>>(self: &Self, path: P) -> bool {
        let Ok(mut watcher) = self.folder_watcher.lock() else {
            return false;
        };
        return watcher.watch_directory(path);
    }

    pub fn unwatch_directory<P: AsRef<std::path::Path>>(self: &Self, path: P) -> bool {
        let Ok(mut watcher) = self.folder_watcher.lock() else {
            return false;
        };
        return watcher.unwatch_directory(path);
    }
}
