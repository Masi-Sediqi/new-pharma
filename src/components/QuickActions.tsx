import { Banknote, PackagePlus, UserPlus, WalletCards } from 'lucide-react'
import type { Page } from './Sidebar'

const actions = [
  [Banknote, 'New Bill', 'billing', true],
  [PackagePlus, 'Add Product', 'medicines', false],
  [UserPlus, 'Add Customer', 'customers', false],
  [WalletCards, 'Record Payment', 'loans', false],
] as const

export default function QuickActions({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section className="app-panel rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(([Icon, label, page, active]) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(page)}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border text-[12px] font-medium transition hover:-translate-y-0.5 ${
              active
                ? 'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#0c1424] dark:hover:bg-white/5'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
