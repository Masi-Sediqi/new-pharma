import { Banknote, PackagePlus, UserPlus, WalletCards } from 'lucide-react'

const actions = [
  [Banknote, 'New Bill', true],
  [PackagePlus, 'Add Product', false],
  [UserPlus, 'Add Customer', false],
  [WalletCards, 'Record Payment', false],
] as const

export default function QuickActions() {
  return (
    <section className="app-panel rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(([Icon, label, active]) => (
          <button key={label} className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border text-[12px] font-medium transition hover:-translate-y-0.5 ${active ? 'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#0c1424] dark:hover:bg-white/5'}`}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
