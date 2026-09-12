import { Component, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  Archive, Banknote, Box, CalendarDays, Check, CircleDollarSign, Clock3, Package, RefreshCcw,
  Crown, ShieldCheck, ShoppingCart, TrendingUp, User, Users, RotateCcw, Warehouse, ArrowLeft, Search, Printer, Plus, Filter, Tag, Truck, MoreHorizontal, Edit3, Trash2, WalletCards, X
} from 'lucide-react'
import Header from './components/Header'
import QuickActions from './components/QuickActions'
import Sidebar from './components/Sidebar'
import ToastHost from './components/ToastHost'
import type { Page } from './components/Sidebar'
import StatCard from './components/StatCard'
import TrendChart from './components/TrendChart'
import { dashboardText, rtlLanguages } from './i18n'
import Settings from './Settings'
import Suppliers from './pages/Suppliers'
import SupplierDetails from './pages/SupplierDetails'
import Billing from './pages/Billing'
import type { Language } from './i18n'
import type { ThemeName } from './theme'

const Medicines = lazy(() => import('./pages/Medicines'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'))
const Staff = lazy(() => import('./pages/Staff'))
const StaffDetails = lazy(() => import('./pages/StaffDetails'))
const Sales = lazy(() => import('./pages/Sales'))
const Godown = lazy(() => import('./pages/Godown'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Loans = lazy(() => import('./pages/Loans'))
const Financials = lazy(() => import('./pages/Financials'))
const Reports = lazy(() => import('./pages/Reports'))
const RecycleBin = lazy(() => import('./pages/RecycleBin'))



type PageErrorBoundaryProps = {
  children: ReactNode
  onReset: () => void
  pageName?: string
}

type PageErrorBoundaryState = {
  error: Error | null
}

class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render failed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-slate-900 shadow-sm dark:border-red-500/30 dark:bg-red-950/20 dark:text-white">
        <div className="text-base font-bold text-red-600 dark:text-red-300">{this.props.pageName || 'Page'} error</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {this.props.pageName || 'This page'} could not load. The rest of the system is still available.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs text-red-700 dark:bg-black/20 dark:text-red-200">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => { this.setState({ error: null }); this.props.onReset() }}
          className="mt-4 h-9 rounded-lg bg-[#172a57] px-4 text-sm font-semibold text-white dark:bg-amber-500 dark:text-slate-950"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }
}

const money = '0.00 ؋'
type DashboardFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
type AccountUser = { id: string; username: string; displayName: string; password?: string; role?: string; active?: boolean; permissions?: Record<string, Record<string, boolean>> }
type CurrentAccount = { id: string; username: string; displayName: string; admin?: boolean; permissions?: AccountUser['permissions'] }

const ACCOUNT_KEY = 'pharma-current-account'
const LOGGED_OUT_KEY = 'pharma-logged-out'
const PAGE_MODULE: Record<Page, string> = {
  dashboard: 'dashboard',
  medicines: 'products',
  billing: 'billing',
  sales: 'sales',
  staff: 'staff',
  customers: 'customers',
  godown: 'godown',
  suppliers: 'suppliers',
  expenses: 'expenses',
  loans: 'loans',
  financials: 'financials',
  reports: 'reports',
  recycle: 'recycle',
  settings: 'settings',
}

function readAccounts(): AccountUser[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('accounts') || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readAdminSecurityPassword(): string {
  try {
    const parsed = JSON.parse(localStorage.getItem('settings') || '[]')
    const settings = Array.isArray(parsed) ? parsed[0] : parsed
    return String(settings?.securitySettings?.password || '')
  } catch {
    return ''
  }
}

function canReadPage(account: CurrentAccount | null, page: Page) {
  if (!account) return false
  if (account.admin) return true
  const module = PAGE_MODULE[page]
  const permissions = account.permissions?.[module]
  return !!(permissions?.all || permissions?.read)
}

function AccountSelector({ isRtl, language, onSelect }: { isRtl: boolean; language: Language; onSelect: (account: CurrentAccount) => void }) {
  const [accounts, setAccounts] = useState<AccountUser[]>(readAccounts)
  const [selected, setSelected] = useState<AccountUser | 'admin' | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const title = language === 'English' ? 'Select your account to continue' : language === 'پښتو' ? 'د دوام لپاره خپل حساب وټاکئ' : 'برای ادامه حساب خود را انتخاب کنید'
  const adminTitle = language === 'English' ? 'Administrator' : language === 'پښتو' ? 'مدیر سیستم' : 'مدیر سیستم'
  const adminSub = language === 'English' ? 'Full system access' : language === 'پښتو' ? 'د ټول سیستم لاسرسی' : 'دسترسی کامل سیستم'
  const vip = language === 'English' ? 'Use emergency VIP key' : language === 'پښتو' ? 'بیړنی VIP کیلي وکاروئ' : 'استفاده از کلید اضطراری VIP'
  const passwordLabel = language === 'English' ? 'Password' : language === 'پښتو' ? 'پټ نوم' : 'رمز عبور'
  const loginLabel = language === 'English' ? 'Login' : language === 'پښتو' ? 'ننوتل' : 'ورود'
  const wrongPassword = language === 'English' ? 'Incorrect password.' : language === 'پښتو' ? 'پټ نوم سم نه دی.' : 'رمز عبور درست نیست.'

  useEffect(() => {
    const refresh = () => setAccounts(readAccounts())
    window.addEventListener('pharma:data-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pharma:data-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const activeAccounts = accounts.filter((account) => account.active !== false)
  const login = () => {
    if (!selected) return
    if (selected === 'admin') {
      const adminPassword = readAdminSecurityPassword()
      if (adminPassword !== password) {
        setError(wrongPassword)
        return
      }
      onSelect({ id: 'admin', username: 'admin', displayName: adminTitle, admin: true })
      return
    }
    if (String(selected.password || '') !== password) {
      setError(wrongPassword)
      return
    }
    onSelect({ id: selected.id, username: selected.username, displayName: selected.displayName || selected.username, permissions: selected.permissions })
  }

  return (
    <div className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-[450px] rounded-xl border border-white/70 bg-white/95 p-6 text-slate-950 shadow-2xl dark:border-[#314260] dark:bg-[#101827]/95 dark:text-white">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-[#172a57] dark:bg-white/10 dark:text-amber-400">
          <ShieldCheck size={32} />
        </div>
        <h2 className="mt-5 text-center text-2xl font-extrabold">Smart Pharma</h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-300">{title}</p>
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => { setSelected('admin'); setPassword(''); setError('') }}
            className={`flex w-full items-center gap-4 rounded-xl border border-dashed bg-white px-4 py-3 text-start transition hover:border-amber-400 hover:bg-amber-50 dark:bg-white/5 dark:hover:bg-amber-500/10 ${selected === 'admin' ? 'border-amber-400 ring-2 ring-amber-400/25 dark:border-amber-400' : 'border-slate-300 dark:border-[#314260]'}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"><Crown size={20}/></span>
            <span className="min-w-0"><b className="block">{adminTitle}</b><small className="text-slate-500 dark:text-slate-300">{adminSub}</small></span>
          </button>
          {activeAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => { setSelected(account); setPassword(''); setError('') }}
              className={`flex w-full items-center gap-4 rounded-xl border bg-white px-4 py-3 text-start transition hover:border-[#172a57] hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 ${selected !== 'admin' && selected?.id === account.id ? 'border-[#172a57] ring-2 ring-[#172a57]/15 dark:border-amber-400 dark:ring-amber-400/20' : 'border-slate-200 dark:border-[#314260]'}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-extrabold text-[#172a57] dark:bg-white/10 dark:text-white">{(account.displayName || account.username || 'U').slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0"><b className="block truncate">{account.displayName || account.username}</b><small className="text-slate-500 dark:text-slate-300">@{account.username}</small></span>
            </button>
          ))}
        </div>
        {selected && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#314260] dark:bg-white/5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">{passwordLabel}</label>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError('') }}
              onKeyDown={(event) => { if (event.key === 'Enter') login() }}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#172a57] focus:ring-2 focus:ring-[#172a57]/20 dark:border-[#314260] dark:bg-[#0c1424] dark:text-white dark:focus:border-amber-400 dark:focus:ring-amber-400/20"
            />
            {error && <div className="mt-2 text-xs font-semibold text-red-500 dark:text-red-300">{error}</div>}
            <button type="button" onClick={login} className="mt-3 h-10 w-full rounded-lg bg-[#172a57] text-sm font-extrabold text-white transition hover:bg-[#22376b] dark:bg-amber-500 dark:text-slate-950">
              {loginLabel}
            </button>
          </div>
        )}
        <button type="button" className="mx-auto mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
          <Crown size={15}/>{vip}
        </button>
      </div>
    </div>
  )
}

const dashboardFilterLabels: Record<Language, Record<DashboardFilter, string>> = {
  English: { all: 'All time', today: 'Today', week: 'Weekly', month: 'Monthly', year: 'Yearly', custom: 'Custom' },
  دری: { all: 'همه وقت', today: 'امروز', week: 'هفتگی', month: 'ماهانه', year: 'سالانه', custom: 'سفارشی' },
  پښتو: { all: 'ټول وخت', today: 'نن', week: 'اونیز', month: 'میاشتنی', year: 'کلنی', custom: 'ځانګړی' },
}

const dashboardFilterOrder: DashboardFilter[] = ['all', 'today', 'week', 'month', 'year', 'custom']

function readCollection(key: string): any[] {
  try { const raw = localStorage.getItem(key); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
const num = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0
const formatDashboardMoney = (value: number) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ؋`
const dashboardCurrencySymbol = (currency: unknown) => {
  const code = String(currency || 'AFN').toUpperCase()
  if (code === 'USD') return '$'
  if (code === 'EUR') return '€'
  if (code === 'GBP') return '£'
  if (code === 'AFN') return '؋'
  return code
}
const addCurrencyAmount = (totals: Record<string, number>, currency: unknown, amount: number) => {
  const code = String(currency || 'AFN').toUpperCase()
  totals[code] = (totals[code] || 0) + num(amount)
  return totals
}
const formatCurrencyTotals = (totals: Record<string, number>) => {
  const entries = Object.entries(totals).filter(([, amount]) => Math.abs(num(amount)) > 0.000001)
  if (!entries.length) return '0.00 ؋'
  const preferred = ['AFN', 'USD', 'EUR', 'GBP']
  entries.sort(([a], [b]) => {
    const ai = preferred.indexOf(a); const bi = preferred.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return entries.map(([currency, amount]) => {
    const value = num(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const symbol = dashboardCurrencySymbol(currency)
    return currency === 'USD' || currency === 'EUR' || currency === 'GBP' ? `${symbol}${value}` : `${value} ${symbol}`
  }).join('\n')
}
const currencyMatches = (recordCurrency: unknown, filterCurrency: string) => !filterCurrency || filterCurrency === 'all' || String(recordCurrency || 'AFN').toUpperCase() === filterCurrency.toUpperCase()

function recordDate(record: any): Date | null {
  const raw = record?.createdAt || record?.updatedAt || record?.date || record?.invoiceDate || record?.expenseDate || record?.purchaseDate || record?.paidAt
  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
}

function dashboardTimeAgo(value: unknown) {
  const date = value ? new Date(String(value)) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'less than a minute ago'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function isWithinDashboardFilter(record: any, filter: DashboardFilter) {
  if (filter === 'all' || filter === 'custom') return true
  const date = recordDate(record)
  if (!date) return false
  const now = new Date()
  const start = new Date(now)
  if (filter === 'today') start.setHours(0, 0, 0, 0)
  if (filter === 'week') start.setDate(now.getDate() - 7)
  if (filter === 'month') start.setMonth(now.getMonth() - 1)
  if (filter === 'year') start.setFullYear(now.getFullYear() - 1)
  return date >= start && date <= now
}

type DashboardDetailView = 'sales' | 'expenses' | 'loans' | 'refunds' | 'customers' | 'supplier-payables' | 'supplier-receivables' | 'medicines' | 'stock' | 'staff-payroll'

function Dashboard({ filter, language, onFilterChange, onNavigate, onOpenRevenue, onOpenCashWallet, onOpenNetProfit, onOpenPureProfit, onOpenDetail }: { filter: DashboardFilter; language: Language; onFilterChange: (filter: DashboardFilter) => void; onNavigate: (page: Page) => void; onOpenRevenue: () => void; onOpenCashWallet: () => void; onOpenNetProfit: () => void; onOpenPureProfit: () => void; onOpenDetail: (view: DashboardDetailView) => void }) {
  const t = dashboardText[language]
  const [filterOpen, setFilterOpen] = useState(false)
  const filterLabels = dashboardFilterLabels[language]
  const [, setDataVersion] = useState(0)
  useEffect(() => {
    const refresh = () => setDataVersion((v) => v + 1)
    window.addEventListener('pharma:data-changed', refresh)
    window.addEventListener('app-currency-changed', refresh)
    window.addEventListener('cash-wallet-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pharma:data-changed', refresh)
      window.removeEventListener('app-currency-changed', refresh)
      window.removeEventListener('cash-wallet-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const businessCurrencyFilter = localStorage.getItem('isp-primary-currency') || 'all'
  const products = readCollection('products')
  const allInvoices = readCollection('billingInvoices')
  const allExpenses = readCollection('expenses')
  const allCustomers = readCollection('customers')
  const allStaffData = readCollection('staff')
  const suppliersData = readCollection('suppliers')
  const allSupplierPurchases = readCollection('supplierPurchases')
  const allGodownEntries = readCollection('godownEntries')
  const allTransactions = readCollection('transactions')
  const invoices = allInvoices.filter((item) => isWithinDashboardFilter(item, filter) && currencyMatches(item.currency, businessCurrencyFilter))
  const expenses = allExpenses.filter((item) => isWithinDashboardFilter(item, filter) && currencyMatches(item.currency, businessCurrencyFilter))
  const customers = allCustomers.filter((item) => isWithinDashboardFilter(item, filter))
  const staffData = allStaffData.filter((item) => isWithinDashboardFilter(item, filter))
  const supplierPurchases = allSupplierPurchases.filter((item) => isWithinDashboardFilter(item, filter) && currencyMatches(item.currency, businessCurrencyFilter))
  const godownEntries = allGodownEntries.filter((item) => isWithinDashboardFilter(item, filter) && currencyMatches(item.currency, businessCurrencyFilter))
  const transactions = allTransactions.filter((item) => isWithinDashboardFilter(item, filter) && currencyMatches(item.currency, businessCurrencyFilter))
  const stockSource = (filter === 'all' || filter === 'custom' ? products : products.filter((item) => isWithinDashboardFilter(item, filter))).filter((item) => currencyMatches(item.currency, businessCurrencyFilter))
  const activeProducts = stockSource.filter((p) => num(p.quantity ?? p.stock ?? p.qty) > 0).length
  const stockQuantity = stockSource.reduce((sum, p) => sum + Math.max(0, num(p.quantity ?? p.stock ?? p.qty)), 0)
  const globalStockValue = stockSource.reduce((sum, p) => sum + Math.max(0, num(p.quantity ?? p.stock ?? p.qty)) * Math.max(0, num(p.purchase ?? p.purchasePrice ?? p.cost)), 0)
  const totalRevenue = invoices.reduce((sum, inv) => sum + num(inv.total), 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + num(inv.paidAmount ?? inv.paid), 0)
  const pendingPayments = invoices.reduce((sum, inv) => sum + num(inv.balance ?? inv.remaining), 0)
  const pureProfit = invoices.reduce((sum, inv) => sum + num(inv.profit), 0)
  const totalRefundsValue = invoices.reduce((sum, inv) => sum + num(inv.refundTotal), 0)
  const totalExpensesValue = expenses.reduce((sum, e) => sum + num(e.amountBase ?? e.amount ?? e.total), 0)
  const netProfit = pureProfit - totalExpensesValue
  const currentWalletByCurrency: Record<string, number> = {}
  invoices.forEach((inv:any) => addCurrencyAmount(currentWalletByCurrency, inv.currency || 'AFN', num(inv.paidAmount ?? inv.paid)))
  expenses.forEach((expense:any) => addCurrencyAmount(currentWalletByCurrency, expense.currency || 'AFN', -num(expense.amountBase ?? expense.amount ?? expense.total)))
  transactions
    .filter((tx:any) => tx.source === 'cash-wallet' && (tx.referenceSource === 'manual-cash-wallet' || String(tx.id || '').startsWith('wallet-')))
    .forEach((tx:any) => {
      const withdraw = String(tx.type).toLowerCase() === 'expense' || String(tx.transactionType).toLowerCase() === 'withdraw'
      addCurrencyAmount(currentWalletByCurrency, tx.currency || 'AFN', withdraw ? -num(tx.amount) : num(tx.amount))
    })
  transactions
    .filter((tx:any) => tx.source === 'product-registration-wallet')
    .forEach((tx:any) => addCurrencyAmount(currentWalletByCurrency, tx.currency || 'AFN', -num(tx.amount)))
  transactions
    .filter((tx:any) => tx.source === 'cash-wallet' && tx.referenceSource === 'godown-purchase')
    .forEach((tx:any) => addCurrencyAmount(currentWalletByCurrency, tx.currency || 'AFN', -num(tx.amount)))
  const currentWalletDisplay = formatCurrencyTotals(currentWalletByCurrency)
  const supplierAdjustments = godownEntries.flatMap((entry) => Array.isArray(entry.adjustments) ? entry.adjustments.map((a: any) => ({...a, supplierId: a.supplierId || entry.supplierId})) : [])
  const supplierBalances = suppliersData.map((supplier) => {
    const opening = num(supplier.openingBalance ?? supplier.balance)
    const purchases = supplierPurchases.filter((p) => String(p.supplierId || '') === String(supplier.id || '') || p.supplierName === supplier.name)
    const purchaseRemain = purchases.reduce((sum, p) => sum + num(p.totalPurchaseValue) - num(p.paidAmount), 0)
    const adjustments = supplierAdjustments.filter((a) => String(a.supplierId || '') === String(supplier.id || '')).reduce((sum, a) => sum + (String(a.type).toLowerCase() === 'credit' ? -num(a.amount) : num(a.amount)), 0)
    return opening + purchaseRemain + adjustments
  })
  const totalPayablesValue = supplierBalances.filter((x) => x > 0).reduce((a,b) => a+b,0)
  const totalReceivablesValue = supplierBalances.filter((x) => x < 0).reduce((a,b) => a+Math.abs(b),0)
  const staffPaid = staffData.reduce((sum, s) => sum + (Array.isArray(s.payrollHistory) ? s.payrollHistory.reduce((a:any,p:any)=>a+num(p.paidAmountBase ?? p.paidAmount ?? p.amount),0) : 0), 0)
  const staffPayable = staffData.reduce((sum, s) => { const h=Array.isArray(s.payrollHistory)?s.payrollHistory:[]; const latest=new Map<string,number>(); h.forEach((p:any)=>latest.set(`${p.start||''}_${p.end||''}_${p.currency||s.currency||'AFN'}`,num(p.payable))); return sum+[...latest.values()].reduce((a,b)=>a+b,0) },0)

  const recentActivity = [
    ...allInvoices.flatMap((invoice: any) => {
      const rows: any[] = [{
        id: `sale-${invoice.id}`,
        kind: 'sale',
        title: 'New Sale Created',
        detail: `Invoice ${invoice.invoiceNo || invoice.invoiceNumber || invoice.id} - ${formatDashboardMoney(num(invoice.total))}`,
        at: invoice.createdAt || invoice.updatedAt || invoice.date,
      }]
      const refunds = Array.isArray(invoice.refundHistory) ? invoice.refundHistory : []
      refunds.forEach((refund: any) => rows.push({
        id: `refund-${invoice.id}-${refund.id || refund.createdAt || refund.date}`,
        kind: 'refund',
        title: 'Refund processed',
        detail: `Refund of ${formatDashboardMoney(num(refund.amount))} for ${invoice.invoiceNo || invoice.invoiceNumber || invoice.id}${refund.note ? `. Reason: ${refund.note}` : ''}`,
        at: refund.createdAt || refund.date || invoice.updatedAt,
      }))
      return rows
    }),
    ...allGodownEntries.map((entry: any) => ({
      id: `stock-${entry.id || entry.referenceId || entry.createdAt}`,
      kind: 'stock',
      title: 'Stock Updated',
      detail: `Stock ${String(entry.type || '').toLowerCase().includes('out') ? 'deducted' : 'updated'} for ${Math.max(1, num(entry.quantity || entry.qty || 1))} product(s)`,
      at: entry.createdAt || entry.updatedAt || entry.date,
    })),
    ...allTransactions
      .filter((tx: any) => String(tx.referenceSource || '') === 'billing-payment')
      .map((tx: any) => ({
        id: `payment-${tx.id}`,
        kind: 'payment',
        title: 'Payment Recorded',
        detail: `${formatDashboardMoney(num(tx.amount))}${tx.referenceId ? ` - ${tx.referenceId}` : ''}`,
        at: tx.createdAt || tx.date,
      })),
  ]
    .filter((item: any) => item.at && !Number.isNaN(new Date(item.at).getTime()))
    .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10)

  return (
    <div className="w-full">
      <div className="mb-5 -mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-950 dark:text-white">{t.dashboard}</h1>
          <p className="text-sm text-slate-500 dark:text-sky-200">{t.welcome}</p>
        </div>
        <div className="relative z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className="flex h-10 min-w-[140px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-soft transition hover:border-amber-400 dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white"
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {filterLabels[filter]}
            </span>
            <span className="text-slate-400">⌄</span>
          </button>
          {filterOpen && (
            <div className="absolute top-11 w-[142px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm text-slate-900 shadow-lg ltr:right-0 rtl:left-0 dark:border-[#24365f] dark:bg-[#101827] dark:text-white">
              {dashboardFilterOrder.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onFilterChange(item)
                    setFilterOpen(false)
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-start hover:bg-slate-50 dark:hover:bg-white/5 ${filter === item ? 'bg-amber-500 text-black hover:bg-amber-500' : ''}`}
                >
                  <span>{filterLabels[item]}</span>
                  {filter === item && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold">{t.financial}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t.totalRevenue} value={formatDashboardMoney(totalRevenue)} icon={CircleDollarSign} accent="green" onClick={onOpenRevenue} />
        <StatCard title={t.currentWallet} value={currentWalletDisplay} icon={Banknote} accent="green" onClick={onOpenCashWallet} />
        <StatCard title={t.netProfit} value={formatDashboardMoney(netProfit)} icon={TrendingUp} accent="green" onClick={onOpenNetProfit} />
        <StatCard title={t.pureProfit} value={formatDashboardMoney(pureProfit)} icon={TrendingUp} accent="green" onClick={onOpenPureProfit} />
        <StatCard title={t.totalSales} value={String(invoices.length)} icon={ShoppingCart} accent="blue" onClick={() => onOpenDetail('sales')} />
        <StatCard title={t.totalExpenses} value={formatDashboardMoney(totalExpensesValue)} icon={Banknote} accent="navy" onClick={() => onOpenDetail('expenses')} />
        <StatCard title={t.pendingPayments} value={formatDashboardMoney(pendingPayments)} icon={Clock3} accent="orange" onClick={() => onOpenDetail('loans')} />
        <StatCard title={t.totalRefunds} value={formatDashboardMoney(totalRefundsValue)} icon={RefreshCcw} accent="red" onClick={() => onOpenDetail('refunds')} />
        <StatCard title={t.totalCustomers} value={String(customers.length)} icon={Users} accent="navy" onClick={() => onOpenDetail('customers')} />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.suppliers}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.totalPayables} value={formatDashboardMoney(totalPayablesValue)} icon={Banknote} accent="orange" onClick={() => onOpenDetail('supplier-payables')} />
        <StatCard title={t.totalReceivables} value={formatDashboardMoney(totalReceivablesValue)} icon={TrendingUp} accent="green" onClick={() => onOpenDetail('supplier-receivables')} />
        <StatCard title={t.netBalance} value={formatDashboardMoney(totalPayablesValue-totalReceivablesValue)} icon={CircleDollarSign} accent="navy" onClick={() => onNavigate('suppliers')} />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.stock}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.activeProducts} value={String(activeProducts)} icon={Box} accent="navy" onClick={() => onOpenDetail('medicines')} />
        <StatCard title={t.stockQuantity} value={String(stockQuantity)} icon={Package} accent="navy" onClick={() => onOpenDetail('stock')} />
        <StatCard title={t.globalStockValue} value={formatDashboardMoney(globalStockValue)} icon={Archive} accent="orange" onClick={() => onOpenDetail('stock')} />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.staff}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.totalStaff} value={String(staffData.length)} icon={User} accent="navy" onClick={() => onNavigate('staff')} />
        <StatCard title={t.staffPayable} value={formatDashboardMoney(staffPayable)} icon={Banknote} accent="orange" onClick={() => onOpenDetail('staff-payroll')} />
        <StatCard title={t.staffPaid} value={formatDashboardMoney(staffPaid)} icon={CircleDollarSign} accent="green" onClick={() => onOpenDetail('staff-payroll')} />
      </div>

      <div className="mt-7"><TrendChart invoices={invoices} expenses={expenses} filter={filter} language={language} /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[470px_1fr]">
        <QuickActions onNavigate={onNavigate} />
        <section className="app-panel min-h-[228px] rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
          <h3 className="text-sm font-semibold">{t.recentActivity}</h3>
          {recentActivity.length === 0 ? (
            <div className="grid h-[165px] place-items-center text-center">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{t.noRecent}</div>
                <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">{t.recentHint}</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-h-[390px] space-y-1 overflow-y-auto pe-1">
              {recentActivity.map((item: any) => {
                const Icon = item.kind === 'refund'
                  ? RotateCcw
                  : item.kind === 'stock'
                    ? Warehouse
                    : item.kind === 'payment'
                      ? Banknote
                      : ShoppingCart
                const iconClass = item.kind === 'refund'
                  ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                  : item.kind === 'stock'
                    ? 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                    : item.kind === 'payment'
                      ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
                      : 'bg-sky-50 text-sky-500 dark:bg-sky-500/10'
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconClass}`}>
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">{item.detail}</div>
                    </div>
                    <div className="shrink-0 pt-1 text-[10px] text-slate-400">{dashboardTimeAgo(item.at)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


type RevenueTab = 'sales' | 'refunds' | 'withdrawals' | 'deposits'

function RevenueView({ language, onBack }: { language: Language; onBack: () => void }) {
  const isRtl = rtlLanguages.includes(language)
  const [tab, setTab] = useState<RevenueTab>('sales')
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<DashboardFilter>('all')
  const [, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1)
    window.addEventListener('pharma:data-changed', refresh)
    window.addEventListener('cash-wallet-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pharma:data-changed', refresh)
      window.removeEventListener('cash-wallet-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const invoices = readCollection('billingInvoices').filter((item) => isWithinDashboardFilter(item, range))
  const transactions = readCollection('transactions').filter((item) => isWithinDashboardFilter(item, range))
  const saleRows = invoices.filter((invoice) => num(invoice.paidAmount ?? invoice.paid) > 0)
  const refundRows = invoices.flatMap((invoice) => {
    const history = Array.isArray(invoice.refundHistory) ? invoice.refundHistory : []
    return history.map((refund: any) => ({
      ...refund,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || invoice.invoiceNumber || invoice.id,
      customerName: invoice.customerName || invoice.customer || 'Walk-in Customer',
      currency: refund.currency || invoice.currency || 'AFN',
    }))
  }).filter((item) => isWithinDashboardFilter(item, range))

  const isWithdraw = (tx: any) => {
    const type = String(tx.transactionType || tx.type || '').toLowerCase()
    return type === 'withdraw' || type === 'expense'
  }
  const isDeposit = (tx: any) => {
    const type = String(tx.transactionType || tx.type || '').toLowerCase()
    return type === 'deposit' || type === 'income' || type === 'credit'
  }
  const walletRows = transactions.filter((tx) => tx.source === 'cash-wallet' || tx.source === 'product-registration-wallet')
  const withdrawalRows = walletRows.filter(isWithdraw)
  const depositRows = walletRows.filter(isDeposit)

  const refundTotal = refundRows.reduce((sum, row) => sum + num(row.amount), 0)
  const paidRevenue = saleRows.reduce((sum, row) => sum + num(row.paidAmount ?? row.paid), 0)
  const netRevenue = paidRevenue - refundTotal
  const average = saleRows.length ? netRevenue / saleRows.length : 0

  const q = query.trim().toLowerCase()
  const match = (...values: unknown[]) => !q || values.some((value) => String(value ?? '').toLowerCase().includes(q))
  const filteredSales = saleRows.filter((row) => match(row.invoiceNo, row.invoiceNumber, row.customerName, row.total, row.date))
  const filteredRefunds = refundRows.filter((row) => match(row.invoiceNo, row.customerName, row.amount, row.note, row.date, row.createdAt))
  const filteredWithdrawals = withdrawalRows.filter((row) => match(row.amount, row.currency, row.title, row.description, row.date))
  const filteredDeposits = depositRows.filter((row) => match(row.amount, row.currency, row.title, row.description, row.date))

  const fmt = (value: number, currency = 'AFN') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'AFN' ? '؋' : currency
    return `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
  }
  const dateText = (value: unknown) => {
    if (!value) return '—'
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }

  const labels = language === 'English'
    ? { title:'Revenue View', sub:'Paid sales', revenue:'Revenue', records:'Records', average:'Average', search:'Search...', allTime:'All Time', sales:'Sales', refunds:'Refunds', withdrawals:'Withdrawals', deposits:'Deposits', invoice:'Invoice', customer:'Customer', total:'Total', reason:'Reason', amount:'Amount', currency:'Currency', date:'Date', empty:'No records found.', print:'Print Report' }
    : language === 'دری'
      ? { title:'نمای عواید', sub:'فروش‌های پرداخت‌شده', revenue:'عواید', records:'ریکاردها', average:'اوسط', search:'جستجو...', allTime:'همه وقت', sales:'فروشات', refunds:'برگشتی‌ها', withdrawals:'برداشت‌ها', deposits:'واریزها', invoice:'فاکتور', customer:'مشتری', total:'مجموع', reason:'دلیل', amount:'مبلغ', currency:'واحد پول', date:'تاریخ', empty:'هیچ ریکاردی یافت نشد.', print:'چاپ گزارش' }
      : { title:'د عایداتو لید', sub:'تادیه شوي پلور', revenue:'عاید', records:'ریکارډونه', average:'اوسط', search:'لټون...', allTime:'ټول وخت', sales:'پلور', refunds:'بېرته ورکول', withdrawals:'ایستل', deposits:'جمع کول', invoice:'بل', customer:'پېرودونکی', total:'ټول', reason:'دلیل', amount:'مبلغ', currency:'اسعار', date:'نېټه', empty:'هیڅ ریکارډ ونه موندل شو.', print:'راپور چاپ' }

  const tabs: Array<[RevenueTab,string,number]> = [
    ['sales', labels.sales, saleRows.length],
    ['refunds', labels.refunds, refundRows.length],
    ['withdrawals', labels.withdrawals, withdrawalRows.length],
    ['deposits', labels.deposits, depositRows.length],
  ]

  return (
    <div className="w-full pb-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#111a2c] dark:text-white"><ArrowLeft size={17}/></button>
          <div><h1 className="text-[24px] font-bold tracking-tight">{labels.title}</h1><p className="text-sm text-slate-500 dark:text-sky-200">{labels.sub}</p></div>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#111a2c]"><Printer size={16}/>{labels.print}</button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title={labels.revenue} value={fmt(netRevenue)} icon={TrendingUp} accent={netRevenue < 0 ? 'red' : 'green'} />
        <StatCard title={labels.records} value={String(saleRows.length)} icon={CircleDollarSign} accent="blue" />
        <StatCard title={labels.average} value={saleRows.length ? fmt(average) : '—'} icon={CircleDollarSign} accent="navy" />
      </div>

      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
        <div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={labels.search} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#172a57] rtl:pl-3 rtl:pr-9 dark:border-[#24365f] dark:bg-[#0c1424]"/></div>
        <select value={range} onChange={(e)=>setRange(e.target.value as DashboardFilter)} className="h-10 min-w-[135px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none dark:border-[#24365f] dark:bg-[#0c1424]"><option value="all">{labels.allTime}</option><option value="today">Today</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></select>
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold"><CircleDollarSign size={17}/>{labels.revenue}</div>
        <div className="w-full rounded-lg bg-slate-100 p-1 dark:bg-white/5" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'4px'}}>
          {tabs.map(([key,label,count]) => <button key={key} type="button" onClick={()=>setTab(key)} className={`h-9 min-w-0 rounded-md px-2 text-sm transition ${tab===key?'bg-white font-semibold text-slate-950 shadow-sm dark:bg-[#172a57] dark:text-white':'text-slate-500 hover:text-slate-900 dark:text-slate-300'}`}>{label} ({count})</button>)}
        </div>

        <div className="mt-4 overflow-x-auto">
          {tab === 'sales' && <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start font-medium">{labels.invoice}</th><th className="px-3 py-3 text-start font-medium">{labels.customer}</th><th className="px-3 py-3 text-end font-medium">{labels.total}</th><th className="px-3 py-3 text-start font-medium">{labels.date}</th></tr></thead><tbody>{filteredSales.map((row:any)=><tr key={row.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-semibold">{row.invoiceNo||row.invoiceNumber||row.id}</td><td className="px-3 py-4">{row.customerName||row.customer||'Walk-in Customer'}</td><td className="px-3 py-4 text-end font-semibold text-emerald-500">{fmt(num(row.total),row.currency||'AFN')}</td><td className="px-3 py-4">{dateText(row.date||row.createdAt)}</td></tr>)}</tbody></table>}
          {tab === 'refunds' && <table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start font-medium">{labels.invoice}</th><th className="px-3 py-3 text-start font-medium">{labels.customer}</th><th className="px-3 py-3 text-end font-medium">{labels.total}</th><th className="px-3 py-3 text-start font-medium">{labels.reason}</th><th className="px-3 py-3 text-start font-medium">{labels.date}</th></tr></thead><tbody>{filteredRefunds.map((row:any,i)=><tr key={row.id||i} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-semibold">{row.invoiceNo}</td><td className="px-3 py-4">{row.customerName}</td><td className="px-3 py-4 text-end font-semibold text-red-500">−{fmt(num(row.amount),row.currency)}</td><td className="px-3 py-4">{row.note||'—'}</td><td className="px-3 py-4">{dateText(row.date||row.createdAt)}</td></tr>)}</tbody></table>}
          {tab === 'withdrawals' && <table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-end font-medium">{labels.amount}</th><th className="px-3 py-3 text-start font-medium">{labels.currency}</th><th className="px-3 py-3 text-start font-medium">{labels.reason}</th><th className="px-3 py-3 text-start font-medium">{labels.date}</th></tr></thead><tbody>{filteredWithdrawals.map((row:any)=><tr key={row.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 text-end font-semibold text-red-500">−{fmt(num(row.amount),row.currency||'AFN')}</td><td className="px-3 py-4">{row.currency||'AFN'}</td><td className="px-3 py-4">{row.title||row.description||row.referenceSource||'—'}</td><td className="px-3 py-4">{dateText(row.date||row.createdAt)}</td></tr>)}</tbody></table>}
          {tab === 'deposits' && <table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-end font-medium">{labels.amount}</th><th className="px-3 py-3 text-start font-medium">{labels.currency}</th><th className="px-3 py-3 text-start font-medium">{labels.reason}</th><th className="px-3 py-3 text-start font-medium">{labels.date}</th></tr></thead><tbody>{filteredDeposits.map((row:any)=><tr key={row.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 text-end font-semibold text-emerald-500">+{fmt(num(row.amount),row.currency||'AFN')}</td><td className="px-3 py-4">{row.currency||'AFN'}</td><td className="px-3 py-4">{row.title||row.description||row.referenceSource||'—'}</td><td className="px-3 py-4">{dateText(row.date||row.createdAt)}</td></tr>)}</tbody></table>}
          {((tab==='sales'&&!filteredSales.length)||(tab==='refunds'&&!filteredRefunds.length)||(tab==='withdrawals'&&!filteredWithdrawals.length)||(tab==='deposits'&&!filteredDeposits.length)) && <div className="grid min-h-[170px] place-items-center text-sm text-slate-500">{labels.empty}</div>}
        </div>
      </section>
    </div>
  )
}



type ProfitRange = 'all' | 'today' | 'week' | 'month' | 'year'
type ProfitTab = 'sales' | 'cogs' | 'expenses' | 'deposits' | 'withdrawals'

function profitRangeMatches(record:any, range:ProfitRange){
  if(range==='all') return true
  const d=recordDate(record); if(!d) return false
  const now=new Date(); const start=new Date(now)
  if(range==='today') return d.toDateString()===now.toDateString()
  if(range==='week') start.setDate(now.getDate()-7)
  if(range==='month') start.setMonth(now.getMonth()-1)
  if(range==='year') start.setFullYear(now.getFullYear()-1)
  return d>=start && d<=now
}

function invoiceItems(inv:any){ return Array.isArray(inv.items) ? inv.items : Array.isArray(inv.cart) ? inv.cart : [] }
function invoiceGross(inv:any){ return num(inv.total ?? inv.grandTotal ?? inv.subtotal) }
function invoicePaidValue(inv:any){ return num(inv.paidAmount ?? inv.paid) }
function invoiceRefundValue(inv:any){
  const hist=Array.isArray(inv.refundHistory)?inv.refundHistory:[]
  return num(inv.refundTotal) || hist.reduce((s:number,r:any)=>s+num(r.amount),0)
}
function invoiceCostValue(inv:any, products:any[]){
  return invoiceItems(inv).reduce((sum:number,item:any)=>{
    const p=products.find((x:any)=>String(x.id)===String(item.productId||item.id))||{}
    const qty=Math.max(0,num(item.quantity ?? item.qty ?? 1))
    const cost=num(item.purchasePrice ?? item.purchase ?? item.cost ?? item.unitCost ?? p.purchase ?? p.purchasePrice ?? p.cost)
    return sum + qty*cost
  },0)
}
function invoiceRefundCostValue(inv:any, products:any[]){
  const source=invoiceItems(inv)
  const history=Array.isArray(inv.refundHistory)?inv.refundHistory:[]
  return history.reduce((sum:number,ref:any)=>{
    const rows=Array.isArray(ref.items)?ref.items:[]
    if(rows.length){
      return sum + rows.reduce((s:number,r:any)=>{
        const orig=source.find((x:any)=>String(x.productId||x.id)===String(r.productId||r.id))||{}
        const p=products.find((x:any)=>String(x.id)===String(r.productId||r.id))||{}
        const q=Math.max(0,num(r.quantity ?? r.qty))
        const c=num(orig.purchasePrice ?? orig.purchase ?? orig.cost ?? orig.unitCost ?? p.purchase ?? p.purchasePrice ?? p.cost)
        return s + q*c
      },0)
    }
    const gross=invoiceGross(inv), cost=invoiceCostValue(inv,products)
    return gross>0 ? sum + cost*(num(ref.amount)/gross) : sum
  },0)
}
function invoiceNetRevenue(inv:any){ return Math.max(0,invoiceGross(inv)-invoiceRefundValue(inv)) }
function invoiceNetCost(inv:any,products:any[]){ return Math.max(0,invoiceCostValue(inv,products)-invoiceRefundCostValue(inv,products)) }
function invoiceFullyPaid(inv:any){
  const net=invoiceNetRevenue(inv)
  return net<=0.000001 || invoicePaidValue(inv)+0.000001>=net
}
function profitMoney(v:number){ return `${Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}${v<0?'−':''} ؋` }

function ProfitRangeSelect({value,onChange}:{value:ProfitRange;onChange:(v:ProfitRange)=>void}){
  return <select value={value} onChange={e=>onChange(e.target.value as ProfitRange)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none dark:border-[#24365f] dark:bg-[#0c1424] dark:text-white">
    <option value="all">All Time</option><option value="today">Today</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Annual</option>
  </select>
}

function ProfitSourceTable({tab,invoices,products,expenses,transactions,query}:{tab:ProfitTab;invoices:any[];products:any[];expenses:any[];transactions:any[];query:string}){
  const q=query.trim().toLowerCase(); const hit=(...v:any[])=>!q||v.some(x=>String(x??'').toLowerCase().includes(q))
  const tx = transactions.filter((x:any)=>String(x.source||'')==='cash-wallet')
  const dep = tx.filter((x:any)=>String(x.transactionType||x.type||'').toLowerCase()==='deposit'||String(x.type||'').toLowerCase()==='income')
  const wd = tx.filter((x:any)=>String(x.transactionType||x.type||'').toLowerCase()==='withdraw'||String(x.type||'').toLowerCase()==='expense')
  const wrap=(body:any)=><div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#24365f]"><table className="w-full min-w-[900px] text-sm">{body}</table></div>
  if(tab==='sales') return wrap(<><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Invoice</th><th className="px-3 py-3 text-start">Customer</th><th className="px-3 py-3 text-end">Gross</th><th className="px-3 py-3 text-end">Refunded</th><th className="px-3 py-3 text-end">Net</th><th className="px-3 py-3 text-end">COGS</th><th className="px-3 py-3 text-end">Gross profit</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{invoices.filter(x=>hit(x.invoiceNo,x.customerName,x.total)).map((x:any)=><tr key={x.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-mono font-semibold">{x.invoiceNo||x.invoiceNumber||x.id}</td><td className="px-3 py-3">{x.customerName||x.customer||'Walk-in Customer'}</td><td className="px-3 py-3 text-end">{profitMoney(invoiceGross(x))}</td><td className="px-3 py-3 text-end text-red-500">{invoiceRefundValue(x)?`−${profitMoney(invoiceRefundValue(x)).replace('−','')}`:'—'}</td><td className="px-3 py-3 text-end font-semibold">{profitMoney(invoiceNetRevenue(x))}</td><td className="px-3 py-3 text-end">{profitMoney(invoiceNetCost(x,products))}</td><td className={`px-3 py-3 text-end font-semibold ${invoiceNetRevenue(x)-invoiceNetCost(x,products)>=0?'text-emerald-500':'text-red-500'}`}>{profitMoney(invoiceNetRevenue(x)-invoiceNetCost(x,products))}</td><td className="px-3 py-3">{dateText(x.date||x.createdAt)}</td></tr>)}</tbody></>)
  if(tab==='cogs') return wrap(<><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Invoice</th><th className="px-3 py-3 text-start">Product</th><th className="px-3 py-3 text-end">Qty</th><th className="px-3 py-3 text-end">Purchase price</th><th className="px-3 py-3 text-end">Line cost</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{invoices.flatMap((inv:any)=>invoiceItems(inv).map((it:any,i:number)=>({inv,it,i}))).filter((r:any)=>hit(r.inv.invoiceNo,r.it.name)).map(({inv,it,i}:any)=>{const p=products.find((x:any)=>String(x.id)===String(it.productId||it.id))||{};const qty=num(it.quantity??it.qty??1);const cost=num(it.purchasePrice??it.purchase??it.cost??p.purchase??p.purchasePrice??p.cost);return <tr key={`${inv.id}-${i}`} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-mono font-semibold">{inv.invoiceNo||inv.invoiceNumber||inv.id}</td><td className="px-3 py-3">{it.name||p.name||'—'}</td><td className="px-3 py-3 text-end">{qty}</td><td className="px-3 py-3 text-end">{profitMoney(cost)}</td><td className="px-3 py-3 text-end">{profitMoney(qty*cost)}</td><td className="px-3 py-3">{dateText(inv.date||inv.createdAt)}</td></tr>})}</tbody></>)
  if(tab==='expenses') return wrap(<><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Description</th><th className="px-3 py-3 text-start">Category</th><th className="px-3 py-3 text-end">Amount</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{expenses.filter((x:any)=>hit(x.description,x.category,x.amount)).map((x:any)=><tr key={x.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3">{x.description||x.title||'—'}</td><td className="px-3 py-3">{x.category||'—'}</td><td className="px-3 py-3 text-end font-semibold text-red-500">−{profitMoney(num(x.amountBase??x.amount??x.total)).replace('−','')}</td><td className="px-3 py-3">{dateText(x.date||x.createdAt)}</td></tr>)}</tbody></>)
  const rows=tab==='deposits'?dep:wd
  return wrap(<><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-end">Amount</th><th className="px-3 py-3 text-start">Currency</th><th className="px-3 py-3 text-start">Reason</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{rows.filter((x:any)=>hit(x.amount,x.currency,x.description,x.title)).map((x:any)=><tr key={x.id} className="border-b border-slate-100 last:border-0"><td className={`px-3 py-3 text-end font-semibold ${tab==='deposits'?'text-emerald-500':'text-red-500'}`}>{tab==='deposits'?'+':'−'}{profitMoney(num(x.amount)).replace('−','')}</td><td className="px-3 py-3">{x.currency||'AFN'}</td><td className="px-3 py-3">{x.description||x.title||'—'}</td><td className="px-3 py-3">{dateText(x.date||x.createdAt)}</td></tr>)}</tbody></>)
}

function NetProfitView({onBack}:{language:Language;onBack:()=>void}){
  const [range,setRange]=useState<ProfitRange>('all'); const [tab,setTab]=useState<ProfitTab>('sales'); const [query,setQuery]=useState(''); const [,setVersion]=useState(0)
  useEffect(()=>{const f=()=>setVersion(v=>v+1);window.addEventListener('pharma:data-changed',f);return()=>window.removeEventListener('pharma:data-changed',f)},[])
  const products=readCollection('products'), allInv=readCollection('billingInvoices'), allExp=readCollection('expenses'), allTx=readCollection('transactions')
  const invoices=allInv.filter((x:any)=>profitRangeMatches(x,range)&&invoiceFullyPaid(x)), expenses=allExp.filter((x:any)=>profitRangeMatches(x,range)), transactions=allTx.filter((x:any)=>profitRangeMatches(x,range))
  const revenue=invoices.reduce((s:number,x:any)=>s+invoiceNetRevenue(x),0), cogs=invoices.reduce((s:number,x:any)=>s+invoiceNetCost(x,products),0), gross=revenue-cogs, exp=expenses.reduce((s:number,x:any)=>s+num(x.amountBase??x.amount??x.total),0), net=gross-exp
  const tabs:[ProfitTab,string,number][]=[['sales','Sales',invoices.length],['cogs','COGS breakdown',invoices.length],['expenses','Expenses',expenses.length],['deposits','Deposits',transactions.filter((x:any)=>String(x.transactionType||x.type).toLowerCase()==='deposit'||String(x.type).toLowerCase()==='income').length],['withdrawals','Withdrawals',transactions.filter((x:any)=>String(x.transactionType||x.type).toLowerCase()==='withdraw'||String(x.type).toLowerCase()==='expense').length]]
  return <div><div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><button onClick={onBack} className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white"><ArrowLeft size={17}/></button><div><h1 className="text-2xl font-bold">Net Profit (After Expenses & Refunds)</h1><p className="text-sm text-slate-500">Pure profit after all costs and expenses</p></div></div><div className="flex gap-2"><ProfitRangeSelect value={range} onChange={setRange}/><button onClick={()=>window.print()} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold"><Printer size={15} className="me-2 inline"/>Print</button></div></div>
  <div className="grid gap-3 lg:grid-cols-3"><StatCard title="Revenue" value={profitMoney(revenue)} icon={CircleDollarSign} accent="green"/><StatCard title="Total Costs" value={profitMoney(cogs+exp)} icon={Banknote} accent="red"/><StatCard title="Net Profit" value={profitMoney(net)} icon={TrendingUp} accent={net>=0?'green':'red'}/></div>
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">How Net Profit is Calculated</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between bg-emerald-50/70 px-2 py-2"><span>Revenue (Paid Sales)</span><b className="text-emerald-500">+{profitMoney(revenue)}</b></div><div className="flex justify-between bg-red-50/70 px-2 py-2"><span>Cost of Goods Sold (Purchase Price × Qty Sold)</span><b className="text-red-500">−{profitMoney(cogs).replace('−','')}</b></div><div className="flex justify-between border border-dashed border-slate-200 px-2 py-2"><b>= Gross Profit</b><b>{profitMoney(gross)}</b></div><div className="flex justify-between bg-red-50/70 px-2 py-2"><span>All Expenses (Rent, Utilities, Salaries, etc.)</span><b className="text-red-500">−{profitMoney(exp).replace('−','')}</b></div><div className={`flex justify-between border px-2 py-3 ${net>=0?'border-emerald-500 bg-emerald-50/50':'border-red-500 bg-red-50/50'}`}><b>= Net Profit (Pure Profit)</b><b className={net>=0?'text-emerald-500':'text-red-500'}>{profitMoney(net)}</b></div></div></section>
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Source records</h3><div className="mt-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{tabs.map(([k,l,c])=><button key={k} onClick={()=>setTab(k)} className={`rounded-md px-3 py-2 text-xs ${tab===k?'bg-white font-semibold shadow-sm':'text-slate-500'}`}>{l} ({c})</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="my-3 h-10 w-[260px] rounded-lg border border-slate-200 px-3 text-sm"/><ProfitSourceTable tab={tab} invoices={invoices} products={products} expenses={expenses} transactions={transactions} query={query}/></section></div>
}

function PureProfitView({onBack}:{language:Language;onBack:()=>void}){
  const [range,setRange]=useState<ProfitRange>('all'); const [tab,setTab]=useState<ProfitTab>('sales'); const [query,setQuery]=useState(''); const [,setVersion]=useState(0)
  useEffect(()=>{const f=()=>setVersion(v=>v+1);window.addEventListener('pharma:data-changed',f);return()=>window.removeEventListener('pharma:data-changed',f)},[])
  const products=readCollection('products'), allInv=readCollection('billingInvoices'), allTx=readCollection('transactions')
  const invoices=allInv.filter((x:any)=>profitRangeMatches(x,range)&&invoiceFullyPaid(x)), transactions=allTx.filter((x:any)=>profitRangeMatches(x,range))
  const revenue=invoices.reduce((s:number,x:any)=>s+invoiceNetRevenue(x),0), cogs=invoices.reduce((s:number,x:any)=>s+invoiceNetCost(x,products),0), pure=revenue-cogs, margin=revenue>0?(pure/revenue)*100:0
  const tabs:[ProfitTab,string,number][]=[['sales','Sales',invoices.length],['cogs','COGS breakdown',invoices.length],['deposits','Deposits',transactions.filter((x:any)=>String(x.transactionType||x.type).toLowerCase()==='deposit'||String(x.type).toLowerCase()==='income').length],['withdrawals','Withdrawals',transactions.filter((x:any)=>String(x.transactionType||x.type).toLowerCase()==='withdraw'||String(x.type).toLowerCase()==='expense').length]]
  return <div><div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><button onClick={onBack} className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white"><ArrowLeft size={17}/></button><div><h1 className="text-2xl font-bold">Pure Profit Breakdown</h1><p className="text-sm text-slate-500">Raw goods margin without expenses deducted</p></div></div><div className="flex gap-2"><ProfitRangeSelect value={range} onChange={setRange}/><button onClick={()=>window.print()} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold"><Printer size={15} className="me-2 inline"/>Print</button></div></div>
  <div className="grid gap-3 lg:grid-cols-4"><StatCard title="Revenue" value={profitMoney(revenue)} icon={CircleDollarSign} accent="green"/><StatCard title="Cost of Goods Sold (COGS)" value={profitMoney(cogs)} icon={CircleDollarSign} accent="red"/><StatCard title="Pure Profit" value={profitMoney(pure)} icon={TrendingUp} accent={pure>=0?'green':'red'}/><StatCard title="Margin %" value={`${margin.toFixed(1)}%`} icon={TrendingUp} accent="blue"/></div>
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">How Pure Profit is Calculated</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between bg-emerald-50/70 px-2 py-2"><span>Total Revenue (Paid Sales)</span><b className="text-emerald-500">+{profitMoney(revenue)}</b></div><div className="flex justify-between bg-red-50/70 px-2 py-2"><span>Cost of Goods Sold (COGS)</span><b className="text-red-500">−{profitMoney(cogs).replace('−','')}</b></div><div className="flex justify-between border border-emerald-500 bg-emerald-50/50 px-2 py-3"><b>= Pure Profit</b><b className="text-emerald-500">{profitMoney(pure)}</b></div><div className="flex justify-between bg-slate-50 px-2 py-2 text-slate-500"><span>Margin %</span><b>{margin.toFixed(1)}%</b></div></div></section>
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Source records</h3><div className="mt-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{tabs.map(([k,l,c])=><button key={k} onClick={()=>setTab(k)} className={`rounded-md px-3 py-2 text-xs ${tab===k?'bg-white font-semibold shadow-sm':'text-slate-500'}`}>{l} ({c})</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="my-3 h-10 w-[260px] rounded-lg border border-slate-200 px-3 text-sm"/><ProfitSourceTable tab={tab} invoices={invoices} products={products} expenses={[]} transactions={transactions} query={query}/></section></div>
}

type WalletKind = 'all' | 'sales' | 'profit' | 'deposits' | 'withdrawals' | 'expenses'

type WalletRange = 'all' | 'today' | 'week' | 'month' | 'year'

function CashWalletView({ language, onBack }: { language: Language; onBack: () => void }) {
  const isRtl = rtlLanguages.includes(language)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<WalletKind>('all')
  const [range, setRange] = useState<WalletRange>('all')
  const [supplier, setSupplier] = useState('all')
  const [category, setCategory] = useState('all')
  const [kindOpen, setKindOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [walletMode, setWalletMode] = useState<'Deposit'|'Withdraw'>('Deposit')
  const [walletAmount, setWalletAmount] = useState('')
  const [walletCurrency, setWalletCurrency] = useState('AFN')
  const [walletNote, setWalletNote] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [, setVersion] = useState(0)

  useEffect(() => {
    const refresh=()=>setVersion(v=>v+1)
    window.addEventListener('pharma:data-changed',refresh)
    window.addEventListener('cash-wallet-updated',refresh)
    window.addEventListener('storage',refresh)
    return()=>{
      window.removeEventListener('pharma:data-changed',refresh)
      window.removeEventListener('cash-wallet-updated',refresh)
      window.removeEventListener('storage',refresh)
    }
  },[])

  const labels = language === 'English' ? {
    title:'Cash Wallet', sub:'Includes pure profit · Owner cash deposits and withdrawals · expenses',
    paid:'Total Paid (from sales)', profit:'Pure Profit', deposits:'Total Deposits', withdrawals:'Total Withdrawals',
    search:'Search...', all:'All', allTime:'All Time', today:'Today', weekly:'Weekly', monthly:'Monthly', yearly:'Annual',
    suppliers:'Suppliers', category:'Category', cashWallet:'Cash Wallet', date:'Date', type:'Type', amount:'Amount', reason:'Reason / Note',
    deposit:'Deposit', withdraw:'Withdraw', saveDeposit:'Save Deposit', saveWithdraw:'Save Withdrawal', cancel:'Cancel', currency:'Currency',
    noRows:'No cash wallet transactions in this range.', print:'Print Statement', sales:'Total Paid (from sales)', expenses:'expenses',
    edit:'Edit', delete:'Delete'
  } : language === 'دری' ? {
    title:'کیف پول نقدی', sub:'شامل سود خالص · واریز و برداشت نقدی مالک · مصارف',
    paid:'مجموع پرداخت از فروشات', profit:'سود خالص', deposits:'مجموع واریزها', withdrawals:'مجموع برداشت‌ها',
    search:'جستجو...', all:'همه', allTime:'همه وقت', today:'امروز', weekly:'هفتگی', monthly:'ماهانه', yearly:'سالانه',
    suppliers:'تامین‌کنندگان', category:'کتگوری', cashWallet:'کیف پول نقدی', date:'تاریخ', type:'نوع', amount:'مبلغ', reason:'دلیل / یادداشت',
    deposit:'واریز', withdraw:'برداشت', saveDeposit:'ثبت واریز', saveWithdraw:'ثبت برداشت', cancel:'لغو', currency:'واحد پول',
    noRows:'در این محدوده تراکنش کیف پول وجود ندارد.', print:'چاپ صورت‌حساب', sales:'پرداخت از فروشات', expenses:'مصارف',
    edit:'ویرایش', delete:'حذف'
  } : {
    title:'نغدي بټوه', sub:'خالصه ګټه · د مالک جمع او ایستل · لګښتونه',
    paid:'له پلور څخه ټولې تادیې', profit:'خالصه ګټه', deposits:'ټولې جمعې', withdrawals:'ټولې ایستنې',
    search:'لټون...', all:'ټول', allTime:'ټول وخت', today:'نن', weekly:'اونیز', monthly:'میاشتنی', yearly:'کلنی',
    suppliers:'عرضه کوونکي', category:'کټګوري', cashWallet:'نغدي بټوه', date:'نېټه', type:'ډول', amount:'مبلغ', reason:'دلیل / یادښت',
    deposit:'جمع', withdraw:'ایستل', saveDeposit:'جمع ثبت کړئ', saveWithdraw:'ایستل ثبت کړئ', cancel:'لغوه', currency:'اسعار',
    noRows:'په دې موده کې د نغدي بټوې معامله نشته.', print:'صورت حساب چاپ', sales:'له پلور څخه تادیه', expenses:'لګښتونه',
    edit:'سمون', delete:'ړنګول'
  }

  const invoices=readCollection('billingInvoices')
  const transactions=readCollection('transactions')
  const suppliers=readCollection('suppliers')

  const dateInRange=(raw:unknown)=>{
    if(range==='all')return true
    const d=new Date(String(raw||'')); if(Number.isNaN(d.getTime()))return true
    const now=new Date()
    if(range==='today')return d.toDateString()===now.toDateString()
    if(range==='week'){const x=new Date();x.setDate(x.getDate()-7);return d>=x}
    if(range==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    if(range==='year')return d.getFullYear()===now.getFullYear()
    return true
  }

  const isWithdraw=(tx:any)=>{const t=String(tx.transactionType||tx.type||'').toLowerCase();return t==='withdraw'||t==='expense'}
  const isDeposit=(tx:any)=>{const t=String(tx.transactionType||tx.type||'').toLowerCase();return t==='deposit'||t==='income'||t==='credit'}
  const walletTransactions=transactions.filter((tx:any)=>tx.source==='cash-wallet'||tx.source==='product-registration-wallet')
  const withdrawalRows=walletTransactions.filter(isWithdraw)
  const depositRows=walletTransactions.filter(isDeposit)
  const paidByCurrency: Record<string, number> = {}
  invoices.forEach((inv:any)=>addCurrencyAmount(paidByCurrency,inv.currency||'AFN',num(inv.paidAmount??inv.paid)))
  const profitByCurrency: Record<string, number> = {}
  invoices.forEach((inv:any)=>addCurrencyAmount(profitByCurrency,inv.currency||'AFN',num(inv.profit)))
  const depositsByCurrency: Record<string, number> = {}
  depositRows.forEach((tx:any)=>addCurrencyAmount(depositsByCurrency,tx.currency||'AFN',num(tx.amount)))
  const withdrawalsByCurrency: Record<string, number> = {}
  withdrawalRows.forEach((tx:any)=>addCurrencyAmount(withdrawalsByCurrency,tx.currency||'AFN',num(tx.amount)))

  const q=query.trim().toLowerCase()
  const txCategory=(tx:any)=>String(tx.category||tx.referenceSource||tx.source||'').trim()||'Other'
  const txSupplier=(tx:any)=>{
    const byId=suppliers.find((s:any)=>String(s.id)===String(tx.supplierId||''))
    if(byId)return String(byId.name||byId.supplierName||byId.company||'')
    const m=String(tx.title||tx.description||'').match(/\(([^)]+)\)/)
    return m?.[1]||''
  }
  const categoryOptions=Array.from(new Set(walletTransactions.map(txCategory).filter(Boolean)))
  const supplierOptions=Array.from(new Set(walletTransactions.map(txSupplier).filter(Boolean)))
  const visibleRows=walletTransactions.filter((tx:any)=>{
    const kindOk=kind==='all'||(kind==='deposits'&&isDeposit(tx))||(kind==='withdrawals'&&isWithdraw(tx))||(kind==='expenses'&&isWithdraw(tx))
    const supplierOk=supplier==='all'||txSupplier(tx)===supplier
    const categoryOk=category==='all'||txCategory(tx)===category
    const searchOk=!q||[tx.amount,tx.currency,tx.title,tx.description,tx.referenceSource,txCategory(tx),txSupplier(tx)].some(v=>String(v??'').toLowerCase().includes(q))
    return kindOk&&supplierOk&&categoryOk&&searchOk&&dateInRange(tx.date||tx.createdAt)
  }).sort((a:any,b:any)=>new Date(b.createdAt||b.date||0).getTime()-new Date(a.createdAt||a.date||0).getTime())

  const fmt=(v:number,c='AFN')=>{const s=c==='USD'?'$':c==='EUR'?'€':c==='GBP'?'£':c==='AFN'?'؋':c;return `${num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${s}`}
  const dateText=(v:unknown)=>{const d=new Date(String(v||''));return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}

  const saveWallet=()=>{
    const amount=Math.max(0,num(walletAmount)); if(!amount)return
    const now=new Date().toISOString()
    const tx={id:`wallet-${Date.now()}`,type:walletMode==='Deposit'?'income':'expense',transactionType:walletMode==='Deposit'?'deposit':'withdraw',title:walletNote||walletMode,description:walletNote,amount,currency:walletCurrency,date:now.slice(0,10),createdAt:now,source:'cash-wallet',category:'Owner Cash'}
    localStorage.setItem('transactions',JSON.stringify([tx,...transactions]))
    window.dispatchEvent(new CustomEvent('cash-wallet-updated',{detail:tx}))
    window.dispatchEvent(new CustomEvent('pharma:data-changed'))
    setWalletOpen(false);setWalletAmount('');setWalletNote('')
  }

  const deleteWalletRow=(row:any)=>{
    const next=transactions.filter((tx:any)=>String(tx.id)!==String(row.id))
    localStorage.setItem('transactions',JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('cash-wallet-updated'))
    window.dispatchEvent(new CustomEvent('pharma:data-changed'))
    setMenuId(null);setVersion(v=>v+1)
  }

  const kindOptions:[WalletKind,string][]=[['all',labels.all],['sales',labels.sales],['profit',labels.profit],['deposits',labels.deposits],['withdrawals',labels.withdrawals],['expenses',labels.expenses]]
  const rangeOptions:[WalletRange,string][]=[['all',labels.allTime],['today',labels.today],['week',labels.weekly],['month',labels.monthly],['year',labels.yearly]]

  const Drop=({open,setOpen,label,children}:{open:boolean;setOpen:(v:boolean)=>void;label:ReactNode;children:ReactNode})=><div className="relative"><button type="button" onClick={()=>setOpen(!open)} className="flex h-10 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-[#24365f] dark:bg-[#111a2c]"><span className="truncate">{label}</span><span className="text-slate-400">⌄</span></button>{open&&<><button className="fixed inset-0 z-30 cursor-default" onClick={()=>setOpen(false)}/><div className="absolute end-0 top-11 z-40 min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-[#24365f] dark:bg-[#111a2c]">{children}</div></>}</div>

  return <div className="w-full pb-8" dir={isRtl?'rtl':'ltr'}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><button onClick={onBack} className="mt-1 grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><ArrowLeft size={17}/></button><div><h1 className="text-[24px] font-bold tracking-tight">{labels.title}</h1><p className="text-sm text-slate-500">{labels.sub}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        <Drop open={kindOpen} setOpen={setKindOpen} label={<span className="flex items-center gap-2"><Filter size={15}/>{kind==='all'?labels.all:kindOptions.find(x=>x[0]===kind)?.[1]}</span>}>{kindOptions.map(([v,l])=><button key={v} onClick={()=>{setKind(v);setKindOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${kind===v?'bg-amber-500 text-black':'hover:bg-slate-50 dark:hover:bg-white/5'}`}>{kind===v&&<Check size={14}/>}<span>{l}</span></button>)}</Drop>
        <Drop open={rangeOpen} setOpen={setRangeOpen} label={<span className="flex items-center gap-2"><CalendarDays size={15}/>{rangeOptions.find(x=>x[0]===range)?.[1]}</span>}>{rangeOptions.map(([v,l])=><button key={v} onClick={()=>{setRange(v);setRangeOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${range===v?'bg-amber-500 text-black':'hover:bg-slate-50 dark:hover:bg-white/5'}`}>{range===v&&<Check size={14}/>}<span>{l}</span></button>)}</Drop>
        <button onClick={()=>setWalletOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-[#172a57] text-white shadow-sm dark:bg-amber-500 dark:text-black"><Plus size={18}/></button>
        <button onClick={()=>window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-[#24365f] dark:bg-[#111a2c]"><Printer size={16}/>{labels.print}</button>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title={labels.paid} value={formatCurrencyTotals(paidByCurrency)} icon={WalletCards} accent="green"/>
      <StatCard title={labels.profit} value={formatCurrencyTotals(profitByCurrency)} icon={TrendingUp} accent="blue"/>
      <StatCard title={labels.deposits} value={formatCurrencyTotals(depositsByCurrency)} icon={CircleDollarSign} accent="blue"/>
      <StatCard title={labels.withdrawals} value={formatCurrencyTotals(withdrawalsByCurrency)} icon={CircleDollarSign} accent="orange"/>
    </div>

    <div className="mt-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={labels.search} className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none dark:border-[#24365f] dark:bg-[#0c1424]"/></div>
      <Drop open={supplierOpen} setOpen={setSupplierOpen} label={<span className="flex items-center gap-2"><Truck size={15}/>{supplier==='all'?labels.suppliers:supplier}</span>}><button onClick={()=>{setSupplier('all');setSupplierOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${supplier==='all'?'bg-amber-500 text-black':''}`}>{supplier==='all'&&<Check size={14}/>} {labels.suppliers}</button>{supplierOptions.map(v=><button key={v} onClick={()=>{setSupplier(v);setSupplierOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${supplier===v?'bg-amber-500 text-black':'hover:bg-slate-50'}`}>{supplier===v&&<Check size={14}/>} {v}</button>)}</Drop>
      <Drop open={categoryOpen} setOpen={setCategoryOpen} label={<span className="flex items-center gap-2"><Tag size={15}/>{category==='all'?labels.category:category}</span>}><button onClick={()=>{setCategory('all');setCategoryOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${category==='all'?'bg-amber-500 text-black':''}`}>{category==='all'&&<Check size={14}/>} {labels.category}</button>{categoryOptions.map(v=><button key={v} onClick={()=>{setCategory(v);setCategoryOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm ${category===v?'bg-amber-500 text-black':'hover:bg-slate-50'}`}>{category===v&&<Check size={14}/>} {v}</button>)}</Drop>
    </div>

    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold"><WalletCards size={17}/>{labels.cashWallet} ({visibleRows.length})</div>
      {visibleRows.length?<div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start font-medium">{labels.date}</th><th className="px-3 py-3 text-start font-medium">{labels.type}</th><th className="px-3 py-3 text-end font-medium">{labels.amount}</th><th className="px-3 py-3 text-start font-medium">{labels.reason}</th><th className="w-12 px-3 py-3"></th></tr></thead><tbody>{visibleRows.map((row:any)=>{const withdraw=isWithdraw(row);return <tr key={row.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4">{dateText(row.date||row.createdAt)}</td><td className="px-3 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${withdraw?'border-red-200 bg-red-50 text-red-500':'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>{withdraw?labels.withdraw:labels.deposit}</span></td><td className={`px-3 py-4 text-end font-semibold ${withdraw?'text-red-500':'text-emerald-500'}`}>{withdraw?'−':'+'}{fmt(num(row.amount),row.currency||'AFN')}</td><td className="px-3 py-4">{row.title||row.description||row.referenceSource||'—'}</td><td className="relative px-3 py-4 text-end"><button onClick={()=>setMenuId(menuId===String(row.id)?null:String(row.id))} className="rounded-lg p-2 hover:bg-slate-100"><MoreHorizontal size={17}/></button>{menuId===String(row.id)&&<div className="absolute end-3 top-12 z-20 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-slate-50"><Edit3 size={14}/>{labels.edit}</button><button onClick={()=>deleteWalletRow(row)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm text-red-500 hover:bg-red-50"><Trash2 size={14}/>{labels.delete}</button></div>}</td></tr>})}</tbody></table></div>:<div className="grid min-h-[190px] place-items-center text-sm text-slate-500"><div className="text-center"><CircleDollarSign size={42} className="mx-auto mb-3 text-slate-300"/><div className="font-semibold text-slate-900 dark:text-white">{labels.noRows}</div></div></div>}
    </section>

    {walletOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4"><div className="w-full max-w-[420px] rounded-2xl bg-white p-6 text-slate-950 shadow-2xl"><div className="flex items-start gap-3"><WalletCards size={20}/><div className="flex-1"><h2 className="text-xl font-extrabold">{labels.cashWallet}</h2><p className="mt-1 text-sm text-slate-500">Track owner cash deposits and withdrawals.</p></div><button onClick={()=>setWalletOpen(false)}><X size={18}/></button></div><div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onClick={()=>setWalletMode('Deposit')} className={`h-10 rounded-lg text-sm font-bold ${walletMode==='Deposit'?'bg-emerald-500 text-white':'text-slate-500'}`}>{labels.deposit}</button><button onClick={()=>setWalletMode('Withdraw')} className={`h-10 rounded-lg text-sm font-bold ${walletMode==='Withdraw'?'bg-red-500 text-white':'text-slate-500'}`}>{labels.withdraw}</button></div><div className="mt-5 grid grid-cols-[1fr_170px] gap-3"><label className="text-sm font-semibold">{labels.amount}<input type="number" min="0" value={walletAmount} onChange={e=>setWalletAmount(e.target.value)} placeholder="0.00" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none"/></label><label className="text-sm font-semibold">{labels.currency}<select value={walletCurrency} onChange={e=>setWalletCurrency(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3"><option>AFN</option><option>USD</option><option>EUR</option></select></label></div><label className="mt-4 block text-sm font-semibold">{labels.reason}<textarea value={walletNote} onChange={e=>setWalletNote(e.target.value)} className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-200 p-3"/></label><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setWalletOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 font-semibold">{labels.cancel}</button><button onClick={saveWallet} className={`h-10 rounded-lg px-4 font-bold text-white ${walletMode==='Deposit'?'bg-emerald-500':'bg-red-500'}`}>{walletMode==='Deposit'?labels.saveDeposit:labels.saveWithdraw}</button></div></div></div>}
  </div>
}


type DetailRange = 'all' | 'today' | 'week' | 'month' | 'year'
type SalesStatusFilter = 'all' | 'paid' | 'partial' | 'loan'

function detailDate(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function detailRangeMatches(row: any, range: DetailRange) {
  if (range === 'all') return true
  const date = recordDate(row)
  if (!date) return true
  const now = new Date()
  if (range === 'today') return date.toDateString() === now.toDateString()
  if (range === 'week') {
    const start = new Date(now)
    start.setHours(0,0,0,0)
    start.setDate(start.getDate() - 7)
    return date >= start
  }
  if (range === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  if (range === 'year') return date.getFullYear() === now.getFullYear()
  return true
}

function DetailDropdown<T extends string>({ value, onChange, options, className='' }: { value:T; onChange:(value:T)=>void; options:Array<[T,string]>; className?:string }) {
  const [open,setOpen]=useState(false)
  const current=options.find(([key])=>key===value)?.[1] || ''
  return <div className={`relative ${className}`}>
    <button type="button" onClick={()=>setOpen(v=>!v)} className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition hover:border-amber-400 dark:border-[#24365f] dark:bg-[#0c1424]">
      <span>{current}</span><span className="text-slate-400">⌄</span>
    </button>
    {open&&<div className="absolute end-0 top-11 z-40 min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-[#24365f] dark:bg-[#101827]">
      {options.map(([key,label])=><button key={key} type="button" onClick={()=>{onChange(key);setOpen(false)}} className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5 ${value===key?'bg-amber-500 text-black':''}`}>
        {value===key?<Check size={14}/>:<span className="w-[14px]"/>}{label}
      </button>)}
    </div>}
  </div>
}

function DetailHeader({title,sub,onBack,printLabel='Print Report'}:{title:string;sub:string;onBack:()=>void;printLabel?:string}) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <button type="button" onClick={onBack} className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#111a2c] dark:text-white"><ArrowLeft size={17}/></button>
      <div><h1 className="text-[24px] font-bold tracking-tight">{title}</h1><p className="text-sm text-slate-500">{sub}</p></div>
    </div>
    <button type="button" onClick={()=>window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#111a2c]"><Printer size={16}/>{printLabel}</button>
  </div>
}

function DashboardDetailPage({ view, language, onBack, onNavigate }: { view:DashboardDetailView; language:Language; onBack:()=>void; onNavigate:(page:Page)=>void }) {
  const isRtl=rtlLanguages.includes(language)
  const [query,setQuery]=useState('')
  const [range,setRange]=useState<DetailRange>('all')
  const [status,setStatus]=useState<SalesStatusFilter>('all')
  const [category,setCategory]=useState('all')
  const [method,setMethod]=useState('all')
  const [menuId,setMenuId]=useState<string|null>(null)
  const [,setVersion]=useState(0)

  useEffect(()=>{
    const refresh=()=>setVersion(v=>v+1)
    window.addEventListener('pharma:data-changed',refresh)
    window.addEventListener('cash-wallet-updated',refresh)
    window.addEventListener('storage',refresh)
    return()=>{window.removeEventListener('pharma:data-changed',refresh);window.removeEventListener('cash-wallet-updated',refresh);window.removeEventListener('storage',refresh)}
  },[])

  const invoices=readCollection('billingInvoices')
  const expenses=readCollection('expenses')
  const customers=readCollection('customers')
  const suppliers=readCollection('suppliers')
  const supplierPurchases=readCollection('supplierPurchases')
  const godownEntries=readCollection('godownEntries')
  const products=readCollection('products')
  const q=query.trim().toLowerCase()
  const hit=(...values:unknown[])=>!q||values.some(v=>String(v??'').toLowerCase().includes(q))
  const rangeOpts:Array<[DetailRange,string]>=[['all','All Time'],['today','Today'],['week','Weekly'],['month','Monthly'],['year','Annual']]
  const fmt=(value:number,currency='AFN')=>{
    const symbol=currency==='USD'?'$':currency==='EUR'?'€':currency==='GBP'?'£':currency==='AFN'?'؋':currency
    return `${Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${symbol}`
  }

  const supplierAdjustments=godownEntries.flatMap((entry:any)=>Array.isArray(entry.adjustments)?entry.adjustments.map((a:any)=>({...a,supplierId:a.supplierId||entry.supplierId})):[])
  const supplierRows=suppliers.map((supplier:any)=>{
    const opening=num(supplier.openingBalance??supplier.balance)
    const purchases=supplierPurchases.filter((p:any)=>String(p.supplierId||'')===String(supplier.id||'')||p.supplierName===supplier.name)
    const purchaseRemain=purchases.reduce((sum:number,p:any)=>sum+num(p.totalPurchaseValue??p.total??p.amount)-num(p.paidAmount??p.paid),0)
    const adjustments=supplierAdjustments.filter((a:any)=>String(a.supplierId||'')===String(supplier.id||'')).reduce((sum:number,a:any)=>sum+(String(a.type).toLowerCase()==='credit'?-num(a.amount):num(a.amount)),0)
    return {...supplier,balanceCalc:opening+purchaseRemain+adjustments}
  })

  if(view==='sales'){
    const rows=invoices.filter((x:any)=>detailRangeMatches(x,range)).filter((x:any)=>{
      const remaining=num(x.balance??x.remaining)
      const paid=num(x.paidAmount??x.paid)
      const total=num(x.total)
      if(status==='paid') return remaining<=0 && paid>=total
      if(status==='partial') return paid>0 && remaining>0
      if(status==='loan') return paid<=0 && remaining>0
      return true
    }).filter((x:any)=>hit(x.invoiceNo,x.invoiceNumber,x.customerName,x.customer,x.total))
    const allRows=invoices.filter((x:any)=>detailRangeMatches(x,range))
    const total=allRows.reduce((s:number,x:any)=>s+num(x.total),0)
    const paidCount=allRows.filter((x:any)=>num(x.balance??x.remaining)<=0).length
    return <div dir={isRtl?'rtl':'ltr'}>
      <DetailHeader title="Sales View" sub="All sales" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-3"><StatCard title="All Sales" value={String(allRows.length)} icon={ShoppingCart} accent="blue"/><StatCard title="Total" value={fmt(total)} icon={ShoppingCart} accent="green"/><StatCard title="Paid" value={String(paidCount)} icon={ShoppingCart} accent="navy"/></div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none"/></div><DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[140px]"/><DetailDropdown value={status} onChange={setStatus} options={[['all','All Statuses'],['paid','Paid'],['partial','Loan / Partially'],['loan','Loan / Credit']]} className="w-[150px]"/></div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><ShoppingCart size={17}/>Sales ({rows.length})</div><div className="overflow-visible"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Invoice</th><th className="px-3 py-3 text-start">Customer</th><th className="px-3 py-3 text-end">Total</th><th className="px-3 py-3 text-start">Status</th><th className="px-3 py-3 text-start">Date</th><th className="w-12"></th></tr></thead><tbody>{rows.map((x:any)=>{const remaining=num(x.balance??x.remaining);const paid=num(x.paidAmount??x.paid);const rowStatus=remaining<=0?'Paid':paid>0?'Partial':'Loan';return <tr key={x.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-semibold">{x.invoiceNo||x.invoiceNumber||x.id}</td><td className="px-3 py-4">{x.customerName||x.customer||'Walk-in Customer'}</td><td className="px-3 py-4 text-end">{fmt(num(x.total),x.currency||'AFN')}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${rowStatus==='Paid'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{rowStatus}</span></td><td className="px-3 py-4">{detailDate(x.date||x.createdAt)}</td><td className="relative px-3 py-4 text-end"><button onClick={()=>setMenuId(menuId===String(x.id)?null:String(x.id))}><MoreHorizontal size={17}/></button>{menuId===String(x.id)&&<div className="absolute end-0 top-11 z-30 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button onClick={()=>onNavigate('sales')} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"><Search size={14}/>View</button></div>}</td></tr>})}</tbody></table></div></section>
    </div>
  }

  if(view==='expenses'){
    const cats=Array.from(new Set(expenses.map((x:any)=>String(x.category||'Miscellaneous'))))
    const methods=Array.from(new Set(expenses.map((x:any)=>String(x.paymentMethod||x.method||'Cash'))))
    const rows=expenses.filter((x:any)=>detailRangeMatches(x,range)).filter((x:any)=>category==='all'||String(x.category||'Miscellaneous')===category).filter((x:any)=>method==='all'||String(x.paymentMethod||x.method||'Cash')===method).filter((x:any)=>hit(x.description,x.notes,x.category,x.amount))
    const total=rows.reduce((s:number,x:any)=>s+num(x.amountBase??x.amount??x.total),0)
    const now=new Date(); const monthly=expenses.filter((x:any)=>{const d=recordDate(x);return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).reduce((s:number,x:any)=>s+num(x.amountBase??x.amount??x.total),0)
    return <div dir={isRtl?'rtl':'ltr'}><DetailHeader title="Expenses View" sub="All expenses" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-3"><StatCard title="Total Expenses" value={fmt(total)} icon={WalletCards} accent="red"/><StatCard title="Monthly" value={fmt(monthly)} icon={WalletCards} accent="orange"/><StatCard title="Records" value={String(rows.length)} icon={WalletCards} accent="blue"/></div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div><DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[130px]"/><DetailDropdown value={category} onChange={setCategory} options={[['all','All Categories'],...cats.map(c=>[c,c] as [string,string])]} className="w-[145px]"/><DetailDropdown value={method} onChange={setMethod} options={[['all','All Methods'],...methods.map(m=>[m,m] as [string,string])]} className="w-[135px]"/></div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><WalletCards size={17}/>Expenses ({rows.length})</div><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Category</th><th className="px-3 py-3 text-start">Notes</th><th className="px-3 py-3 text-end">Amount</th><th className="px-3 py-3 text-start">Payment Method</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{x.category||'Miscellaneous'}</span></td><td className="px-3 py-4">{x.description||x.notes||x.title||'—'}</td><td className="px-3 py-4 text-end text-red-500">−{fmt(num(x.amountBase??x.amount??x.total),x.currency||'AFN')}</td><td className="px-3 py-4">{x.paymentMethod||x.method||'Cash'}</td><td className="px-3 py-4">{detailDate(x.date||x.createdAt)}</td></tr>)}</tbody></table></section>
    </div>
  }

  if(view==='loans'){
    const rows=invoices.filter((x:any)=>detailRangeMatches(x,range)&&num(x.balance??x.remaining)>0).filter((x:any)=>hit(x.invoiceNo,x.customerName,x.total,x.balance))
    const remaining=rows.reduce((s:number,x:any)=>s+num(x.balance??x.remaining),0)
    const total=rows.reduce((s:number,x:any)=>s+num(x.total),0)
    return <div dir={isRtl?'rtl':'ltr'}><DetailHeader title="Loan / Partially View" sub="Loan / Partially sales" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-3"><StatCard title="Loan / Partially" value={fmt(remaining)} icon={Clock3} accent="orange"/><StatCard title="Records" value={String(rows.length)} icon={Clock3} accent="blue"/><StatCard title="Total" value={fmt(total)} icon={Clock3} accent="navy"/></div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div><DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[140px]"/></div>
      <section className="mt-5 min-h-[230px] rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Clock3 size={17}/>Loan / Partially ({rows.length})</div>{rows.length?<table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Invoice</th><th className="px-3 py-3 text-start">Customer</th><th className="px-3 py-3 text-end">Total</th><th className="px-3 py-3 text-end">Paid</th><th className="px-3 py-3 text-end">Remaining</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-semibold">{x.invoiceNo||x.invoiceNumber||x.id}</td><td className="px-3 py-4">{x.customerName||x.customer||'Walk-in Customer'}</td><td className="px-3 py-4 text-end">{fmt(num(x.total),x.currency||'AFN')}</td><td className="px-3 py-4 text-end text-emerald-500">{fmt(num(x.paidAmount??x.paid),x.currency||'AFN')}</td><td className="px-3 py-4 text-end text-red-500">{fmt(num(x.balance??x.remaining),x.currency||'AFN')}</td><td className="px-3 py-4">{detailDate(x.date||x.createdAt)}</td></tr>)}</tbody></table>:<div className="grid h-[170px] place-items-center text-center"><div><Clock3 size={44} className="mx-auto text-slate-300"/><div className="mt-3 font-semibold">No results found</div></div></div>}</section>
    </div>
  }

  if(view==='refunds'){
    const refundRows=invoices.flatMap((inv:any)=>(Array.isArray(inv.refundHistory)?inv.refundHistory:[]).map((r:any)=>({...r,invoice:inv}))).filter((x:any)=>detailRangeMatches(x,range)).filter((x:any)=>hit(x.invoice?.invoiceNo,x.invoice?.customerName,x.amount,x.reason,x.note))
    const total=refundRows.reduce((s:number,x:any)=>s+num(x.amount),0)
    const refundedInvoiceIds=new Set(refundRows.map((x:any)=>String(x.invoice?.id)))
    const refundCogs=invoices.filter((inv:any)=>refundedInvoiceIds.has(String(inv.id))).reduce((s:number,inv:any)=>s+invoiceRefundCost(inv,products,{baseCurrency:'AFN',exchangeRates:{}}),0)
    return <div dir={isRtl?'rtl':'ltr'}><DetailHeader title="Total Refundables" sub="Process Refund" onBack={onBack} printLabel="Print"/>
      <div className="grid gap-3 lg:grid-cols-3"><StatCard title="Total Refundables" value={fmt(total)} icon={RefreshCcw} accent="red"/><StatCard title="Records" value={String(refundRows.length)} icon={RefreshCcw} accent="navy"/><StatCard title="Cost of Goods Sold (Purchase Price × Qty Sold)" value={fmt(refundCogs)} icon={RefreshCcw} accent="orange"/></div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div><DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[140px]"/></div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><RefreshCcw size={17}/>Process Refund ({refundRows.length})</div><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Invoice</th><th className="px-3 py-3 text-start">Customer</th><th className="px-3 py-3 text-end">Qty</th><th className="px-3 py-3 text-end">Total Refund Amount</th><th className="px-3 py-3 text-start">Reason for Refund</th><th className="px-3 py-3 text-start">Date</th></tr></thead><tbody>{refundRows.map((x:any,i:number)=><tr key={`${x.invoice?.id}-${x.id||i}`} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-semibold">{x.invoice?.invoiceNo||x.invoice?.invoiceNumber||x.invoice?.id}</td><td className="px-3 py-4">{x.invoice?.customerName||x.invoice?.customer||'Walk-in Customer'}</td><td className="px-3 py-4 text-end">{num(x.quantity??x.qty??x.refundQuantity??0)||'—'}</td><td className="px-3 py-4 text-end text-red-500">{fmt(num(x.amount),x.currency||x.invoice?.currency||'AFN')}</td><td className="px-3 py-4">{x.reason||x.note||'—'}</td><td className="px-3 py-4">{detailDate(x.date||x.createdAt||x.invoice?.updatedAt)}</td></tr>)}</tbody></table></section>
    </div>
  }

  if(view==='customers'){
    const rows=customers.filter((x:any)=>hit(x.name,x.phone,x.email))
    const customerTotal=(c:any)=>invoices.filter((inv:any)=>String(inv.customerId||'')===String(c.id||'')||String(inv.customerName||'')===String(c.name||'')).reduce((s:number,inv:any)=>s+num(inv.total),0)
    const total=rows.reduce((s:number,c:any)=>s+customerTotal(c),0)
    const active=rows.filter((c:any)=>String(c.status||'active').toLowerCase()!=='inactive').length
    const vip=rows.filter((c:any)=>Boolean(c.vip)||String(c.status||'').toLowerCase()==='vip').length
    return <div dir={isRtl?'rtl':'ltr'}><DetailHeader title="Customers View" sub="All customers" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-3"><StatCard title="Active" value={String(active)} icon={Users} accent="blue"/><StatCard title="VIP" value={String(vip)} icon={Crown} accent="green"/><StatCard title="Total" value={fmt(total)} icon={Users} accent="navy"/></div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><div className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div></div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Users size={17}/>Customers ({rows.length})</div><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500"><th className="px-3 py-3 text-start">Name</th><th className="px-3 py-3 text-start">Phone</th><th className="px-3 py-3 text-end">Total</th><th className="px-3 py-3 text-start">Status</th></tr></thead><tbody>{rows.map((c:any)=><tr key={c.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold">{c.name||'—'}</td><td className="px-3 py-4">{c.phone||'—'}</td><td className="px-3 py-4 text-end">{fmt(customerTotal(c))}</td><td className="px-3 py-4"><span className="rounded-full bg-[#172a57] px-2.5 py-1 text-xs text-white">{String(c.status||'Active')}</span></td></tr>)}</tbody></table></section>
    </div>
  }


  if(view==='medicines'){
    const productRows=products.filter((p:any)=>hit(p.code,p.barcode,p.name,p.brandName,p.category,p.selling,p.sellingPrice))
    const active=products.filter((p:any)=>num(p.quantity??p.stock??p.qty)>0).length
    const totalStock=products.reduce((s:number,p:any)=>s+Math.max(0,num(p.quantity??p.stock??p.qty)),0)
    const lowStock=products.filter((p:any)=>{
      const qty=Math.max(0,num(p.quantity??p.stock??p.qty))
      const threshold=Math.max(0,num(p.lowStock??p.lowStockThreshold??p.minimumStock))
      return qty>0 && threshold>0 && qty<=threshold
    }).length
    return <div dir={isRtl?'rtl':'ltr'}>
      <DetailHeader title="Medicines View" sub="All medicines" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title="Active" value={String(active)} icon={Box} accent="blue"/>
        <StatCard title="Total Stock" value={String(totalStock)} icon={Box} accent="green"/>
        <StatCard title="Low Stock" value={String(lowStock)} icon={Package} accent="orange"/>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none"/></div>
      </div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Box size={17}/>Medicines ({productRows.length})</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Code</th><th className="px-3 py-3 text-start">Name</th><th className="px-3 py-3 text-start">Category</th><th className="px-3 py-3 text-end">Amount</th><th className="px-3 py-3 text-end">Stock</th><th className="px-3 py-3 text-start">Status</th><th className="w-12"></th></tr></thead>
          <tbody>{productRows.map((p:any)=>{
            const qty=Math.max(0,num(p.quantity??p.stock??p.qty))
            const threshold=Math.max(0,num(p.lowStock??p.lowStockThreshold??p.minimumStock))
            const low=qty===0 || (threshold>0&&qty<=threshold)
            const unit=p.unit||'unit'
            return <tr key={p.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-4 font-mono">{p.code||p.barcode||'—'}</td>
              <td className="px-3 py-4 font-semibold">{p.name||p.brandName||'—'}</td>
              <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{p.category||'—'}</span></td>
              <td className="px-3 py-4 text-end">{fmt(num(p.selling??p.sellingPrice??p.price),p.currency||'AFN')}</td>
              <td className="px-3 py-4 text-end">{qty} {unit}</td>
              <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${low?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-600'}`}>{qty===0?'Out':low?'Low':'Active'}</span></td>
              <td className="relative px-3 py-4 text-end"><button onClick={()=>setMenuId(menuId===String(p.id)?null:String(p.id))}><MoreHorizontal size={17}/></button>{menuId===String(p.id)&&<div className="absolute end-0 top-11 z-30 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button onClick={()=>onNavigate('medicines')} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"><Search size={14}/>View</button></div>}</td>
            </tr>
          })}</tbody>
        </table>
      </section>
    </div>
  }

  if(view==='stock'){
    const [lowOnly,setLowOnly]=useState(false)
    const stockRows=products.filter((p:any)=>{
      const qty=Math.max(0,num(p.quantity??p.stock??p.qty))
      const threshold=Math.max(0,num(p.lowStock??p.lowStockThreshold??p.minimumStock))
      const low=qty===0 || (threshold>0&&qty<=threshold)
      return (!lowOnly||low) && hit(p.code,p.barcode,p.name,p.brandName,p.category)
    })
    const totalQty=products.reduce((s:number,p:any)=>s+Math.max(0,num(p.quantity??p.stock??p.qty)),0)
    const amount=products.reduce((s:number,p:any)=>s+Math.max(0,num(p.quantity??p.stock??p.qty))*Math.max(0,num(p.purchase??p.purchasePrice??p.cost)),0)
    const lowCount=products.filter((p:any)=>{const q=Math.max(0,num(p.quantity??p.stock??p.qty));const t=Math.max(0,num(p.lowStock??p.lowStockThreshold??p.minimumStock));return q>0&&t>0&&q<=t}).length
    const outCount=products.filter((p:any)=>num(p.quantity??p.stock??p.qty)<=0).length
    return <div dir={isRtl?'rtl':'ltr'}>
      <DetailHeader title="Stock View" sub="Medicines" onBack={onBack}/>
      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard title="Total" value={String(totalQty)} icon={Package} accent="blue"/>
        <StatCard title="Amount" value={fmt(amount)} icon={Package} accent="green"/>
        <StatCard title="Low Stock" value={String(lowCount)} icon={Package} accent="orange"/>
        <StatCard title="Out of Stock" value={String(outCount)} icon={Package} accent="red"/>
      </div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div>
        <button type="button" onClick={()=>setLowOnly(v=>!v)} className={`h-10 rounded-lg border px-4 text-sm font-semibold ${lowOnly?'border-amber-400 bg-amber-50 text-amber-700':'border-slate-200 bg-white'}`}><Package size={15} className="me-2 inline"/>Low Stock</button>
      </div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Package size={17}/>Stock ({stockRows.length})</div>
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Code</th><th className="px-3 py-3 text-start">Name</th><th className="px-3 py-3 text-start">Category</th><th className="px-3 py-3 text-end">Qty</th><th className="px-3 py-3 text-end">Total</th><th className="px-3 py-3 text-start">Status</th><th className="w-12"></th></tr></thead>
        <tbody>{stockRows.map((p:any)=>{const qty=Math.max(0,num(p.quantity??p.stock??p.qty));const threshold=Math.max(0,num(p.lowStock??p.lowStockThreshold??p.minimumStock));const low=qty>0&&threshold>0&&qty<=threshold;const status=qty<=0?'Out of Stock':low?'Low':'Active';return <tr key={p.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono">{p.code||p.barcode||'—'}</td><td className="px-3 py-4 font-semibold">{p.name||'—'}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{p.category||'—'}</span></td><td className="px-3 py-4 text-end">{qty} {p.unit||'unit'}</td><td className="px-3 py-4 text-end">{fmt(qty*num(p.purchase??p.purchasePrice??p.cost),p.currency||'AFN')}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${status==='Active'?'bg-emerald-50 text-emerald-600':status==='Low'?'bg-amber-50 text-amber-600':'bg-red-50 text-red-600'}`}>{status}</span></td><td className="relative px-3 py-4 text-end"><button onClick={()=>setMenuId(menuId===String(p.id)?null:String(p.id))}><MoreHorizontal size={17}/></button>{menuId===String(p.id)&&<div className="absolute end-0 top-11 z-30 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button onClick={()=>onNavigate('godown')} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"><Search size={14}/>View</button></div>}</td></tr>})}</tbody></table>
      </section>
    </div>
  }

  if(view==='staff-payroll'){
    const staff=readCollection('staff')
    const histories=staff.flatMap((s:any)=>(Array.isArray(s.payrollHistory)?s.payrollHistory:[]).map((p:any)=>({...p,staff:s}))).filter((p:any)=>detailRangeMatches(p,range)).filter((p:any)=>hit(p.staff?.name,p.period,p.start,p.end,p.paidAmount,p.payable))
    const activeStaff=staff.filter((s:any)=>String(s.status||'active').toLowerCase()!=='inactive').length
    const paid=histories.reduce((sum:number,p:any)=>sum+num(p.paidAmountBase??p.paidAmount??p.amount),0)
    const payable=staff.reduce((sum:number,s:any)=>{
      const h=Array.isArray(s.payrollHistory)?s.payrollHistory:[]
      const latest=new Map<string,number>()
      h.forEach((p:any)=>latest.set(`${p.start||''}_${p.end||''}_${p.currency||s.currency||'AFN'}`,num(p.payable)))
      return sum+[...latest.values()].reduce((a,b)=>a+b,0)
    },0)
    return <div dir={isRtl?'rtl':'ltr'}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <DetailHeader title="Staff Payroll" sub="Staff members and salary breakdown" onBack={onBack} printLabel="Print Report"/>
        <DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[145px]"/>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard title="Total Staff" value={String(staff.length)} icon={Users} accent="blue"/>
        <StatCard title="Active Staff" value={String(activeStaff)} icon={Users} accent="green"/>
        <StatCard title="Staff Payable" value={fmt(payable)} icon={WalletCards} accent="orange"/>
        <StatCard title="Staff Paid" value={fmt(paid)} icon={CircleDollarSign} accent="green"/>
      </div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><WalletCards size={17}/>Payroll History ({histories.length})</div>
        <table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Name</th><th className="px-3 py-3 text-start">Period</th><th className="px-3 py-3 text-start">Date</th><th className="px-3 py-3 text-end">Base Salary</th><th className="px-3 py-3 text-end">Paid Amount</th><th className="px-3 py-3 text-start">Status</th></tr></thead>
        <tbody>{histories.map((p:any,i:number)=>{const base=num(p.baseSalary??p.salary??p.staff?.salary);const paidAmt=num(p.paidAmountBase??p.paidAmount??p.amount);const rem=Math.max(0,num(p.payable));const status=rem<=0?'Paid':paidAmt>0?'Partial':'Unpaid';const period=p.period||((p.start||p.end)?`${detailDate(p.start)} - ${detailDate(p.end)}`:'—');return <tr key={p.id||`${p.staff?.id}-${i}`} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold">{p.staff?.name||'—'}</td><td className="px-3 py-4">{period}</td><td className="px-3 py-4">{detailDate(p.date||p.createdAt||p.start)}</td><td className="px-3 py-4 text-end">{fmt(base,p.currency||p.staff?.currency||'AFN')}</td><td className="px-3 py-4 text-end">{fmt(paidAmt,p.currency||p.staff?.currency||'AFN')}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${status==='Paid'?'bg-emerald-50 text-emerald-600':status==='Partial'?'bg-slate-100 text-slate-600':'bg-amber-50 text-amber-600'}`}>{status}</span></td></tr>})}</tbody></table>
      </section>
    </div>
  }

  const payable=view==='supplier-payables'
  const rows=supplierRows.filter((s:any)=>payable?s.balanceCalc>0:s.balanceCalc<0).filter((s:any)=>hit(s.name,s.phone,s.balanceCalc)).filter((s:any)=>detailRangeMatches(s,range))
  const total=rows.reduce((sum:number,s:any)=>sum+Math.abs(num(s.balanceCalc)),0)
  return <div dir={isRtl?'rtl':'ltr'}><DetailHeader title={payable?'Supplier Payables':'Supplier Receivables'} sub={payable?'Suppliers you owe money to':'Suppliers who owe money to you'} onBack={onBack} printLabel="Print"/>
    <div className="grid max-w-[760px] gap-3 md:grid-cols-2"><StatCard title={payable?'Payable Suppliers':'Receivable Suppliers'} value={String(rows.length)} icon={TrendingUp} accent={payable?'red':'green'}/><StatCard title={payable?'Total Payables':'Total Receivables'} value={fmt(total)} icon={TrendingUp} accent={payable?'orange':'blue'}/></div>
    <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="relative flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search suppliers..." className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm"/></div><DetailDropdown value={range} onChange={setRange} options={rangeOpts} className="w-[140px]"/></div>
    <section className="mt-5 min-h-[220px] rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><TrendingUp size={17}/>{payable?'Supplier Payables':'Supplier Receivables'} ({rows.length})</div>{rows.length?<table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 text-start">Name</th><th className="px-3 py-3 text-start">Phone</th><th className="px-3 py-3 text-start">Currency</th><th className="px-3 py-3 text-end">{payable?'Payable Amount':'Receivable Amount'}</th><th className="px-3 py-3 text-start">Status</th><th className="px-3 py-3 text-start">Since</th><th className="w-12"></th></tr></thead><tbody>{rows.map((s:any)=><tr key={s.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4">{s.name||'—'}</td><td className="px-3 py-4">{s.phone||'—'}</td><td className="px-3 py-4">{s.currency||'AFN'}</td><td className={`px-3 py-4 text-end font-semibold ${payable?'text-red-500':'text-emerald-500'}`}>{fmt(Math.abs(num(s.balanceCalc)),s.currency||'AFN')}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs text-white ${payable?'bg-red-500':'bg-emerald-500'}`}>{payable?'Payable':'Receivable'}</span></td><td className="px-3 py-4">{detailDate(s.createdAt||s.date)}</td><td className="relative px-3 py-4 text-end"><button onClick={()=>setMenuId(menuId===String(s.id)?null:String(s.id))}><MoreHorizontal size={17}/></button>{menuId===String(s.id)&&<div className="absolute end-0 top-11 z-30 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button onClick={()=>onNavigate('suppliers')} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"><Search size={14}/>View</button>{payable&&<button onClick={()=>onNavigate('suppliers')} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"><WalletCards size={14}/>Make Payment</button>}</div>}</td></tr>)}</tbody></table>:<div className="grid h-[160px] place-items-center text-center"><div><TrendingUp size={44} className="mx-auto text-slate-300"/><div className="mt-3 font-semibold">No results found</div></div></div>}</section>
  </div>
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pharma-sidebar-collapsed') === '1')
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('month')
  const [globalSearch, setGlobalSearch] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [billingEditId, setBillingEditId] = useState<string | null>(null)
  const [dashboardRevenueOpen, setDashboardRevenueOpen] = useState(false)
  const [dashboardCashWalletOpen, setDashboardCashWalletOpen] = useState(false)
  const [dashboardNetProfitOpen, setDashboardNetProfitOpen] = useState(false)
  const [dashboardPureProfitOpen, setDashboardPureProfitOpen] = useState(false)
  const [dashboardDetailView, setDashboardDetailView] = useState<DashboardDetailView | null>(null)
  const [theme, setTheme] = useState<ThemeName>(() => (localStorage.getItem('pharma-theme') as ThemeName) || 'minimalism')
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('pharma-language') as Language) || 'دری')
  const [currentAccount, setCurrentAccount] = useState<CurrentAccount | null>(() => {
    if (localStorage.getItem(LOGGED_OUT_KEY) === '1') return null
    try {
      const parsed = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null')
      return parsed && typeof parsed === 'object' ? parsed : { id: 'admin', username: 'admin', displayName: 'Administrator', admin: true }
    } catch {
      return { id: 'admin', username: 'admin', displayName: 'Administrator', admin: true }
    }
  })
  const [accountPickerOpen, setAccountPickerOpen] = useState(() => localStorage.getItem(LOGGED_OUT_KEY) === '1')
  const isDarkTheme = theme === 'glassmorphism' || theme === 'liquidGlass' || theme === 'neonGlass'
  const isRtl = rtlLanguages.includes(language)
  const allowedPages = useMemo(() => ([
    'dashboard','medicines','billing','sales','staff','customers','godown','suppliers','expenses','loans','financials','reports','recycle','settings',
  ] as Page[]).filter((page) => canReadPage(currentAccount, page)), [currentAccount])
  const sidebarOffsetClass = sidebarCollapsed
    ? isRtl ? 'lg:mr-[72px]' : 'lg:ml-[72px]'
    : isRtl ? 'lg:mr-[260px]' : 'lg:ml-[260px]'

  useEffect(() => {
    localStorage.setItem('pharma-theme', theme)
    localStorage.setItem('pharma-language', language)
    localStorage.setItem('isp-selected-language', language === 'پښتو' ? 'ps' : language === 'دری' ? 'fa' : 'en')
    document.documentElement.classList.toggle('dark', isDarkTheme)
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = language === 'پښتو' ? 'ps' : language === 'دری' ? 'fa' : 'en'
    window.dispatchEvent(new CustomEvent('app-language-changed', { detail: { language, direction: isRtl ? 'rtl' : 'ltr' } }))
  }, [isDarkTheme, isRtl, language, theme])

  useEffect(() => {
    localStorage.setItem('pharma-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!currentAccount) return
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(currentAccount))
  }, [currentAccount])

  useEffect(() => {
    if (!allowedPages.length || allowedPages.includes(activePage)) return
    setActivePage(allowedPages[0])
    setSelectedSupplierId(null)
    setSelectedCustomerId(null)
    setSelectedStaffId(null)
    setBillingEditId(null)
  }, [activePage, allowedPages])

  const selectAccount = (account: CurrentAccount) => {
    setCurrentAccount(account)
    localStorage.removeItem(LOGGED_OUT_KEY)
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
    setAccountPickerOpen(false)
  }

  const logout = () => {
    localStorage.removeItem(ACCOUNT_KEY)
    localStorage.setItem(LOGGED_OUT_KEY, '1')
    setCurrentAccount(null)
    setAccountPickerOpen(true)
  }

  const pageAnimationKey = `${activePage}-${dashboardRevenueOpen ? 'revenue' : dashboardCashWalletOpen ? 'cash-wallet' : dashboardNetProfitOpen ? 'net-profit' : dashboardPureProfitOpen ? 'pure-profit' : dashboardDetailView || selectedSupplierId || selectedCustomerId || selectedStaffId || billingEditId || 'list'}`
  const navigate = (page: Page) => {
    if (!canReadPage(currentAccount, page)) return
    setActivePage(page)
    setDashboardRevenueOpen(false)
    setDashboardCashWalletOpen(false)
    setDashboardNetProfitOpen(false)
    setDashboardPureProfitOpen(false)
    setDashboardDetailView(null)
    setGlobalSearch('')
    if (page !== 'suppliers') setSelectedSupplierId(null)
    if (page !== 'customers') setSelectedCustomerId(null)
    if (page !== 'staff') setSelectedStaffId(null)
    if (page !== 'billing') setBillingEditId(null)
  }

  return (
    <div className="app-root min-h-screen bg-page text-slate-950 dark:bg-[#090f1d] dark:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar
        activePage={activePage}
        allowedPages={allowedPages}
        collapsed={sidebarCollapsed}
        isOpen={mobileSidebarOpen}
        isRtl={isRtl}
        language={language}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onNavigate={navigate}
      />
      <Header isRtl={isRtl} language={language} onMenuClick={() => setMobileSidebarOpen(true)} onLanguageChange={setLanguage} theme={theme} onThemeChange={setTheme} sidebarCollapsed={sidebarCollapsed} onLogout={logout} searchValue={globalSearch} onSearchChange={setGlobalSearch} />
      <ToastHost isRtl={isRtl} />
      {accountPickerOpen && <AccountSelector isRtl={isRtl} language={language} onSelect={selectAccount} />}
      <main className={`px-3 pb-8 pt-4 transition-[margin] duration-300 lg:px-5 ${sidebarOffsetClass}`}>
        <div key={pageAnimationKey} className="page-fade">
          {activePage === 'settings' ? (
            <Settings theme={theme} onThemeChange={setTheme} language={language} onLanguageChange={setLanguage} />
          ) : activePage === 'suppliers' ? (
            selectedSupplierId ? <SupplierDetails supplierId={selectedSupplierId} language={language} onBack={() => setSelectedSupplierId(null)} /> : <Suppliers language={language} onOpenSupplier={setSelectedSupplierId} globalSearch={globalSearch} />
          ) : activePage === 'customers' ? (
            <PageErrorBoundary key={`customers-${selectedCustomerId || 'list'}-${language}`} pageName="Customers" onReset={() => { setSelectedCustomerId(null); setActivePage('dashboard') }}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading customers…</div>}>
                {selectedCustomerId ? <CustomerDetails customerId={selectedCustomerId} language={language} onBack={() => setSelectedCustomerId(null)} /> : <Customers language={language} onOpenCustomer={setSelectedCustomerId} globalSearch={globalSearch} />}
              </Suspense>
            </PageErrorBoundary>
          ) : activePage === 'staff' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading staff…</div>}>
              {selectedStaffId ? <StaffDetails staffId={selectedStaffId} language={language} onBack={() => setSelectedStaffId(null)} /> : <Staff language={language} onOpenStaff={setSelectedStaffId} globalSearch={globalSearch} />}
            </Suspense>
          ) : activePage === 'sales' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading sales…</div>}>
              <Sales language={language} globalSearch={globalSearch} onEditInvoice={(id) => { setBillingEditId(id); setActivePage('billing') }} />
            </Suspense>
          ) : activePage === 'godown' ? (
            <PageErrorBoundary key={`godown-${language}`} pageName="Godown" onReset={() => setActivePage('dashboard')}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading godown…</div>}>
                <Godown language={language} />
              </Suspense>
            </PageErrorBoundary>
          ) : activePage === 'expenses' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading expenses…</div>}>
              <Expenses language={language} globalSearch={globalSearch} />
            </Suspense>
          ) : activePage === 'loans' ? (
            <PageErrorBoundary key={`loans-${language}`} pageName="Loans" onReset={() => setActivePage('dashboard')}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading loans…</div>}><Loans language={language} onEditInvoice={(id) => { setBillingEditId(id); setActivePage('billing') }} /></Suspense>
            </PageErrorBoundary>
          ) : activePage === 'financials' ? (
            <PageErrorBoundary key={`financials-${language}`} pageName="Financials" onReset={() => setActivePage('dashboard')}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading financials…</div>}><Financials language={language} /></Suspense>
            </PageErrorBoundary>
          ) : activePage === 'reports' ? (
            <PageErrorBoundary key={`reports-${language}`} pageName="Reports" onReset={() => setActivePage('dashboard')}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading reports…</div>}><Reports language={language} /></Suspense>
            </PageErrorBoundary>
          ) : activePage === 'recycle' ? (
            <PageErrorBoundary key={`recycle-${language}`} pageName="Recycle Bin" onReset={() => setActivePage('dashboard')}>
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading recycle bin…</div>}><RecycleBin language={language} globalSearch={globalSearch} /></Suspense>
            </PageErrorBoundary>
          ) : activePage === 'billing' ? (
            <Billing language={language} globalSearch={globalSearch} editInvoiceId={billingEditId} onEditDone={() => setBillingEditId(null)} />
          ) : activePage === 'medicines' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500">Loading medicines…</div>}>
              <Medicines language={language} globalSearch={globalSearch} />
            </Suspense>
          ) : (
            <PageErrorBoundary key={`dashboard-${language}-${dashboardRevenueOpen ? 'revenue' : dashboardCashWalletOpen ? 'cash-wallet' : dashboardNetProfitOpen ? 'net-profit' : dashboardPureProfitOpen ? 'pure-profit' : dashboardDetailView || 'main'}`} pageName="Dashboard" onReset={() => { setDashboardRevenueOpen(false); setDashboardCashWalletOpen(false); setDashboardNetProfitOpen(false); setDashboardPureProfitOpen(false); setDashboardDetailView(null); setActivePage('dashboard') }}>
              {dashboardRevenueOpen
                ? <RevenueView language={language} onBack={() => setDashboardRevenueOpen(false)} />
                : dashboardCashWalletOpen
                  ? <CashWalletView language={language} onBack={() => setDashboardCashWalletOpen(false)} />
                  : dashboardNetProfitOpen
                    ? <NetProfitView language={language} onBack={() => setDashboardNetProfitOpen(false)} />
                    : dashboardPureProfitOpen
                      ? <PureProfitView language={language} onBack={() => setDashboardPureProfitOpen(false)} />
                      : dashboardDetailView
                        ? <DashboardDetailPage view={dashboardDetailView} language={language} onBack={() => setDashboardDetailView(null)} onNavigate={navigate} />
                        : <Dashboard filter={dashboardFilter} language={language} onFilterChange={setDashboardFilter} onNavigate={navigate} onOpenRevenue={() => setDashboardRevenueOpen(true)} onOpenCashWallet={() => setDashboardCashWalletOpen(true)} onOpenNetProfit={() => setDashboardNetProfitOpen(true)} onOpenPureProfit={() => setDashboardPureProfitOpen(true)} onOpenDetail={(view) => setDashboardDetailView(view)} />}
            </PageErrorBoundary>
          )}
        </div>
      </main>
    </div>
  )
}
