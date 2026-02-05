use std::collections::{HashMap};

use crate::file_utils;

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FSCreateFileEvent {
    pub parent_dir: String,
    pub created_content: file_utils::FolderContent
}

fn udpate_content<P: AsRef<std::path::Path>>(content: &mut file_utils::FolderContent, p: P, kind: &notify::event::CreateKind) {
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
            let mut new_event = FSCreateFileEvent{ parent_dir: parent.clone(), created_content: file_utils::FolderContent{folders: vec![], images: vec![], others: vec![]} };
            udpate_content(&mut new_event.created_content, p, kind);
            events_map.insert(parent.clone(), new_event);
        }
    }

    events_map.into_values().collect()
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FSDeleteFileEvent {
    pub parent_dir: String,
    pub filepath: String
}

fn handle_delete(delete_paths: &Vec<std::path::PathBuf>, _kind: &notify::event::RemoveKind) -> Vec<FSDeleteFileEvent> {
    let mut events : Vec<FSDeleteFileEvent> = vec![];
    for p in delete_paths {
        events.push(FSDeleteFileEvent {
            parent_dir: if let Some(parent) = p.parent() { parent.display().to_string() } else { String::new() },
            filepath: p.display().to_string()
        });
    }
    events
}

#[derive(Clone, Debug, PartialEq)]
pub enum FSEvent {
    Create(FSCreateFileEvent),
    Delete(FSDeleteFileEvent)
}

fn convert_event(event: notify::Event) -> Vec<FSEvent> {
    match event.kind {
        notify::EventKind::Create(create_kind) => {
            let create_events = handle_create(&event.paths, &create_kind);
            create_events.into_iter().map(|e| FSEvent::Create(e)).collect()
        },
        notify::EventKind::Remove(remove_kind) => {
            let delete_events = handle_delete(&event.paths, &remove_kind);
            delete_events.into_iter().map(|e| FSEvent::Delete(e)).collect()
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

struct FolderWatcherSharedData {
    #[cfg(windows)]
    parent_watcher: Option<notify::RecommendedWatcher>,
    #[cfg(windows)]
    watched_parents: HashMap<std::path::PathBuf, Vec<std::path::PathBuf>>
}

struct FolderWatcher {
    watcher: Option<notify::RecommendedWatcher>,

    // Unfortunately, cannot use the same lock as the one allowing mutability of watcher because creating the watcher
    // will move the closure that will use this lock
    // will move the closure that will use the lock for watched_folders
    watcher_data: std::sync::Arc<std::sync::Mutex<FolderWatcherSharedData>>,

    handler_thread: Option<std::thread::JoinHandle<()>>,
    pending_event_cond: std::sync::Arc<std::sync::Condvar>,
    pending_event_count: std::sync::Arc<std::sync::atomic::AtomicUsize>
}

impl Drop for FolderWatcher {
    fn drop(&mut self) {
        #[cfg(windows)]
        if let Ok(mut watcher_data) = self.watcher_data.lock() {
            if let Some(mut watcher) = watcher_data.parent_watcher.take() {
                use notify::Watcher;
                for f in watcher_data.watched_parents.iter() {
                    let _ = watcher.unwatch(&f.0);
                }
                watcher_data.watched_parents.clear();

                drop(watcher);
            }
        }

        if let Some(watcher) = self.watcher.take() {
            drop(watcher);
        }

        if let Some(join_handle) = self.handler_thread.take() {
            let _ = join_handle.join();
        }
    }
}

impl FolderWatcher {

    fn make_event_sender(sender: std::sync::mpsc::Sender<FSEvent>,
                         event_counter: std::sync::Arc<std::sync::atomic::AtomicUsize>,
                         pending_event_cond: std::sync::Arc<std::sync::Condvar>) -> Box<dyn Fn(notify::Event) + Send + 'static> {
        Box::new(move |e| {
            event_counter.fetch_add(1, std::sync::atomic::Ordering::Acquire);
            let events = convert_event(e);

            if events.len() > 0 {
                event_counter.fetch_add(events.len() - 1, std::sync::atomic::Ordering::Acquire);
            } else if event_counter.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                pending_event_cond.notify_all();
            }

            for ev in events.into_iter() {
                let _ = sender.send(ev);
            }
        })
    }

    #[cfg(windows)]
    fn make_parent_event_sender(sender: std::sync::mpsc::Sender<FSEvent>,
                                event_counter: std::sync::Arc<std::sync::atomic::AtomicUsize>,
                                pending_event_cond: std::sync::Arc<std::sync::Condvar>) -> Box<dyn Fn(notify::Event) + Send + 'static> {
        Box::new(move |event: notify::Event| {
            match &event.kind {
                notify::EventKind::Remove(_) => {
                    event_counter.fetch_add(1, std::sync::atomic::Ordering::Acquire);
                    let events = convert_event(event);
                    if events.len() > 0 {
                        event_counter.fetch_add(events.len() - 1, std::sync::atomic::Ordering::Acquire);
                    } else if event_counter.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                        pending_event_cond.notify_all();
                    }
                    for event in events.into_iter() {
                        match event {
                            FSEvent::Delete(mut delete_event) => {
                                // Add '*' character, forbidden in Windows paths, so it is easy to
                                // know the event came from the parent watcher
                                delete_event.filepath = "*".to_owned() + &delete_event.filepath;
                                let _ = sender.send(FSEvent::Delete(delete_event));
                            },
                            _ => ()
                        }
                    }
                },
                _ => ()
            }
        })
    }

    pub fn new(event_callback: Box<dyn Fn(FSEvent) + Send>) -> Result<FolderWatcher, ()> {
        let (tx, rx) = std::sync::mpsc::channel::<FSEvent>();

        let event_counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let event_counter_receiver = event_counter.clone();

        let pending_event_cond = std::sync::Arc::new(std::sync::Condvar::new());
        let pending_event_cond_thread = pending_event_cond.clone();

        #[cfg(windows)]
        let parent_watcher =
            notify::recommended_watcher(
                FolderUpdateHandler::new(
                    Self::make_parent_event_sender(tx.clone(), event_counter.clone(), pending_event_cond.clone()))).ok();

        let send_to_thread = Self::make_event_sender(tx, event_counter.clone(), pending_event_cond.clone());

        let watcher_data = std::sync::Arc::new(std::sync::Mutex::new(FolderWatcherSharedData{
            #[cfg(windows)]
            parent_watcher: parent_watcher,
            #[cfg(windows)]
            watched_parents: HashMap::new()
        }));
        let watcher_data_thread = watcher_data.clone();

        let thread_handle = std::thread::spawn(move || {
            loop {
                let Ok(event) = rx.recv() else {
                    break;
                };

                for ev in FolderWatcher::preprocess_event(event, &*watcher_data_thread).into_iter() {
                    event_callback(ev);
                }

                if event_counter_receiver.fetch_sub(1, std::sync::atomic::Ordering::Acquire) <= 1 {
                    pending_event_cond_thread.notify_all();
                }
            }

            // Ensure no watch/unwatch call is stuck
            event_counter_receiver.store(0, std::sync::atomic::Ordering::Release);
            pending_event_cond_thread.notify_all();
        });

        if let Ok(watcher) = notify::recommended_watcher(FolderUpdateHandler::new(send_to_thread)) {
            return Ok(FolderWatcher {
                watcher: Some(watcher),
                watcher_data,
                handler_thread: Some(thread_handle),
                pending_event_cond: pending_event_cond,
                pending_event_count: event_counter
            })
        }
        Err(())
    }

    fn watch_setup<P: AsRef<std::path::Path>>(watched_file: P, data: &mut FolderWatcherSharedData) -> bool {
        use notify::Watcher;

        #[cfg(windows)]
        if let Some(parent) = watched_file.as_ref().parent() {
            if let Some(file_list) = data.watched_parents.get_mut(parent) {
                file_list.push(watched_file.as_ref().to_owned());
            } else {
                if let Some(watcher) = data.parent_watcher.as_mut() {
                    if let Ok(_) = watcher.watch(parent, notify::RecursiveMode::NonRecursive) {
                        data.watched_parents.insert(parent.to_owned(), vec![watched_file.as_ref().to_owned()]);
                    } else {
                        return false;
                    }
                }
            }
        }

        true
    }

    fn unwatch_cleanup<P: AsRef<std::path::Path>>(unwatched_file: P, data: &mut FolderWatcherSharedData) -> bool {
        use notify::Watcher;

        #[cfg(windows)]
        if let Some(parent) = unwatched_file.as_ref().parent() {
            if let Some(file_list) = data.watched_parents.get_mut(parent) {
                let mut res = false;
                if let Some(pos) = file_list.iter().position(|e| e == unwatched_file.as_ref()) {
                    file_list.remove(pos);
                    res = true;
                }
                if file_list.len() == 0 && let Some(_) = data.watched_parents.remove(parent) {
                    if let Some(watcher) = data.parent_watcher.as_mut() {
                        let _ = watcher.unwatch(parent);
                    }
                }
                return res;
            }
        }

        false
    }

    fn preprocess_event(event: FSEvent, data_lock: &std::sync::Mutex<FolderWatcherSharedData>) -> Vec<FSEvent> {
        // is folder still watched?
        let mut events = vec![];
        match event {
            FSEvent::Delete(mut ev) => {
                // If a file being watched was deleted, remove it from the watched list
                #[cfg(windows)]
                if ev.filepath.starts_with("*") {
                    ev.filepath.remove(0);
                    if let Ok(mut watcher_data) = data_lock.lock() {
                        if Self::unwatch_cleanup(&ev.filepath, &mut watcher_data) {
                            events.push(FSEvent::Delete(ev));
                        }
                    }
                } else {
                    events.push(FSEvent::Delete(ev));
                }

                #[cfg(not(windows))]
                events.push(FSEvent::Delete(ev));
            },
            _ => events.push(event)
        }

        events
    }

    pub fn watch_directory<P: AsRef<std::path::Path>>(self: &mut Self, path: P) -> bool {
        use notify::Watcher;

        let Ok(guard) = self.watcher_data.lock() else {
            return false;
        };

        let Ok(mut watcher_data) = self.pending_event_cond.wait_while(guard, |_| self.pending_event_count.load(std::sync::atomic::Ordering::Acquire) > 0) else {
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
        if let Ok(_) = watcher.unwatch(path.as_ref()) {
            Self::unwatch_cleanup(path.as_ref(), &mut watcher_data);
        }

        match watcher.watch(path.as_ref(), notify::RecursiveMode::NonRecursive) {
            Ok(_) => {
                Self::watch_setup(path.as_ref(), &mut watcher_data);
                true
            },
            Err(_) => false
        }
    }

    pub fn unwatch_directory<P: AsRef<std::path::Path>>(self: &mut Self, path: P) -> bool {
        use notify::Watcher;

        let Ok(guard) = self.watcher_data.lock() else {
            return false;
        };

        let Ok(mut watcher_data) = self.pending_event_cond.wait_while(guard, |_| self.pending_event_count.load(std::sync::atomic::Ordering::Acquire) > 0) else {
            return false;
        };

        let Some(watcher) = self.watcher.as_mut() else {
            return false;
        };

        match watcher.unwatch(path.as_ref()) {
            Ok(_) => {
                Self::unwatch_cleanup(path.as_ref(), &mut watcher_data);
                true
            },
            Err(_) => false
        }
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
