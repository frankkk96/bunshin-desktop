use tauri::{AppHandle, Manager};

pub fn setup_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(_main_window) = app.get_webview_window("main") {
        // Platform specific window setup
        #[cfg(target_os = "windows")]
        {
            // Windows: 隐藏原生标题栏，使用自定义控件
            _main_window.set_decorations(false)?;
        }

        #[cfg(target_os = "macos")]
        {
            // macOS: 使用overlay样式的标题栏
            // let _ = _main_window.create_overlay_titlebar();
            // let _ = _main_window.set_traffic_lights_inset(12.0, 16.0);
        }

        #[cfg(target_os = "linux")]
        {
            // Linux: 保持默认行为
        }
    }

    Ok(())
}
