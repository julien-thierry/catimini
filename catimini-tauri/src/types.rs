#[derive(Clone, serde::Serialize)]
pub struct FolderContent {
    pub folders : Vec<String>,
    pub images : Vec<String>,
    pub others : Vec<String>
}

impl FolderContent {
    pub fn add_dir_entry(self: &mut Self, entry: std::fs::DirEntry, ignore_others : Option<bool>) {
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
