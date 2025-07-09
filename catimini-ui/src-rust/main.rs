// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args : Vec<String> = std::env::args().collect();

    let workspace = if args.len() > 1 { std::path::PathBuf::from(&args[1]) } else { std::env::current_dir().unwrap_or_default() };

    catimini_tauri::init(&workspace)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
