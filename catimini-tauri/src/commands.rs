use crate::state;
use crate::fswatch;
use crate::file_utils;

#[tauri::command]
pub fn get_root_folders(state: tauri::State<state::AppState>) -> Vec<String> {
    state.root_folders.iter().map(|e| {e.display().to_string()}).collect()
}

#[tauri::command]
pub fn list_folder_files(path : String,
                         ignore_others : Option<bool>) -> Result<file_utils::FolderContent, String> {
    file_utils::get_folder_content(&path, ignore_others)
}

#[tauri::command]
pub fn fetch_image(path : String) -> tauri::ipc::Response {
    let data = match file_utils::load_image(&path) {
        Err(e) => {
            eprintln!("Failed to load image {path}: {e}");
            Vec::<u8>::new()
        },
        Ok(data) => data
    };
    tauri::ipc::Response::new(data)
}

#[tauri::command]
pub fn enable_directory_notifications(folder_watcher: tauri::State<fswatch::SyncedFolderWatcher>,
                                      path: String) -> bool {
    return folder_watcher.watch_directory(&path);
}

#[tauri::command]
pub fn disable_directory_notifications(folder_watcher: tauri::State<fswatch::SyncedFolderWatcher>,
                                       path: String) -> bool {
    return folder_watcher.unwatch_directory(&path);
}
