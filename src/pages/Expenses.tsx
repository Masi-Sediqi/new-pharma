import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays, Check, ChevronDown, DollarSign, Eye, Pencil, Plus, Printer,
  Search, Trash2, WalletCards, X
} from 'lucide-react'
import type { Language } from '../i18n'
import { moveRecordToRecycleBin } from '../utils/recycleBin'

type Row = Record<string, any>
type Option = { value: string; label: string }

type Expense = {
  id: string
  category: string
  description: string
  amount: number
  amountBase?: number
  currency: string
  method: string
  notes: string
  date: string
  createdAt: string
  updatedAt: string
}

const num = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0
const round = (value: unknown) => Math.round((num(value) + Number.EPSILON) * 100) / 100
const today = () => new Date().toISOString().slice(0, 10)
const lower = (value: unknown) => String(value ?? '').trim().toLowerCase()

function loadArray(key: string): Row[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
  } catch {
    return []
  }
}

function loadObject(key: string): Row {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed[0] && typeof parsed[0] === 'object' ? parsed[0] : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveArray(key: string, value: Row[]) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('pharma:data-changed'))
}

const symbols: Record<string, string> = {
  AFN: '؋', USD: '$', EUR: '€', GBP: '£', SAR: '﷼', PKR: 'Rs', INR: '₹', AED: 'د.إ', CNY: '¥'
}
const money = (amount: unknown, currency = 'AFN') =>
  `${num(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbols[String(currency).toUpperCase()] || currency}`

const baseCategories = [
  'Miscellaneous', 'Rent', 'Utilities', 'Transport', 'Salary', 'Inventory',
  'Maintenance', 'Marketing', 'Food', 'Office Supplies', 'Internet', 'Electricity',
  'Cleaning', 'Tax', 'Delivery', 'Repair'
]
const methods = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money']
const currencies = ['AFN', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR', 'CNY']

const text = {
  English: {
    title: 'Expense Management', sub: 'Track all business expenses and cash outflows', add: 'Add Expense', print: 'Print Report',
    filtered: 'Filtered Total', month: 'This Month', count: 'Expense Count', search: 'Search by description or category...',
    allCategories: 'All categories', allMethods: 'All methods', allTime: 'All time', today: 'Today', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom',
    records: 'Expenses', category: 'Category', description: 'Description', amount: 'Amount', currency: 'Currency', method: 'Payment Method', date: 'Date', actions: 'Actions', notes: 'Notes',
    noData: 'No expense found', noDataSub: 'Add your first expense record', view: 'View', edit: 'Edit', del: 'Delete', modalAdd: 'Add Expense', modalEdit: 'Edit Expense',
    customCategory: 'Custom', categoryName: 'Category name', addCategory: 'Add', cancel: 'Cancel', save: 'Save Expense', descPh: 'What was this expense for?', notesPh: 'Additional notes...',
    deleteTitle: 'Delete Expense', deleteMsg: 'Delete this expense? Its linked financial transaction will also be removed.', confirm: 'Delete', required: 'Description and a valid amount are required.'
  },
  دری: {
    title: 'مدیریت مصارف', sub: 'پیگیری تمام مصارف کسب و کار و خروج پول', add: 'افزودن مصرف', print: 'چاپ گزارش',
    filtered: 'مجموع فیلتر شده', month: 'این ماه', count: 'تعداد مصارف', search: 'جستجو با توضیحات یا دسته‌بندی...',
    allCategories: 'همه دسته‌ها', allMethods: 'همه روش‌ها', allTime: 'همه وقت', today: 'امروز', weekly: 'هفتگی', monthly: 'ماهانه', yearly: 'سالانه', custom: 'سفارشی',
    records: 'مصارف', category: 'دسته‌بندی', description: 'توضیحات', amount: 'مقدار', currency: 'واحد پول', method: 'روش پرداخت', date: 'تاریخ', actions: 'عملیات', notes: 'یادداشت',
    noData: 'مصرفی یافت نشد', noDataSub: 'اولین مصرف را اضافه کنید', view: 'مشاهده', edit: 'ویرایش', del: 'حذف', modalAdd: 'افزودن مصرف', modalEdit: 'ویرایش مصرف',
    customCategory: 'سفارشی +', categoryName: 'نام دسته‌بندی', addCategory: 'افزودن', cancel: 'لغو', save: 'ذخیره مصرف', descPh: 'این مصرف برای چه بود؟', notesPh: 'یادداشت‌های اضافی...',
    deleteTitle: 'حذف مصرف', deleteMsg: 'این مصرف حذف شود؟ تراکنش مالی مرتبط نیز حذف می‌شود.', confirm: 'حذف', required: 'توضیحات و مقدار معتبر الزامی است.'
  },
  پښتو: {
    title: 'د لګښتونو مدیریت', sub: 'ټول سوداګریز لګښتونه او د پیسو وتل تعقیب کړئ', add: 'لګښت زیات کړئ', print: 'راپور چاپ',
    filtered: 'فلټر شوی ټول', month: 'دا میاشت', count: 'د لګښتونو شمېر', search: 'د تشریح یا کټګورۍ له مخې لټون...',
    allCategories: 'ټولې کټګورۍ', allMethods: 'ټولې طریقې', allTime: 'ټول وخت', today: 'نن', weekly: 'اوونیز', monthly: 'میاشتنی', yearly: 'کلنی', custom: 'ځانګړی',
    records: 'لګښتونه', category: 'کټګوري', description: 'تشریح', amount: 'مقدار', currency: 'اسعار', method: 'د ورکړې طریقه', date: 'نېټه', actions: 'عملیات', notes: 'یادښت',
    noData: 'لګښت ونه موندل شو', noDataSub: 'لومړی لګښت اضافه کړئ', view: 'کتل', edit: 'سمول', del: 'ړنګول', modalAdd: 'لګښت زیات کړئ', modalEdit: 'لګښت سمول',
    customCategory: 'ځانګړی +', categoryName: 'د کټګورۍ نوم', addCategory: 'زیاتول', cancel: 'لغوه', save: 'لګښت خوندي کړئ', descPh: 'دا لګښت د څه لپاره و؟', notesPh: 'اضافي یادښتونه...',
    deleteTitle: 'لګښت ړنګول', deleteMsg: 'دا لګښت ړنګ شي؟ اړوند مالي معامله به هم ړنګه شي.', confirm: 'ړنګول', required: 'تشریح او معتبر مقدار اړین دي.'
  }
} as const

const categoryLabels: Record<string, Record<Language, string>> = {
  Miscellaneous: { English: 'Miscellaneous', دری: 'متفرقه', پښتو: 'متفرقه' },
  Rent: { English: 'Rent', دری: 'کرایه', پښتو: 'کرایه' },
  Utilities: { English: 'Utilities', دری: 'خدمات عمومی', پښتو: 'خدمات' },
  Transport: { English: 'Transport', دری: 'ترانسپورت', پښتو: 'ترانسپورت' },
  Salary: { English: 'Salary', دری: 'معاش', پښتو: 'معاش' },
  Inventory: { English: 'Inventory', دری: 'موجودی / خرید جنس', پښتو: 'موجودي / پېرود' },
  Maintenance: { English: 'Maintenance', دری: 'نگهداری', پښتو: 'ساتنه' },
  Marketing: { English: 'Marketing', دری: 'بازاریابی', پښتو: 'بازارموندنه' },
  Food: { English: 'Food', دری: 'خوراک', پښتو: 'خوراک' },
  'Office Supplies': { English: 'Office Supplies', دری: 'لوازم دفتر', پښتو: 'د دفتر توکي' },
  Internet: { English: 'Internet', دری: 'انترنت', پښتو: 'انټرنېټ' },
  Electricity: { English: 'Electricity', دری: 'برق', پښتو: 'برېښنا' },
  Cleaning: { English: 'Cleaning', دری: 'نظافت', پښتو: 'پاکوالی' },
  Tax: { English: 'Tax', دری: 'مالیات', پښتو: 'مالیه' },
  Delivery: { English: 'Delivery', دری: 'تحویل / انتقال', پښتو: 'لېږد' },
  Repair: { English: 'Repair', دری: 'ترمیم', پښتو: 'ترمیم' }
}
const methodLabels: Record<string, Record<Language, string>> = {
  Cash: { English: 'Cash', دری: 'نقدی', پښتو: 'نغدي' },
  'Bank Transfer': { English: 'Bank Transfer', دری: 'انتقال بانکی', پښتو: 'بانکي انتقال' },
  Card: { English: 'Card', دری: 'کارت', پښتو: 'کارت' },
  'Mobile Money': { English: 'Mobile Money', دری: 'پول موبایلی', پښتو: 'موبایل پیسې' }
}

function amountToBase(amount: number, currency: string, settings: Row) {
  const base = String(settings.baseCurrency || 'AFN').toUpperCase()
  const from = String(currency || base).toUpperCase()
  if (from === base) return round(amount)
  const rates = settings.exchangeRates || {}
  const direct = num(rates[from])
  if (direct > 0) return round(amount / direct)
  const inverse = num(rates[`${from}_${base}`] ?? rates[`${from}-${base}`])
  if (inverse > 0) return round(amount * inverse)
  return round(amount)
}

function dateMatches(value: string, filter: string, customFrom: string, customTo: string) {
  if (filter === 'all') return true
  const raw = String(value || '').slice(0, 10)
  if (!raw) return false
  const d = new Date(`${raw}T12:00:00`)
  const now = new Date()
  if (filter === 'today') return d.toDateString() === now.toDateString()
  if (filter === 'week') {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6)
    return d >= start && d <= now
  }
  if (filter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (filter === 'year') return d.getFullYear() === now.getFullYear()
  if (filter === 'custom') return (!customFrom || raw >= customFrom) && (!customTo || raw <= customTo)
  return true
}

function SelectBox({ value, onChange, options, className = '' }: { value: string; onChange: (v: string) => void; options: Option[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement | null>(null)
  const current = options.find((option) => String(option.value) === String(value)) || options[0]
  useEffect(() => {
    const close = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return <div ref={root} className={`relative min-w-0 ${className}`}>
    <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition hover:border-slate-300 dark:border-[#2a3d68] dark:bg-[#0c1629] dark:text-slate-100 dark:hover:border-[#476397]">
      <span className="truncate">{current?.label}</span><ChevronDown size={15}/>
    </button>
    {open && <div className="absolute start-0 top-[calc(100%+6px)] z-[80] min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-[#2a3d68] dark:bg-[#101a2e]">
      {options.map((option) => <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false) }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm ${String(option.value) === String(value) ? 'bg-amber-500 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'}`}>
        <span className="grid h-4 w-4 place-items-center">{String(option.value) === String(value) && <Check size={14}/>}</span><span className="whitespace-nowrap">{option.label}</span>
      </button>)}
    </div>}
  </div>
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'orange' | 'red' }) {
  const edge = tone === 'blue' ? 'border-sky-500' : tone === 'red' ? 'border-red-500' : 'border-amber-500'
  const bg = tone === 'blue' ? 'bg-sky-50 dark:bg-sky-400/10' : tone === 'red' ? 'bg-red-50 dark:bg-red-400/10' : 'bg-amber-50 dark:bg-amber-400/10'
  return <article className={`flex min-h-[88px] items-center justify-between rounded-xl border border-slate-200 border-s-4 ${edge} bg-white px-5 shadow-sm dark:border-[#25365f] dark:bg-[#111827]`}>
    <div><div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div><strong className="mt-1 block whitespace-pre-line text-[22px] leading-7 text-slate-950 dark:text-white">{value}</strong></div>
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${bg} text-slate-800 dark:text-slate-100`}><Icon size={20}/></span>
  </article>
}

function ActionMenu({ t, language, onView, onEdit, onDelete }: { t: any; language: Language; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null)

  const openMenu = (button: HTMLButtonElement) => {
    if (menu) { setMenu(null); return }
    const rect = button.getBoundingClientRect()
    const width = 170
    const height = 140
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const top = rect.bottom + 8 + height <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(8, rect.top - height - 8)
    setMenu({ top, left })
  }

  return <>
    <button
      type="button"
      onClick={(e) => openMenu(e.currentTarget)}
      className="grid h-8 w-9 place-items-center rounded-lg border border-transparent text-lg font-bold transition hover:border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:hover:border-[#31466f] dark:hover:bg-white/10"
      aria-label={t.actions}
    >
      •••
    </button>

    {menu && createPortal(
      <>
        <button
          type="button"
          aria-label="Close actions"
          className="fixed inset-0 z-[80] cursor-default bg-transparent"
          onClick={() => setMenu(null)}
        />
        <div
          dir={language === 'English' ? 'ltr' : 'rtl'}
          className="fixed z-[90] w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-start shadow-2xl dark:border-[#2a3d68] dark:bg-[#101a2e]"
          style={{ top: menu.top, left: menu.left }}
        >
          <button type="button" onClick={() => { setMenu(null); onView() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10">
            <Eye size={15}/><span className="flex-1 whitespace-nowrap">{t.view}</span>
          </button>
          <button type="button" onClick={() => { setMenu(null); onEdit() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10">
            <Pencil size={15}/><span className="flex-1 whitespace-nowrap">{t.edit}</span>
          </button>
          <button type="button" onClick={() => { setMenu(null); onDelete() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 size={15}/><span className="flex-1 whitespace-nowrap">{t.del}</span>
          </button>
        </div>
      </>,
      document.body
    )}
  </>
}

export default function Expenses({ language, globalSearch = '' }: { language: Language; globalSearch?: string }) {
  const t = text[language]
  const rtl = language !== 'English'
  const [version, setVersion] = useState(0)
  const [rows, setRows] = useState<Expense[]>(() => loadArray('expenses') as Expense[])
  const [categories, setCategories] = useState<string[]>(() => {
    const custom = loadArray('expenseCategories').map((item) => String(item.name || item.value || '')).filter(Boolean)
    return Array.from(new Set([...baseCategories, ...custom]))
  })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [method, setMethod] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [viewing, setViewing] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const settings = loadObject('settings')
  const baseCurrency = String(settings.baseCurrency || 'AFN')

  useEffect(() => {
    const sync = () => { setRows(loadArray('expenses') as Expense[]); setVersion((v) => v + 1) }
    window.addEventListener('pharma:data-changed', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('pharma:data-changed', sync); window.removeEventListener('storage', sync) }
  }, [])
  useEffect(() => {
    setSearch(globalSearch)
  }, [globalSearch])

  const normalized = useMemo(() => rows.map((row: any) => ({
    id: String(row.id || `expense-${row.description || row.date || Math.random()}`),
    category: row.category || 'Miscellaneous', description: row.description || row.title || '',
    amount: num(row.amount ?? row.total), amountBase: num(row.amountBase ?? row.amount ?? row.total), currency: row.currency || baseCurrency,
    method: row.method || 'Cash', notes: row.notes || row.description2 || '', date: String(row.date || row.createdAt || '').slice(0, 10),
    createdAt: row.createdAt || new Date().toISOString(), updatedAt: row.updatedAt || row.createdAt || new Date().toISOString()
  })), [rows, baseCurrency, version])

  const filtered = useMemo(() => normalized.filter((expense) => {
    const needle = lower(search)
    const matchesSearch = !needle || lower([expense.description, expense.category, expense.method, expense.notes].join(' ')).includes(needle)
    const matchesCategory = category === 'all' || expense.category === category
    const matchesMethod = method === 'all' || expense.method === method
    return matchesSearch && matchesCategory && matchesMethod && dateMatches(expense.date, dateFilter, customFrom, customTo)
  }), [normalized, search, category, method, dateFilter, customFrom, customTo])

  const filteredByCurrency = useMemo(() => {
    const out: Record<string, number> = {}
    filtered.forEach((expense) => { const c = String(expense.currency || baseCurrency).toUpperCase(); out[c] = (out[c] || 0) + expense.amount })
    return out
  }, [filtered, baseCurrency])
  const monthRows = normalized.filter((expense) => dateMatches(expense.date, 'month', '', ''))
  const monthByCurrency: Record<string, number> = {}
  monthRows.forEach((expense) => { const c = String(expense.currency || baseCurrency).toUpperCase(); monthByCurrency[c] = (monthByCurrency[c] || 0) + expense.amount })
  const multiMoney = (values: Record<string, number>) => Object.entries(values).filter(([, v]) => Math.abs(v) > 0.000001).sort(([a], [b]) => a.localeCompare(b)).map(([c, v]) => money(v, c)).join('\n') || money(0, baseCurrency)

  const addCategory = (name: string) => {
    const clean = name.trim(); if (!clean) return
    const next = categories.some((c) => lower(c) === lower(clean)) ? categories : [...categories, clean]
    setCategories(next)
    saveArray('expenseCategories', next.filter((x) => !baseCategories.includes(x)).map((x) => ({ id: `expense-category-${x}`, name: x })))
  }

  const persistExpense = (draft: Expense) => {
    const now = new Date().toISOString()
    const clean: Expense = {
      ...draft,
      id: draft.id || `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: draft.category || 'Miscellaneous', description: draft.description.trim(), amount: round(draft.amount), currency: draft.currency || baseCurrency,
      method: draft.method || 'Cash', notes: draft.notes.trim(), date: draft.date || today(), createdAt: draft.createdAt || now, updatedAt: now,
      amountBase: amountToBase(round(draft.amount), draft.currency || baseCurrency, settings)
    }
    if (!clean.description || clean.amount <= 0) return false
    const current = loadArray('expenses') as Expense[]
    const next = current.some((item) => String(item.id) === clean.id) ? current.map((item) => String(item.id) === clean.id ? clean : item) : [clean, ...current]
    saveArray('expenses', next)

    const transactions = loadArray('transactions')
    const transaction = {
      id: `expense-${clean.id}`, transactionType: 'withdraw', type: 'expense', title: clean.description,
      amount: clean.amount, amountBase: clean.amountBase, date: clean.date, description: clean.notes,
      source: 'cash-wallet', referenceSource: 'manual-expense', category: clean.category, method: clean.method,
      referenceId: clean.id, currency: clean.currency, createdAt: clean.createdAt, updatedAt: clean.updatedAt
    }
    const txNext = transactions.some((item) => String(item.id) === transaction.id) ? transactions.map((item) => String(item.id) === transaction.id ? transaction : item) : [transaction, ...transactions]
    saveArray('transactions', txNext)
    setRows(next)
    setEditing(undefined)
    return true
  }

  const removeExpense = (expense: Expense) => {
    const next = (loadArray('expenses') as Expense[]).filter((item) => String(item.id) !== expense.id)
    const relatedTransactions = loadArray('transactions').filter((item) => String(item.id) === `expense-${expense.id}` || String(item.referenceId) === expense.id)
    const txNext = loadArray('transactions').filter((item) => String(item.id) !== `expense-${expense.id}` && String(item.referenceId) !== expense.id)
    moveRecordToRecycleBin('expenses', expense, expense.description, { relatedTransactions })
    saveArray('expenses', next)
    saveArray('transactions', txNext)
    setRows(next)
    setDeleting(null)
  }

  const categoryOptions: Option[] = [{ value: 'all', label: t.allCategories }, ...categories.map((c) => ({ value: c, label: categoryLabels[c]?.[language] || c }))]
  const methodOptions: Option[] = [{ value: 'all', label: t.allMethods }, ...methods.map((m) => ({ value: m, label: methodLabels[m]?.[language] || m }))]
  const dateOptions: Option[] = [
    { value: 'all', label: t.allTime }, { value: 'today', label: t.today }, { value: 'week', label: t.weekly },
    { value: 'month', label: t.monthly }, { value: 'year', label: t.yearly }, { value: 'custom', label: t.custom }
  ]

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{t.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.sub}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="app-btn-secondary"><Printer size={16}/>{t.print}</button>
        <button type="button" onClick={() => setEditing(null)} className="app-btn-primary"><Plus size={16}/>{t.add}</button>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <StatCard icon={WalletCards} label={t.filtered} value={multiMoney(filteredByCurrency)} tone="red"/>
      <StatCard icon={CalendarDays} label={t.month} value={multiMoney(monthByCurrency)} tone="orange"/>
      <StatCard icon={DollarSign} label={t.count} value={String(filtered.length)} tone="blue"/>
    </div>

    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#25365f] dark:bg-[#111827]">
      <div dir="ltr" className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[430px]" dir={rtl ? 'rtl' : 'ltr'}>
          <SelectBox value={dateFilter} onChange={setDateFilter} options={dateOptions}/>
          <SelectBox value={method} onChange={setMethod} options={methodOptions}/>
          <SelectBox value={category} onChange={setCategory} options={categoryOptions}/>
        </div>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 shadow-sm dark:border-[#2a3d68] dark:bg-[#0c1629] dark:text-slate-300" dir={rtl ? 'rtl' : 'ltr'}>
          <Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"/>
        </label>
      </div>
      {dateFilter === 'custom' && <div className="mt-3 flex flex-wrap gap-2" dir={rtl ? 'rtl' : 'ltr'}><input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="form-control max-w-[180px]"/><input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="form-control max-w-[180px]"/></div>}
    </section>

    <section className="overflow-visible rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#25365f] dark:bg-[#111827]">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-950 dark:text-white">{t.records} ({filtered.length})</h2><WalletCards size={18} className="text-slate-600 dark:text-slate-300"/></div>
      {filtered.length ? <div className="overflow-x-auto pb-2"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#2a3d68] dark:text-slate-400"><th className="px-3 py-3 text-start">{t.category}</th><th className="px-3 py-3 text-start">{t.description}</th><th className="px-3 py-3 text-start">{t.amount}</th><th className="px-3 py-3 text-start">{t.method}</th><th className="px-3 py-3 text-start">{t.date}</th><th className="px-3 py-3 text-start">{t.actions}</th></tr></thead>
        <tbody>{filtered.map((expense) => <tr key={expense.id} className="border-b border-slate-100 last:border-0 dark:border-[#1d2b49]"><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">{categoryLabels[expense.category]?.[language] || expense.category}</span></td><td className="px-3 py-4"><strong className="block text-slate-950 dark:text-white">{expense.description}</strong>{expense.notes && <span className="mt-0.5 block max-w-[360px] truncate text-xs text-slate-500 dark:text-slate-400">{expense.notes}</span>}</td><td className="px-3 py-4 font-bold text-red-500">{money(expense.amount, expense.currency)}</td><td className="px-3 py-4 text-slate-700 dark:text-slate-200">{methodLabels[expense.method]?.[language] || expense.method}</td><td className="px-3 py-4 text-slate-700 dark:text-slate-200">{expense.date || '-'}</td><td className="px-3 py-4"><ActionMenu t={t} language={language} onView={() => setViewing(expense)} onEdit={() => setEditing(expense)} onDelete={() => setDeleting(expense)}/></td></tr>)}</tbody></table></div>
      : <div className="grid min-h-[250px] place-items-center text-center"><div><WalletCards size={44} className="mx-auto text-slate-300 dark:text-slate-600"/><div className="mt-3 font-bold text-slate-900 dark:text-white">{t.noData}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.noDataSub}</div></div></div>}
    </section>

    {viewing && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[1px]" onMouseDown={(e) => { if (e.currentTarget === e.target) setViewing(null) }}>
      <div dir={rtl ? 'rtl' : 'ltr'} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-[#334871] dark:bg-[#111827] dark:text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t.records}</h2>
          <button type="button" onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button>
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#2a3d68]"><span className="text-slate-500">{t.category}</span><b>{categoryLabels[viewing.category]?.[language] || viewing.category}</b></div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#2a3d68]"><span className="text-slate-500">{t.description}</span><b className="text-end">{viewing.description}</b></div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#2a3d68]"><span className="text-slate-500">{t.amount}</span><b className="text-red-500">{money(viewing.amount, viewing.currency)}</b></div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#2a3d68]"><span className="text-slate-500">{t.method}</span><b>{methodLabels[viewing.method]?.[language] || viewing.method}</b></div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 dark:border-[#2a3d68]"><span className="text-slate-500">{t.date}</span><b>{viewing.date || '-'}</b></div>
          {viewing.notes && <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><div className="mb-1 text-xs font-semibold text-slate-500">{t.notes}</div><div>{viewing.notes}</div></div>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { const row = viewing; setViewing(null); setEditing(row) }} className="app-btn-secondary justify-center"><Pencil size={15}/>{t.edit}</button>
          <button type="button" onClick={() => setViewing(null)} className="app-btn-primary justify-center">{t.cancel}</button>
        </div>
      </div>
    </div>}

    {editing !== undefined && <ExpenseModal language={language} t={t} categories={categories} baseCurrency={baseCurrency} initial={editing} onAddCategory={addCategory} onClose={() => setEditing(undefined)} onSave={persistExpense}/>} 
    {deleting && <ConfirmModal t={t} onClose={() => setDeleting(null)} onConfirm={() => removeExpense(deleting)}/>} 
  </div>
}

function ExpenseModal({ language, t, categories, baseCurrency, initial, onAddCategory, onClose, onSave }: { language: Language; t: any; categories: string[]; baseCurrency: string; initial: Expense | null; onAddCategory: (name: string) => void; onClose: () => void; onSave: (expense: Expense) => boolean }) {
  const blank: Expense = { id: '', category: 'Miscellaneous', description: '', amount: 0, currency: baseCurrency, method: 'Cash', notes: '', date: today(), createdAt: '', updatedAt: '' }
  const [form, setForm] = useState<Expense>(initial ? { ...blank, ...initial } : blank)
  const [customMode, setCustomMode] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = old } }, [])
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.description.trim() || form.amount <= 0) { setError(t.required); return } ; if (!onSave(form)) setError(t.required) }
  const categoryOptions = categories.map((c) => ({ value: c, label: categoryLabels[c]?.[language] || c }))
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[1px]" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose() }}>
    <form onSubmit={submit} className="my-6 w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#334871] dark:bg-[#111827] dark:text-white">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold">{initial ? t.modalEdit : t.modalAdd}</h2><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button></div>
      <div className="space-y-3">
        <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t.category}</span>{customMode ? <div className="flex gap-2"><input autoFocus value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder={t.categoryName} className="form-control flex-1"/><button type="button" onClick={() => { const c = newCategory.trim(); if (!c) return; onAddCategory(c); setForm({ ...form, category: c }); setCustomMode(false); setNewCategory('') }} className="app-btn-primary">{t.addCategory}</button></div> : <div className="grid grid-cols-[1fr_auto] gap-2"><SelectBox value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={categoryOptions}/><button type="button" onClick={() => setCustomMode(true)} className="app-btn-secondary whitespace-nowrap">{t.customCategory}</button></div>}</label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t.description} *</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.descPh} className="form-control"/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold">{t.amount} *</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: num(e.target.value) })} className="form-control"/></label><label><span className="mb-1.5 block text-sm font-semibold">{t.currency}</span><SelectBox value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={currencies.map((c) => ({ value: c, label: c }))}/></label></div>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t.method}</span><SelectBox value={form.method} onChange={(v) => setForm({ ...form, method: v })} options={methods.map((m) => ({ value: m, label: methodLabels[m]?.[language] || m }))}/></label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t.date}</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-control"/></label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t.notes}</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t.notesPh} className="form-control min-h-[90px] resize-y"/></label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      </div>
      <div className="mt-5 flex gap-2"><button className="app-btn-primary flex-1">{t.save}</button><button type="button" onClick={onClose} className="app-btn-secondary">{t.cancel}</button></div>
    </form>
  </div>
}

function ConfirmModal({ t, onClose, onConfirm }: { t: any; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = old } }, [])
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4 backdrop-blur-[1px]" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose() }}><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#334871] dark:bg-[#111827] dark:text-white"><div className="flex items-start justify-between"><div><h3 className="text-lg font-extrabold">{t.deleteTitle}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{t.deleteMsg}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button></div><div className="mt-5 flex gap-2"><button type="button" onClick={onConfirm} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">{t.confirm}</button><button type="button" onClick={onClose} className="app-btn-secondary">{t.cancel}</button></div></div></div>
}
