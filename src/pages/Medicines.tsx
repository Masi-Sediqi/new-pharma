import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import {
  Box, CalendarDays, Check, ChevronDown, Copy, Edit3, Eye, Package,
  Pill, Plus, Printer, RefreshCcw, Search, Trash2, X,
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

type Product = {
  id: string
  name: string
  brandName: string
  strength: string
  batchNo: string
  manufacturer: string
  prescriptionRequired: boolean
  packHierarchyEnabled: boolean
  packHierarchy: { boxLabel: string; stripsPerBox: number; stripLabel: string; tabletsPerStrip: number; unitLabel: string; stripSelling: number; tabletSelling: number }
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
  packHierarchyEnabled: true, packHierarchy: { boxLabel: 'Box', stripsPerBox: 10, stripLabel: 'Strip', tabletsPerStrip: 4, unitLabel: 'Tablet', stripSelling: 0, tabletSelling: 0 },
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
      boxLabel: asText(hierarchy.boxLabel, 'Box'),
      stripsPerBox: Math.max(1, n(hierarchy.stripsPerBox) || 10),
      stripLabel: asText(hierarchy.stripLabel, 'Strip'),
      tabletsPerStrip: Math.max(1, n(hierarchy.tabletsPerStrip) || 4),
      unitLabel: asText(hierarchy.unitLabel || hierarchy.tabletLabel, 'Tablet'),
      stripSelling: Math.max(0, n(hierarchy.stripSelling)),
      tabletSelling: Math.max(0, n(hierarchy.tabletSelling)),
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
  const [barcodeTemplate, setBarcodeTemplate] = useState('a4-50x25')
  const [barcodeCopies, setBarcodeCopies] = useState(1)
  const [customWidth, setCustomWidth] = useState(50)
  const [customHeight, setCustomHeight] = useState(25)
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setSearch(globalSearch)
  }, [globalSearch])

  const filtered = useMemo(() => products.filter((product) => {
    const q = search.trim().toLowerCase()
    const supplier = suppliers.find((s) => String(s.id) === String(product.supplierId))
    const searchable = [product.name, product.brandName, product.strength, product.batchNo, product.manufacturer, product.code, product.barcode, product.category, product.unit, supplierName(supplier)].join(' ').toLowerCase()
    if (q && !searchable.includes(q)) return false
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
    const status = statusOf(product)
    if (stockFilter !== 'all' && status !== stockFilter) return false
    if (!inTimeRange(product, timeFilter, dateFrom, dateTo)) return false
    return true
  }), [categoryFilter, dateFrom, dateTo, products, search, stockFilter, suppliers, timeFilter])

  const openAdd = () => {
    setEditingId(null); setDraft(emptyDraft()); setMargin(''); setFormError(''); setFormOpen(true)
  }
  const openEdit = (product: Product) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = product
    setEditingId(product.id); setDraft(rest); setMargin(''); setFormError(''); setFormOpen(true); setMenu(null)
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
      packHierarchyEnabled: Boolean(draft.packHierarchyEnabled),
      packHierarchy: { boxLabel: draft.packHierarchy.boxLabel.trim() || 'Box', stripsPerBox: Math.max(1, n(draft.packHierarchy.stripsPerBox) || 10), stripLabel: draft.packHierarchy.stripLabel.trim() || 'Strip', tabletsPerStrip: Math.max(1, n(draft.packHierarchy.tabletsPerStrip) || 4), unitLabel: draft.packHierarchy.unitLabel.trim() || 'Tablet', stripSelling: Math.max(0, n(draft.packHierarchy.stripSelling)), tabletSelling: Math.max(0, n(draft.packHierarchy.tabletSelling)) },
      createdAt: existing?.createdAt || now, updatedAt: now,
    }
    let nextProducts = editingId ? products.map((p) => p.id === editingId ? product : p) : [product, ...products]
    saveProductLinkedRecords(product, existing)
    const entries = load<GodownEntry[]>('godownEntries', [])
    if (product.quantity > 0) {
      const weighted = calculateWeightedAverageCost(product.id, entries, product.purchase)
      nextProducts = nextProducts.map((p) => p.id === product.id ? { ...p, purchase: weighted } : p)
    }
    setProducts(nextProducts); save('products', nextProducts); notifyDataChanged(); setFormOpen(false); toast.success(editingId ? t.edit : t.add, product.name)
  }

  const saveProductLinkedRecords = (product: Product, _previous?: Product) => {
    const now = new Date().toISOString(); const date = now.slice(0, 10); const ref = `product-purchase-${product.id}`
    const supplier = suppliers.find((s) => String(s.id) === String(product.supplierId))
    const total = round(product.quantity * product.purchase)
    let entries = load<GodownEntry[]>('godownEntries', []).filter((e) => e.referenceId !== ref)
    if (product.quantity > 0) {
      const entry: GodownEntry = {
        id: `godown-${product.id}`, type: 'import', movementType: 'Purchase', date, currency: product.currency, supplierId: product.supplierId,
        supplierName: supplierName(supplier), total, paid: 0, remaining: total, source: 'product-registration', referenceId: ref,
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
        totalPurchaseValue: total, paidAmount: 0, remainAmount: total, status: total <= 0 ? 'Paid' : 'Unpaid', notes: product.notes || 'Medicine registration purchase', source: 'product-registration', createdAt: now, updatedAt: now,
      }, ...purchases]
    }
    save('supplierPurchases', purchases)
  }

  const remove = (product: Product) => {
    setMenu(null); if (!window.confirm(t.confirmDelete)) return
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
    const rows = filtered.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.code || '-')}</td><td>${escapeHtml(p.category)}</td><td>${money(p.purchase, p.currency)}</td><td>${money(p.selling, p.currency)}</td><td>${money(p.selling - p.purchase, p.currency)}</td><td>${p.quantity} ${escapeHtml(p.unit)}</td><td>${statusLabel(statusOf(p), t)}</td></tr>`).join('')
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
          <select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className="form-control xl:w-40"><option value="all">{t.allCategories}</option>{categories.map((c)=><option key={c} value={c}>{localizeCategory(c, language)}</option>)}</select>
          <select value={stockFilter} onChange={(e)=>setStockFilter(e.target.value as StockFilter)} className="form-control xl:w-44">
            <option value="all">{t.allStock}</option><option value="active">{t.active}</option><option value="low">{t.low}</option><option value="out">{t.out}</option><option value="expiring">{t.expiring}</option><option value="expired">{t.expired}</option>
          </select>
          <div className="relative xl:w-36"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/><select value={timeFilter} onChange={(e)=>setTimeFilter(e.target.value)} className="form-control pl-9 rtl:pl-3 rtl:pr-9"><option value="all">{t.allTime}</option><option value="today">{t.today}</option><option value="week">{t.weekly}</option><option value="month">{t.monthly}</option><option value="year">{t.yearly}</option><option value="custom">{t.custom}</option></select></div>
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
              <tbody>{filtered.map((p)=><tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-[#1c2d4e]"><td className="px-3 py-4 font-semibold">{p.name}<div className="text-[11px] font-normal text-slate-400">{p.strength || p.brandName}</div></td><td className="px-3 py-4 font-mono text-xs">{p.code || '-'}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-white/10">{localizeCategory(p.category, language)}</span></td><td className="px-3 py-4">{money(p.purchase,p.currency)}</td><td className="px-3 py-4">{money(p.selling,p.currency)}</td><td className="px-3 py-4 text-emerald-500">{money(p.selling-p.purchase,p.currency)}</td><td className="px-3 py-4">{p.quantity} {localizeUnit(p.unit, language)}</td><td className="px-3 py-4"><StatusBadge status={statusOf(p)} text={t}/></td><td className="px-3 py-4"><button onClick={(event)=>{if(menu?.id===p.id){setMenu(null);return}const rect=event.currentTarget.getBoundingClientRect();const width=176;const height=174;const left=Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8));const top=rect.bottom+8+height<=window.innerHeight?rect.bottom+8:Math.max(8,rect.top-height-8);setMenu({id:p.id,top,left})}} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">•••</button>{menu?.id===p.id && <ActionMenu product={p} t={t} top={menu.top} left={menu.left} onClose={()=>setMenu(null)} onView={()=>{setViewProduct(p);setMenu(null)}} onEdit={()=>openEdit(p)} onBarcode={()=>{setBarcodeProduct(p);setMenu(null)}} onDelete={()=>remove(p)}/>}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && <MedicineModal language={language} t={t} draft={draft} setDraft={setDraft} editing={!!editingId} onClose={()=>setFormOpen(false)} onSubmit={submit} margin={margin} setMargin={setMargin} applyMargin={applyMargin} categories={categories} units={units} suppliers={suppliers} showCategoryAdd={showCategoryAdd} setShowCategoryAdd={setShowCategoryAdd} categoryNew={categoryNew} setCategoryNew={setCategoryNew} addCategory={addCategory} showUnitAdd={showUnitAdd} setShowUnitAdd={setShowUnitAdd} unitNew={unitNew} setUnitNew={setUnitNew} addUnit={addUnit} generateCode={generateCode} onAddSupplier={()=>{setSupplierDraft((s)=>({...s,currency:draft.currency}));setSupplierOpen(true)}} error={formError}/>} 
      {supplierOpen && <SupplierModal t={t} draft={supplierDraft} setDraft={setSupplierDraft} onClose={()=>setSupplierOpen(false)} onSubmit={createSupplier} onItemKey={supplierItemKey} addItem={addSupplierItem}/>} 
      {viewProduct && <ViewModal language={language} product={viewProduct} supplier={suppliers.find((s)=>s.id===viewProduct.supplierId)} t={t} onClose={()=>setViewProduct(null)}/>} 
      {barcodeProduct && <BarcodeModal product={barcodeProduct} t={t} onClose={()=>setBarcodeProduct(null)} template={barcodeTemplate} setTemplate={setBarcodeTemplate} copies={barcodeCopies} setCopies={setBarcodeCopies} customWidth={customWidth} setCustomWidth={setCustomWidth} customHeight={customHeight} setCustomHeight={setCustomHeight} onCopy={copyBarcode} onPrint={printBarcode}/>} 
    </div>
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
  const { language,t,draft,setDraft,editing,onClose,onSubmit,margin,setMargin,applyMargin,categories,units,suppliers,showCategoryAdd,setShowCategoryAdd,categoryNew,setCategoryNew,addCategory,showUnitAdd,setShowUnitAdd,unitNew,setUnitNew,addUnit,generateCode,onAddSupplier,error } = props
  return <ModalShell onClose={onClose} width="max-w-[650px]">
    <form onSubmit={onSubmit} className="max-h-[88vh] overflow-y-auto p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="inline-flex items-center gap-2 text-lg font-bold"><Pill size={21}/>{editing?t.editTitle:t.addTitle}</h2><button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18}/></button></div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`${t.name} *`}><input autoFocus value={draft.name} onChange={(e)=>setDraft((d:Draft)=>({...d,name:e.target.value}))} className="form-control"/></Field>
        <Field label={t.brand}><input value={draft.brandName} onChange={(e)=>setDraft((d:Draft)=>({...d,brandName:e.target.value}))} className="form-control"/></Field>
        <Field label={t.strength}><input value={draft.strength} onChange={(e)=>setDraft((d:Draft)=>({...d,strength:e.target.value}))} className="form-control" placeholder="e.g. 500 mg"/></Field>
        <Field label={t.batch}><input value={draft.batchNo} onChange={(e)=>setDraft((d:Draft)=>({...d,batchNo:e.target.value}))} className="form-control" placeholder="B-12345"/></Field>
        <Field label={t.codeOptional} full><div className="flex gap-2"><input value={draft.code} onChange={(e)=>setDraft((d:Draft)=>({...d,code:e.target.value}))} className="form-control"/><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,code:generateCode()}))} className="h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-xs dark:border-[#24365f]">{t.generate}</button></div></Field>
        <Field label={t.barcode} full><div className="flex gap-2"><input value={draft.barcode} onChange={(e)=>setDraft((d:Draft)=>({...d,barcode:e.target.value.trim()}))} onKeyDown={(e)=>{if(e.key==='Enter')e.preventDefault()}} className="form-control font-mono" placeholder="scanner auto-fills"/><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,barcode:generateBarcodeValue()}))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><RefreshCcw size={16}/></button></div></Field>
        <Field label={t.categoryLabel} full><div className="flex gap-2"><select value={draft.category} onChange={(e)=>setDraft((d:Draft)=>({...d,category:e.target.value}))} className="form-control">{categories.map((c:string)=><option key={c} value={c}>{localizeCategory(c, language)}</option>)}</select><button type="button" onClick={()=>setShowCategoryAdd(!showCategoryAdd)} className="h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-[#24365f]"><Plus size={15}/></button></div>{showCategoryAdd&&<div className="mt-2 flex gap-2"><input value={categoryNew} onChange={(e)=>setCategoryNew(e.target.value)} className="form-control"/><button type="button" onClick={addCategory} className="rounded-lg bg-[#172a57] px-3 text-xs font-bold text-white">{t.addCategory}</button></div>}</Field>
        <Field label={t.manufacturer}><input value={draft.manufacturer} onChange={(e)=>setDraft((d:Draft)=>({...d,manufacturer:e.target.value}))} className="form-control"/></Field>
        <Field label={t.expiry}><input type="date" value={draft.expiry} onChange={(e)=>setDraft((d:Draft)=>({...d,expiry:e.target.value}))} className="form-control"/></Field>
        <Field label={t.alertBefore}><div className="flex gap-2"><select value={draft.alertBefore} onChange={(e)=>setDraft((d:Draft)=>({...d,alertBefore:Number(e.target.value)}))} className="form-control">{alertOptions.map((v)=><option key={v} value={v}>{v} {t.days}</option>)}</select></div></Field>
        <Field label={t.purchasePrice}><input type="number" min="0" step="0.01" value={draft.purchase} onChange={(e)=>setDraft((d:Draft)=>({...d,purchase:n(e.target.value)}))} className="form-control"/></Field>
        <Field label={t.sellingPrice}><input type="number" min="0" step="0.01" value={draft.selling} onChange={(e)=>setDraft((d:Draft)=>({...d,selling:n(e.target.value)}))} className="form-control"/></Field>
        <Field label={t.margin} full><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#24365f] dark:bg-white/5"><div className="flex gap-2"><input value={margin} onChange={(e)=>setMargin(e.target.value.replace(/[^\d.]/g,''))} className="form-control" placeholder="e.g. 30"/><button type="button" onClick={applyMargin} className="shrink-0 rounded-lg bg-slate-500 px-4 text-xs font-bold text-white">{t.applyPercent}</button></div><div className="mt-2 text-[10px] text-slate-400">{t.marginHint}</div></div></Field>
        <Field label={t.quantity}><input type="number" min="0" step="any" value={draft.quantity} onChange={(e)=>setDraft((d:Draft)=>({...d,quantity:n(e.target.value)}))} className="form-control"/></Field>
        <Field label={t.unit}><div className="flex gap-2"><select value={draft.unit} onChange={(e)=>setDraft((d:Draft)=>({...d,unit:e.target.value}))} className="form-control">{units.map((u:string)=><option key={u} value={u}>{localizeUnit(u, language)}</option>)}</select><button type="button" onClick={()=>setShowUnitAdd(!showUnitAdd)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={15}/></button></div>{showUnitAdd&&<div className="mt-2 flex gap-2"><input value={unitNew} onChange={(e)=>setUnitNew(e.target.value)} className="form-control"/><button type="button" onClick={addUnit} className="rounded-lg bg-[#172a57] px-3 text-xs font-bold text-white">{t.addCategory}</button></div>}</Field>
        <Field label={t.currency}><select value={draft.currency} onChange={(e)=>setDraft((d:Draft)=>({...d,currency:e.target.value}))} className="form-control">{currencies.map((c)=><option key={c}>{c}</option>)}</select></Field>
        <Field label={t.lowStockLimit}><input type="number" min="0" step="any" value={draft.lowStock} onChange={(e)=>setDraft((d:Draft)=>({...d,lowStock:n(e.target.value)}))} className="form-control"/><div className="mt-1 text-[10px] text-slate-400">{t.lowStockHint}</div></Field>
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#24365f] dark:bg-white/[0.03]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-bold"><Package size={16}/>{t.packHierarchy}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.packHint}</div>
          </div>
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold">{language==='English'?'Box label':language==='دری'?'نام قطعی':'د بکس نوم'}</span>
              <input value={draft.packHierarchy.boxLabel} onChange={(e)=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:true,packHierarchy:{...d.packHierarchy,boxLabel:e.target.value}}))} className="form-control" placeholder="Box"/>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold">{language==='English'?'Strips per box':language==='دری'?'تعداد پته در هر قطعی':'په هر بکس کې پټې'}</span>
              <input type="number" min="1" step="1" value={draft.packHierarchy.stripsPerBox} onChange={(e)=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:true,packHierarchy:{...d.packHierarchy,stripsPerBox:n(e.target.value)}}))} className="form-control"/>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold">{language==='English'?'Strip label':language==='دری'?'نام پته':'د پټې نوم'}</span>
              <input value={draft.packHierarchy.stripLabel} onChange={(e)=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:true,packHierarchy:{...d.packHierarchy,stripLabel:e.target.value}}))} className="form-control" placeholder="Strip"/>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold">{language==='English'?'Units per strip':language==='دری'?'تعداد تابلیت در هر پته':'په هره پټه کې واحدونه'}</span>
              <input type="number" min="1" step="1" value={draft.packHierarchy.tabletsPerStrip} onChange={(e)=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:true,packHierarchy:{...d.packHierarchy,tabletsPerStrip:n(e.target.value)}}))} className="form-control"/>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold">{language==='English'?'Unit label':language==='دری'?'نام واحد':'د واحد نوم'}</span>
              <input value={draft.packHierarchy.unitLabel} onChange={(e)=>setDraft((d:Draft)=>({...d,packHierarchyEnabled:true,packHierarchy:{...d.packHierarchy,unitLabel:e.target.value}}))} className="form-control" placeholder="Tablet"/>
            </label>
          </div>
        </div>
        <Field label={t.prescription} full><button type="button" onClick={()=>setDraft((d:Draft)=>({...d,prescriptionRequired:!d.prescriptionRequired}))} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-start dark:border-[#24365f]"><span><b className="text-xs">{t.prescription}</b><span className="mt-1 block text-[10px] text-slate-400">{t.prescriptionHint}</span></span>{draft.prescriptionRequired?<Check size={20} className="text-emerald-500"/>:<span className="h-5 w-5 rounded-md border border-slate-300 dark:border-slate-600"/>}</button></Field>
        <Field label={t.supplier} full><div className="rounded-xl border border-slate-200 p-3 dark:border-[#24365f]"><div className="mb-2 text-[10px] text-slate-400">{t.supplierHint}</div><div className="flex gap-2"><select value={draft.supplierId} onChange={(e)=>setDraft((d:Draft)=>({...d,supplierId:e.target.value}))} className="form-control"><option value="">{t.selectSupplier}</option>{suppliers.map((s:Supplier)=><option key={s.id} value={s.id}>{supplierName(s)}</option>)}</select><button type="button" onClick={onAddSupplier} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={16}/></button></div></div></Field>
      </div>
      <button className="mt-5 h-10 w-full rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">{editing?t.update:t.save}</button>
    </form>
  </ModalShell>
}

function SupplierModal({ t,draft,setDraft,onClose,onSubmit,onItemKey,addItem }: any) {
  return <ModalShell onClose={onClose} width="max-w-[500px]" z="z-[95]"><form onSubmit={onSubmit} className="max-h-[85vh] overflow-y-auto p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{t.supplierTitle}</h2><button type="button" onClick={onClose}><X size={18}/></button></div><div className="grid gap-4 sm:grid-cols-2"><Field label={`${t.supplierName} *`} full><input autoFocus value={draft.name} onChange={(e)=>setDraft((s:any)=>({...s,name:e.target.value}))} className="form-control"/></Field><Field label={t.phone}><input value={draft.phone} onChange={(e)=>setDraft((s:any)=>({...s,phone:e.target.value}))} className="form-control"/></Field><Field label={t.businessType}><input value={draft.businessType} onChange={(e)=>setDraft((s:any)=>({...s,businessType:e.target.value}))} className="form-control"/></Field><Field label={t.address} full><input value={draft.address} onChange={(e)=>setDraft((s:any)=>({...s,address:e.target.value}))} className="form-control"/></Field><Field label={t.currency} full><select value={draft.currency} onChange={(e)=>setDraft((s:any)=>({...s,currency:e.target.value}))} className="form-control">{currencies.map((c)=><option key={c}>{c}</option>)}</select></Field><Field label={t.items} full><div className="flex gap-2"><input value={draft.item} onChange={(e)=>setDraft((s:any)=>({...s,item:e.target.value}))} onKeyDown={onItemKey} className="form-control"/><button type="button" onClick={addItem} className="rounded-lg border border-slate-200 px-3 text-xs dark:border-[#24365f]">{t.addCategory}</button></div>{draft.items.length>0&&<div className="mt-2 flex flex-wrap gap-1">{draft.items.map((item:string)=><span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] dark:bg-white/10">{item}</span>)}</div>}</Field><Field label={t.notes} full><textarea value={draft.notes} onChange={(e)=>setDraft((s:any)=>({...s,notes:e.target.value}))} className="form-control min-h-[74px] py-2"/></Field><Field label={t.openingBalance} full><input type="number" step="0.01" value={draft.balance} onChange={(e)=>setDraft((s:any)=>({...s,balance:n(e.target.value)}))} className="form-control"/></Field></div><div className="mt-5 flex gap-2"><button className="h-10 flex-1 rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">{t.createSupplier}</button><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm dark:border-[#24365f]">{t.cancel}</button></div></form></ModalShell>
}

function ViewModal({ language,product,supplier,t,onClose }: any) { return <ModalShell onClose={onClose} width="max-w-[560px]"><div className="p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{t.details}</h2><button onClick={onClose}><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2">{[[t.name,product.name],[t.code,product.code||'-'],[t.brandLabel,product.brandName||'-'],[t.category,localizeCategory(product.category, language)],[t.batchLabel,product.batchNo||'-'],[t.manufacturerLabel,product.manufacturer||'-'],[t.purchase,money(product.purchase,product.currency)],[t.selling,money(product.selling,product.currency)],[t.stock,`${product.quantity} ${localizeUnit(product.unit, language)}`],[t.expiryLabel,product.expiry||'-'],[t.supplierLabel,supplierName(supplier)||'-']].map(([a,b])=><div key={a} className="rounded-lg border border-slate-200 p-3 dark:border-[#24365f]"><div className="text-[10px] text-slate-400">{a}</div><div className="mt-1 text-sm font-semibold">{b}</div></div>)}</div></div></ModalShell> }

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
