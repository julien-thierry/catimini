// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(debug_assertions)]
use tauri::Manager;

mod cmdline;

#[cfg(debug_assertions)]
fn setup_front_debug(app: &tauri::App) {
    let window = app.get_webview_window("catimini-main").unwrap();
    window.open_devtools();
}

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
                setup_front_debug(&app);
            }

            catimini_tauri::setup_app(&app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
