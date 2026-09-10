import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, Trash2 } from 'lucide-react'
import type { Language } from '../i18n'
import { readCollection, restoreRecycleEntry, saveCollection } from '../utils/recycleBin'

const copy = {
  English: { title: 'Recycle Bin', sub: 'Restore deleted records or remove them forever.', empty: 'Recycle bin is empty.', search: 'Search deleted records...', all: 'All', records: 'records', name: 'Name', module: 'Module', deleted: 'Deleted', actions: 'Actions', restore: 'Restore', deleteForever: 'Delete forever', emptyBin: 'Empty Bin', restored: 'Record restored.', removed: 'Record removed forever.' },
  دری: { title: 'سطل بازیافت', sub: 'ریکاردهای حذف‌شده را برگردانید یا برای همیشه پاک کنید.', empty: 'سطل بازیافت خالی است.', search: 'جستجوی ریکاردهای حذف‌شده...', all: 'همه', records: 'ریکارد', name: 'نام', module: 'بخش', deleted: 'حذف شده', actions: 'عملیات', restore: 'برگرداندن', deleteForever: 'حذف نهایی', emptyBin: 'خالی کردن سطل', restored: 'ریکارد برگردانده شد.', removed: 'ریکارد برای همیشه حذف شد.' },
  پښتو: { title: 'بیا کارونې ټوکرۍ', sub: 'ړنګ شوي ریکارډونه بېرته راوړئ یا یې تل لپاره حذف کړئ.', empty: 'ټوکرۍ تشه ده.', search: 'ړنګ شوي ریکارډونه ولټوئ...', all: 'ټول', records: 'ریکارډونه', name: 'نوم', module: 'برخه', deleted: 'ړنګ شوی', actions: 'عملیات', restore: 'بېرته راوړل', deleteForever: 'تل حذف', emptyBin: 'ټوکرۍ تشول', restored: 'ریکارډ بېرته راوړل شو.', removed: 'ریکارډ تل لپاره حذف شو.' },
} as const

const labels: Record<string, Record<Language, string>> = {
  products: { English: 'Medicines', دری: 'داروها', پښتو: 'درمل' },
  billingInvoices: { English: 'Sales / Bills', دری: 'فروش/فاکتورها', پښتو: 'پلور/بلونه' },
  customers: { English: 'Customers', دری: 'مشتریان', پښتو: 'پیرودونکي' },
  staff: { English: 'Staff', دری: 'کارمندان', پښتو: 'کارکوونکي' },
  suppliers: { English: 'Suppliers', دری: 'تأمین‌کنندگان', پښتو: 'عرضه کوونکي' },
  expenses: { English: 'Expenses', دری: 'مصارف', پښتو: 'لګښتونه' },
  godownEntries: { English: 'Godown', دری: 'گدام', پښتو: 'ګدام' },
  transactions: { English: 'Cash Wallet', دری: 'کیف پول نقدی', پښتو: 'نغدي بټوه' },
}

const nameOf = (item: any) => item.label || item.data?.name || item.data?.productName || item.data?.customerName || item.data?.supplierName || item.data?.description || item.data?.invoiceNo || item.data?.invoiceNumber || 'Deleted record'
const dateOf = (value: unknown) => {
  const date = value ? new Date(String(value)) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '-'
}

export default function RecycleBin({ language, globalSearch = '' }: { language: Language; globalSearch?: string }) {
  const t = copy[language] ?? copy.English
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('all')

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('pharma:data-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pharma:data-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  useEffect(() => {
    setQuery(globalSearch)
  }, [globalSearch])

  const deletedItems = useMemo(() => readCollection<any>('deletedItems'), [version])
  const modules = useMemo(() => ['all', ...Array.from(new Set(deletedItems.map((item) => item.collection || item.module || item.type).filter(Boolean)))], [deletedItems])
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return deletedItems.filter((item) => {
      const itemModule = item.collection || item.module || item.type
      if (module !== 'all' && itemModule !== module) return false
      if (!needle) return true
      return `${nameOf(item)} ${itemModule}`.toLowerCase().includes(needle)
    })
  }, [deletedItems, module, query])

  const restore = (item: any) => {
    restoreRecycleEntry(item)
    setVersion((value) => value + 1)
  }

  const removeForever = (item: any) => {
    if (!window.confirm(t.deleteForever)) return
    saveCollection('deletedItems', deletedItems.filter((row) => String(row.recycleId || row.id) !== String(item.recycleId || item.id)))
    setVersion((value) => value + 1)
  }

  const emptyBin = () => {
    if (!deletedItems.length || !window.confirm(t.emptyBin)) return
    saveCollection('deletedItems', [])
    setVersion((value) => value + 1)
  }

  return (
    <div className="w-full pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.sub}</p>
        </div>
        <button disabled={!deletedItems.length} onClick={emptyBin} className="app-btn-secondary text-red-500 disabled:opacity-45"><Trash2 size={16} />{t.emptyBin}</button>
      </div>

      <div className="app-panel mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c] md:grid-cols-[210px_1fr_auto]">
        <select value={module} onChange={(event) => setModule(event.target.value)} className="form-control">
          {modules.map((item) => <option key={item} value={item}>{item === 'all' ? t.all : labels[item]?.[language] || item}</option>)}
        </select>
        <label className="relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="form-control ps-10" placeholder={t.search} />
        </label>
        <div className="flex h-10 items-center rounded-lg bg-slate-100 px-3 text-sm font-semibold dark:bg-white/10">{rows.length} {t.records}</div>
      </div>

      <section className="app-panel mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#24365f] dark:bg-[#111a2c]">
        {!rows.length ? (
          <div className="grid min-h-[280px] place-items-center text-center text-slate-400">
            <div>
              <Trash2 className="mx-auto mb-3 opacity-40" size={44} />
              <div className="font-bold">{t.empty}</div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-start">{t.name}</th>
                  <th className="px-4 py-3 text-start">{t.module}</th>
                  <th className="px-4 py-3 text-start">{t.deleted}</th>
                  <th className="px-4 py-3 text-start">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const itemModule = item.collection || item.module || item.type
                  return (
                    <tr key={item.recycleId || item.id} className="border-t border-slate-100 dark:border-[#24365f]">
                      <td className="px-4 py-4 font-semibold">{nameOf(item)}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-white/10">{labels[itemModule]?.[language] || itemModule}</span></td>
                      <td className="px-4 py-4">{dateOf(item.deletedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => restore(item)} className="app-btn-secondary"><RotateCcw size={15} />{t.restore}</button>
                          <button onClick={() => removeForever(item)} className="app-btn-secondary text-red-500"><Trash2 size={15} />{t.deleteForever}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
