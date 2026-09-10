import { useMemo } from 'react'
import type { Language } from '../i18n'

type DashboardFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
type Row = Record<string, any>

type Props = {
  invoices: Row[]
  expenses: Row[]
  filter: DashboardFilter
  language: Language
}

type Point = {
  key: string
  label: string
  revenue: number
  expenses: number
  refunds: number
  pending: number
  sales: number
}

const n = (v: unknown) => Number.parseFloat(String(v ?? 0)) || 0
const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

const labels = {
  English: {
    title: 'Trends', revenue: 'Collected Revenue', expenses: 'Expenses', refunds: 'Refunds',
    pending: 'Pending Payments', sales: 'Sales Value', empty: 'No financial activity in this period', amount: 'Amount',
  },
  دری: {
    title: 'روند مالی', revenue: 'عواید دریافت‌شده', expenses: 'مصارف', refunds: 'بازپرداخت‌ها',
    pending: 'پرداخت‌های معلق', sales: 'ارزش فروش', empty: 'در این دوره فعالیت مالی ثبت نشده است', amount: 'مبلغ',
  },
  پښتو: {
    title: 'مالي بهیر', revenue: 'ترلاسه شوي عواید', expenses: 'لګښتونه', refunds: 'بېرته ورکړې',
    pending: 'پاتې تادیات', sales: 'د پلور ارزښت', empty: 'په دې موده کې مالي فعالیت نشته', amount: 'مبلغ',
  },
} as const

const COLORS = {
  revenue: '#1e3a8a',
  expenses: '#ef4444',
  refunds: '#f59e0b',
  pending: '#8b5cf6',
  sales: '#10b981',
} as const

function validDate(raw: unknown): Date | null {
  if (!raw) return null
  const d = new Date(String(raw))
  return Number.isNaN(d.getTime()) ? null : d
}

function rowDate(row: Row): Date | null {
  return validDate(row.date || row.invoiceDate || row.expenseDate || row.createdAt || row.updatedAt)
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function hourKey(d: Date) { return `${dayKey(d)}-${String(d.getHours()).padStart(2, '0')}` }

function formatDay(d: Date, language: Language, withMonth = true) {
  const locale = language === 'English' ? 'en-US' : 'fa-AF'
  return new Intl.DateTimeFormat(locale, withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' }).format(d)
}
function formatMonth(d: Date, language: Language) {
  const locale = language === 'English' ? 'en-US' : 'fa-AF'
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(d)
}

function buildBuckets(filter: DashboardFilter, language: Language, invoices: Row[], expenses: Row[]) {
  const now = new Date()
  now.setSeconds(0, 0)
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = []

  if (filter === 'today') {
    for (let h = 0; h < 24; h += 2) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.min(h + 2, 24), 0, 0, 0)
      buckets.push({ key: hourKey(start), label: `${String(h).padStart(2, '0')}:00`, start, end })
    }
    return buckets
  }

  if (filter === 'week') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0)
      const end = new Date(start); end.setDate(end.getDate() + 1)
      buckets.push({ key: dayKey(start), label: formatDay(start, language), start, end })
    }
    return buckets
  }

  if (filter === 'year') {
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1)
      const end = new Date(now.getFullYear(), m + 1, 1)
      buckets.push({ key: monthKey(start), label: formatMonth(start, language), start, end })
    }
    return buckets
  }

  if (filter === 'all') {
    const dates = [...invoices, ...expenses].map(rowDate).filter((d): d is Date => !!d)
    const oldest = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const first = new Date(oldest.getFullYear(), oldest.getMonth(), 1)
    const months = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1)
    const shown = Math.min(months, 18)
    for (let i = shown - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({ key: monthKey(start), label: formatMonth(start, language), start, end })
    }
    return buckets
  }

  // Monthly and Custom currently use the current calendar month. This keeps the chart aligned with the dashboard's monthly view.
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= days; d++) {
    const start = new Date(now.getFullYear(), now.getMonth(), d, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), d + 1, 0, 0, 0, 0)
    buckets.push({ key: dayKey(start), label: formatDay(start, language), start, end })
  }
  return buckets
}

function niceMax(value: number) {
  if (value <= 0) return 1
  const power = Math.pow(10, Math.floor(Math.log10(value)))
  const scaled = value / power
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return nice * power
}

function fmtMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ؋'
}

export default function TrendChart({ invoices, expenses, filter, language }: Props) {
  const t = labels[language]
  const { points, maxY } = useMemo(() => {
    const buckets = buildBuckets(filter, language, invoices, expenses)
    const pts: Point[] = buckets.map(b => ({ key: b.key, label: b.label, revenue: 0, expenses: 0, refunds: 0, pending: 0, sales: 0 }))
    const findIndex = (date: Date | null) => date ? buckets.findIndex(b => date >= b.start && date < b.end) : -1

    invoices.forEach(inv => {
      const invoiceDate = rowDate(inv)
      const invoiceIndex = findIndex(invoiceDate)
      const total = n(inv.total)
      const currentPaid = n(inv.paidAmount ?? inv.paid)
      const remaining = n(inv.balance ?? inv.remaining ?? Math.max(0, total - currentPaid))
      const paymentHistory = Array.isArray(inv.paymentHistory) ? inv.paymentHistory : []
      const laterPayments = paymentHistory.reduce((sum: number, p: Row) => sum + n(p.amount), 0)
      const initialPaid = Math.max(0, currentPaid - laterPayments)

      if (invoiceIndex >= 0) {
        pts[invoiceIndex].sales += total
        pts[invoiceIndex].revenue += initialPaid
        pts[invoiceIndex].pending += Math.max(0, remaining)
      }

      paymentHistory.forEach((p: Row) => {
        const idx = findIndex(rowDate(p))
        if (idx >= 0) pts[idx].revenue += n(p.amount)
      })

      const refundHistory = Array.isArray(inv.refundHistory) ? inv.refundHistory : []
      if (refundHistory.length) {
        refundHistory.forEach((r: Row) => {
          const idx = findIndex(rowDate(r))
          if (idx >= 0) pts[idx].refunds += n(r.amount)
        })
      } else if (invoiceIndex >= 0) {
        pts[invoiceIndex].refunds += n(inv.refundTotal)
      }
    })

    expenses.forEach(exp => {
      const idx = findIndex(rowDate(exp))
      if (idx >= 0) pts[idx].expenses += n(exp.amountBase ?? exp.amount ?? exp.total)
    })

    pts.forEach(p => {
      p.revenue = round(p.revenue); p.expenses = round(p.expenses); p.refunds = round(p.refunds)
      p.pending = round(p.pending); p.sales = round(p.sales)
    })
    const highest = Math.max(0, ...pts.flatMap(p => [p.revenue, p.expenses, p.refunds, p.pending, p.sales]))
    return { points: pts, maxY: niceMax(highest) }
  }, [filter, language, invoices, expenses])

  const W = 1200, H = 270, left = 72, right = 24, top = 18, bottom = 54
  const plotW = W - left - right, plotH = H - top - bottom
  const x = (i: number) => left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => top + plotH - (v / maxY) * plotH
  const series = [
    ['revenue', t.revenue], ['expenses', t.expenses], ['refunds', t.refunds], ['pending', t.pending], ['sales', t.sales],
  ] as const
  const hasData = points.some(p => p.revenue || p.expenses || p.refunds || p.pending || p.sales)
  const labelEvery = points.length > 20 ? 3 : points.length > 12 ? 2 : 1

  return (
    <section className="app-panel rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</h3>
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300">
          {series.map(([key, label]) => <span key={key} className="flex items-center gap-1.5"><i className="h-0.5 w-3 rounded-full" style={{ backgroundColor: COLORS[key] }}/>{label}</span>)}
        </div>
      </div>
      <div className="mt-4 min-h-[280px] w-full overflow-x-auto">
        {!hasData ? (
          <div className="grid h-[260px] place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-[#24365f] dark:text-slate-400">{t.empty}</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[280px] min-w-[760px] w-full" role="img" aria-label={t.title}>
            {[0, 0.25, 0.5, 0.75, 1].map((r) => {
              const yy = top + plotH * (1 - r)
              return <g key={r}><line x1={left} x2={W-right} y1={yy} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-[#24365f]" strokeDasharray="3 4"/><text x={left-10} y={yy+4} textAnchor="end" fontSize="10" fill="currentColor" className="text-slate-500 dark:text-slate-400">{fmtMoney(maxY*r)}</text></g>
            })}
            <line x1={left} x2={left} y1={top} y2={top+plotH} stroke="currentColor" className="text-slate-400 dark:text-[#47618f]"/>
            <line x1={left} x2={W-right} y1={top+plotH} y2={top+plotH} stroke="currentColor" className="text-slate-400 dark:text-[#47618f]"/>
            {points.map((p, i) => i % labelEvery === 0 || i === points.length-1 ? <text key={p.key} x={x(i)} y={H-24} textAnchor="middle" fontSize="10" fill="currentColor" className="text-slate-500 dark:text-slate-400">{p.label}</text> : null)}
            {series.map(([key]) => {
              const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p[key]).toFixed(2)}`).join(' ')
              return <g key={key}><path d={path} fill="none" stroke={COLORS[key]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>{points.map((p,i)=>p[key]>0?<circle key={p.key} cx={x(i)} cy={y(p[key])} r="3.2" fill={COLORS[key]}><title>{`${p.label} — ${series.find(s=>s[0]===key)?.[1]}: ${fmtMoney(p[key])}`}</title></circle>:null)}</g>
            })}
          </svg>
        )}
      </div>
    </section>
  )
}
