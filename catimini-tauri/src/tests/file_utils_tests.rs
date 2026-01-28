use crate::file_utils;

#[test]
fn list_non_existing_folder() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let non_existing_path = work_dir.path().join("non_existing_folder");

    let res = file_utils::get_folder_content(non_existing_path.display().to_string(), Some(false));
    assert!(res.is_err());
}

#[test]
fn list_existing_non_folder_file() {
    let work_dir = tempfile::TempDir::new().unwrap();
    let non_folder_file = tempfile::NamedTempFile::new_in(work_dir.path()).unwrap();

    let res = file_utils::get_folder_content(non_folder_file.path().display().to_string(), Some(false));
    assert!(res.is_err());
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

    let res = file_utils::get_folder_content(work_dir.path().display().to_string(), None);
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

    let res = file_utils::get_folder_content(work_dir.path().display().to_string(), Some(false));
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

    let res = file_utils::load_image(work_dir.path().join("non_existing.jpg").display().to_string());
    assert!(res.is_err())
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

    let res = file_utils::load_image(filepath.display().to_string());
    assert!(res.is_err())
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

    let res = file_utils::load_image(filepath.display().to_string());
    assert!(res.is_ok());
    let res = res.unwrap();
    assert_eq!(res.len(), 1000);
    assert_eq!(res, content)
}
