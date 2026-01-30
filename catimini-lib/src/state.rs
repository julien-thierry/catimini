pub struct AppState {
    pub root_folders : Vec<std::path::PathBuf>
}

impl AppState {
    pub fn new<P : AsRef<std::path::Path>>(paths : &Vec<P>) -> Option<Self> {
        let mut state = AppState{ root_folders: vec![] };

        for r in paths {
            if r.as_ref().is_dir() {
                state.root_folders.push(r.as_ref().to_path_buf());
            }
        }

        if state.root_folders.is_empty() {
            None
        } else {
            Some(state)
        }
    }
}
