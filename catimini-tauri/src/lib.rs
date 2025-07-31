mod state;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn init<P : AsRef<std::path::Path>>(workspace : P) -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .manage(state::AppState::new(workspace).expect("Failed to create AppState."))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::fetch_image,
            commands::list_folder_files,
        ])
}
