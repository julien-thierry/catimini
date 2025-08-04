// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod cmdline;

fn main() {
    let args = cmdline::get_args();

    let root_directories = if !args.root_directories.is_empty() { args.root_directories }
                           else { vec![std::env::current_dir().unwrap_or_default()] };

    #[cfg(debug_assertions)]
    let debug_front = args.debug_front;

    catimini_tauri::init(&root_directories)
        .setup(move |app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            if debug_front {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
