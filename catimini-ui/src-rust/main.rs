// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cmdline;

fn main() {
    let args = cmdline::get_args();

    let root_directories = if !args.root_directories.is_empty() { args.root_directories }
                           else { vec![std::env::current_dir().unwrap_or_default()] };

    catimini_tauri::init(&root_directories)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
