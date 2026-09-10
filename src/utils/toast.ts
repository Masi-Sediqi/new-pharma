export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastPayload = {
  type?: ToastType
  title: string
  message?: string
  duration?: number
}

export const TOAST_EVENT = 'pharma:toast'

export function showToast(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }))
}

export const toast = {
  success: (title: string, message?: string) => showToast({ type: 'success', title, message }),
  error: (title: string, message?: string) => showToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) => showToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) => showToast({ type: 'info', title, message }),
}
