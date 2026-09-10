import { Component, lazy, Suspense, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  Archive, Banknote, Box, CalendarDays, Check, CircleDollarSign, Clock3, Package, RefreshCcw,
  ShoppingCart, TrendingUp, User, Users, WalletCards
} from 'lucide-react'
import Header from './components/Header'
import QuickActions from './components/QuickActions'
import Sidebar from './components/Sidebar'
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
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [billingEditId, setBillingEditId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeName>(() => (localStorage.getItem('pharma-theme') as ThemeName) || 'minimalism')
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('pharma-language') as Language) || 'دری')
  const isDarkTheme = theme === 'glassmorphism' || theme === 'liquidGlass' || theme === 'neonGlass'
  const isRtl = rtlLanguages.includes(language)
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

  const pageAnimationKey = `${activePage}-${selectedSupplierId || selectedCustomerId || selectedStaffId || billingEditId || 'list'}`

  return (
    <div className="app-root min-h-screen bg-page text-slate-950 dark:bg-[#090f1d] dark:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar
        activePage={activePage}
        collapsed={sidebarCollapsed}
        isOpen={mobileSidebarOpen}
        isRtl={isRtl}
        language={language}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onNavigate={(page) => { setActivePage(page); if (page !== 'suppliers') setSelectedSupplierId(null); if (page !== 'customers') setSelectedCustomerId(null); if (page !== 'staff') setSelectedStaffId(null); if (page !== 'billing') setBillingEditId(null) }}
      />
      <Header isRtl={isRtl} language={language} onMenuClick={() => setMobileSidebarOpen(true)} onLanguageChange={setLanguage} theme={theme} onThemeChange={setTheme} sidebarCollapsed={sidebarCollapsed} />
      <main className={`px-3 pb-8 pt-4 transition-[margin] duration-300 lg:px-5 ${sidebarOffsetClass}`}>
        <div key={pageAnimationKey} className="page-fade">
          {activePage === 'settings' ? (
            <Settings theme={theme} onThemeChange={setTheme} language={language} onLanguageChange={setLanguage} />
          ) : activePage === 'suppliers' ? (
            selectedSupplierId ? <SupplierDetails supplierId={selectedSupplierId} language={language} onBack={() => setSelectedSupplierId(null)} /> : <Suppliers language={language} onOpenSupplier={setSelectedSupplierId} />
          ) : activePage === 'customers' ? (
            selectedCustomerId ? <CustomerDetails customerId={selectedCustomerId} language={language} onBack={() => setSelectedCustomerId(null)} /> : <Customers language={language} onOpenCustomer={setSelectedCustomerId} />
          ) : activePage === 'staff' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading staff…</div>}>
              {selectedStaffId ? <StaffDetails staffId={selectedStaffId} language={language} onBack={() => setSelectedStaffId(null)} /> : <Staff language={language} onOpenStaff={setSelectedStaffId} />}
            </Suspense>
          ) : activePage === 'sales' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading sales…</div>}>
              <Sales language={language} onEditInvoice={(id) => { setBillingEditId(id); setActivePage('billing') }} />
            </Suspense>
          ) : activePage === 'godown' ? (
            <PageErrorBoundary key={`godown-${language}`} pageName="Godown" onReset={() => setActivePage('dashboard')}>
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading godown…</div>}>
                <Godown language={language} />
              </Suspense>
            </PageErrorBoundary>
          ) : activePage === 'expenses' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading expenses…</div>}>
              <Expenses language={language} />
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
              <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500 dark:text-slate-300">Loading recycle bin…</div>}><RecycleBin language={language} /></Suspense>
            </PageErrorBoundary>
          ) : activePage === 'billing' ? (
            <Billing language={language} editInvoiceId={billingEditId} onEditDone={() => setBillingEditId(null)} />
          ) : activePage === 'medicines' ? (
            <Suspense fallback={<div className="grid min-h-[300px] place-items-center text-sm text-slate-500">Loading medicines…</div>}>
              <Medicines language={language} />
            </Suspense>
          ) : (
            <Dashboard filter={dashboardFilter} language={language} onFilterChange={setDashboardFilter} />
          )}
        </div>
      </main>
    </div>
  )
}
