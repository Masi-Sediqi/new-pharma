import { useEffect, useRef, useState } from 'react'
import {
  Bell, Check, Download, Filter, Languages, Menu,
  LogOut, Moon, Search, Settings, SlidersHorizontal, Sun, Upload, User, Volume2,
  WalletCards, X
} from 'lucide-react'
import type { Language } from '../i18n'
import type { ThemeName } from '../theme'

type MenuName = 'currencyFilter' | 'exchange' | 'language' | 'notifications' | 'account' | null

const currencies = [
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: 'ریال', name: 'Saudi Riyal' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'IRR', symbol: 'ریال', name: 'Iranian Rial' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
] as const

const languages: Language[] = ['English', 'دری', 'پښتو']
const walletText = {
  English: {
    title: 'Cash Wallet',
    subtitle: 'Track owner cash deposits and withdrawals.',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    amount: 'Amount *',
    currency: 'Currency',
    note: 'Reason / Note',
    placeholder: 'e.g. Owner injection from personal funds',
    saveDeposit: 'Save Deposit',
    saveWithdraw: 'Save Withdraw',
    cancel: 'Cancel',
    close: 'Close cash wallet',
    depositTitle: 'Cash Wallet Deposit',
    withdrawTitle: 'Cash Wallet Withdrawal',
  },
  دری: {
    title: 'کیف پول نقد',
    subtitle: 'ثبت سپرده‌ها و برداشت‌های نقدی مالک.',
    deposit: 'سپرده',
    withdraw: 'برداشت',
    amount: 'مقدار *',
    currency: 'واحد پول',
    note: 'دلیل / یادداشت',
    placeholder: 'مثال: تزریق سرمایه از منابع شخصی',
    saveDeposit: 'ذخیره سپرده',
    saveWithdraw: 'ذخیره برداشت',
    cancel: 'لغو',
    close: 'بستن کیف پول نقد',
    depositTitle: 'سپرده کیف پول نقد',
    withdrawTitle: 'برداشت کیف پول نقد',
  },
  پښتو: {
    title: 'نغدي بټوه',
    subtitle: 'د مالک نغدي سپارنې او برداشتونه ثبت کړئ.',
    deposit: 'سپارنه',
    withdraw: 'برداشت',
    amount: 'مقدار *',
    currency: 'اسعار',
    note: 'دلیل / یادښت',
    placeholder: 'بېلګه: له شخصي پیسو څخه پانګه اچونه',
    saveDeposit: 'سپارنه خوندي کړئ',
    saveWithdraw: 'برداشت خوندي کړئ',
    cancel: 'لغوه',
    close: 'نغدي بټوه بندول',
    depositTitle: 'د نغدي بټوې سپارنه',
    withdrawTitle: 'د نغدي بټوې برداشت',
  },
} as const
const PRIMARY_CURRENCY_KEY = 'isp-primary-currency'
const SECONDARY_CURRENCY_KEY = 'isp-secondary-currency'
const EXCHANGE_FROM_KEY = 'isp-exchange-from-currency'
const EXCHANGE_TO_KEY = 'isp-exchange-to-currency'
const EXCHANGE_ACTIVE_KEY = 'isp-exchange-conversion-active'

function readArray(key: string): any[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveArray(key: string, value: unknown[]) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('pharma:data-changed'))
  window.dispatchEvent(new CustomEvent('storage'))
}

function IconButton({
  active,
  children,
  onClick,
  label,
}: {
  active?: boolean
  children: React.ReactNode
  onClick?: () => void
  label: string
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition sm:h-8 sm:w-8 ${
        active
          ? 'bg-amber-500 text-slate-950'
          : 'text-slate-950 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function MenuPanel({ children, className = '', isRtl }: { children: React.ReactNode; className?: string; isRtl: boolean }) {
  return (
    <div className={`absolute top-10 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-[#24365f] dark:bg-[#101827] dark:text-white ${isRtl ? 'left-0 text-right' : 'right-0 text-left'} ${className}`}>
      {children}
    </div>
  )
}

type Props = {
  isRtl: boolean
  language: Language
  onMenuClick: () => void
  onLanguageChange: (language: Language) => void
  theme: ThemeName
  onThemeChange: (theme: ThemeName) => void
  sidebarCollapsed: boolean
  onLogout?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export default function Header({ isRtl, language, onMenuClick, onLanguageChange, theme, onThemeChange, sidebarCollapsed, onLogout, searchValue = '', onSearchChange }: Props) {
  const wt = walletText[language] ?? walletText.English
  const headerRef = useRef<HTMLElement | null>(null)
  const [openMenu, setOpenMenu] = useState<MenuName>(null)
  const [cashOpen, setCashOpen] = useState(false)
  const [walletMode, setWalletMode] = useState<'Deposit' | 'Withdraw'>('Deposit')
  const [walletAmount, setWalletAmount] = useState('')
  const [walletCurrency, setWalletCurrency] = useState(() => localStorage.getItem(PRIMARY_CURRENCY_KEY) !== 'all' ? localStorage.getItem(PRIMARY_CURRENCY_KEY) || 'AFN' : 'AFN')
  const [walletNote, setWalletNote] = useState('')
  const [primaryCurrency, setPrimaryCurrency] = useState(() => localStorage.getItem(PRIMARY_CURRENCY_KEY) || 'all')
  const [exchangeFromCurrency, setExchangeFromCurrency] = useState(() => localStorage.getItem(EXCHANGE_FROM_KEY) || 'original')
  const [exchangeToCurrency, setExchangeToCurrency] = useState(() => localStorage.getItem(EXCHANGE_TO_KEY) || 'AFN')
  const isDarkTheme = theme === 'glassmorphism' || theme === 'liquidGlass' || theme === 'neonGlass'
  const sidebarOffsetClass = sidebarCollapsed
    ? isRtl ? 'lg:mr-[72px]' : 'lg:ml-[72px]'
    : isRtl ? 'lg:mr-[260px]' : 'lg:ml-[260px]'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkTheme)
    document.documentElement.dataset.theme = theme
  }, [isDarkTheme, theme])

  useEffect(() => {
    if (!openMenu) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenu])

  const toggleMenu = (menu: Exclude<MenuName, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  const dispatchCurrencyChange = (nextPrimary = primaryCurrency, nextFrom = exchangeFromCurrency, nextTo = exchangeToCurrency) => {
    window.dispatchEvent(new CustomEvent('app-currency-changed', {
      detail: {
        primaryCurrency: nextPrimary,
        exchangeFromCurrency: nextFrom,
        exchangeToCurrency: nextTo,
        secondaryCurrency: nextFrom === 'original' ? 'original' : nextTo,
        conversionActive: nextFrom !== 'original',
      },
    }))
    window.dispatchEvent(new CustomEvent('pharma:data-changed'))
  }

  const changePrimaryCurrency = (code: string) => {
    setPrimaryCurrency(code)
    localStorage.setItem(PRIMARY_CURRENCY_KEY, code)
    dispatchCurrencyChange(code)
    setOpenMenu(null)
  }

  const changeExchangeCurrency = (code: string) => {
    const nextFrom = code
    const nextTo = code === 'original' ? exchangeToCurrency : (code === exchangeToCurrency ? 'AFN' : exchangeToCurrency)
    setExchangeFromCurrency(nextFrom)
    setExchangeToCurrency(nextTo)
    localStorage.setItem(EXCHANGE_FROM_KEY, nextFrom)
    localStorage.setItem(EXCHANGE_TO_KEY, nextTo)
    localStorage.setItem(SECONDARY_CURRENCY_KEY, nextFrom === 'original' ? 'original' : nextTo)
    localStorage.setItem(EXCHANGE_ACTIVE_KEY, nextFrom === 'original' ? '0' : '1')
    dispatchCurrencyChange(primaryCurrency, nextFrom, nextTo)
    setOpenMenu(null)
  }

  const openCashWallet = () => {
    setWalletAmount('')
    setWalletCurrency(primaryCurrency !== 'all' ? primaryCurrency : 'AFN')
    setWalletNote('')
    setWalletMode('Deposit')
    setCashOpen(true)
    setOpenMenu(null)
  }

  const closeCashWallet = () => {
    setCashOpen(false)
    setWalletAmount('')
    setWalletNote('')
  }

  const saveCashWallet = () => {
    const amount = Number(walletAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const now = new Date().toISOString()
    const transaction = {
      id: `wallet-${Date.now()}`,
      transactionType: walletMode === 'Deposit' ? 'deposit' : 'withdraw',
      type: walletMode === 'Deposit' ? 'income' : 'expense',
      category: 'Cash Wallet',
      title: walletMode === 'Deposit' ? wt.depositTitle : wt.withdrawTitle,
      amount,
      currency: walletCurrency || 'AFN',
      note: walletNote.trim(),
      description: walletNote.trim(),
      date: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      source: 'cash-wallet',
      referenceSource: 'manual-cash-wallet',
    }
    saveArray('transactions', [transaction, ...readArray('transactions')])
    window.dispatchEvent(new CustomEvent('cash-wallet-updated', { detail: transaction }))
    closeCashWallet()
  }

  return (
    <>
      <header ref={headerRef} className={`sticky top-0 z-30 bg-page/95 px-2 pt-2 backdrop-blur transition-[margin] duration-300 dark:bg-[#090f1d]/95 sm:px-3 lg:px-4 ${sidebarOffsetClass}`}>
        <div className="flex h-[54px] items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 shadow-soft dark:border-[#24365f] dark:bg-[#0c1424] sm:gap-2 sm:px-4">
          <button aria-label="Open sidebar" onClick={onMenuClick} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"><Menu size={20} /></button>
          <div className="relative min-w-[92px] flex-1 sm:w-[290px] sm:max-w-[38vw] sm:flex-none">
            <Search size={17} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 ${isRtl ? 'right-2 sm:right-3' : 'left-2 sm:left-3'}`} />
            <input
              aria-label="Search products and customers"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={isRtl ? 'جستجوی داروها، مشتریان...' : 'Search products, customers...'}
              className={`h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-[#172a57] focus:bg-white focus:ring-2 focus:ring-[#172a57] dark:border-[#22345d] dark:bg-[#0c1424] dark:text-white dark:placeholder:text-slate-300 dark:focus:border-amber-500 dark:focus:ring-amber-500 sm:text-sm ${isRtl ? 'pl-2 pr-8 text-right sm:pl-3 sm:pr-9' : 'pl-8 pr-2 text-left sm:pl-9 sm:pr-3'}`}
            />
          </div>
          <div className="mx-auto hidden rounded-full bg-slate-50 px-4 py-1 text-xs font-semibold text-slate-600 dark:bg-[#101827] dark:text-white md:block">{isRtl ? 'Lifetime ∞' : '∞ Lifetime'}</div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <div className="relative">
              <IconButton label="Business currency filter" onClick={() => toggleMenu('currencyFilter')}>
                <Filter size={17} />
              </IconButton>
              {openMenu === 'currencyFilter' && (
                <MenuPanel isRtl={isRtl} className="w-[208px]">
                  <div className="px-3 py-3 text-sm font-bold">Business Currency Filter</div>
                  <button onClick={() => changePrimaryCurrency('all')} className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-3 text-start text-sm hover:bg-slate-50 dark:border-[#24365f] dark:hover:bg-white/5">
                    <span>All — All Currencies</span>
                    {primaryCurrency === 'all' && <Check size={16} />}
                  </button>
                  <div className="py-2">
                    {currencies.map(({ code, symbol, name }) => (
                      <button key={code} onClick={() => changePrimaryCurrency(code)} className="flex w-full items-center gap-1 px-3 py-1.5 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                        <span className="w-7 shrink-0">{symbol}</span>
                        <span className="flex-1">{name}</span>
                        {primaryCurrency === code && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </MenuPanel>
              )}
            </div>
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">ALL</span>
            <div className="relative">
              <IconButton label="Exchange currency" onClick={() => toggleMenu('exchange')}>
                <SlidersHorizontal size={17} />
              </IconButton>
              {openMenu === 'exchange' && (
                <MenuPanel isRtl={isRtl} className="w-[208px]">
                  <div className="px-3 py-3 text-sm font-bold">Exchange Currency</div>
                  <button onClick={() => changeExchangeCurrency('original')} className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-3 text-start text-sm hover:bg-slate-50 dark:border-[#24365f] dark:hover:bg-white/5">
                    <span>Original (No Conversion)</span>
                    {exchangeFromCurrency === 'original' && <Check size={16} />}
                  </button>
                  <div className="py-2">
                    {currencies.map(({ code, symbol, name }) => (
                      <button key={`exchange-${code}`} onClick={() => changeExchangeCurrency(code)} className="flex w-full items-center gap-1 px-3 py-1.5 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                        <span className="w-7 shrink-0">{symbol}</span>
                        <span className="flex-1">{name}</span>
                        {exchangeFromCurrency === code && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </MenuPanel>
              )}
            </div>
            <IconButton active={cashOpen} label="Cash wallet" onClick={openCashWallet}>
              <WalletCards size={17} />
            </IconButton>
            <IconButton active={isDarkTheme} label="Toggle dark mode" onClick={() => onThemeChange(isDarkTheme ? 'minimalism' : 'neonGlass')}>
              {isDarkTheme ? <Sun size={17} /> : <Moon size={17} />}
            </IconButton>
            <div className="relative">
              <IconButton label="Language" onClick={() => toggleMenu('language')}>
                <Languages size={17} />
              </IconButton>
              {openMenu === 'language' && (
                <MenuPanel isRtl={isRtl} className="w-[192px]">
                  <div className="px-3 py-3 text-sm font-bold">{isRtl ? 'زبان' : 'Language'}</div>
                  <div className="border-t border-slate-100 py-2 dark:border-[#24365f]">
                    {languages.map((item) => (
                      <button
                        key={item}
                        onClick={() => onLanguageChange(item)}
                        className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <span>{item}</span>
                        {language === item && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </MenuPanel>
              )}
            </div>
            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => toggleMenu('notifications')}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition sm:h-8 sm:w-8 ${
                  openMenu === 'notifications'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-950 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10'
                }`}
              >
                <Bell size={17} />
              </button>
              {openMenu === 'notifications' && (
                <MenuPanel isRtl={isRtl} className="w-[320px]">
                  <div className="flex items-center justify-between px-3 py-4 text-base font-bold">
                    <span>Notifications</span>
                    <Volume2 size={17} />
                  </div>
                  <div className="grid h-[124px] place-items-center border-t border-slate-100 text-center text-slate-500 dark:border-[#24365f] dark:text-slate-300">
                    <div>
                      <Bell size={34} className="mx-auto mb-2 text-slate-400" />
                      <div className="text-sm">No notifications</div>
                    </div>
                  </div>
                </MenuPanel>
              )}
            </div>
            <div className="relative">
              <button
                aria-label="My account"
                onClick={() => toggleMenu('account')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#172a57] text-xs font-bold text-white transition dark:bg-amber-500 dark:text-slate-950 sm:h-8 sm:w-8"
              >
                A
              </button>
              {openMenu === 'account' && (
                <MenuPanel isRtl={isRtl} className="w-[222px]">
                  <div className="px-3 py-3 text-sm font-bold">My Account</div>
                  <div className="border-t border-slate-100 py-2 dark:border-[#24365f]">
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"><User size={16} /> Profile</button>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"><Settings size={16} /> Settings</button>
                  </div>
                  <div className="border-t border-slate-100 py-2 dark:border-[#24365f]">
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"><Download size={16} /> Export Backup</button>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5"><Upload size={16} /> Import / Restore Backup</button>
                  </div>
                  <div className="border-t border-slate-100 py-2 dark:border-[#24365f]">
                    <button onClick={() => { setOpenMenu(null); onLogout?.() }} className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"><LogOut size={16} /> {isRtl ? 'خروج' : 'Logout'}</button>
                  </div>
                </MenuPanel>
              )}
            </div>
          </div>
        </div>
      </header>

      {cashOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
          <section dir={isRtl ? 'rtl' : 'ltr'} className="modal-card w-full max-w-[440px] rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-slate-200 dark:bg-white dark:text-slate-950">
            <div className="flex items-start gap-3">
              <WalletCards size={21} className="mt-0.5 text-[#172a57]" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold">{wt.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{wt.subtitle}</p>
              </div>
              <button aria-label={wt.close} onClick={closeCashWallet} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              {(['Deposit', 'Withdraw'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setWalletMode(mode)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                    walletMode === mode
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full border text-[10px]">{mode === 'Deposit' ? '↓' : '↑'}</span>
                  {mode === 'Deposit' ? wt.deposit : wt.withdraw}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_190px]">
              <label className="text-sm font-medium">
                {wt.amount}
                <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#172a57] focus:bg-white focus:ring-2 focus:ring-[#172a57]/25" type="number" min="0" step="0.01" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} placeholder="0.00" />
              </label>
              <label className="text-sm font-medium">
                {wt.currency}
                <select value={walletCurrency} onChange={(event) => setWalletCurrency(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#172a57] focus:bg-white focus:ring-2 focus:ring-[#172a57]/25">
                  {currencies.map(({ code, symbol }) => <option key={code} value={code}>{symbol} {code}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium">
              {wt.note}
              <textarea value={walletNote} onChange={(event) => setWalletNote(event.target.value)} className="mt-2 h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#172a57] focus:bg-white focus:ring-2 focus:ring-[#172a57]/25" placeholder={wt.placeholder} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeCashWallet} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">{wt.cancel}</button>
              <button onClick={saveCashWallet} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white hover:bg-emerald-600">
                {walletMode === 'Deposit' ? wt.saveDeposit : wt.saveWithdraw}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
