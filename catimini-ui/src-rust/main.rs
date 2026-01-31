// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod cmdline;
mod commands;

fn setup_root_directories<P : AsRef<std::path::Path>>(app: &tauri::App, root_paths : &Vec<P>) {
    if let Some(state) = catimini_lib::state::AppState::new(&root_paths) {
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
            catimini_lib::fswatch::FSEvent::Create(create_event) => {
                let _ = app_handle.emit("filesystem-event-create", create_event);
            },
            catimini_lib::fswatch::FSEvent::Delete(delete_event) => {
                let _ = app_handle.emit("filesystem-event-delete", delete_event);
            },
            _ => ()
        }
    });

    if let Ok(watcher) = catimini_lib::fswatch::SyncedFolderWatcher::new(fs_event_callback) {
        app.manage(watcher);
    }
}

#[cfg(debug_assertions)]
fn setup_front_debug(app: &tauri::App) {
    let window = app.get_webview_window("catimini-main").unwrap();
    window.open_devtools();
}

// Needed to display log messages on release builds: https://github.com/tauri-apps/tauri/issues/8305#issuecomment-1826871949
#[cfg(all(not(debug_assertions), windows))]
fn enable_logging_on_parent_console() {
    use windows::Win32::System::Console::{AttachConsole, ATTACH_PARENT_PROCESS};
    // we ignore the result here because
    // if the app started from a command line, like cmd or powershell,
    // it will attach sucessfully which is what we want
    // but if we were started from something like explorer,
    // it will fail to attach console which is also what we want.
    let _ = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    let args = cmdline::get_args();

    let root_directories = if !args.root_directories.is_empty() { args.root_directories }
                           else { vec![std::env::current_dir().unwrap_or_default()] };

    #[cfg(all(not(debug_assertions), windows))]
    enable_logging_on_parent_console();

    #[cfg(debug_assertions)]
    let debug_front = args.debug_front;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_root_folders,
            commands::fetch_image,
            commands::list_folder_files,
            commands::enable_directory_notifications,
            commands::disable_directory_notifications
        ])
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
