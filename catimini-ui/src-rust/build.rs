type RGBABuffer = image::ImageBuffer<image::Rgba<u8>, Vec<u8>>;

fn check_dummy_icon_exists<P>(icon_path: P,
                              expected_format : &image::ImageFormat) -> Result<bool, image::ImageError>
where
    P : AsRef<std::path::Path>
{
    if std::fs::exists(&icon_path)? {
        let img = image::ImageReader::open(&icon_path)?;
        if let Some(fmt) = img.format() {
            assert!(fmt == *expected_format,
                    "Expect {} to have {} format, got {}",
                    icon_path.as_ref().display() ,expected_format.to_mime_type(), fmt.to_mime_type());
            return Ok(true)
        }
    }

    Ok(false)
}

fn generate_dummy_icon() -> RGBABuffer {
    let mut img_buf = image::RgbaImage::new(128, 128);

    // Generate a 64x64 centered golden square with transparent background
    for (x, y, pix) in img_buf.enumerate_pixels_mut() {
        if x < 32 || y < 32 || x >= 128 - 32 || y >= 128 - 32 {
            *pix = image::Rgba([0, 0, 0, 0]);
        } else {
            *pix = image::Rgba([255, 215, 0, 255]);
        }
    }

    img_buf
}

fn create_icon_file<P : AsRef<std::path::Path>>(icon_path: P) -> std::io::Result<std::fs::File> {
    let parent_path = icon_path.as_ref().parent().unwrap();
    if !std::fs::exists(parent_path)? {
        std::fs::create_dir_all(parent_path).unwrap();
    }
    std::fs::File::options().write(true).create(true).open(icon_path)
}

fn main() {
    // Tauri requires an icon to exist to create the app.
    // To avoid storing a temporary icon in git, generate a small one at build
    // time when it is needed.

    // IconInfo = (path_of_icon, icon_format, write_buf_to_file(file, buf))
    type IconInfo<'a> = (&'a str, image::ImageFormat, Box<dyn Fn(std::fs::File, &RGBABuffer) -> image::ImageResult<()>>);
    let icons_info : [IconInfo;2]= [
        ("gen/icons/dummy.ico", image::ImageFormat::Ico,
         Box::new(|file, img_buf : &RGBABuffer| {img_buf.write_with_encoder(image::codecs::ico::IcoEncoder::new(file))})),
        ("gen/icons/dummy.png", image::ImageFormat::Png,
         Box::new(|file, img_buf : &RGBABuffer| {img_buf.write_with_encoder(image::codecs::png::PngEncoder::new(file))}))
    ];

    let missing_icons : Vec<&IconInfo> =
        icons_info.iter().filter(|e| !check_dummy_icon_exists(&e.0, &e.1).unwrap()).collect();

    let icon_buf = if missing_icons.len() > 0  { generate_dummy_icon() } else {
        return;
    };

    for icon_info in missing_icons {
        let icon_file = create_icon_file(&icon_info.0).unwrap();
        icon_info.2(icon_file, &icon_buf).unwrap();
    }
    tauri_build::build()
}
