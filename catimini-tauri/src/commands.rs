use crate::state;
use crate::fswatch;
use crate::types;

#[tauri::command]
pub fn get_root_folders(state: tauri::State<state::AppState>) -> Vec<String> {
    state.root_folders.iter().map(|e| {e.display().to_string()}).collect()
}

#[tauri::command]
pub fn list_folder_files(path : String,
                         ignore_others : Option<bool>) -> Result<types::FolderContent, String> {
    let target_path = std::path::PathBuf::from(path);

    if let Ok(dir_it) = std::fs::read_dir(&target_path) {
        let mut res = types::FolderContent { folders : vec![], images : vec![], others : vec![] };
        for entry in dir_it {
            let Ok(entry) = entry else {
                continue;
            };

            res.add_dir_entry(entry, ignore_others);
        }
        Ok(res)
    } else {
        Err(format!("Failed to open directory: {}", &target_path.display().to_string()))
    }
}

#[tauri::command]
pub fn fetch_image(path : String) -> tauri::ipc::Response {
    if image::ImageFormat::from_path(&path).is_err() {
        // TODO: check magic numbers after reading image
        eprintln!("Unsupported image format {path}");
        return tauri::ipc::Response::new(Vec::<u8>::new())
    }
    let data = std::fs::read(&path).unwrap_or_else(
        |e| {
            eprintln!("Failed to read file {path}: {e}");
            Vec::<u8>::new()
        }
    );
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
