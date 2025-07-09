pub struct AppState {
    pub workspace : std::path::PathBuf
}

impl AppState {
    pub fn new<P : AsRef<std::path::Path>>(path : P) -> Option<Self> {
        if let Ok(md) = std::fs::metadata(&path) {
            if !md.is_dir() {
                None
            } else {
                Some(AppState { workspace: path.as_ref().to_path_buf()})
            }
        } else {
            None
        }
    }
}
