use crate::state;

#[test]
fn no_path_no_state() {
    let result = state::AppState::new(&(vec![] as Vec<String>));
    assert!(result.is_none());
}

#[test]
fn single_dir_state() {
    let dir = tempfile::TempDir::new().unwrap();
    let result = state::AppState::new(&(vec![dir.path()]));
    assert!(result.is_some());
    let state = result.unwrap();
    assert_eq!(state.root_folders.len(), 1);
    assert_eq!(dir.path(), state.root_folders[0]);
}

#[test]
fn reject_normal_files() {
    let file = tempfile::NamedTempFile::new().unwrap();
    let result = state::AppState::new(&(vec![file.path()]));
    assert!(result.is_none());
}

#[test]
fn multiple_dirs_state() {
    let mut dir_paths = vec![];
    let mut temp_dirs = vec![];
    for _ in 0..5 {
        temp_dirs.push(tempfile::TempDir::new().unwrap());
        dir_paths.push(temp_dirs.last().unwrap().path().to_path_buf());
    }
    let result = state::AppState::new(&(dir_paths));
    assert!(result.is_some());
    let state = result.unwrap();
    assert_eq!(state.root_folders.len(), 5);
    assert_eq!(dir_paths, state.root_folders);
}

#[test]
fn mixed_dirs_and_files_state() {
    let dir1 = tempfile::TempDir::new().unwrap();
    let dir2 = tempfile::TempDir::new().unwrap();
    let file1 = tempfile::NamedTempFile::new().unwrap();
    let dir3 = tempfile::TempDir::new().unwrap();
    let file2 = tempfile::NamedTempFile::new().unwrap();
    let file3 = tempfile::NamedTempFile::new().unwrap();
    let dir4 = tempfile::TempDir::new().unwrap();

    let result = state::AppState::new(&(vec![dir1.path(), dir2.path(),
                                      file1.path(),
                                      dir3.path(),
                                      file2.path(), file3.path(),
                                      dir4.path()]));
    assert!(result.is_some());
    let state = result.unwrap();
    assert_eq!(state.root_folders.len(), 4);
    assert_eq!(vec![dir1.path(), dir2.path(), dir3.path(), dir4.path()], state.root_folders);
}
