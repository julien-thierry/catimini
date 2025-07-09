fn check_dummy_icon_exists(icon_path: &str) -> Result<bool, image::ImageError>{
    if std::fs::exists(icon_path)? {
        let img = image::ImageReader::open(icon_path)?;
        if let Some(fmt) = img.format() {
            assert!(fmt == image::ImageFormat::Ico, "Expect {icon_path} to have ICO format, got {}", fmt.to_mime_type());
            return Ok(true)
        }
    }

    Ok(false)
}

fn generate_dummy_icon(icon_path: &str) -> Result<(), image::ImageError> {
    let mut img_buf = image::RgbaImage::new(128, 128);

    // Generate a 64x64 centered golden square with transparent background
    for (x, y, pix) in img_buf.enumerate_pixels_mut() {
        if x < 32 || y < 32 || x >= 128 - 32 || y >= 128 - 32 {
            *pix = image::Rgba([0, 0, 0, 0]);
        } else {
            *pix = image::Rgba([255, 215, 0, 255]);
        }
    }

    let parent_path = std::path::Path::new(icon_path).parent().unwrap();
    if !std::fs::exists(parent_path)? {
        std::fs::create_dir_all(parent_path).unwrap();
    }
    let ico_file = std::fs::File::options().write(true).create(true).open(icon_path)?;
    img_buf.write_with_encoder(image::codecs::ico::IcoEncoder::new(ico_file))
}

fn main() {
    // Tauri requires an icon to exist to create the app.
    // To avoid storing a temporary icon in git, generate a small one at build
    // time when it is needed.
    let icon_path = "dist/icons/dummy.ico";

    if !check_dummy_icon_exists(icon_path).unwrap() {
        generate_dummy_icon(icon_path).unwrap();
    }
    tauri_build::build()
}
