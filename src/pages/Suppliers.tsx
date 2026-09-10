import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react'
import {
  Check, ChevronDown, DollarSign, Edit3, Plus, Printer, Search,
  Trash2, TrendingDown, TrendingUp, Truck, Users, X,
} from 'lucide-react'
import type { Language } from '../i18n'
import { supplierText } from '../i18n'
import { moveRecordToRecycleBin } from '../utils/recycleBin'
import { toast } from '../utils/toast'
import {
  calculateSupplierRowPaid,
  calculateSupplierSummaryByCurrency,
  roundSupplierMoney,
} from '../utils/supplierLedgerAccounting'

type Supplier = {
  id: string
  name: string
  phone: string
  businessType: string
  address: string
  currency: string
  items: string[]
  notes: string
  balance: number
  createdAt: string
}

type GodownRow = {
  id?: string
  productId?: string
  supplierId?: string
  quantity?: number | string
  purchase?: number | string
  selling?: number | string
  total?: number | string
  paid?: number | string
  currency?: string
}

type GodownEntry = {
  id: string
  supplierId?: string
  total?: number | string
  paid?: number | string
  currency?: string
  date?: string
  createdAt?: string
  rows?: GodownRow[]
  adjustments?: Array<{
    supplierId?: string
    amount?: number | string
    currency?: string
    type?: string
    balanceDelta?: number | string
    date?: string
  }>
}

const currencies = [
  ['AFN', '؋', 'Afghan Afghani'], ['USD', '$', 'US Dollar'], ['EUR', '€', 'Euro'],
  ['GBP', '£', 'British Pound'], ['SAR', 'ریال', 'Saudi Riyal'], ['PKR', 'Rs', 'Pakistani Rupee'],
  ['INR', '₹', 'Indian Rupee'], ['IRR', 'ریال', 'Iranian Rial'], ['AED', 'د.إ', 'UAE Dirham'],
  ['CNY', '¥', 'Chinese Yuan'],
] as const

const emptySupplier = (): Supplier => ({
  id: '', name: '', phone: '', businessType: '', address: '', currency: 'AFN',
  items: [], notes: '', balance: 0, createdAt: new Date().toISOString(),
})

function loadCollection<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const saveCollection = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
const money = (value: number, currency = 'AFN') => {
  const found = currencies.find(([code]) => code === currency)
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${found?.[1] ?? currency}`
}

export default function Suppliers({ language, onOpenSupplier, globalSearch = '' }: { language: Language, onOpenSupplier?: (supplierId: string) => void, globalSearch?: string }) {
  const t = supplierText[language]
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadCollection<Supplier[]>('suppliers', []))
  const [godownEntries] = useState<GodownEntry[]>(() => loadCollection<GodownEntry[]>('godownEntries', []))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Supplier>(emptySupplier)
  const [itemDraft, setItemDraft] = useState('')
  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'payable' | 'receivable' | 'settled'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all')
  const [printOpen, setPrintOpen] = useState(false)

  useEffect(() => {
    setSearch(globalSearch)
  }, [globalSearch])

  const supplierRows = useMemo(() => godownEntries.flatMap((entry) => {
    const rows = Array.isArray(entry.rows) ? entry.rows : []
    const billTotal = Number(entry.total || 0) || rows.reduce(
      (sum, row) => sum + (Number(row.total || 0) || Number(row.quantity || 0) * Number(row.purchase || 0)), 0,
    )
    const billPaid = Math.min(Math.max(0, Number(entry.paid || 0)), Math.max(0, billTotal))
    return rows.map((row) => {
      const total = Number(row.total || 0) || Number(row.quantity || 0) * Number(row.purchase || 0)
      const paid = calculateSupplierRowPaid({ rowTotal: total, rowPaid: row.paid, billPaid, billTotal })
      return {
        ...row,
        supplierId: row.supplierId || entry.supplierId || '',
        currency: row.currency || entry.currency || 'AFN',
        total,
        paid,
      }
    })
  }), [godownEntries])

  const adjustments = useMemo(() => godownEntries.flatMap((entry) =>
    (entry.adjustments || []).map((item) => ({ ...item, supplierId: item.supplierId || entry.supplierId || '' })),
  ), [godownEntries])

  const rows = useMemo(() => suppliers.map((supplier) => {
    const entries = supplierRows.filter((row) => String(row.supplierId) === String(supplier.id))
    const supplierAdjustments = adjustments.filter((row) => String(row.supplierId) === String(supplier.id))
    const summary = calculateSupplierSummaryByCurrency({ supplier, entries, adjustments: supplierAdjustments, baseCurrency: supplier.currency })
    const currencySummary = summary[supplier.currency] || Object.values(summary)[0]
    return {
      supplier,
      remaining: roundSupplierMoney(currencySummary?.remaining || 0),
      profit: roundSupplierMoney(currencySummary?.profit || 0),
    }
  }), [adjustments, supplierRows, suppliers])

  const filtered = useMemo(() => rows.filter(({ supplier, remaining }) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [supplier.name, supplier.phone, supplier.businessType, supplier.address, ...supplier.items]
      .some((value) => String(value || '').toLowerCase().includes(query))
    if (!matchesSearch) return false
    if (balanceFilter === 'payable' && remaining <= 0) return false
    if (balanceFilter === 'receivable' && remaining >= 0) return false
    if (balanceFilter === 'settled' && remaining !== 0) return false
    return true
  }), [balanceFilter, rows, search])

  const totals = useMemo(() => rows.reduce((acc, row) => {
    if (row.remaining > 0) acc.payable += row.remaining
    if (row.remaining < 0) acc.receivable += Math.abs(row.remaining)
    return acc
  }, { payable: 0, receivable: 0 }), [rows])

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptySupplier())
    setItemDraft('')
    setModalOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setDraft({ ...supplier, items: [...supplier.items] })
    setItemDraft('')
    setModalOpen(true)
  }

  const addItem = () => {
    const value = itemDraft.trim()
    if (!value || draft.items.includes(value)) return
    setDraft((current) => ({ ...current, items: [...current.items, value] }))
    setItemDraft('')
  }

  const onItemKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addItem()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    const record: Supplier = {
      ...draft,
      id: editingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `supplier-${Date.now()}`),
      name: draft.name.trim(),
      balance: Number(draft.balance || 0),
      createdAt: editingId ? draft.createdAt : new Date().toISOString(),
    }
    const next = editingId
      ? suppliers.map((item) => item.id === editingId ? record : item)
      : [record, ...suppliers]
    setSuppliers(next)
    saveCollection('suppliers', next)
    setModalOpen(false)
    toast.success(editingId ? t.edit : t.add, record.name)
  }

  const removeSupplier = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return
    const supplier = suppliers.find((item) => item.id === id)
    if (supplier) moveRecordToRecycleBin('suppliers', supplier, supplier.name)
    const next = suppliers.filter((item) => item.id !== id)
    setSuppliers(next)
    saveCollection('suppliers', next)
    toast.warning(t.delete, supplier?.name)
  }

  return (
    <div className="w-full pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172a57] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2047] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400">
            <Plus size={17} /> {t.createSupplier}
          </button>
          <button onClick={() => setPrintOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white dark:hover:bg-white/5">
            <Printer size={17} /> {t.print}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} title={t.totalSuppliers} value={String(suppliers.length)} />
        <SummaryCard icon={TrendingDown} title={t.totalPayable} value={money(totals.payable)} valueClass="text-red-500" />
        <SummaryCard icon={TrendingUp} title={t.totalReceivable} value={money(totals.receivable)} valueClass="text-emerald-500" />
        <SummaryCard icon={DollarSign} title={t.netBalance} value={money(totals.payable - totals.receivable)} />
      </div>

      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-[360px]">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#172a57] focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white rtl:pl-3 rtl:pr-10" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5 rounded-lg">
            {(['all', 'payable', 'receivable', 'settled'] as const).map((key) => (
              <button key={key} onClick={() => setBalanceFilter(key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${balanceFilter === key ? 'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-slate-200'}`}>
                {t.filters[key]}
              </button>
            ))}
          </div>
          <div className="relative">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)} className="h-10 min-w-[150px] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm outline-none dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white rtl:pl-9 rtl:pr-3">
              <option value="all">{t.dateFilters.all}</option>
              <option value="today">{t.dateFilters.today}</option>
              <option value="week">{t.dateFilters.week}</option>
              <option value="month">{t.dateFilters.month}</option>
              <option value="year">{t.dateFilters.year}</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-3 rtl:right-auto" />
          </div>
        </div>
      </div>

      <div className="app-panel mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#24365f] dark:bg-[#111a2c]">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-slate-300">
              <tr>
                <Th>{t.name}</Th><Th>{t.phone}</Th><Th>{t.address}</Th><Th>{t.currency}</Th><Th>{t.balance}</Th><Th>{t.status}</Th><Th>{t.profit}</Th><Th>{t.actions}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24365f]">
              {filtered.map(({ supplier, remaining, profit }) => (
                <tr key={supplier.id} onClick={() => onOpenSupplier?.(supplier.id)} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <Td><div className="font-semibold text-slate-900 dark:text-white">{supplier.name}</div><div className="mt-0.5 text-xs text-slate-400">{supplier.businessType || '—'}</div></Td>
                  <Td>{supplier.phone || '—'}</Td><Td>{supplier.address || '—'}</Td><Td>{supplier.currency}</Td>
                  <Td><span className={remaining > 0 ? 'font-bold text-red-500' : remaining < 0 ? 'font-bold text-emerald-500' : 'font-semibold'}>{money(Math.abs(remaining), supplier.currency)}</span></Td>
                  <Td><StatusPill remaining={remaining} t={t} /></Td><Td>{money(profit, supplier.currency)}</Td>
                  <Td><div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); openEdit(supplier) }} className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10" aria-label={t.edit}><Edit3 size={15} /></button><button onClick={(e) => { e.stopPropagation(); removeSupplier(supplier.id) }} className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label={t.delete}><Trash2 size={15} /></button></div></Td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="h-28 text-center text-sm text-slate-400">{t.noSuppliers}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 p-3 sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <form onSubmit={submit} className="my-auto w-full max-w-[520px] rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#24365f] dark:bg-[#101827] dark:text-white sm:p-6">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-extrabold">{editingId ? t.editSupplier : t.createSupplier}</h2><button type="button" onClick={() => setModalOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button></div>
            <div className="mt-5 space-y-4">
              <Field label={`${t.name} *`}><input autoFocus required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t.namePlaceholder} className="form-control" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label={t.phone}><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="form-control" /></Field><Field label={t.businessType}><input value={draft.businessType} onChange={(e) => setDraft({ ...draft, businessType: e.target.value })} placeholder={t.businessPlaceholder} className="form-control" /></Field></div>
              <Field label={t.address}><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="form-control" /></Field>
              <Field label={t.currency}><select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className="form-control">{currencies.map(([code, symbol, label]) => <option key={code} value={code}>{symbol} {label}</option>)}</select></Field>
              <Field label={t.items}><div className="flex gap-2"><input value={itemDraft} onChange={(e) => setItemDraft(e.target.value)} onKeyDown={onItemKey} placeholder={t.itemsPlaceholder} className="form-control" /><button type="button" onClick={addItem} className="h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold dark:border-[#24365f]">{t.add}</button></div>{draft.items.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{draft.items.map((item) => <button type="button" key={item} onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x !== item) })} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-white/10">{item}<X size={12} /></button>)}</div>}</Field>
              <Field label={t.notes}><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder={t.notesPlaceholder} className="form-control min-h-[80px] resize-none py-2" /></Field>
              <Field label={t.openingBalance}><input type="number" step="0.01" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: Number(e.target.value) })} className="form-control" /><p className="mt-1.5 text-[11px] text-slate-400">{t.openingHint}</p></Field>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold dark:border-[#24365f]">{t.cancel}</button><button type="submit" className="h-10 rounded-lg bg-[#172a57] px-4 text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">{editingId ? t.save : t.createSupplier}</button></div>
          </form>
        </div>
      )}

      {printOpen && <PrintPreview language={language} suppliers={filtered} totals={totals} onClose={() => setPrintOpen(false)} />}
    </div>
  )
}

function SummaryCard({ icon: Icon, title, value, valueClass = '' }: { icon: typeof Truck, title: string, value: string, valueClass?: string }) {
  return <div className="app-panel flex min-h-[100px] items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#24365f] dark:bg-[#111a2c]"><div><div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</div><div className={`mt-2 text-2xl font-extrabold ${valueClass}`}>{value}</div></div><Icon size={18} className="mt-1 text-slate-500 dark:text-slate-300" /></div>
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 text-start text-xs font-bold">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{children}</td> }
function Field({ label, children }: { label: string, children: React.ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-1.5 block">{label}</span>{children}</label> }
function StatusPill({ remaining, t }: { remaining: number, t: (typeof supplierText)[Language] }) { const label = remaining > 0 ? t.payable : remaining < 0 ? t.receivable : t.settled; const cls = remaining > 0 ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : remaining < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span> }

function PrintPreview({ language, suppliers, totals, onClose }: { language: Language, suppliers: Array<{ supplier: Supplier, remaining: number, profit: number }>, totals: { payable: number, receivable: number }, onClose: () => void }) {
  const t = supplierText[language]
  const isRtl = language !== 'English'
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/75 p-3 sm:p-6"><div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-slate-100 shadow-2xl dark:bg-[#0c1424]"><div className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-[#24365f] dark:bg-[#101827]"><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><X size={17} /></button><button onClick={() => window.print()} className="inline-flex h-8 items-center gap-2 rounded-md bg-[#172a57] px-3 text-xs font-bold text-white dark:bg-amber-500 dark:text-slate-950"><Printer size={14} /> {t.print}</button><div className="ml-auto text-sm font-bold rtl:ml-0 rtl:mr-auto">{t.report}</div></div><div className="p-4 sm:p-8"><section dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto min-h-[700px] max-w-[760px] bg-white p-8 text-slate-900 shadow-lg print:max-w-none print:shadow-none"><div className="border-b-4 border-teal-600 pb-5"><div className="text-2xl font-black">Pharma Pro</div><div className="text-xs text-slate-500">PHARMA MANAGEMENT SYSTEM</div></div><div className="mt-8"><div className="text-xs font-bold text-slate-500">REPORT</div><h2 className="mt-1 text-2xl font-black">{t.report}</h2><p className="mt-1 text-xs text-slate-500">{t.subtitle}</p></div><div className="mt-5 grid grid-cols-3 gap-2"><ReportBox label={t.totalSuppliers} value={String(suppliers.length)} /><ReportBox label={t.totalPayable} value={money(totals.payable)} /><ReportBox label={t.totalReceivable} value={money(totals.receivable)} /></div><div className="mt-5 overflow-hidden rounded border border-slate-200"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-2 text-start">{t.name}</th><th className="p-2 text-start">{t.phone}</th><th className="p-2 text-start">{t.balance}</th><th className="p-2 text-start">{t.status}</th></tr></thead><tbody>{suppliers.map(({supplier, remaining}) => <tr key={supplier.id} className="border-t"><td className="p-2">{supplier.name}</td><td className="p-2">{supplier.phone || '—'}</td><td className="p-2">{money(Math.abs(remaining), supplier.currency)}</td><td className="p-2">{remaining > 0 ? t.payable : remaining < 0 ? t.receivable : t.settled}</td></tr>)}{!suppliers.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">{t.noSuppliers}</td></tr>}</tbody></table></div></section></div></div></div>
}
function ReportBox({ label, value }: { label: string, value: string }) { return <div className="rounded border border-slate-300 p-3"><div className="text-[10px] text-slate-500">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div> }
