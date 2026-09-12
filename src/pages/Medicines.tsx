import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import {
  Box, CalendarDays, Check, ChevronDown, Copy, Edit3, Eye, Package,
  Pill, Plus, Printer, RefreshCcw, Search, Trash2, WalletCards, X,
} from 'lucide-react'
import type { Language } from '../i18n'
import { medicineCategoryLabels, medicineText, medicineUnitLabels } from '../i18n'
import { barcodeDataUri, generateBarcodeValue } from '../utils/barcode'
import { calculateWeightedAverageCost } from '../utils/inventoryCosting'
import { moveRecordToRecycleBin } from '../utils/recycleBin'
import { toast } from '../utils/toast'

function BarcodeIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 5v14" />
      <path d="M6 5v14" />
      <path d="M10 5v14" />
      <path d="M13 5v14" />
      <path d="M17 5v14" />
      <path d="M21 5v14" />
    </svg>
  )
}

function QrIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/>
      <path d="M15 15h2v2h-2zM19 15h2v4h-2zM15 19h2v2h-2zM19 21h2"/>
    </svg>
  )
}

type Product = {
  id: string
  name: string
  brandName: string
  strength: string
  batchNo: string
  manufacturer: string
  prescriptionRequired: boolean
  packHierarchyEnabled: boolean
  packHierarchy: { stripsPerBox: number; tabletsPerStrip: number; stripSelling: number; tabletSelling: number; boxLabel: string; stripLabel: string; unitLabel: string }
  code: string
  barcode: string
  category: string
  purchase: number
  selling: number
  expiry: string
  alertBefore: number
  lowStock: number
  quantity: number
  unit: string
  currency: string
  supplierId: string
  notes: string
  createdAt: string
  updatedAt: string
}

type Supplier = {
  id: string
  name: string
  supplierName?: string
  phone?: string
  businessType?: string
  address?: string
  currency?: string
  items?: string[]
  notes?: string
  balance?: number
  openingBalance?: number
  createdAt?: string
}

type GodownEntry = {
  id: string
  type: 'import'
  movementType: 'Purchase'
  date: string
  currency: string
  supplierId: string
  supplierName: string
  total: number
  paid: number
  remaining: number
  source: string
  referenceId: string
  rows: Array<{ id: string; productId: string; name: string; code: string; category: string; quantity: number; unit: string; purchase: number; selling: number; currency: string; supplierId: string }>
  createdAt: string
  updatedAt: string
}

type SupplierPurchase = {
  id: string
  supplierId: string
  supplierName: string
  referenceNumber: string
  invoiceNumber: string
  purchaseDate: string
  date: string
  productId: string
  deviceName: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  currency: string
  totalPurchaseValue: number
  paidAmount: number
  remainAmount: number
  status: 'Paid' | 'Partial' | 'Unpaid'
  notes: string
  source: string
  createdAt: string
  updatedAt: string
}

type StockStatus = 'active' | 'low' | 'out' | 'expiring' | 'expired'
type StockFilter = 'all' | StockStatus

type Draft = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

const baseCategories = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Vial', 'Ampoule', 'Drops', 'Eye Drops', 'Ear Drops', 'Nasal Drops', 'Cream', 'Ointment', 'Gel', 'Lotion', 'Powder', 'Sachet', 'Inhaler', 'Spray', 'Suppository', 'IV Fluid', 'Antibiotic', 'Analgesic', 'Antipyretic', 'Antacid', 'Vitamin', 'Supplement', 'First Aid', 'Medical Device', 'Other']
const baseUnits = ['Box (box)', 'Pack (pack)', 'Strip (strip)', 'Blister (blister)', 'Tablet (tablet)', 'Capsule (capsule)', 'Bottle (bottle)', 'Vial (vial)', 'Ampoule (ampoule)', 'Tube (tube)', 'Sachet (sachet)', 'Bag (bag)', 'Can (can)', 'Jar (jar)', 'Roll (roll)', 'Kit (kit)', 'Set (set)', 'Pair (pair)', 'Dozen (12) (dozen)', 'Pieces', 'Unit (unit)', 'Milligram (mg)', 'Gram (g)', 'Kilogram (kg)', 'Milliliter (ml)', 'Liter (L)']
const currencies = ['AFN', 'USD', 'EUR', 'GBP', 'SAR', 'PKR', 'INR', 'IRR', 'AED', 'CNY']
const alertOptions = [7, 14, 30, 60, 90, 180, 365]

const emptyDraft = (): Draft => ({
  name: '', brandName: '', strength: '', batchNo: '', manufacturer: '', prescriptionRequired: false,
  packHierarchyEnabled: false, packHierarchy: { stripsPerBox: 10, tabletsPerStrip: 3, stripSelling: 0, tabletSelling: 0, boxLabel: 'Box', stripLabel: 'Strip', unitLabel: 'Tablet' },
  code: '', barcode: '', category: 'Tablet', purchase: 0, selling: 0, expiry: '', alertBefore: 30,
  lowStock: 0, quantity: 0, unit: 'Box (box)', currency: 'AFN', supplierId: '', notes: '',
})

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage may be unavailable */ }
}

const asText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    for (const key of ['name', 'label', 'value', 'unit', 'category', 'title']) {
      if (typeof item[key] === 'string' && item[key]) return item[key] as string
    }
  }
  return fallback
}

const normalizeStringCollection = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback
  const result = value.map((item) => asText(item)).filter(Boolean)
  return result.length ? Array.from(new Set(result)) : fallback
}

const normalizeProduct = (raw: unknown, index: number): Product => {
  const item = raw && typeof raw === 'object' ? raw as Record<string, any> : {}
  const hierarchy = item.packHierarchy && typeof item.packHierarchy === 'object' ? item.packHierarchy : {}
  const now = new Date().toISOString()
  return {
    id: asText(item.id, `product-${index}-${asText(item.code) || Date.now()}`),
    name: asText(item.name || item.deviceName || item.productName, 'Unnamed Product'),
    brandName: asText(item.brandName),
    strength: asText(item.strength),
    batchNo: asText(item.batchNo || item.batch),
    manufacturer: asText(item.manufacturer),
    prescriptionRequired: Boolean(item.prescriptionRequired),
    packHierarchyEnabled: Boolean(item.packHierarchyEnabled),
    packHierarchy: {
      stripsPerBox: Math.max(1, n(hierarchy.stripsPerBox) || 10),
      tabletsPerStrip: Math.max(1, n(hierarchy.tabletsPerStrip) || 10),
      stripSelling: Math.max(0, n(hierarchy.stripSelling)),
      tabletSelling: Math.max(0, n(hierarchy.tabletSelling)),
      boxLabel: asText(hierarchy.boxLabel, 'Box'),
      stripLabel: asText(hierarchy.stripLabel, 'Strip'),
      unitLabel: asText(hierarchy.unitLabel, 'Tablet'),
    },
    code: asText(item.code || item.assetId || item.productCode),
    barcode: asText(item.barcode),
    category: asText(item.category, 'Tablet'),
    purchase: Math.max(0, n(item.purchase ?? item.purchasePrice ?? item.cost)),
    selling: Math.max(0, n(item.selling ?? item.sellingPrice ?? item.salePrice)),
    expiry: asText(item.expiry || item.expiryDate),
    alertBefore: Math.max(1, n(String(item.alertBefore ?? 30).match(/\d+/)?.[0] ?? 30)),
    lowStock: Math.max(0, n(item.lowStock ?? item.lowStockLimit ?? item.minimumStock)),
    quantity: Math.max(0, n(item.quantity ?? item.stock ?? item.qty)),
    unit: asText(item.unit, 'Box (box)'),
    currency: asText(item.currency, 'AFN'),
    supplierId: asText(item.supplierId || item.supplier),
    notes: asText(item.notes),
    createdAt: asText(item.createdAt || item.date, now),
    updatedAt: asText(item.updatedAt, now),
  }
}

const normalizeSupplier = (raw: unknown, index: number): Supplier => {
  const item = raw && typeof raw === 'object' ? raw as Record<string, any> : {}
  const name = asText(item.supplierName || item.companyName || item.name, `Supplier ${index + 1}`)
  return {
    ...item,
    id: asText(item.id, `supplier-${index}`),
    name,
    supplierName: name,
    phone: asText(item.phone),
    businessType: asText(item.businessType),
    address: asText(item.address),
    currency: asText(item.currency, 'AFN'),
    items: Array.isArray(item.items) ? item.items.map((x: unknown) => asText(x)).filter(Boolean) : [],
    notes: asText(item.notes),
    balance: n(item.balance ?? item.openingBalance),
    openingBalance: n(item.openingBalance ?? item.balance),
    createdAt: asText(item.createdAt),
  }
}

const n = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const money = (value: number, currency = 'AFN') => `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === 'AFN' ? '؋' : currency}`
const inputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const supplierName = (supplier?: Supplier) => supplier?.supplierName || supplier?.name || ''
const readCompanyName = () => {
  try {
    const raw = JSON.parse(localStorage.getItem('settings') || '[]')
    const settings = Array.isArray(raw) ? raw[0] || {} : raw || {}
    return String(settings.companyName || settings.companyNameDari || settings.companyNamePashto || 'Smart Pharma').trim() || 'Smart Pharma'
  } catch {
    return 'Smart Pharma'
  }
}

const localizeCategory = (value: string, language: Language) => (medicineCategoryLabels[language] as Record<string, string>)[value] || value
const localizeUnit = (value: string, language: Language) => (medicineUnitLabels[language] as Record<string, string>)[value] || value
const notifyDataChanged = () => window.dispatchEvent(new CustomEvent('pharma:data-changed'))

const walletCopy = {
  English: {
    pay: 'Pay from Cash Wallet',
    balance: 'Current balance',
    amount: 'Cash Wallet payment',
    of: 'of',
    canGoNegative: 'Payment is allowed even if the wallet balance becomes negative.',
    overTotal: 'Cash Wallet payment cannot be greater than the purchase total.',
  },
  دری: {
    pay: 'پرداخت از Cash Wallet',
    balance: 'موجودی فعلی',
    amount: 'مبلغ پرداخت از Cash Wallet',
    of: 'از',
    canGoNegative: 'حتی اگر موجودی کافی نباشد، پرداخت انجام می‌شود و همان واحد پول منفی می‌گردد.',
    overTotal: 'مبلغ پرداخت از Cash Wallet نمی‌تواند بیشتر از مجموع خرید باشد.',
  },
  پښتو: {
    pay: 'له Cash Wallet څخه تادیه',
    balance: 'اوسنی موجودي',
    amount: 'د Cash Wallet تادیه',
    of: 'له',
    canGoNegative: 'که موجودي کافي هم نه وي، تادیه کېږي او هماغه اسعار منفي کېږي.',
    overTotal: 'د Cash Wallet تادیه د پېرود له ټول مبلغ څخه زیاته کېدای نشي.',
  },
} as const

function cashWalletBalance(currency: string) {
  const code = String(currency || 'AFN').toUpperCase()
  const sameCurrency = (item: any) => String(item?.currency || 'AFN').toUpperCase() === code
  const invoices = load<any[]>('billingInvoices', []).filter(sameCurrency)
  const expenses = load<any[]>('expenses', []).filter(sameCurrency)
  const transactions = load<any[]>('transactions', []).filter(sameCurrency)

  const paidSales = invoices.reduce((sum, inv) => sum + n(inv.paidAmount ?? inv.paid), 0)
  const expenseOut = expenses.reduce((sum, item) => sum + n(item.amountBase ?? item.amount ?? item.total), 0)

  const txDelta = transactions.reduce((sum, tx) => {
    const type = String(tx.transactionType || tx.type || '').toLowerCase()
    const amount = n(tx.amount)
    return sum + (type === 'withdraw' || type === 'expense' ? -amount : amount)
  }, 0)

  // Sales already contribute through invoice paid amounts, so ignore billing deposits
  // from transactions to avoid double-counting them in this small form preview.
  const billingDepositDuplicate = transactions
    .filter((tx) => String(tx.referenceSource || '') === 'billing-payment')
    .reduce((sum, tx) => sum + n(tx.amount), 0)

  // Expenses are already counted above. Salary/Godown/medicine wallet withdrawals are
  // transaction-only here, so they remain part of txDelta.
  const expenseTransactionDuplicates = transactions
    .filter((tx) => {
      const source = String(tx.source || '')
      const module = String(tx.module || '')
      return source === 'expenses' || module === 'expenses'
    })
    .reduce((sum, tx) => sum + n(tx.amount), 0)

  return round(paidSales - expenseOut + txDelta - billingDepositDuplicate + expenseTransactionDuplicates)
}

function FilterSelect({ value, onChange, options, ariaLabel, className = '' }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; ariaLabel: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? options[0]
  return (
    <div className={`relative min-w-0 ${className}`}>
      <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#30456f] dark:bg-[#0d1628] dark:text-slate-100 dark:hover:border-[#49608c] dark:focus:ring-amber-400/20">
        <span className="truncate">{selected?.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <>
        <button type="button" aria-label="Close filter menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
        <div className="absolute start-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#101a2d]">
          {options.map((option) => {
            const active = option.value === value
            return <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false) }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${active ? 'bg-amber-500 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'}`}>
              <span className="grid h-4 w-4 place-items-center">{active && <Check size={15}/>}</span>
              <span className="whitespace-nowrap">{option.label}</span>
            </button>
          })}
        </div>
      </>}
    </div>
  )
}

function simpleStockStatus(product: Product): 'active' | 'out' {
  return product.quantity > 0 ? 'active' : 'out'
}

function stockDisplay(product: Product, language: Language) {
  const quantity = Math.max(0, n(product.quantity))
  if (!product.packHierarchyEnabled) return `${round(quantity)} ${localizeUnit(product.unit, language)}`
  const stripsPerBox = Math.max(1, n(product.packHierarchy?.stripsPerBox) || 1)
  const tabletsPerStrip = Math.max(1, n(product.packHierarchy?.tabletsPerStrip) || 1)
  const boxes = round(quantity)
  const strips = round(quantity * stripsPerBox)
  const tablets = round(quantity * stripsPerBox * tabletsPerStrip)
  const boxLabel = product.packHierarchy?.boxLabel || 'Box'
  const stripLabel = product.packHierarchy?.stripLabel || 'Strip'
  const unitLabel = product.packHierarchy?.unitLabel || 'Tablet'
  return `${boxes} ${localizeUnit(boxLabel, language)} · ${strips} ${localizeUnit(stripLabel, language)} · ${tablets} ${localizeUnit(unitLabel, language)}`
}

function statusOf(product: Product): StockStatus {
  const today = new Date(`${inputDate(new Date())}T12:00:00`)
  if (product.expiry) {
    const expiry = new Date(`${product.expiry}T12:00:00`)
    if (expiry < today) return 'expired'
    const alert = new Date(expiry)
    alert.setDate(alert.getDate() - Math.max(1, n(product.alertBefore) || 30))
    if (today >= alert) return 'expiring'
  }
  if (product.lowStock > 0 && product.quantity <= product.lowStock) return 'low'
  if (product.quantity <= 0) return 'out'
  return 'active'
}

function inTimeRange(product: Product, filter: string, from: string, to: string) {
  if (filter === 'all') return true
  const date = new Date(product.createdAt)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (filter === 'today') return date >= startToday
  if (filter === 'week') { const start = new Date(startToday); start.setDate(start.getDate() - 6); return date >= start }
  if (filter === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  if (filter === 'year') return date.getFullYear() === now.getFullYear()
  if (filter === 'custom') {
    const fromDate = from ? new Date(`${from}T00:00:00`) : null
    const toDate = to ? new Date(`${to}T23:59:59`) : null
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
  }
  return true
}

export default function Medicines({ language, globalSearch = '' }: { language: Language; globalSearch?: string }) {
  const t = medicineText[language] ?? medicineText.English
  const [products, setProducts] = useState<Product[]>(() => {
    const raw = load<unknown>('products', [])
    return Array.isArray(raw) ? raw.map(normalizeProduct) : []
  })
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const raw = load<unknown>('suppliers', [])
    return Array.isArray(raw) ? raw.map(normalizeSupplier) : []
  })
  const [categories, setCategories] = useState<string[]>(() => Array.from(new Set([...baseCategories, ...normalizeStringCollection(load<unknown>('productCategories', []), [])])))
  const [units, setUnits] = useState<string[]>(() => Array.from(new Set([...baseUnits, ...normalizeStringCollection(load<unknown>('productUnits', []), [])])))
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [margin, setMargin] = useState('')
  const [categoryNew, setCategoryNew] = useState('')
  const [showCategoryAdd, setShowCategoryAdd] = useState(false)
  const [unitNew, setUnitNew] = useState('')
  const [showUnitAdd, setShowUnitAdd] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [supplierDraft, setSupplierDraft] = useState({ name: '', phone: '', businessType: '', address: '', currency: 'AFN', item: '', items: [] as string[], notes: '', balance: 0 })
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [barcodeTemplate, setBarcodeTemplate] = useState('a4-50x25')
  const [barcodeCopies, setBarcodeCopies] = useState(1)
  const [customWidth, setCustomWidth] = useState(50)
  const [customHeight, setCustomHeight] = useState(25)
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null)
  const [formError, setFormError] = useState('')
  const [formCodeMode, setFormCodeMode] = useState<'barcode' | 'qr'>('barcode')
  const [formCodePreviewOpen, setFormCodePreviewOpen] = useState(false)
  const [cashPayEnabled, setCashPayEnabled] = useState(false)
  const [cashPayAmount, setCashPayAmount] = useState('0')

  useEffect(() => {
    setSearch(globalSearch)
  }, [globalSearch])

  const filterCategories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [products])
  useEffect(() => {
    if (categoryFilter !== 'all' && !filterCategories.includes(categoryFilter)) setCategoryFilter('all')
  }, [categoryFilter, filterCategories])

  const filtered = useMemo(() => products.filter((product) => {
    const q = search.trim().toLowerCase()
    const supplier = suppliers.find((s) => String(s.id) === String(product.supplierId))
    const searchable = [product.name, product.brandName, product.strength, product.batchNo, product.manufacturer, product.code, product.barcode, product.category, product.unit, supplierName(supplier)].join(' ').toLowerCase()
    if (q && !searchable.includes(q)) return false
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
    const status = simpleStockStatus(product)
    if (stockFilter !== 'all' && status !== stockFilter) return false
    if (!inTimeRange(product, timeFilter, dateFrom, dateTo)) return false
    return true
  }), [categoryFilter, dateFrom, dateTo, products, search, stockFilter, suppliers, timeFilter])

  const openAdd = () => {
    setEditingId(null); setDraft(emptyDraft()); setMargin(''); setFormError(''); setFormCodeMode('barcode'); setFormCodePreviewOpen(false); setCashPayEnabled(false); setCashPayAmount('0'); setFormOpen(true)
  }
  const openEdit = (product: Product) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = product
    const ref = `product-purchase-${product.id}`
    const existingWalletTx = load<any[]>('transactions', []).find((tx) => tx.source === 'product-registration-wallet' && tx.referenceId === ref)
    const existingPaid = Math.max(0, n(existingWalletTx?.amount))
    setEditingId(product.id); setDraft(rest); setMargin(''); setFormError(''); setFormCodeMode('barcode'); setFormCodePreviewOpen(false); setCashPayEnabled(existingPaid > 0); setCashPayAmount(String(existingPaid || 0)); setFormOpen(true); setMenu(null)
  }

  const addCategory = () => {
    const name = categoryNew.trim(); if (!name) return
    const next = categories.some((x) => x.toLowerCase() === name.toLowerCase()) ? categories : [...categories, name]
    setCategories(next); save('productCategories', next); setDraft((d) => ({ ...d, category: name })); setCategoryNew(''); setShowCategoryAdd(false)
  }
  const addUnit = () => {
    const name = unitNew.trim(); if (!name) return
    const next = units.some((x) => x.toLowerCase() === name.toLowerCase()) ? units : [...units, name]
    setUnits(next); save('productUnits', next); setDraft((d) => ({ ...d, unit: name })); setUnitNew(''); setShowUnitAdd(false)
  }

  const generateCode = () => {
    const max = products.reduce((m, p) => { const hit = p.code.match(/^MED-(\d+)$/i); return hit ? Math.max(m, Number(hit[1])) : m }, 0)
    return `MED-${String(max + 1).padStart(4, '0')}`
  }

  const applyMargin = () => {
    const pct = n(margin); const purchase = n(draft.purchase)
    setDraft((d) => ({ ...d, selling: round(purchase * (1 + pct / 100)) }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError('')
    const name = draft.name.trim()
    if (!name) { setFormError(t.nameRequired); return }
    const code = draft.code.trim()
    if (code && products.some((p) => p.id !== editingId && p.code.trim().toLowerCase() === code.toLowerCase())) { setFormError(t.duplicateCode); return }
    const barcode = draft.barcode.trim()
    if (barcode && products.some((p) => p.id !== editingId && p.barcode.trim().toLowerCase() === barcode.toLowerCase())) { setFormError(t.duplicateBarcode); return }
    const now = new Date().toISOString()
    const existing = products.find((p) => p.id === editingId)
    const id = editingId || `product-${Date.now()}`
    const product: Product = {
      ...draft, id, name, code, barcode, brandName: draft.brandName.trim(), strength: draft.strength.trim(), batchNo: draft.batchNo.trim(), manufacturer: draft.manufacturer.trim(),
      purchase: Math.max(0, n(draft.purchase)), selling: Math.max(0, n(draft.selling)), quantity: Math.max(0, n(draft.quantity)), lowStock: Math.max(0, n(draft.lowStock)),
      alertBefore: Math.max(1, n(draft.alertBefore) || 30), unit: draft.packHierarchyEnabled ? 'Box (box)' : draft.unit,
      packHierarchy: { stripsPerBox: Math.max(1, n(draft.packHierarchy.stripsPerBox) || 10), tabletsPerStrip: Math.max(1, n(draft.packHierarchy.tabletsPerStrip) || 3), stripSelling: Math.max(0, n(draft.packHierarchy.stripSelling)), tabletSelling: Math.max(0, n(draft.packHierarchy.tabletSelling)), boxLabel: draft.packHierarchy.boxLabel.trim() || 'Box', stripLabel: draft.packHierarchy.stripLabel.trim() || 'Strip', unitLabel: draft.packHierarchy.unitLabel.trim() || 'Tablet' },
      createdAt: existing?.createdAt || now, updatedAt: now,
    }
    const purchaseTotal = round(product.quantity * product.purchase)
    const requestedCashPayment = cashPayEnabled ? round(Math.max(0, n(cashPayAmount))) : 0
    const wc = walletCopy[language] ?? walletCopy.English
    if (requestedCashPayment > purchaseTotal) { setFormError(wc.overTotal); return }

    let nextProducts = editingId ? products.map((p) => p.id === editingId ? product : p) : [product, ...products]
    saveProductLinkedRecords(product, existing, requestedCashPayment)
    const entries = load<GodownEntry[]>('godownEntries', [])
    if (product.quantity > 0) {
      const weighted = calculateWeightedAverageCost(product.id, entries, product.purchase)
      nextProducts = nextProducts.map((p) => p.id === product.id ? { ...p, purchase: weighted } : p)
    }
    setProducts(nextProducts); save('products', nextProducts); notifyDataChanged(); setFormOpen(false); toast.success(editingId ? t.edit : t.add, product.name)
  }

  const saveProductLinkedRecords = (product: Product, _previous?: Product, cashPaid = 0) => {
    const now = new Date().toISOString(); const date = now.slice(0, 10); const ref = `product-purchase-${product.id}`
    const supplier = suppliers.find((s) => String(s.id) === String(product.supplierId))
    const total = round(product.quantity * product.purchase)
    let entries = load<GodownEntry[]>('godownEntries', []).filter((e) => e.referenceId !== ref)
    if (product.quantity > 0) {
      const entry: GodownEntry = {
        id: `godown-${product.id}`, type: 'import', movementType: 'Purchase', date, currency: product.currency, supplierId: product.supplierId,
        supplierName: supplierName(supplier), total, paid: Math.min(cashPaid, total), remaining: Math.max(0, total - Math.min(cashPaid, total)), source: 'product-registration', referenceId: ref,
        rows: [{ id: `godown-row-${product.id}`, productId: product.id, name: product.name, code: product.code, category: product.category, quantity: product.quantity, unit: product.unit, purchase: product.purchase, selling: product.selling, currency: product.currency, supplierId: product.supplierId }],
        createdAt: now, updatedAt: now,
      }
      entries = [entry, ...entries]
    }
    save('godownEntries', entries)

    let purchases = load<SupplierPurchase[]>('supplierPurchases', []).filter((p) => p.id !== ref)
    if (supplier && product.quantity > 0) {
      purchases = [{
        id: ref, supplierId: supplier.id, supplierName: supplierName(supplier), referenceNumber: product.code, invoiceNumber: product.code, purchaseDate: date, date,
        productId: product.id, deviceName: product.name, category: product.category, quantity: product.quantity, unit: product.unit, unitPrice: product.purchase, currency: product.currency,
        totalPurchaseValue: total, paidAmount: Math.min(cashPaid, total), remainAmount: Math.max(0, total - Math.min(cashPaid, total)), status: total <= 0 || cashPaid >= total ? 'Paid' : cashPaid > 0 ? 'Partial' : 'Unpaid', notes: product.notes || 'Medicine registration purchase', source: 'product-registration', createdAt: now, updatedAt: now,
      }, ...purchases]
    }
    save('supplierPurchases', purchases)

    let transactions = load<any[]>('transactions', []).filter(
      (tx) => !(tx.source === 'product-registration-wallet' && tx.referenceId === ref)
    )
    const paid = Math.min(Math.max(0, cashPaid), total)
    if (paid > 0) {
      transactions = [{
        id: `medicine-wallet-${product.id}`,
        type: 'expense',
        transactionType: 'withdraw',
        category: 'Cash Wallet',
        title: `Medicine purchase — ${product.name}`,
        description: product.notes || `Cash payment for ${product.name}`,
        amount: paid,
        currency: product.currency,
        date,
        createdAt: now,
        updatedAt: now,
        source: 'product-registration-wallet',
        referenceSource: 'product-registration',
        referenceId: ref,
        productId: product.id,
        supplierId: product.supplierId,
      }, ...transactions]
    }
    save('transactions', transactions)
    window.dispatchEvent(new CustomEvent('cash-wallet-updated', {
      detail: { referenceId: ref, amount: paid, currency: product.currency }
    }))
  }

  const requestRemove = (product: Product) => {
    setMenu(null)
    setDeleteProduct(product)
  }

  const confirmRemove = () => {
    const product = deleteProduct
    if (!product) return
    const next = products.filter((p) => p.id !== product.id); setProducts(next); save('products', next)
    const ref = `product-purchase-${product.id}`
    const godownEntries = load<GodownEntry[]>('godownEntries', [])
    const supplierPurchases = load<SupplierPurchase[]>('supplierPurchases', [])
    moveRecordToRecycleBin('products', product, product.name, {
      relatedGodownEntries: godownEntries.filter((e) => e.referenceId === ref),
      relatedSupplierPurchases: supplierPurchases.filter((p) => p.id === ref),
    })
    save('godownEntries', godownEntries.filter((e) => e.referenceId !== ref))
    save('supplierPurchases', supplierPurchases.filter((p) => p.id !== ref))
    const transactions = load<any[]>('transactions', [])
    save('transactions', transactions.filter((tx) => !(tx.source === 'product-registration-wallet' && tx.referenceId === ref)))
    setDeleteProduct(null)
    notifyDataChanged()
    toast.warning(t.delete, product.name)
  }

  const createSupplier = (event: FormEvent) => {
    event.preventDefault(); const name = supplierDraft.name.trim(); if (!name) return
    const supplier: Supplier = { id: `supplier-${Date.now()}`, name, supplierName: name, phone: supplierDraft.phone.trim(), businessType: supplierDraft.businessType.trim(), address: supplierDraft.address.trim(), currency: supplierDraft.currency || draft.currency, items: supplierDraft.items, notes: supplierDraft.notes.trim(), balance: n(supplierDraft.balance), openingBalance: n(supplierDraft.balance), createdAt: new Date().toISOString() }
    const next = [supplier, ...suppliers]; setSuppliers(next); save('suppliers', next); notifyDataChanged(); setDraft((d) => ({ ...d, supplierId: supplier.id })); setSupplierOpen(false)
    setSupplierDraft({ name: '', phone: '', businessType: '', address: '', currency: draft.currency, item: '', items: [], notes: '', balance: 0 })
  }

  const addSupplierItem = () => {
    const item = supplierDraft.item.trim(); if (!item || supplierDraft.items.includes(item)) return
    setSupplierDraft((s) => ({ ...s, item: '', items: [...s.items, item] }))
  }
  const supplierItemKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') { event.preventDefault(); addSupplierItem() } }

  const printReport = () => {
    const rows = filtered.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.code || '-')}</td><td>${escapeHtml(p.category)}</td><td>${money(p.purchase, p.currency)}</td><td>${money(p.selling, p.currency)}</td><td>${money(p.selling - p.purchase, p.currency)}</td><td>${escapeHtml(stockDisplay(p, language))}</td><td>${statusLabel(simpleStockStatus(p), t)}</td></tr>`).join('')
    printHtml(`<h1>${t.title}</h1><p>${t.subtitle}</p><table><thead><tr><th>${t.name}</th><th>${t.code}</th><th>${t.category}</th><th>${t.purchase}</th><th>${t.selling}</th><th>${t.profit}</th><th>${t.stock}</th><th>${t.status}</th></tr></thead><tbody>${rows || `<tr><td colspan="8">${t.noneTitle}</td></tr>`}</tbody></table>`, t.printReport)
  }

  const copyBarcode = async () => { if (barcodeProduct?.barcode) await navigator.clipboard?.writeText(barcodeProduct.barcode) }
  const printBarcode = async () => {
    if (!barcodeProduct) return
    const value = barcodeProduct.barcode || barcodeProduct.code || barcodeProduct.name
    const dimensions = templateSize(barcodeTemplate, customWidth, customHeight)
    const company = escapeHtml(readCompanyName().toUpperCase())
    const code = escapeHtml(value)
    const isSingleLabel = barcodeTemplate.startsWith('label-') || barcodeTemplate === 'custom'
    const isPos4030 = barcodeTemplate === 'pos-40x30' || barcodeTemplate === 'label-40x30'
    const image = isPos4030
      ? await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 520, color: { dark: '#000000', light: '#ffffff' } })
      : barcodeDataUri(value, 520, 150, false)
    const copies = Array.from({ length: Math.max(1, barcodeCopies) }, () => `<div class="label ${isPos4030 ? 'label-40x30 label-qr' : 'label-linear'}"><div class="brand">${company}</div><img src="${image}" alt="barcode"/><div class="code">${code}</div></div>`).join('')
    const pageSize = isSingleLabel || barcodeTemplate.startsWith('pos-')
      ? `${dimensions.w}mm ${dimensions.h}mm`
      : '210mm 297mm'
    printLabelHtml(`<div class="labels">${copies}</div><style>@page{size:${pageSize};margin:0}*{box-sizing:border-box}html,body{width:${dimensions.w}mm;min-height:${dimensions.h}mm;margin:0!important;padding:0!important;background:#fff;color:#000}.labels{display:block;width:${dimensions.w}mm;margin:0;padding:0;background:#fff}.label{width:${dimensions.w}mm;height:${dimensions.h}mm;margin:0;padding:1.8mm 1.7mm .9mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;break-after:page;page-break-after:always;background:#fff;color:#000;font-family:Arial,"Helvetica Neue",sans-serif}.label:last-child{break-after:auto;page-break-after:auto}.brand{width:100%;height:5.2mm;line-height:5.2mm;text-align:center;font-family:Georgia,"Times New Roman",Arial,sans-serif;font-size:11px;font-weight:900;letter-spacing:.45px;white-space:nowrap;overflow:hidden;text-transform:uppercase}.label img{display:block;object-fit:contain;image-rendering:crisp-edges}.label-linear img{width:36mm;height:15.2mm;margin:1mm auto 0;object-fit:fill}.label-qr img{width:17.8mm;height:17.8mm;margin:.7mm auto 0}.code{width:100%;height:4.8mm;line-height:4.8mm;text-align:center;font-family:"Courier New",monospace;font-size:10.5px;font-weight:800;white-space:nowrap;overflow:hidden}.label-40x30{border:0}@media print{html,body{overflow:hidden}.label{break-inside:avoid;page-break-inside:avoid}}</style>`, t.printBarcode)
  }

  return (
    <div className="w-full pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAdd} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172a57] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2047] dark:bg-amber-500 dark:text-slate-950"><Plus size={17}/>{t.add}</button>
          <button onClick={printReport} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white"><Printer size={17}/>{t.printReport}</button>
        </div>
      </div>

      <section className="app-panel mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#24365f] dark:bg-[#111a2c]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={t.search} className="form-control pl-10 rtl:pl-3 rtl:pr-10"/>
          </div>
          <FilterSelect className="xl:w-40" value={categoryFilter} onChange={setCategoryFilter} ariaLabel={t.allCategories} options={[{ value: 'all', label: t.allCategories }, ...filterCategories.map((category) => ({ value: category, label: localizeCategory(category, language) }))]} />
          <FilterSelect className="xl:w-44" value={stockFilter} onChange={(value)=>setStockFilter(value as StockFilter)} ariaLabel={t.allStock} options={[{ value: 'all', label: t.allStock }, { value: 'active', label: t.active }, { value: 'out', label: t.out }]} />
          <div className="relative xl:w-36"><CalendarDays size={16} className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"/><FilterSelect className="[&_button:first-child]:ps-9" value={timeFilter} onChange={setTimeFilter} ariaLabel={t.allTime} options={[{value:'all',label:t.allTime},{value:'today',label:t.today},{value:'week',label:t.weekly},{value:'month',label:t.monthly},{value:'year',label:t.yearly},{value:'custom',label:t.custom}]} /></div>
        </div>
        {timeFilter === 'custom' && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="form-control sm:w-44"/><input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="form-control sm:w-44"/></div>}
      </section>

      <section className={`app-panel mt-5 ${filtered.length === 0 ? 'min-h-[265px]' : ''} rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#24365f] dark:bg-[#111a2c]`}>
        <div className="flex items-center justify-between px-5 py-5"><h2 className="inline-flex items-center gap-2 text-sm font-bold"><Box size={18}/>{t.inventory} ({filtered.length})</h2></div>
        {filtered.length === 0 ? (
          <div className="grid min-h-[190px] place-items-center text-center"><div><Package size={44} className="mx-auto text-slate-300 dark:text-slate-500"/><div className="mt-3 text-base font-semibold">{t.noneTitle}</div><div className="mt-1 text-xs text-slate-400">{t.noneHint}</div></div></div>
        ) : (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-[#24365f] dark:text-slate-300"><th className="px-3 py-3 text-start">{t.name}</th><th className="px-3 py-3 text-start">{t.code}</th><th className="px-3 py-3 text-start">{t.category}</th><th className="px-3 py-3 text-start">{t.purchase}</th><th className="px-3 py-3 text-start">{t.selling}</th><th className="px-3 py-3 text-start">{t.profit}</th><th className="px-3 py-3 text-start">{t.stock}</th><th className="px-3 py-3 text-start">{t.status}</th><th className="px-3 py-3 text-start">{t.actions}</th></tr></thead>
              <tbody>{filtered.map((p)=><tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-[#1c2d4e]"><td className="px-3 py-4 font-semibold">{p.name}<div className="text-[11px] font-normal text-slate-400">{p.strength || p.brandName}</div></td><td className="px-3 py-4 font-mono text-xs">{p.code || '-'}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-white/10">{localizeCategory(p.category, language)}</span></td><td className="px-3 py-4">{money(p.purchase,p.currency)}</td><td className="px-3 py-4">{money(p.selling,p.currency)}</td><td className="px-3 py-4 text-emerald-500">{money(p.selling-p.purchase,p.currency)}</td><td className="px-3 py-4 font-medium">{stockDisplay(p, language)}</td><td className="px-3 py-4"><StatusBadge status={simpleStockStatus(p)} text={t}/></td><td className="px-3 py-4"><button onClick={(event)=>{if(menu?.id===p.id){setMenu(null);return}const rect=event.currentTarget.getBoundingClientRect();const width=176;const height=174;const left=Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8));const top=rect.bottom+8+height<=window.innerHeight?rect.bottom+8:Math.max(8,rect.top-height-8);setMenu({id:p.id,top,left})}} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">•••</button>{menu?.id===p.id && <ActionMenu product={p} t={t} top={menu.top} left={menu.left} onClose={()=>setMenu(null)} onView={()=>{setViewProduct(p);setMenu(null)}} onEdit={()=>openEdit(p)} onBarcode={()=>{setBarcodeProduct(p);setMenu(null)}} onDelete={()=>requestRemove(p)}/>}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && <MedicineModal language={language} t={t} draft={draft} setDraft={setDraft} editing={!!editingId} onClose={()=>setFormOpen(false)} onSubmit={submit} margin={margin} setMargin={setMargin} applyMargin={applyMargin} categories={categories} units={units} suppliers={suppliers} showCategoryAdd={showCategoryAdd} setShowCategoryAdd={setShowCategoryAdd} categoryNew={categoryNew} setCategoryNew={setCategoryNew} addCategory={addCategory} showUnitAdd={showUnitAdd} setShowUnitAdd={setShowUnitAdd} unitNew={unitNew} setUnitNew={setUnitNew} addUnit={addUnit} generateCode={generateCode} onAddSupplier={()=>{setSupplierDraft((s)=>({...s,currency:draft.currency}));setSupplierOpen(true)}} error={formError} formCodeMode={formCodeMode} setFormCodeMode={setFormCodeMode} onCodePreview={()=>{ if(!draft.barcode.trim()) setDraft((d:Draft)=>({...d,barcode:generateBarcodeValue()})); setFormCodePreviewOpen(true) }} cashPayEnabled={cashPayEnabled} setCashPayEnabled={setCashPayEnabled} cashPayAmount={cashPayAmount} setCashPayAmount={setCashPayAmount} walletBalance={cashWalletBalance(draft.currency)}/>} 
      {formOpen && formCodePreviewOpen && <DraftCodeModal name={draft.name || t.name} value={draft.barcode || draft.code || draft.name || generateBarcodeValue()} mode={formCodeMode} t={t} onClose={()=>setFormCodePreviewOpen(false)} template={barcodeTemplate} setTemplate={setBarcodeTemplate} copies={barcodeCopies} setCopies={setBarcodeCopies} customWidth={customWidth} setCustomWidth={setCustomWidth} customHeight={customHeight} setCustomHeight={setCustomHeight}/>} 
      {supplierOpen && <SupplierModal t={t} draft={supplierDraft} setDraft={setSupplierDraft} onClose={()=>setSupplierOpen(false)} onSubmit={createSupplier} onItemKey={supplierItemKey} addItem={addSupplierItem}/>} 
      {viewProduct && <ViewModal language={language} product={viewProduct} supplier={suppliers.find((s)=>s.id===viewProduct.supplierId)} t={t} onClose={()=>setViewProduct(null)}/>} 
      {barcodeProduct && <BarcodeModal product={barcodeProduct} t={t} onClose={()=>setBarcodeProduct(null)} template={barcodeTemplate} setTemplate={setBarcodeTemplate} copies={barcodeCopies} setCopies={setBarcodeCopies} customWidth={customWidth} setCustomWidth={setCustomWidth} customHeight={customHeight} setCustomHeight={setCustomHeight} onCopy={copyBarcode} onPrint={printBarcode}/>} 
      {deleteProduct && <DeleteMedicineModal language={language} product={deleteProduct} t={t} onClose={()=>setDeleteProduct(null)} onConfirm={confirmRemove}/>}
    </div>
  )
}

function DeleteMedicineModal({ language, product, t, onClose, onConfirm }: { language: Language; product: Product; t: any; onClose:()=>void; onConfirm:()=>void }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = oldOverflow }
  }, [])

  const copy = language === 'دری'
    ? { title: 'تأیید حذف', before: 'آیا مطمئن هستید که می‌خواهید', after: 'را حذف کنید؟ این عمل قابل بازگشت نیست. آیا می‌خواهید ادامه دهید؟' }
    : language === 'پښتو'
      ? { title: 'د حذف تایید', before: 'ایا ډاډه یاست چې', after: 'ړنګول غواړئ؟ دا عمل بېرته نه راګرځي. ایا دوام ورکول غواړئ؟' }
      : { title: 'Confirm Deletion', before: 'Are you sure you want to delete', after: '? This action cannot be undone. Are you sure you want to continue?' }

  return createPortal(
    <div
      className="fixed inset-0 z-[180] grid place-items-center bg-black/80 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medicine-delete-title"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose() }}
    >
      <section className="w-full max-w-[470px] rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-[#34476d] dark:bg-[#101827] dark:text-white">
        <h2 id="medicine-delete-title" className="text-xl font-extrabold">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
          {copy.before} <span className="font-semibold">&quot;{product.name}&quot;</span>{copy.after}
        </p>
        <div className="mt-5 flex justify-end gap-2 rtl:justify-start">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-[#34476d] dark:bg-[#0d1628] dark:text-slate-100 dark:hover:bg-white/10">{t.cancel}</button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-lg bg-red-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-red-600">{t.delete}</button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function StatusBadge({ status, text }: { status: StockStatus; text: any }) {
  const map: Record<StockStatus, { label: string; cls: string }> = {
    active: { label: text.active, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    low: { label: text.low, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    out: { label: text.out, cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
    expiring: { label: text.expiring, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
    expired: { label: text.expired, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${map[status].cls}`}>{map[status].label}</span>
}

function ActionMenu({ product, t, top, left, onClose, onView, onEdit, onBarcode, onDelete }: { product: Product; t: any; top: number; left: number; onClose:()=>void; onView:()=>void; onEdit:()=>void; onBarcode:()=>void; onDelete:()=>void }) {
  return createPortal(<>
    <button type="button" aria-label="Close actions" className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={onClose} />
    <div className="fixed z-[90] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-[#24365f] dark:bg-[#0c1424]" style={{ top, left }}>
      <MenuButton icon={Eye} label={t.view} onClick={onView}/><MenuButton icon={Edit3} label={t.edit} onClick={onEdit}/><MenuButton icon={BarcodeIcon} label={t.viewBarcode} onClick={onBarcode}/><MenuButton icon={Trash2} label={t.delete} onClick={onDelete} danger/>
      <span className="hidden">{product.id}</span>
    </div>
  </>, document.body)
}
function MenuButton({ icon: Icon, label, onClick, danger=false }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-xs font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/10 ${
        danger ? 'text-red-500 dark:text-red-300' : 'text-slate-700 dark:text-slate-100'
      }`}
    >
      <Icon size={15}/>
      {label}
    </button>
  )
}

function Field({ label, children, full=false }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full?'md:col-span-2':''}><span className="mb-1.5 block text-xs font-semibold">{label}</span>{children}</label> }

function MedicineModal(props: any) {
  const { language,t,draft,setDraft,editing,onClose,onSubmit,margin,setMargin,applyMargin,categories,units,suppliers,showCategoryAdd,setShowCategoryAdd,categoryNew,setCategoryNew,addCategory,showUnitAdd,setShowUnitAdd,unitNew,setUnitNew,addUnit,generateCode,onAddSupplier,error,formCodeMode,setFormCodeMode,onCodePreview,cashPayEnabled,setCashPayEnabled,cashPayAmount,setCashPayAmount,walletBalance } = props
  const profit = round(n(draft.selling) - n(draft.purchase))
  const profitPct = n(draft.purchase) > 0 ? round((profit / n(draft.purchase)) * 100) : 0
  const stripsPerBox = Math.max(1, n(draft.packHierarchy.stripsPerBox) || 1)
  const unitsPerStrip = Math.max(1, n(draft.packHierarchy.tabletsPerStrip) || 1)
  const unitsPerBox = stripsPerBox * unitsPerStrip
  const boxCost = n(draft.purchase)
  const stripCost = round(boxCost / stripsPerBox)
  const unitCost = round(boxCost / unitsPerBox)
  const boxSell = n(draft.selling)
  const stripSell = round(boxSell / stripsPerBox)
  const unitSell = round(boxSell / unitsPerBox)
  const wc = walletCopy[language] ?? walletCopy.English
  const purchaseTotal = round(Math.max(0, n(draft.quantity)) * Math.max(0, n(draft.purchase)))
  const changeHierarchy = (patch: Partial<Draft['packHierarchy']>) => setDraft((d:Draft)=>({...d, packHierarchy:{...d.packHierarchy,...patch}}))
  const hierarchyToggleText = language === 'English'
    ? {
        title: 'Sell in multiple units',
        on: 'Multiple sale units enabled',
        off: 'Single sale unit only',
        hint: 'Enable this when the medicine can be sold as Box, Strip and Tablet.'
      }
    : language === 'دری'
      ? {
          title: 'فروش به چند واحد',
          on: 'فروش چند واحدی فعال است',
          off: 'فقط یک واحد فروش',
          hint: 'اگر دوا به شکل Box، Strip و Tablet فروخته می‌شود، این گزینه را فعال کنید.'
        }
      : {
          title: 'په څو واحدونو پلور',
          on: 'د څو واحدونو پلور فعال دی',
          off: 'یوازې یو د پلور واحد',
          hint: 'که دوا د Box، Strip او Tablet په بڼه پلورل کېږي، دا اختیار فعال کړئ.'
        }


  return <ModalShell onClose={onClose} width="max-w-[700px]">
    <form onSubmit={onSubmit} className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="inline-flex items-center gap-2 text-lg font-bold"><Pill size={21}/>{editing?t.editTitle:t.addTitle}</h2><button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button></div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`${t.name} *`}><input autoFocus value={draft.name} onChange={(e)=>setDraft((d:Draft)=>({...d,name:e.target.value}))} className="form-control"/></Field>
        <Field label={t.brand}><input value={draft.brandName} onChange={(e)=>setDraft((d:Draft)=>({...d,brandName:e.target.value}))} className="form-control"/></Field>
        <Field label={t.strength}><input value={draft.strength} onChange={(e)=>setDraft((d:Draft)=>({...d,strength:e.target.value}))} className="form-control" placeholder="400mg"/></Field>
        <Field label={t.batch}><input value={draft.batchNo} onChange={(e)=>setDraft((d:Draft)=>({...d,batchNo:e.target.value}))} className="form-control" placeholder="B-1234"/></Field>

        <Field label={t.codeOptional} full><input value={draft.code} onChange={(e)=>setDraft((d:Draft)=>({...d,code:e.target.value}))} className="form-control"/></Field>

        <div className="md:col-span-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold"><BarcodeIcon size={16}/>{formCodeMode==='qr' ? t.qrCode : t.barcode}</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[#24365f] dark:bg-white/5">
              <button type="button" onClick={()=>{setFormCodeMode('barcode');onCodePreview()}} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold ${formCodeMode==='barcode'?'bg-[#172a57] text-white dark:bg-amber-500 dark:text-slate-950':'text-slate-500 dark:text-slate-300'}`}><BarcodeIcon size={13}/>{t.barcode}</button>
              <button type="button" onClick={()=>{setFormCodeMode('qr');onCodePreview()}} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold ${formCodeMode==='qr'?'bg-[#172a57] text-white dark:bg-amber-500 dark:text-slate-950':'text-slate-500 dark:text-slate-300'}`}><QrIcon size={13}/>{t.qrCode}</button>
            </div>
          </div>
          <div className="flex gap-2">
            <input value={draft.barcode} onChange={(e)=>setDraft((d:Draft)=>({...d,barcode:e.target.value.trim()}))} onKeyDown={(e)=>{if(e.key==='Enter')e.preventDefault()}} className="form-control font-mono" placeholder="2008526833025"/>
            <button type="button" title={t.generate} onClick={()=>setDraft((d:Draft)=>({...d,barcode:generateBarcodeValue()}))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-[#24365f] dark:hover:bg-white/10"><RefreshCcw size={16}/></button>
            <button type="button" title={formCodeMode==='qr'?t.printQr:t.printBarcode} onClick={onCodePreview} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-[#24365f] dark:hover:bg-white/10"><Printer size={16}/></button>
          </div>
        </div>

        <Field label={t.categoryLabel} full>
          {!showCategoryAdd ? <div className="flex gap-2"><select value={draft.category} onChange={(e)=>setDraft((d:Draft)=>({...d,category:e.target.value}))} className="form-control">{categories.map((c:string)=><option key={c} value={c}>{localizeCategory(c, language)}</option>)}</select><button type="button" onClick={()=>{setCategoryNew('');setShowCategoryAdd(true)}} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={16}/></button></div> : <div className="flex gap-2"><input autoFocus value={categoryNew} onChange={(e)=>setCategoryNew(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();addCategory()}}} className="form-control" placeholder={t.categoryName}/><button type="button" onClick={addCategory} className="rounded-lg bg-[#172a57] px-4 text-xs font-bold text-white dark:bg-amber-500 dark:text-slate-950">{t.addCategory}</button><button type="button" onClick={()=>{setCategoryNew('');setShowCategoryAdd(false)}} className="rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-[#24365f]">{t.cancel}</button></div>}
        </Field>

        <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
          <Field label={t.expiry}><input type="date" value={draft.expiry} onChange={(e)=>setDraft((d:Draft)=>({...d,expiry:e.target.value}))} className="form-control"/></Field>
          <Field label={t.alertBefore}><select value={draft.alertBefore} onChange={(e)=>setDraft((d:Draft)=>({...d,alertBefore:Number(e.target.value)}))} className="form-control">{alertOptions.map((v)=><option key={v} value={v}>{v===7?t.oneWeek:`${v} ${t.days}`}</option>)}</select></Field>
          <Field label={t.manufacturer}><input value={draft.manufacturer} onChange={(e)=>setDraft((d:Draft)=>({...d,manufacturer:e.target.value}))} className="form-control"/></Field>
        </div>

        <Field label={t.purchasePrice}><input type="number" min="0" step="0.01" value={draft.purchase} onChange={(e)=>setDraft((d:Draft)=>({...d,purchase:n(e.target.value)}))} className="form-control"/></Field>
        <Field label={t.sellingPrice}><input type="number" min="0" step="0.01" value={draft.selling} onChange={(e)=>setDraft((d:Draft)=>({...d,selling:n(e.target.value)}))} className="form-control"/></Field>

        <Field label={t.margin} full><div className="rounded-xl border border-slate-300 bg-slate-100/80 p-3 dark:border-[#314366] dark:bg-white/5"><div className="flex gap-2"><input value={margin} onChange={(e)=>setMargin(e.target.value.replace(/[^\d.]/g,''))} className="form-control" placeholder="e.g. 30"/><button type="button" onClick={applyMargin} className="shrink-0 rounded-lg bg-slate-500 px-4 text-xs font-bold text-white">{t.applyPercent}</button></div><div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{t.marginHint}</div></div></Field>

        <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-[#24365f]">
          <span className="text-sm text-slate-500 dark:text-slate-300">{t.profitPerUnit}</span>
          <span className={`text-sm font-extrabold ${profit>=0?'text-emerald-500':'text-red-500'}`}>{money(profit,draft.currency)} <span className="font-semibold">({profitPct.toFixed(1)}% {t.marginWord})</span></span>
        </div>

        <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
          <Field label={t.quantity}><input type="number" min="0" step="any" value={draft.quantity} onChange={(e)=>setDraft((d:Draft)=>({...d,quantity:n(e.target.value)}))} className="form-control"/></Field>
          <Field label={t.unit}>
            {!showUnitAdd ? <div className="flex gap-2"><select value={draft.unit} onChange={(e)=>setDraft((d:Draft)=>({...d,unit:e.target.value}))} className="form-control">{units.map((u:string)=><option key={u} value={u}>{localizeUnit(u, language)}</option>)}</select><button type="button" onClick={()=>{setUnitNew('');setShowUnitAdd(true)}} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={15}/></button></div> : <div className="flex gap-2"><input autoFocus value={unitNew} onChange={(e)=>setUnitNew(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();addUnit()}}} className="form-control" placeholder={t.unitName}/><button type="button" onClick={addUnit} className="rounded-lg bg-[#172a57] px-3 text-xs font-bold text-white dark:bg-amber-500 dark:text-slate-950">{t.addCategory}</button><button type="button" onClick={()=>{setUnitNew('');setShowUnitAdd(false)}} className="rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-[#24365f]">{t.cancel}</button></div>}
          </Field>
          <Field label={t.currency}><select value={draft.currency} onChange={(e)=>setDraft((d:Draft)=>({...d,currency:e.target.value}))} className="form-control">{currencies.map((c)=><option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label={t.lowStockLimit} full><input type="number" min="0" step="any" value={draft.lowStock} onChange={(e)=>setDraft((d:Draft)=>({...d,lowStock:n(e.target.value)}))} className="form-control"/><div className="mt-1 text-[10px] text-slate-400">{t.lowStockHint}</div></Field>

        <div className="md:col-span-2 rounded-xl border border-slate-200 p-3 dark:border-[#24365f]">
          <button
            type="button"
            onClick={()=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:!d.packHierarchyEnabled}))}
            className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-start transition ${
              draft.packHierarchyEnabled
                ? 'border-[#172a57] bg-[#172a57]/5 dark:border-amber-500 dark:bg-amber-500/10'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-[#24365f] dark:bg-white/5 dark:hover:bg-white/10'
            }`}
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${
                draft.packHierarchyEnabled
                  ? 'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                  : 'border-slate-400 bg-white dark:bg-transparent'
              }`}>
                {draft.packHierarchyEnabled && <Check size={14}/>}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Package size={16}/>
                  {hierarchyToggleText.title}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  {hierarchyToggleText.hint}
                </span>
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              draft.packHierarchyEnabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            }`}>
              {draft.packHierarchyEnabled ? hierarchyToggleText.on : hierarchyToggleText.off}
            </span>
          </button>

          {draft.packHierarchyEnabled && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-[#24365f]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-sm font-bold">
                  <Package size={16}/>{t.packHierarchy}
                </div>
                <span className="text-[11px] text-slate-400">{t.packHint}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t.boxLabel}><input value={draft.packHierarchy.boxLabel} onChange={(e)=>changeHierarchy({boxLabel:e.target.value})} className="form-control"/></Field>
                <Field label={t.stripsPerBox}><input type="number" min="1" value={draft.packHierarchy.stripsPerBox} onChange={(e)=>changeHierarchy({stripsPerBox:n(e.target.value)})} className="form-control"/></Field>
                <Field label={t.stripLabel}><input value={draft.packHierarchy.stripLabel} onChange={(e)=>changeHierarchy({stripLabel:e.target.value})} className="form-control"/></Field>
                <Field label={t.unitsPerStrip}><input type="number" min="1" value={draft.packHierarchy.tabletsPerStrip} onChange={(e)=>changeHierarchy({tabletsPerStrip:n(e.target.value)})} className="form-control"/></Field>
                <Field label={t.unitLabel}><input value={draft.packHierarchy.unitLabel} onChange={(e)=>changeHierarchy({unitLabel:e.target.value})} className="form-control"/></Field>
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-white/10">
                  <div className="text-[10px] text-slate-500">{t.packBreakdown}</div>
                  <div className="mt-1 font-bold">
                    1 {draft.packHierarchy.boxLabel||'Box'} = {stripsPerBox} {draft.packHierarchy.stripLabel||'Strip'}
                    <br/>
                    = {unitsPerBox} {draft.packHierarchy.unitLabel||'Tablet'}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-[#24365f]">
                <div className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">{t.perTierPreview}</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <TierPreview title={`1 ${draft.packHierarchy.unitLabel||'Tablet'}`} detail={`(1 ${draft.packHierarchy.unitLabel||'Tablet'})`} sell={unitSell} cost={unitCost} currency={draft.currency}/>
                  <TierPreview title={`1 ${draft.packHierarchy.stripLabel||'Strip'}`} detail={`(${unitsPerStrip} ${draft.packHierarchy.unitLabel||'Tablet'})`} sell={stripSell} cost={stripCost} currency={draft.currency}/>
                  <TierPreview title={`1 ${draft.packHierarchy.boxLabel||'Box'}`} detail={`(${unitsPerBox} ${draft.packHierarchy.unitLabel||'Tablet'})`} sell={boxSell} cost={boxCost} currency={draft.currency}/>
                </div>
              </div>
            </div>
          )}
        </div>

        <Field label={t.prescription} full><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,prescriptionRequired:!d.prescriptionRequired}))} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-start dark:border-[#24365f]">{draft.prescriptionRequired?<span className="grid h-5 w-5 place-items-center rounded border border-[#172a57] bg-[#172a57] text-white"><Check size={14}/></span>:<span className="h-5 w-5 rounded border border-slate-400"/>}<span><b className="text-sm">{t.prescription}</b><span className="mt-0.5 block text-[10px] text-slate-400">{t.prescriptionHint}</span></span></button></Field>
        <Field label={t.supplier} full><div className="rounded-xl border border-slate-200 p-3 dark:border-[#24365f]"><div className="mb-2 text-[10px] text-slate-400">{t.supplierHint}</div><div className="flex gap-2"><select value={draft.supplierId} onChange={(e)=>setDraft((d:Draft)=>({...d,supplierId:e.target.value}))} className="form-control"><option value="">{t.selectSupplier}</option>{suppliers.map((s:Supplier)=><option key={s.id} value={s.id}>{supplierName(s)}</option>)}</select><button type="button" onClick={onAddSupplier} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={16}/></button></div></div></Field>

        <div className="md:col-span-2 rounded-xl border border-slate-200 p-3 dark:border-[#24365f]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={()=>{
                const next=!cashPayEnabled
                setCashPayEnabled(next)
                if(next && n(cashPayAmount) <= 0) setCashPayAmount(String(purchaseTotal || 0))
                if(!next) setCashPayAmount('0')
              }}
              className="inline-flex min-w-0 items-center gap-2 text-start"
            >
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                cashPayEnabled
                  ? 'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                  : 'border-slate-400'
              }`}>
                {cashPayEnabled&&<Check size={14}/>}
              </span>
              <WalletCards size={17} className="shrink-0 text-[#172a57] dark:text-amber-400"/>
              <span className="text-sm font-bold">{wc.pay}</span>
            </button>
            <div className={`text-[11px] ${n(walletBalance)<0?'font-bold text-red-500':'text-slate-500 dark:text-slate-300'}`}>
              {wc.balance}: <b>{money(n(walletBalance),draft.currency)}</b>
            </div>
          </div>

          {cashPayEnabled && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold">{wc.amount}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={purchaseTotal}
                  value={cashPayAmount}
                  onChange={(e)=>{
                    const raw=e.target.value
                    if(raw===''){setCashPayAmount('');return}
                    setCashPayAmount(String(Math.min(Math.max(0,n(raw)),purchaseTotal)))
                  }}
                  className="form-control"
                />
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-300">
                  {wc.of} {money(purchaseTotal,draft.currency)}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400">{wc.canGoNegative}</div>
              <div className="mt-1 text-[10px] text-slate-400">
                {language==='English'
                  ? `This payment will be deducted from the ${draft.currency} wallet only.`
                  : language==='دری'
                    ? `این مبلغ فقط از موجودی ${draft.currency} کسر می‌شود.`
                    : `دا مبلغ یوازې د ${draft.currency} له موجودۍ څخه کمیږي.`}
              </div>
            </div>
          )}
        </div>
      </div>
      <button className="mt-5 h-10 w-full rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">{editing?t.update:t.save}</button>
    </form>
  </ModalShell>
}

function TierPreview({ title,detail,sell,cost,currency }: { title:string; detail:string; sell:number; cost:number; currency:string }) {
  return <div className="rounded-lg border border-slate-200 p-2.5 text-xs dark:border-[#24365f]"><div className="font-bold">{title} <span className="font-normal text-slate-400">{detail}</span></div><div className="mt-1">Sell: <b>{money(sell,currency)}</b></div><div className="mt-0.5 text-[10px] text-slate-500">Cost <span className="text-emerald-500">{money(cost,currency)}</span></div></div>
}

function SupplierModal({ t,draft,setDraft,onClose,onSubmit,onItemKey,addItem }: any) {
  return <ModalShell onClose={onClose} width="max-w-[500px]" z="z-[95]"><form onSubmit={onSubmit} className="max-h-[85vh] overflow-y-auto p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{t.supplierTitle}</h2><button type="button" onClick={onClose}><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2"><Field label={`${t.supplierName} *`} full><input autoFocus value={draft.name} onChange={(e)=>setDraft((s:any)=>({...s,name:e.target.value}))} className="form-control"/></Field><Field label={t.phone}><input value={draft.phone} onChange={(e)=>setDraft((s:any)=>({...s,phone:e.target.value}))} className="form-control"/></Field><Field label={t.businessType}><input value={draft.businessType} onChange={(e)=>setDraft((s:any)=>({...s,businessType:e.target.value}))} className="form-control"/></Field><Field label={t.address} full><input value={draft.address} onChange={(e)=>setDraft((s:any)=>({...s,address:e.target.value}))} className="form-control"/></Field><Field label={t.currency} full><select value={draft.currency} onChange={(e)=>setDraft((s:any)=>({...s,currency:e.target.value}))} className="form-control">{currencies.map((c)=><option key={c}>{c}</option>)}</select></Field><Field label={t.items} full><div className="flex gap-2"><input value={draft.item} onChange={(e)=>setDraft((s:any)=>({...s,item:e.target.value}))} onKeyDown={onItemKey} className="form-control"/><button type="button" onClick={addItem} className="rounded-lg border border-slate-200 px-3 text-xs dark:border-[#24365f]">{t.addCategory}</button></div>{draft.items.length>0&&<div className="mt-2 flex flex-wrap gap-1">{draft.items.map((item:string)=><span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] dark:bg-white/10">{item}</span>)}</div>}</Field><Field label={t.notes} full><textarea value={draft.notes} onChange={(e)=>setDraft((s:any)=>({...s,notes:e.target.value}))} className="form-control min-h-[74px] py-2"/></Field><Field label={t.openingBalance} full><input type="number" step="0.01" value={draft.balance} onChange={(e)=>setDraft((s:any)=>({...s,balance:n(e.target.value)}))} className="form-control"/></Field></div><div className="mt-5 flex gap-2"><button className="h-10 flex-1 rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">{t.createSupplier}</button><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm dark:border-[#24365f]">{t.cancel}</button></div></form></ModalShell>
}

function ViewModal({ language,product,supplier,t,onClose }: any) { return <ModalShell onClose={onClose} width="max-w-[560px]"><div className="p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{t.details}</h2><button onClick={onClose}><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2">{[[t.name,product.name],[t.code,product.code||'-'],[t.brandLabel,product.brandName||'-'],[t.category,localizeCategory(product.category, language)],[t.batchLabel,product.batchNo||'-'],[t.manufacturerLabel,product.manufacturer||'-'],[t.purchase,money(product.purchase,product.currency)],[t.selling,money(product.selling,product.currency)],[t.stock,`${product.quantity} ${localizeUnit(product.unit, language)}`],[t.expiryLabel,product.expiry||'-'],[t.supplierLabel,supplierName(supplier)||'-']].map(([a,b])=><div key={a} className="rounded-lg border border-slate-200 p-3 dark:border-[#24365f]"><div className="text-[10px] text-slate-400">{a}</div><div className="mt-1 text-sm font-semibold">{b}</div></div>)}</div></div></ModalShell> }

function DraftCodeModal({ name,value,mode,t,onClose,template,setTemplate,copies,setCopies,customWidth,setCustomWidth,customHeight,setCustomHeight }: any) {
  const [qrImage,setQrImage] = useState('')
  useEffect(()=>{ let active=true; if(mode==='qr'){QRCode.toDataURL(value,{errorCorrectionLevel:'M',margin:1,width:360,color:{dark:'#000000',light:'#ffffff'}}).then((img)=>{if(active)setQrImage(img)})} return()=>{active=false} },[mode,value])
  const image = mode==='qr' ? qrImage : barcodeDataUri(value,360,110)
  const doCopy = async()=>{ await navigator.clipboard?.writeText(value) }
  const doPrint = async()=>{
    const dimensions=templateSize(template,customWidth,customHeight); const single=template.startsWith('label-')||template==='custom'||template.startsWith('pos-');
    const imageData=mode==='qr' ? await QRCode.toDataURL(value,{errorCorrectionLevel:'M',margin:1,width:520,color:{dark:'#000000',light:'#ffffff'}}) : barcodeDataUri(value,520,150,false)
    const copiesHtml=Array.from({length:Math.max(1,copies)},()=>`<div class="label"><div class="name">${escapeHtml(name)}</div><img src="${imageData}"/><div class="code">${escapeHtml(value)}</div></div>`).join('')
    const page=single?`${dimensions.w}mm ${dimensions.h}mm`:'210mm 297mm';
    printLabelHtml(`<div class="labels">${copiesHtml}</div><style>@page{size:${page};margin:0}*{box-sizing:border-box}body{margin:0;background:#fff}.labels{width:${dimensions.w}mm}.label{width:${dimensions.w}mm;height:${dimensions.h}mm;padding:1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;break-after:page;font-family:Arial}.label img{max-width:92%;max-height:65%;object-fit:contain}.name{font-size:10px;font-weight:700;margin-bottom:1mm}.code{font:700 9px monospace;margin-top:1mm}</style>`, mode==='qr'?t.printQr:t.printBarcode)
  }
  return <ModalShell onClose={onClose} width="max-w-[470px]" z="z-[110]"><div className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="inline-flex items-center gap-2 text-lg font-bold">{mode==='qr'?<QrIcon size={20}/>:<BarcodeIcon size={20}/>} {mode==='qr'?t.qrCode:t.barcode} — {name}</h2><button onClick={onClose}><X size={18}/></button></div><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f]">{image&&<img src={image} alt={mode} className={`mx-auto object-contain ${mode==='qr'?'h-[170px]':'h-[110px]'}`}/>}<div className="mt-2 text-center font-mono text-[10px] text-slate-600">{value}</div></div><label className="mt-4 block text-xs font-semibold">{t.labelTemplate}</label><select value={template} onChange={(e)=>setTemplate(e.target.value)} className="form-control mt-1"><option value="a4-50x25">A4 sheet · 50×25mm</option><option value="a4-40x30">A4 sheet · 40×30mm</option><option value="label-50x25">Label printer · 50×25mm</option><option value="label-40x30">Label printer · 40×30mm</option><option value="custom">{t.customSize}</option></select>{template==='custom'&&<div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="10" value={customWidth} onChange={(e)=>setCustomWidth(n(e.target.value))} className="form-control" placeholder={t.width}/><input type="number" min="10" value={customHeight} onChange={(e)=>setCustomHeight(n(e.target.value))} className="form-control" placeholder={t.height}/></div>}<label className="mt-3 block text-xs font-semibold">{t.copies}</label><input type="number" min="1" max="100" value={copies} onChange={(e)=>setCopies(Math.max(1,n(e.target.value)))} className="form-control mt-1"/><div className="mt-4 flex gap-2"><button type="button" onClick={doPrint} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950"><Printer size={16}/>{mode==='qr'?t.printQr:t.printBarcode}</button><button type="button" onClick={doCopy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm dark:border-[#24365f]"><Copy size={16}/>{t.copy}</button></div></div></ModalShell>
}

function BarcodeModal({ product,t,onClose,template,setTemplate,copies,setCopies,customWidth,setCustomWidth,customHeight,setCustomHeight,onCopy,onPrint }: any) {
  const value = product.barcode || product.code || product.name; const image = barcodeDataUri(value, 360, 110)
  return <ModalShell onClose={onClose} width="max-w-[470px]"><div className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="inline-flex items-center gap-2 text-lg font-bold"><BarcodeIcon size={20}/>{t.barcodeTitle} — {product.name}</h2><button onClick={onClose}><X size={18}/></button></div><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f]"><img src={image} alt="barcode" className="mx-auto h-[110px] max-w-full"/></div><label className="mt-4 block text-xs font-semibold">{t.labelTemplate}</label><select value={template} onChange={(e)=>setTemplate(e.target.value)} className="form-control mt-1"><option value="pos-40x30">POS label · 40×30mm</option><option value="a4-50x25">A4 sheet · 50×25mm</option><option value="a4-40x30">A4 sheet · 40×30mm</option><option value="a4-30x20">A4 sheet · 30×20mm</option><option value="pos-80">POS / ESC-POS · 80mm roll</option><option value="pos-58">POS / ESC-POS · 58mm roll</option><option value="label-50x25">Label printer · 50×25mm</option><option value="label-40x30">Label printer · 40×30mm</option><option value="label-30x20">Label printer · 30×20mm</option><option value="custom">{t.customSize}</option></select>{template==='custom'&&<div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="10" value={customWidth} onChange={(e)=>setCustomWidth(n(e.target.value))} className="form-control" placeholder={t.width}/><input type="number" min="10" value={customHeight} onChange={(e)=>setCustomHeight(n(e.target.value))} className="form-control" placeholder={t.height}/></div>}<label className="mt-3 block text-xs font-semibold">{t.copies}</label><input type="number" min="1" max="100" value={copies} onChange={(e)=>setCopies(Math.max(1,n(e.target.value)))} className="form-control mt-1"/><div className="mt-4 flex gap-2"><button onClick={onPrint} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950"><Printer size={16}/>{t.printBarcode}</button><button onClick={onCopy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm dark:border-[#24365f]"><Copy size={16}/>{t.copy}</button></div></div></ModalShell>
}

function ModalShell({ children,onClose,width,z='z-[90]' }: { children:React.ReactNode; onClose:()=>void; width:string; z?:string }) { return <div onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose()}} className={`fixed inset-0 ${z} grid place-items-center overflow-y-auto bg-black/70 p-3 backdrop-blur-[1px]`}><section className={`my-4 w-full ${width} rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#24365f] dark:bg-[#0c1424]`}>{children}</section></div> }

function statusLabel(status: StockStatus, t: any) { return ({active:t.active,low:t.low,out:t.out,expiring:t.expiring,expired:t.expired})[status] }
function templateSize(template:string,w:number,h:number){ const sizes:Record<string,{w:number;h:number}>={'pos-40x30':{w:40,h:30},'a4-50x25':{w:50,h:25},'a4-40x30':{w:40,h:30},'a4-30x20':{w:30,h:20},'pos-80':{w:72,h:32},'pos-58':{w:50,h:28},'label-50x25':{w:50,h:25},'label-40x30':{w:40,h:30},'label-30x20':{w:30,h:20}}; return sizes[template]||{w:Math.max(10,w),h:Math.max(10,h)} }
function escapeHtml(value:unknown){ return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function printHtml(body:string,title:string){ const win=window.open('','_blank','width=1000,height=760'); if(!win)return; win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 4px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:12px}th{background:#f1f5f9}</style></head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script></body></html>`); win.document.close() }
function printLabelHtml(body:string,title:string){ const win=window.open('','_blank','width=420,height=420'); if(!win)return; win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><meta charset="utf-8"></head><body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script></body></html>`); win.document.close() }
