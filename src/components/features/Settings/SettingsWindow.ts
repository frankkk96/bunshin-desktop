import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { handleRuntimeError } from '@/lib/core/utils/error'
import { type } from '@tauri-apps/plugin-os'

let settingsWindow: WebviewWindow | null = null

export async function openSettingsWindow(defaultSection: string) {
  // 检查窗口是否已经存在且打开
  if (settingsWindow) {
    try {
      // 检查窗口是否真的还在
      const isVisible = await settingsWindow.isVisible()
      if (isVisible) {
        await settingsWindow.setFocus()
        // If there's a default section, navigate to it
        if (defaultSection) {
          await settingsWindow.emit('navigate-to-section', { section: defaultSection })
        }
        return
      } else {
        await settingsWindow.show()
        await settingsWindow.setFocus()
        // If there's a default section, navigate to it
        if (defaultSection) {
          await settingsWindow.emit('navigate-to-section', { section: defaultSection })
        }
        return
      }
    } catch (error) {
      // 窗口可能已经关闭，重置引用
      settingsWindow = null
    }
  }

  try {
    // 检查操作系统类型
    const osType = await type()
    const isWindows = osType === 'windows'

    // 创建新的设置窗口
    const url = defaultSection ? `/settings-window?section=${defaultSection}` : '/settings-window'
    settingsWindow = new WebviewWindow('settings', {
      url,
      title: 'Settings',
      width: 600,
      height: 700,
      minWidth: 400,
      minHeight: 500,
      resizable: true,
      maximizable: true, // 在Windows下允许最大化
      minimizable: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      titleBarStyle: isWindows ? undefined : 'overlay', // Windows下不使用overlay
      decorations: !isWindows, // Windows下隐藏原生装饰
      transparent: false,
      center: true,
      closable: true,
    })

    // 监听窗口销毁事件以清理引用
    settingsWindow.once('tauri://destroyed', () => {
      // Settings window destroyed - removed debug console.log
      settingsWindow = null
    })

    // 显示窗口
    await settingsWindow.show()
    await settingsWindow.setFocus()
  } catch (error) {
    settingsWindow = null
  }
}

export async function closeSettingsWindow() {
  if (settingsWindow) {
    try {
      await settingsWindow.close()
    } catch (error) {
      handleRuntimeError(error, { message: 'Failed to close settings window' })
    }
    settingsWindow = null
  }
}

export function getSettingsWindow() {
  return settingsWindow
}
