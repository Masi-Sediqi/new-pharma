import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { TOAST_EVENT, type ToastPayload, type ToastType } from '../utils/toast'

type ToastItem = Required<Pick<ToastPayload, 'type' | 'title'>> & {
  id: number
  message?: string
  leaving?: boolean
}

const tone: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100',
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

export default function ToastHost({ isRtl }: { isRtl: boolean }) {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const remove = (id: number) => {
      setItems((current) => current.map((item) => item.id === id ? { ...item, leaving: true } : item))
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 220)
    }
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail
      if (!detail?.title) return
      const id = Date.now() + Math.random()
      const item: ToastItem = { id, type: detail.type || 'info', title: detail.title, message: detail.message }
      setItems((current) => [item, ...current].slice(0, 4))
      window.setTimeout(() => remove(id), detail.duration ?? 3200)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (!items.length) return null

  return (
    <div className={`pointer-events-none fixed top-5 z-[200] flex w-[calc(100vw-24px)] max-w-sm flex-col gap-2 ${isRtl ? 'left-3 sm:left-5' : 'right-3 sm:right-5'}`}>
      {items.map((item) => {
        const Icon = icons[item.type]
        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur transition-all duration-200 ${tone[item.type]} ${item.leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <Icon size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold">{item.title}</div>
              {item.message && <div className="mt-1 text-xs leading-5 opacity-85">{item.message}</div>}
            </div>
            <button
              type="button"
              onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
