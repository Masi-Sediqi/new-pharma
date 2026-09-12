import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  value: string
  icon: LucideIcon
  accent?: 'green' | 'blue' | 'navy' | 'orange' | 'red'
  onClick?: () => void
}

const accents = {
  green: ['border-l-emerald-500', 'bg-emerald-50 dark:bg-emerald-500/10'],
  blue: ['border-l-sky-500', 'bg-sky-50 dark:bg-sky-500/10'],
  navy: ['border-l-[#172a57] dark:border-l-amber-500', 'bg-slate-100 dark:bg-amber-500/10'],
  orange: ['border-l-amber-500', 'bg-amber-50 dark:bg-amber-500/10'],
  red: ['border-l-red-500', 'bg-red-50 dark:bg-red-500/10'],
}

export default function StatCard({ title, value, icon: Icon, accent = 'navy', onClick }: Props) {
  const [border, bg] = accents[accent]
  return (
    <button type="button" onClick={onClick} className={`stat-card flex min-h-[96px] w-full items-center justify-between rounded-xl border border-slate-200 border-l-[3px] ${border} bg-white px-6 py-4 text-start shadow-soft transition ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400/50' : 'cursor-default'} dark:border-[#24365f] dark:bg-[#111a2c]`}>
      <div>
        <div className="text-[12px] text-slate-500 dark:text-sky-200">{title}</div>
        <div className="mt-1 whitespace-pre-line text-[22px] font-bold leading-tight tracking-tight text-slate-950 dark:text-white">{value}</div>
      </div>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
    </button>
  )
}
