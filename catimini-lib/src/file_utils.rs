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

pub fn load_image<P: AsRef<std::path::Path>>(path: P) -> Result<Vec<u8>, String> {
    if let Err(e) = image::ImageFormat::from_path(&path) {
        // TODO: check magic numbers after reading image
        return Err(e.to_string())
    }
    match std::fs::read(&path) {
        Err(e) => Err(std::format!("Failed to read file {path}: {e}", path=path.as_ref().display().to_string())),
        Ok(data) => Ok(data)
    }
}

pub fn get_folder_content<P: AsRef<std::path::Path>>(path: P, ignore_others: Option<bool>) -> Result<FolderContent, String> {
    if let Ok(dir_it) = std::fs::read_dir(path.as_ref()) {
        let mut res = FolderContent { folders : vec![], images : vec![], others : vec![] };
        for entry in dir_it {
            let Ok(entry) = entry else {
                continue;
            };

            res.add_dir_entry(entry, ignore_others);
        }
        Ok(res)
    } else {
        Err(format!("Failed to open directory: {}", path.as_ref().display().to_string()))
    }
}
