use std::collections::{HashMap};

use crate::types;

#[derive(Clone, serde::Serialize)]
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
    watcher: notify::RecommendedWatcher,

    // Unfortunately, cannot use the same lock as the one allowing mutability of watcher because creating the watcher
    // will move the closure that will use this lock
    watcher_lock: std::sync::Arc<std::sync::Mutex<()>>,

    pending_event_cond: std::sync::Arc<std::sync::Condvar>,
    pending_event_count: std::sync::Arc<std::sync::atomic::AtomicUsize>
}

impl FolderWatcher {
    pub fn new(event_callback: Box<dyn Fn(FSEvent) + Send>) -> Result<FolderWatcher, ()> {
        let event_counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let event_counter_callback = event_counter.clone();

        let pending_event_cond = std::sync::Arc::new(std::sync::Condvar::new());
        let pending_event_cond_callback = pending_event_cond.clone();
        let watcher_callback = Box::new(move |e| {
            event_counter_callback.fetch_add(1, std::sync::atomic::Ordering::Acquire);
            let events = convert_event(e);
            for ev in events.into_iter() {
                event_callback(ev);
            }
            if event_counter_callback.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                pending_event_cond_callback.notify_all();
            }
        });

        if let Ok(watcher) = notify::recommended_watcher(FolderUpdateHandler::new(watcher_callback)) {
            return Ok(FolderWatcher {
                watcher: watcher,
                watcher_lock: std::sync::Arc::new(std::sync::Mutex::new(())),
                pending_event_count: event_counter,
                pending_event_cond
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

        // Ensure given path is not already watched otherwise we will receive all events twice.
        // A solution could be to have a map of watched files, however there would be race condition:
        // If a watched file gets deleted, recreated and then rewatched, it is possible to do the
        // rewatch before the deletion event is seen. This would cause the map to inform that the
        // file is already being watched, confusing the deleted file with the new file.
        let _ = self.watcher.unwatch(path.as_ref());

        match self.watcher.watch(path.as_ref(), notify::RecursiveMode::NonRecursive) {
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

        let _ = self.watcher.unwatch(path.as_ref());

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
