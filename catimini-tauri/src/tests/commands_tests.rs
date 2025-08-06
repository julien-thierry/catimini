use tauri::ipc::IpcResponse;
use tauri::Manager;

use crate::state;
use crate::commands;

fn create_app_with_state<P : AsRef<std::path::Path>>(paths : &Vec<P>) -> tauri::App<tauri::test::MockRuntime> {
    let app = tauri::test::mock_app();
    app.manage(state::AppState::new(&paths).unwrap());
    app
}

#[test]
fn list_non_existing_folder() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let non_existing_path = work_dir.path().join("non_existing_folder");

    let app = create_app_with_state(&vec![work_dir.path()]);
    let res = commands::list_folder_files(app.state(), Some(non_existing_path.display().to_string()), Some(false));
    assert!(res.is_err());
}

#[test]
fn list_existing_non_folder_file() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let non_folder_file = tempfile::NamedTempFile::new_in(work_dir.path()).unwrap();

    let app = create_app_with_state(&vec![work_dir.path()]);
    let res = commands::list_folder_files(app.state(), Some(non_folder_file.path().display().to_string()), Some(false));
    assert!(res.is_err());
}

#[test]
fn list_root_folders() {
    let work_dir1 = tempfile::TempDir::new().unwrap();
    let work_dir2 = tempfile::TempDir::new().unwrap();
    let work_dir3 = tempfile::TempDir::new().unwrap();
    let work_dir4 = tempfile::TempDir::new().unwrap();

    let app = create_app_with_state(&vec![work_dir1.path(), work_dir2.path(), work_dir3.path(), work_dir4.path()]);
    let res = commands::list_folder_files(app.state(), None, Some(false));
    assert!(res.is_ok());

    let content = res.unwrap();
    assert_eq!(content.folders.len(), 4);
    assert!(content.images.is_empty());
    assert!(content.others.is_empty());

    assert!(content.folders.contains(&work_dir1.path().display().to_string()));
    assert!(content.folders.contains(&work_dir2.path().display().to_string()));
    assert!(content.folders.contains(&work_dir3.path().display().to_string()));
    assert!(content.folders.contains(&work_dir4.path().display().to_string()));
}

#[test]
fn list_images_and_folders() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let dirs = vec![work_dir.path().join("dir1"), work_dir.path().join("dir2"), work_dir.path().join("dir3")];
    for dir in &dirs {
        std::fs::create_dir(dir).unwrap();
    }

    let images = vec![work_dir.path().join("img1.png"), work_dir.path().join("img2.png"), work_dir.path().join("img3.jpg")];
    for image in &images {
        std::fs::File::create(image).unwrap();
    }

    let others = vec![work_dir.path().join("other1"), work_dir.path().join("other2.txt")];
    for other in &others {
        std::fs::File::create(other).unwrap();
    }

    let app = create_app_with_state(&vec![work_dir.path()]);
    let res = commands::list_folder_files(app.state(), Some(work_dir.path().display().to_string()), None);
    assert!(res.is_ok());

    let content = res.unwrap();
    assert_eq!(content.folders.len(), 3);
    for dir in &dirs {
        assert!(content.folders.contains(&dir.display().to_string()));
    }

    assert_eq!(content.images.len(), 3);
    for image in &images {
        assert!(content.images.contains(&image.display().to_string()));
    }

    assert!(content.others.is_empty());
}

#[test]
fn list_images_folders_and_others() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let dirs = vec![work_dir.path().join("dir1"), work_dir.path().join("dir2"), work_dir.path().join("dir3")];
    for dir in &dirs {
        std::fs::create_dir(dir).unwrap();
    }

    let images = vec![work_dir.path().join("img1.png"), work_dir.path().join("img2.png"), work_dir.path().join("img3.jpg")];
    for image in &images {
        std::fs::File::create(image).unwrap();
    }

    let others = vec![work_dir.path().join("other1"), work_dir.path().join("other2.txt")];
    for other in &others {
        std::fs::File::create(other).unwrap();
    }

    let app = create_app_with_state(&vec![work_dir.path()]);
    let res = commands::list_folder_files(app.state(), Some(work_dir.path().display().to_string()), Some(false));
    assert!(res.is_ok());

    let content = res.unwrap();
    assert_eq!(content.folders.len(), 3);
    for dir in &dirs {
        assert!(content.folders.contains(&dir.display().to_string()));
    }

    assert_eq!(content.images.len(), 3);
    for image in &images {
        assert!(content.images.contains(&image.display().to_string()));
    }

    assert_eq!(content.others.len(), 2);
    for other in &others {
        assert!(content.others.contains(&other.display().to_string()));
    }
}

#[test]
fn fetch_non_existing_image() {
    let work_dir = tempfile::TempDir::new().unwrap();

    let res = commands::fetch_image(work_dir.path().join("non_existing.jpg").display().to_string());
    match res.body().unwrap() {
        tauri::ipc::InvokeResponseBody::Json(_) => { panic!("Should not receive a JSON response") }
        tauri::ipc::InvokeResponseBody::Raw(v) => { assert!(v.is_empty()) }
    }
}

#[test]
fn fetch_non_image_file() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let filepath = work_dir.path().join("non_image");
    let mut content : Vec<u8> = vec![];
    for _ in 0 .. 1000 {
        content.push(0xBA);
    }
    std::fs::write(&filepath, &content).unwrap();

    let res = commands::fetch_image(filepath.display().to_string());
    match res.body().unwrap() {
        tauri::ipc::InvokeResponseBody::Json(_) => { panic!("Should not receive a JSON response") }
        tauri::ipc::InvokeResponseBody::Raw(v) => { assert!(v.is_empty()) }
    }
}

#[test]
fn fetch_good_image() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let filepath = work_dir.path().join("image.png");
    let mut content : Vec<u8> = vec![];
    for _ in 0 .. 1000 {
        content.push(0xBA);
    }
    std::fs::write(&filepath, &content).unwrap();

    let res = commands::fetch_image(filepath.display().to_string());
    match res.body().unwrap() {
        tauri::ipc::InvokeResponseBody::Json(_) => { panic!("Should not receive a JSON response") }
        tauri::ipc::InvokeResponseBody::Raw(v) => { assert_eq!(v.len(), 1000); assert_eq!(v, content) }
    }
}
