pub mod state;
mod commands;
pub mod fswatch;
pub mod file_utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn init() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_root_folders,
            commands::fetch_image,
            commands::list_folder_files,
            commands::enable_directory_notifications,
            commands::disable_directory_notifications
        ])
}

#[cfg(test)]
mod tests;
