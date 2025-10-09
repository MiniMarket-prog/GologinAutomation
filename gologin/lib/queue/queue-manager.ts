import type { TaskQueue } from "./task-queue"

let currentQueue: TaskQueue | null = null

export function setCurrentQueue(queue: TaskQueue | null) {
  currentQueue = queue
}

export function getCurrentQueue(): TaskQueue | null {
  return currentQueue
}

export function stopCurrentQueue() {
  if (currentQueue) {
    currentQueue.requestStop()
    return true
  }
  return false
}
