import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

export default function TrendChart({ invoices = [], expenses = [], filter = 'month', language = 'English' }: Partial<Props>) {
  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const safeExpenses = Array.isArray(expenses) ? expenses : []
  const safeFilter: DashboardFilter = filter || 'month'
  const safeLanguage: Language = language || 'English'
  const t = labels[safeLanguage]
  const { points, maxY } = useMemo(() => {
    const buckets = buildBuckets(safeFilter, safeLanguage, safeInvoices, safeExpenses)
    const pts: Point[] = buckets.map(b => ({ key: b.key, label: b.label, revenue: 0, expenses: 0, refunds: 0, pending: 0, sales: 0 }))
    const findIndex = (date: Date | null) => date ? buckets.findIndex(b => date >= b.start && date < b.end) : -1

    safeInvoices.forEach(inv => {
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

    safeExpenses.forEach(exp => {
      const idx = findIndex(rowDate(exp))
      if (idx >= 0) pts[idx].expenses += n(exp.amountBase ?? exp.amount ?? exp.total)
    })

    pts.forEach(p => {
      p.revenue = round(p.revenue); p.expenses = round(p.expenses); p.refunds = round(p.refunds)
      p.pending = round(p.pending); p.sales = round(p.sales)
    })
    const highest = Math.max(0, ...pts.flatMap(p => [p.revenue, p.expenses, p.refunds, p.pending, p.sales]))
    return { points: pts, maxY: niceMax(highest) }
  }, [safeFilter, safeLanguage, safeInvoices, safeExpenses])

  const graphData = points.length
    ? points
    : [{ key: 'empty', label: '', revenue: 0, expenses: 0, refunds: 0, pending: 0, sales: 0 }]

  const moneyTooltip = (value: unknown) => [
    fmtMoney(n(value)),
  ]

  return (
    <section className="app-panel rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <div className="mb-3">
        <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">{t.title}</h3>
      </div>

      <div className="h-[280px] min-w-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={graphData}
            margin={{ top: 12, right: 18, left: -8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical
              stroke="currentColor"
              className="text-[#dce6f2] dark:text-[#334155]"
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => n(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #dce3eb',
                boxShadow: '0 10px 28px rgba(15,23,42,.12)',
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const label = String(name || '')
                if (label === t.sales) return [fmtMoney(n(value)), label]
                return [fmtMoney(n(value)), label]
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={38}
              wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
            />

            <Line
              type="monotone"
              dataKey="revenue"
              name={t.revenue}
              stroke="#172554"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="expenses"
              name={t.expenses}
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="refunds"
              name={t.refunds}
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="pending"
              name={t.pending}
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="sales"
              name={t.sales}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )

}
