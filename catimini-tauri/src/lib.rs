mod state;
mod commands;
mod fswatch;
mod file_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn init<P : AsRef<std::path::Path>>(root_paths : &Vec<P>) -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .manage(state::AppState::new(&root_paths).expect("Failed to create AppState."))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_root_folders,
            commands::fetch_image,
            commands::list_folder_files,
            commands::enable_directory_notifications,
            commands::disable_directory_notifications
        ])
}

pub fn setup_app(app: &tauri::App) {
    use tauri::Manager;

    let watcher_app_handle = app.app_handle().clone();
    let fs_event_callback = Box::new(move |events| {
        use tauri::Emitter;
        let app_handle = watcher_app_handle.clone();
        match events {
            fswatch::FSEvent::Create(create_event) => {
                let _ = app_handle.emit("filesystem-event-create", create_event);
            },
            fswatch::FSEvent::Delete(delete_event) => {
                let _ = app_handle.emit("filesystem-event-delete", delete_event);
            },
            _ => ()
        }
    });

    if let Ok(watcher) = fswatch::SyncedFolderWatcher::new(fs_event_callback) {
        app.manage(watcher);
    }
}

#[cfg(test)]
mod tests;
