// 轻量全局提示（配合 AppToast.vue 渲染）
import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'ok' | 'err' | 'info'
}

let seq = 0
export const toasts = ref<ToastItem[]>([])
const durationMs = 3200

export function toast(message: string, type: ToastItem['type'] = 'info') {
  const id = ++seq
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, durationMs)
}

export const toastOk = (m: string) => toast(m, 'ok')
export const toastErr = (m: string) => toast(m, 'err')