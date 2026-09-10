import { Component, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  Archive, Banknote, Box, CalendarDays, Check, CircleDollarSign, Clock3, Package, RefreshCcw,
  Crown, ShieldCheck, ShoppingCart, TrendingUp, User, Users, WalletCards
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
import Customers from './pages/Customers'
import CustomerDetails from './pages/CustomerDetails'
import type { Language } from './i18n'
import type { ThemeName } from './theme'

const Medicines = lazy(() => import('./pages/Medicines'))
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
      onSelect({ id: 'admin', username: 'admin', displayName: adminTitle, admin: true })
      return
    }
    if (selected.password && selected.password !== password) {
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
const currencyMatches = (recordCurrency: unknown, filterCurrency: string) => !filterCurrency || filterCurrency === 'all' || String(recordCurrency || 'AFN').toUpperCase() === filterCurrency.toUpperCase()

function recordDate(record: any): Date | null {
  const raw = record?.createdAt || record?.updatedAt || record?.date || record?.invoiceDate || record?.expenseDate || record?.purchaseDate || record?.paidAt
  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
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

function Dashboard({ filter, language, onFilterChange }: { filter: DashboardFilter; language: Language; onFilterChange: (filter: DashboardFilter) => void }) {
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
  const manualWalletDelta = transactions
    .filter((tx) => tx.source === 'cash-wallet' && (tx.referenceSource === 'manual-cash-wallet' || String(tx.id || '').startsWith('wallet-')))
    .reduce((sum, tx) => sum + (String(tx.type).toLowerCase() === 'expense' || String(tx.transactionType).toLowerCase() === 'withdraw' ? -num(tx.amount) : num(tx.amount)), 0)
  const currentWallet = totalPaid - totalExpensesValue + manualWalletDelta
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
        <StatCard title={t.totalRevenue} value={formatDashboardMoney(totalRevenue)} icon={CircleDollarSign} accent="green" />
        <StatCard title={t.currentWallet} value={formatDashboardMoney(currentWallet)} icon={WalletCards} accent="green" />
        <StatCard title={t.netProfit} value={formatDashboardMoney(netProfit)} icon={TrendingUp} accent="green" />
        <StatCard title={t.pureProfit} value={formatDashboardMoney(pureProfit)} icon={TrendingUp} accent="green" />
        <StatCard title={t.totalSales} value={String(invoices.length)} icon={ShoppingCart} accent="blue" />
        <StatCard title={t.totalExpenses} value={formatDashboardMoney(totalExpensesValue)} icon={WalletCards} accent="navy" />
        <StatCard title={t.pendingPayments} value={formatDashboardMoney(pendingPayments)} icon={Clock3} accent="orange" />
        <StatCard title={t.totalRefunds} value={formatDashboardMoney(totalRefundsValue)} icon={RefreshCcw} accent="red" />
        <StatCard title={t.totalCustomers} value={String(customers.length)} icon={Users} accent="navy" />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.suppliers}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.totalPayables} value={formatDashboardMoney(totalPayablesValue)} icon={Banknote} accent="orange" />
        <StatCard title={t.totalReceivables} value={formatDashboardMoney(totalReceivablesValue)} icon={TrendingUp} accent="green" />
        <StatCard title={t.netBalance} value={formatDashboardMoney(totalPayablesValue-totalReceivablesValue)} icon={CircleDollarSign} accent="navy" />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.stock}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.activeProducts} value={String(activeProducts)} icon={Box} accent="navy" />
        <StatCard title={t.stockQuantity} value={String(stockQuantity)} icon={Package} accent="navy" />
        <StatCard title={t.globalStockValue} value={formatDashboardMoney(globalStockValue)} icon={Archive} accent="orange" />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold">{t.staff}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard title={t.totalStaff} value={String(staffData.length)} icon={User} accent="navy" />
        <StatCard title={t.staffPayable} value={formatDashboardMoney(staffPayable)} icon={Banknote} accent="orange" />
        <StatCard title={t.staffPaid} value={formatDashboardMoney(staffPaid)} icon={CircleDollarSign} accent="green" />
      </div>

      <div className="mt-7"><TrendChart /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[470px_1fr]">
        <QuickActions />
        <section className="app-panel min-h-[228px] rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
          <h3 className="text-sm font-semibold">{t.recentActivity}</h3>
          <div className="grid h-[165px] place-items-center text-center">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-300">{t.noRecent}</div>
              <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">{t.recentHint}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
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

  const pageAnimationKey = `${activePage}-${selectedSupplierId || selectedCustomerId || selectedStaffId || billingEditId || 'list'}`
  const navigate = (page: Page) => {
    if (!canReadPage(currentAccount, page)) return
    setActivePage(page)
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
            selectedCustomerId ? <CustomerDetails customerId={selectedCustomerId} language={language} onBack={() => setSelectedCustomerId(null)} /> : <Customers language={language} onOpenCustomer={setSelectedCustomerId} globalSearch={globalSearch} />
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
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading loans…</div>}><Loans language={language} /></Suspense>
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
            <Dashboard filter={dashboardFilter} language={language} onFilterChange={setDashboardFilter} />
          )}
        </div>
      </main>
    </div>
  )
}
