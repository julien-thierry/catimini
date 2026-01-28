// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod cmdline;

fn setup_root_directories<P : AsRef<std::path::Path>>(app: &tauri::App, root_paths : &Vec<P>) {
    if let Some(state) = catimini_tauri::state::AppState::new(&root_paths) {
        let _ = app.manage(state);
    } else {
        eprint!("Could not setup root directories")
    }
}

fn setup_fs_watch(app: &tauri::App) {
    let watcher_app_handle = app.app_handle().clone();
    let fs_event_callback = Box::new(move |events| {
        use tauri::Emitter;
        let app_handle = watcher_app_handle.clone();
        match events {
            catimini_tauri::fswatch::FSEvent::Create(create_event) => {
                let _ = app_handle.emit("filesystem-event-create", create_event);
            },
            catimini_tauri::fswatch::FSEvent::Delete(delete_event) => {
                let _ = app_handle.emit("filesystem-event-delete", delete_event);
            },
            _ => ()
        }
    });

    if let Ok(watcher) = catimini_tauri::fswatch::SyncedFolderWatcher::new(fs_event_callback) {
        app.manage(watcher);
    }
}

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

    catimini_tauri::init()
        .setup(move |app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            if debug_front {
                setup_front_debug(&app);
            }

            setup_root_directories(&app, &root_directories);
            setup_fs_watch(&app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
