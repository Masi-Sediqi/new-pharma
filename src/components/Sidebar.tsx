import {
  Boxes, ChevronLeft, CircleDollarSign, ClipboardList, LayoutDashboard,
  Package, Pill, Receipt, Recycle, Settings, ShoppingCart, Truck,
  User, Users, WalletCards, Warehouse
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Language } from '../i18n'
import { sidebarLabels } from '../i18n'

const items = [
  [LayoutDashboard, 'Dashboard', 'dashboard'],
  [Package, 'Medicines', 'medicines'],
  [Receipt, 'Billing', 'billing'],
  [ShoppingCart, 'Sales/Bills', 'sales'],
  [Users, 'Staff', 'staff'],
  [User, 'Customers', 'customers'],
  [Warehouse, 'Godown', 'godown'],
  [Truck, 'Suppliers/Katanama', 'suppliers'],
  [WalletCards, 'Expenses', 'expenses'],
  [ClipboardList, 'Loans', 'loans'],
  [CircleDollarSign, 'Financials', 'financials'],
  [Boxes, 'Reports', 'reports'],
  [Recycle, 'Recycle Bin', 'recycle'],
  [Settings, 'Settings', 'settings'],
] as const

export type Page = (typeof items)[number][2]

type Props = {
  activePage: Page
  allowedPages?: Page[]
  collapsed: boolean
  isOpen: boolean
  isRtl: boolean
  language: Language
  onClose: () => void
  onToggleCollapse: () => void
  onNavigate: (page: Page) => void
}

type SidebarBrand = { logo: string; name: string; subtitle: string }

function readBrand(language: Language): SidebarBrand {
  try {
    const raw = JSON.parse(localStorage.getItem('settings') || '[]')
    const settings = Array.isArray(raw) ? raw[0] || {} : raw || {}
    const name = language === 'دری'
      ? settings.companyNameDari || settings.companyName || 'سمارت فارما'
      : language === 'پښتو'
        ? settings.companyNamePashto || settings.companyName || 'سمارټ فارما'
        : settings.companyName || 'Smart Pharma'
    const subtitle = language === 'دری'
      ? settings.systemSubtitleDari || settings.systemSubtitle || 'سیستم مدیریت فارمسی'
      : language === 'پښتو'
        ? settings.systemSubtitlePashto || settings.systemSubtitle || 'د درملتون د مدیریت سیستم'
        : settings.systemSubtitle || 'Pharmacy Management System'
    return { logo: settings.logo || '', name, subtitle }
  } catch {
    return {
      logo: '',
      name: language === 'English' ? 'Smart Pharma' : language === 'دری' ? 'سمارت فارما' : 'سمارټ فارما',
      subtitle: language === 'English' ? 'Pharmacy Management System' : language === 'دری' ? 'سیستم مدیریت فارمسی' : 'د درملتون د مدیریت سیستم',
    }
  }
}

export default function Sidebar({ activePage, allowedPages, collapsed, isOpen, isRtl, language, onClose, onToggleCollapse, onNavigate }: Props) {
  const hiddenTransform = isRtl ? 'translate-x-full' : '-translate-x-full'
  const [brand, setBrand] = useState<SidebarBrand>(() => readBrand(language))
  const visibleItems = allowedPages ? items.filter(([, , page]) => allowedPages.includes(page)) : items

  useEffect(() => {
    const refresh = () => setBrand(readBrand(language))
    refresh()
    window.addEventListener('pharma:data-changed', refresh)
    window.addEventListener('company-settings-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pharma:data-changed', refresh)
      window.removeEventListener('company-settings-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [language])

  return (
    <>
      {isOpen && <button aria-label="Close sidebar overlay" onClick={onClose} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <aside className={`fixed inset-y-0 z-50 flex w-[260px] flex-col bg-black text-white transition-[width,transform] duration-300 lg:z-40 lg:translate-x-0 ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'} ${isRtl ? 'right-0' : 'left-0'} ${isOpen ? 'translate-x-0' : hiddenTransform}`}>
      <div className={`flex h-[62px] items-center border-b border-white/10 px-3 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
        <div className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-amber-500 text-black ${collapsed ? 'lg:h-9 lg:w-9' : ''}`}>
          {brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-cover" /> : <Pill size={21} strokeWidth={2.2} />}
        </div>
        <div className={`${isRtl ? 'mr-3 text-right' : 'ml-3'} min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="truncate text-[17px] font-bold">{brand.name}</div>
          <div className="truncate text-[9px] text-slate-400">{brand.subtitle}</div>
        </div>
        <button
          onClick={onToggleCollapse}
          className={`${isRtl ? 'mr-auto' : 'ml-auto'} grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white ${
            collapsed ? `${isRtl ? 'lg:-left-3 lg:right-auto' : 'lg:-right-3 lg:left-auto'} lg:absolute lg:top-4 lg:bg-black lg:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]` : ''
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={17} className={`${isRtl ? 'rotate-180' : ''} ${collapsed ? 'lg:rotate-0' : ''}`} />
        </button>
      </div>

      <nav className={`scrollbar-none flex-1 overflow-y-auto px-3 py-2 ${collapsed ? 'lg:px-2' : ''}`}>
        {visibleItems.map(([Icon, label, page]) => (
          <button
            key={label}
            onClick={() => {
              onNavigate(page)
              onClose()
            }}
            title={collapsed ? sidebarLabels[language][page] ?? label : undefined}
            className={`mb-1 flex h-[39px] w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isRtl ? 'justify-start text-right' : 'text-left'} ${
              activePage === page ? 'bg-amber-500 text-black' : 'text-slate-100 hover:bg-white/10'
            }`}
          >
            <Icon size={18} strokeWidth={1.8} className="shrink-0" />
            <span className={`min-w-0 flex-1 ${isRtl ? 'text-right' : ''} ${collapsed ? 'lg:hidden' : ''}`}>{sidebarLabels[language][page] ?? label}</span>
          </button>
        ))}
      </nav>

      <div dir="ltr" className={`flex h-[52px] items-center border-t border-white/10 px-3 text-left text-[10px] font-semibold text-slate-300 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
        <span className={collapsed ? 'lg:hidden' : ''}>
        v6.5.0 • Pharma MIS
        </span>
        <span className={`${collapsed ? 'lg:mx-auto' : 'ml-auto'} grid h-5 w-5 place-items-center rounded-full border border-slate-500 text-[9px]`}>i</span>
      </div>
      </aside>
    </>
  )
}
