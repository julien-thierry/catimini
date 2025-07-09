use crate::state;

#[tauri::command]
pub fn list_images(state: tauri::State<state::AppState>) -> Vec<String> {
    let mut dir_images = vec![];

    if let Ok(dir_it) = std::fs::read_dir(state.workspace.as_path()) {
        for entry in dir_it {
            let Ok(entry) = entry else {
                continue;
            };
            if let Ok(_)  = image::ImageFormat::from_path(entry.path()) {
                // Unwrap should work since we are stripping the directory prefix from the file we found in the directory
                dir_images.push(entry.path().strip_prefix(state.workspace.as_path()).unwrap().display().to_string());
            }
        }
    }

    dir_images
}
