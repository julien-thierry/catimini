#[derive(Clone, Debug, PartialEq, serde::Serialize)]
pub struct FolderContent {
    pub folders : Vec<String>,
    pub images : Vec<String>,
    pub others : Vec<String>
}

impl FolderContent {
    pub fn add_path<P: AsRef<std::path::Path>>(self: &mut Self, path: P, ignore_others : Option<bool>) {
        let target_list =
            if path.as_ref().is_dir() {
                &mut self.folders
            } else if let Ok(_)  = image::ImageFormat::from_path(path.as_ref()) {
                &mut self.images
            } else if let Some(false) = ignore_others {
                &mut self.others
            } else {
                return;
            };

        target_list.push(path.as_ref().display().to_string())
    }

    pub fn add_dir_entry(self: &mut Self, entry: std::fs::DirEntry, ignore_others : Option<bool>) {
        self.add_path(entry.path(), ignore_others)
    }
}
