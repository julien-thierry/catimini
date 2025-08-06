use crate::state;

#[derive(serde::Serialize)]
pub struct FolderContent {
    pub folders : Vec<String>,
    pub images : Vec<String>,
    pub others : Vec<String>
}

impl FolderContent {
    fn add_dir_entry(self: &mut Self, entry: std::fs::DirEntry, ignore_others : Option<bool>) {
        let target_list =
            if entry.path().is_dir() {
                &mut self.folders
            } else if let Ok(_)  = image::ImageFormat::from_path(entry.path()) {
                &mut self.images
            } else if let Some(false) = ignore_others {
                &mut self.others
            } else {
                return;
            };

        target_list.push(entry.path().display().to_string())
    }
}

#[tauri::command]
pub fn list_folder_files(state: tauri::State<state::AppState>,
                         path : Option<String>,
                         ignore_others : Option<bool>) -> Result<FolderContent, String> {
    let target_path : std::path::PathBuf =
        if let Some(path) = path { std::path::PathBuf::from(path) }
        else {
            return Ok(FolderContent {
                folders: state.root_folders.iter().map(|e| {e.display().to_string()}).collect(),
                images: vec![],
                others: vec![] })
        };

    if let Ok(dir_it) = std::fs::read_dir(&target_path) {
        let mut res = FolderContent { folders : vec![], images : vec![], others : vec![] };
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
