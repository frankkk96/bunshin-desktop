import { ErrorAction } from '../execution/errors/types'
import { TaskContext } from '../providers/base'

export interface TaskErrorEvent {
  context: TaskContext
  title: string
  message: string
  label?: string
  action?: ErrorAction
}

export enum ErrorEventType {
  TaskError = 'task:error',
}
