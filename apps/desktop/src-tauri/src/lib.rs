mod commands;
mod state;

use state::{db_dir, AppState};
use tauri::Manager;
use typr_db::queries;

#[cfg(desktop)]
fn on_pause_hotkey(
    app: &tauri::AppHandle,
    _shortcut: &tauri_plugin_global_shortcut::Shortcut,
    event: tauri_plugin_global_shortcut::ShortcutEvent,
) {
    use tauri_plugin_global_shortcut::ShortcutState;
    if event.state != ShortcutState::Pressed {
        return;
    }
    let state = app.state::<AppState>();
    let guard = state.capture.lock();
    if let Some(handle) = guard.as_ref() {
        let paused = !handle.is_paused();
        handle.set_paused(paused);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = db_dir().join("typr.db");

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    // In-app auto-update (desktop only).
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .setup(|app| {
            let state = AppState::new(db_path)?;
            app.manage(state);

            // Passive capture runs automatically (consent is collected during
            // onboarding); the user can pause or fully disable it later.
            {
                let app_state = app.state::<AppState>();
                let enabled = {
                    let db = app_state.db.lock();
                    queries::get_setting(db.conn(), "capture_enabled")
                        .ok()
                        .flatten()
                };
                if enabled.as_deref() != Some("false") {
                    if let Err(e) = commands::ensure_capture_started(&app_state) {
                        eprintln!("typr: could not auto-start capture: {e}");
                    }
                }
            }

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;
                use tauri_plugin_global_shortcut::GlobalShortcutExt;

                // Register the global pause/resume hotkey. Failure (e.g. an
                // unparseable binding or a headless environment) is non-fatal.
                let hotkey = {
                    let app_state = app.state::<AppState>();
                    let db = app_state.db.lock();
                    queries::get_setting(db.conn(), "pause_hotkey")
                        .ok()
                        .flatten()
                        .unwrap_or_default()
                };
                let registered = if hotkey.is_empty() {
                    Err(())
                } else {
                    app.global_shortcut()
                        .on_shortcut(hotkey.as_str(), on_pause_hotkey)
                        .map_err(|_| ())
                };
                if registered.is_err() {
                    let _ = app
                        .global_shortcut()
                        .on_shortcut("CmdOrCtrl+Shift+P", on_pause_hotkey);
                }

                let pause = MenuItem::with_id(app, "pause", "Toggle pause", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit Typr", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&pause, &quit])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("Typr — recording")
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "pause" => {
                                let state = app.state::<AppState>();
                                let guard = state.capture.lock();
                                if let Some(handle) = guard.as_ref() {
                                    let paused = !handle.is_paused();
                                    handle.set_paused(paused);
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_onboarding_complete,
            commands::set_onboarding_complete,
            commands::start_capture,
            commands::stop_capture,
            commands::toggle_pause_capture,
            commands::get_capture_status,
            commands::get_error_profile,
            commands::get_sessions,
            commands::get_blocklist,
            commands::add_blocklist_pattern,
            commands::remove_blocklist_pattern,
            commands::export_data,
            commands::delete_all_data,
            commands::record_typing,
            commands::get_due_drills,
            commands::save_drill_cards,
            commands::get_event_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
