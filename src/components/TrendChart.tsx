export default function TrendChart() {
  const days = Array.from({ length: 30 }, (_, i) => `Sep ${i + 1}`)
  return (
    <section className="app-panel rounded-xl border border-slate-200 bg-white p-5 shadow-soft dark:border-[#24365f] dark:bg-[#111a2c]">
      <h3 className="text-sm font-semibold">Trends</h3>
      <div className="mt-4 h-[245px] overflow-hidden rounded-lg">
        <div className="relative h-[195px] border-b border-l border-slate-400 bg-[linear-gradient(to_right,#dbe7f2_1px,transparent_1px),linear-gradient(to_bottom,#dbe7f2_1px,transparent_1px)] bg-[size:6.66%_100%,100%_25%] dark:border-[#47618f] dark:bg-[linear-gradient(to_right,#1e3158_1px,transparent_1px),linear-gradient(to_bottom,#1e3158_1px,transparent_1px)]">
          <div className="absolute -left-4 top-[-5px] text-[10px] text-slate-500 dark:text-slate-300">4</div>
          <div className="absolute -left-4 top-[45px] text-[10px] text-slate-500 dark:text-slate-300">3</div>
          <div className="absolute -left-4 top-[94px] text-[10px] text-slate-500 dark:text-slate-300">2</div>
          <div className="absolute -left-4 top-[143px] text-[10px] text-slate-500 dark:text-slate-300">1</div>
          <div className="absolute -left-4 bottom-[-5px] text-[10px] text-slate-500 dark:text-slate-300">0</div>
          <div className="absolute bottom-[-21px] left-0 right-0 flex justify-between text-[9px] text-slate-500 dark:text-slate-300">
            {days.filter((_, i) => i % 2 === 0).map(d => <span key={d}>{d}</span>)}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-[10px] text-slate-600 dark:text-slate-300">
          {['Total Revenue','Total Expenses','Refunds','Pending Payments','Sales'].map((x,i) => <span key={x} className="flex items-center gap-1"><i className={`h-0.5 w-3 ${['bg-slate-800','bg-red-400','bg-amber-500','bg-violet-500','bg-emerald-500'][i]}`}/>{x}</span>)}
        </div>
      </div>
    </section>
  )
}
