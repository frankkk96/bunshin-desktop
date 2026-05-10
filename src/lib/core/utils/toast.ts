import { toast as sonnerToast } from 'sonner'
import { logger } from '@/lib/core/utils/logger'

// Platform-specific toast implementation using Sonner (React library)
export class Toast {
  static info(message: string, duration?: number): void {
    sonnerToast.info(message, {
      duration: duration ?? 4000,
    })
  }

  static success(message: string, duration?: number): void {
    sonnerToast.success(message, {
      duration: duration ?? 2000,
    })
  }

  static error(message: string, duration?: number): void {
    sonnerToast.error(message, {
      duration: duration ?? 4000,
    })
    logger.error(message)
  }

  static warning(message: string, duration?: number): void {
    sonnerToast.warning(message, {
      duration: duration ?? 3000,
    })
  }
}

export const toast = Toast
