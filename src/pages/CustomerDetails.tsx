import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Percent,
  Printer,
  FileText,
  Search,
  ShoppingCart,
  TrendingUp,
  User,
  WalletCards,
} from 'lucide-react'
import type { Language } from '../i18n'

type Customer={
  id:string
  name:string
  phone?:string
  email?:string
  address?:string
  notes?:string
  vip?:boolean
  status?:string
  createdAt?:string
}
type Payment={
  id?:string
  amount?:number
  date?:string
  createdAt?:string
  note?:string
  method?:string
  currency?:string
  synthetic?:boolean
}
type Invoice={
  id:string
  invoiceNo?:string
  invoiceNumber?:string
  date?:string
  createdAt?:string
  customerId?:string
  customerName?:string
  currency?:string
  subtotal?:number
  total?:number
  paid?:number
  paidAmount?:number
  remaining?:number
  balance?:number
  discount?:number
  discountTotal?:number
  itemDiscountTotal?:number
  profit?:number
  items?:any[]
  paymentStatus?:string
  paymentMethod?:string
  paymentHistory?:Payment[]
  isLoan?:boolean
  creditType?:string
  originalPaymentStatus?:string
  initialPaymentStatus?:string
}

const n=(v:unknown)=>Number.parseFloat(String(v??0))||0
const load=<T,>(k:string,f:T):T=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}}
const money=(v:number,c='AFN')=>`${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${c==='AFN'?'؋':c}`
const invoiceNo=(i:Invoice)=>i.invoiceNo||i.invoiceNumber||i.id||'-'
const invTotal=(i:Invoice)=>n(i.total)||n(i.subtotal)
const invPaid=(i:Invoice)=>n(i.paidAmount??i.paid)
const invBalance=(i:Invoice)=>Math.max(0,n(i.balance??i.remaining??(invTotal(i)-invPaid(i))))
const invDate=(i:Invoice)=>String(i.date||i.createdAt||'').slice(0,10)
const invDiscount=(i:Invoice)=>n(i.discountTotal)||n(i.itemDiscountTotal)+n(i.discount)
const isPaid=(i:Invoice)=>invBalance(i)<=0.000001 && invPaid(i)+0.000001>=invTotal(i)
const isLoanInvoice=(i:Invoice)=>{
  if(i.isLoan===true)return true
  if(String(i.creditType||'').toLowerCase()==='loan')return true
  const initial=String(i.originalPaymentStatus||i.initialPaymentStatus||'').toLowerCase()
  return ['loan','partial','pending','unpaid','debt'].includes(initial)
}
const lineTotal=(item:any)=>n(item.lineTotal??item.total) || n(item.price??item.selling)*n(item.qty??item.quantity??1)-n(item.discount)
const invoiceCost=(i:Invoice)=>{
  const items=Array.isArray(i.items)?i.items:[]
  if(items.length){
    return items.reduce((sum,item)=>sum+n(item.purchase??item.purchasePrice??item.cost)*n(item.qty??item.quantity??1),0)
  }
  if(Number.isFinite(Number(i.profit))) return Math.max(0,invTotal(i)-n(i.profit))
  return 0
}
const invoiceProfit=(i:Invoice)=>{
  if(Number.isFinite(Number(i.profit)))return n(i.profit)
  return Math.max(0,invTotal(i)-invoiceCost(i)-invDiscount(i))
}
const fmtDate=(value?:string)=>{
  if(!value)return '—'
  try{return new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}
  catch{return String(value)}
}
const monthYear=(value?:string)=>{
  if(!value)return '—'
  try{return new Date(value).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
  catch{return '—'}
}
const inPeriod=(d:string,period:string)=>{
  if(period==='all'||!d)return true
  const x=new Date(`${d}T12:00:00`)
  const now=new Date()
  if(Number.isNaN(x.getTime()))return true
  if(period==='today')return x.toDateString()===now.toDateString()
  if(period==='week'){const z=new Date();z.setDate(z.getDate()-7);return x>=z}
  if(period==='month')return x.getMonth()===now.getMonth()&&x.getFullYear()===now.getFullYear()
  if(period==='year')return x.getFullYear()===now.getFullYear()
  return true
}
const normalizedPayments=(invoice:Invoice):Payment[]=>{
  const raw=Array.isArray(invoice.paymentHistory)?invoice.paymentHistory.filter(p=>n(p.amount)>0):[]
  const recorded=raw.reduce((sum,p)=>sum+n(p.amount),0)
  const missing=Math.max(0,invPaid(invoice)-recorded)
  const synthetic=missing>0.000001?[{
    id:`initial-${invoice.id}`,
    amount:missing,
    date:invDate(invoice),
    createdAt:invoice.createdAt||invDate(invoice),
    note:'Initial payment',
    method:invoice.paymentMethod||'Cash',
    currency:invoice.currency||'AFN',
    synthetic:true,
  }]:[]
  return [...synthetic,...raw].sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')))
}

const text={
 English:{
  edit:'Edit',print:'Print Statement',member:'Member since',spent:'Total Spent',revenue:'Total Revenue',orders:'Total Orders',
  pending:'Pending Balance',discounts:'Total Discounts',profitEarned:'Profit Earned',search:'Search invoices...',all:'All Status',
  time:'All Time',today:'Today',week:'Weekly',month:'Monthly',year:'Yearly',paidStatus:'Paid',pendingStatus:'Pending',
  ordersTab:'Orders',payments:'Payment History',loans:'Loans',profit:'Profit Analysis',activity:'Activity Log',
  invoice:'Invoice',items:'Items',total:'Total',paid:'Paid',balance:'Balance Due',status:'Status',date:'Date',none:'No records found',
  revenueFrom:'Revenue from Customer',cost:'Cost of Goods Sold',netProfit:'Net Profit',profitByOrder:'Profit by Order',
  revenueCol:'Revenue',costCol:'Cost',profitCol:'Profit',noLoans:'No loans found',newSale:'New Sale Created',
  paymentRecorded:'Payment Recorded',of:'of',activityInvoice:'Invoice',
 },
 دری:{
  edit:'ویرایش',print:'چاپ صورت‌حساب',member:'عضو از',spent:'مجموع خرید',revenue:'مجموع عواید',orders:'مجموع سفارشات',
  pending:'مانده قرض',discounts:'مجموع تخفیف‌ها',profitEarned:'سود بدست آمده',search:'جستجوی فاکتورها...',all:'همه وضعیت‌ها',
  time:'همه وقت',today:'امروز',week:'هفتگی',month:'ماهانه',year:'سالانه',paidStatus:'پرداخت شده',pendingStatus:'معلق',
  ordersTab:'سفارشات',payments:'تاریخچه پرداخت',loans:'قرض‌ها',profit:'تحلیل سود',activity:'گزارش فعالیت',
  invoice:'فاکتور',items:'اقلام',total:'مجموع',paid:'پرداخت شده',balance:'باقیمانده',status:'وضعیت',date:'تاریخ',none:'ریکاردی یافت نشد',
  revenueFrom:'عواید از مشتری',cost:'قیمت تمام‌شده اجناس',netProfit:'سود خالص',profitByOrder:'سود به تفکیک فاکتور',
  revenueCol:'عواید',costCol:'قیمت تمام‌شده',profitCol:'سود',noLoans:'قرضی یافت نشد',newSale:'فروش جدید ایجاد شد',
  paymentRecorded:'پرداخت ثبت شد',of:'از',activityInvoice:'فاکتور',
 },
 پښتو:{
  edit:'سمون',print:'صورت حساب چاپ',member:'غړی له',spent:'ټول مصرف',revenue:'ټول عواید',orders:'ټولې فرمایشونه',
  pending:'پاتې بیلانس',discounts:'ټول تخفیفونه',profitEarned:'ترلاسه شوې ګټه',search:'فاکتورونه ولټوئ...',all:'ټول حالتونه',
  time:'ټول وخت',today:'نن',week:'اونیز',month:'میاشتنی',year:'کلنی',paidStatus:'ورکړل شوی',pendingStatus:'پاتې',
  ordersTab:'فرمایشونه',payments:'د تادیې تاریخ',loans:'قرضونه',profit:'د ګټې تحلیل',activity:'د فعالیت راپور',
  invoice:'فاکتور',items:'توکي',total:'ټول',paid:'ورکړل شوی',balance:'پاتې',status:'حالت',date:'نېټه',none:'ریکارډ نشته',
  revenueFrom:'د پیرودونکي عواید',cost:'د توکو لګښت',netProfit:'خالصه ګټه',profitByOrder:'د فاکتور له مخې ګټه',
  revenueCol:'عواید',costCol:'لګښت',profitCol:'ګټه',noLoans:'قرض ونه موندل شو',newSale:'نوی پلور جوړ شو',
  paymentRecorded:'تادیه ثبت شوه',of:'له',activityInvoice:'فاکتور',
 }
} as const

function SmoothSelect({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
 const [open,setOpen]=useState(false)
 const selected=options.find(o=>o.value===value)||options[0]
 return <div className="relative min-w-0">
  <button type="button" onClick={()=>setOpen(v=>!v)} className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#30456f] dark:bg-[#0d1628] dark:text-slate-100">
   <span className="truncate">{selected?.label}</span><ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open?'rotate-180':''}`}/>
  </button>
  {open&&<>
   <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={()=>setOpen(false)}/>
   <div className="absolute end-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#101a2d]">
    {options.map(o=><button type="button" key={o.value} onClick={()=>{onChange(o.value);setOpen(false)}} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${o.value===value?'bg-amber-500 font-semibold text-slate-950':'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'}`}><span className="grid h-4 w-4 place-items-center">{o.value===value&&<Check size={15}/>}</span><span className="whitespace-nowrap">{o.label}</span></button>)}
   </div>
  </>}
 </div>
}

export default function CustomerDetails({customerId,language,onBack}:{customerId:string;language:Language;onBack:()=>void}){
 const t=text[language]??text.English
 const [version,setVersion]=useState(0)
 const [tab,setTab]=useState('orders')
 const [search,setSearch]=useState('')
 const [period,setPeriod]=useState('all')
 const [status,setStatus]=useState('all')

 useEffect(()=>{
  const refresh=()=>setVersion(v=>v+1)
  addEventListener('pharma:data-changed',refresh)
  addEventListener('storage',refresh)
  return()=>{removeEventListener('pharma:data-changed',refresh);removeEventListener('storage',refresh)}
 },[])

 const customer=useMemo(()=>load<Customer[]>('customers',[]).find(c=>String(c.id)===String(customerId)),[customerId,version])
 const invoices=useMemo(()=>load<Invoice[]>('billingInvoices',[]).filter(i=>String(i.customerId||'')===String(customerId)||(!i.customerId&&i.customerName===customer?.name)),[customerId,customer?.name,version])

 if(!customer)return <div className="app-panel rounded-xl border border-slate-200 bg-white p-8 dark:border-[#24365f] dark:bg-[#111a2c]">Customer not found</div>

 const filtered=invoices.filter(i=>{
  const query=`${invoiceNo(i)} ${invDate(i)} ${i.customerName||''}`.toLowerCase()
  const matchesStatus=status==='all'||(status==='paid'&&isPaid(i))||(status==='pending'&&!isPaid(i))
  return (!search||query.includes(search.toLowerCase()))&&matchesStatus&&inPeriod(invDate(i),period)
 }).sort((a,b)=>String(b.createdAt||invDate(b)||'').localeCompare(String(a.createdAt||invDate(a)||'')))

 const totalSpent=invoices.reduce((s,i)=>s+invTotal(i),0)
 const totalRevenue=invoices.reduce((s,i)=>s+invPaid(i),0)
 const pending=invoices.reduce((s,i)=>s+invBalance(i),0)
 const discounts=invoices.reduce((s,i)=>s+invDiscount(i),0)
 const recognized=invoices.filter(isPaid)
 const profitEarned=recognized.reduce((s,i)=>s+invoiceProfit(i),0)
 const loans=invoices.filter(isLoanInvoice)

 const payments=filtered.flatMap(invoice=>normalizedPayments(invoice).map(payment=>({invoice,payment}))).sort((a,b)=>String(b.payment.createdAt||b.payment.date||'').localeCompare(String(a.payment.createdAt||a.payment.date||'')))
 const filteredLoans=filtered.filter(isLoanInvoice)
 const profitRows=filtered.filter(isPaid)
 const revenueFrom=profitRows.reduce((s,i)=>s+invTotal(i),0)
 const cost=profitRows.reduce((s,i)=>s+invoiceCost(i),0)
 const netProfit=profitRows.reduce((s,i)=>s+invoiceProfit(i),0)

 const activities=[
  ...filtered.map(i=>({id:`sale-${i.id}`,kind:'sale',date:i.createdAt||invDate(i),invoice:i,amount:invTotal(i)})),
  ...payments.map(({invoice,payment})=>({id:`payment-${invoice.id}-${payment.id||payment.createdAt}`,kind:'payment',date:payment.createdAt||payment.date||invDate(invoice),invoice,amount:n(payment.amount)}))
 ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))

 const tabs:[string,string][]=[
  ['orders',`${t.ordersTab} (${filtered.length})`],
  ['payments',`${t.payments}${payments.length?` (${payments.length})`:''}`],
  ['loans',`${t.loans} (${filteredLoans.length})`],
  ['profit',t.profit],
  ['activity',t.activity]
 ]

 return <div className="w-full pb-8">
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
   <div className="flex items-center gap-3">
    <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-[#24365f] dark:bg-[#111a2c] dark:hover:bg-white/10"><ArrowLeft size={17}/></button>
    <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100"><User size={20}/></div>
    <div>
     <h1 className="text-2xl font-extrabold">{customer.name}</h1>
     <div className="text-sm text-slate-500">{t.member} {monthYear(customer.createdAt)}</div>
    </div>
   </div>
   <div className="flex gap-2">
    <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 dark:border-[#24365f] dark:bg-[#111a2c] dark:text-white"><Edit3 size={16}/>{t.edit}</button>
    <button onClick={()=>window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 dark:border-[#24365f] dark:bg-[#111a2c] dark:text-white"><Printer size={16}/>{t.print}</button>
   </div>
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
   <K title={t.spent} value={money(totalSpent)} icon={<WalletCards size={18}/>} tone="green"/>
   <K title={t.revenue} value={money(totalRevenue)} icon={<BadgeDollarSign size={18}/>} tone="blue"/>
   <K title={t.orders} value={String(invoices.length)} icon={<ShoppingCart size={18}/>} tone="blue"/>
   <K title={t.pending} value={money(pending)} icon={<Clock3 size={18}/>} tone="orange"/>
   <K title={t.discounts} value={money(discounts)} icon={<Percent size={18}/>} tone="orange"/>
   <K title={t.profitEarned} value={money(profitEarned)} icon={<TrendingUp size={18}/>} tone="green"/>
  </div>

  <div className="app-panel mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c] md:grid-cols-[minmax(0,1fr)_135px_135px]">
   <label className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="form-control ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/></label>
   <SmoothSelect value={period} onChange={setPeriod} options={[{value:'all',label:t.time},{value:'today',label:t.today},{value:'week',label:t.week},{value:'month',label:t.month},{value:'year',label:t.year}]}/>
   <SmoothSelect value={status} onChange={setStatus} options={[{value:'all',label:t.all},{value:'paid',label:t.paidStatus},{value:'pending',label:t.pendingStatus}]}/>
  </div>

  <div className="mt-5 flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1 text-sm dark:bg-white/5">
   {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-lg px-4 py-2 ${tab===k?'bg-white font-bold shadow-sm dark:bg-[#17233b] dark:text-white':'text-slate-500 dark:text-slate-300'}`}>{l}</button>)}
  </div>

  <div className="app-panel mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#24365f] dark:bg-[#111a2c]">
   {tab==='orders'&&<OrdersTable rows={filtered} t={t}/>}
   {tab==='payments'&&<PaymentHistory rows={payments} t={t}/>}
   {tab==='loans'&&<LoansTable rows={filteredLoans} t={t}/>}
   {tab==='profit'&&<ProfitAnalysis rows={profitRows} t={t} revenue={revenueFrom} cost={cost} profit={netProfit}/>}
   {tab==='activity'&&<Activity rows={activities} t={t}/>}
  </div>
 </div>
}

function K({title,value,icon,tone}:{title:string;value:string;icon:ReactNode;tone:'blue'|'green'|'orange'}){
 const border=tone==='green'?'border-s-emerald-500':tone==='orange'?'border-s-amber-500':'border-s-sky-500'
 const bg=tone==='green'?'bg-emerald-50 dark:bg-emerald-500/10':tone==='orange'?'bg-amber-50 dark:bg-amber-500/10':'bg-sky-50 dark:bg-sky-500/10'
 return <div className={`stat-card rounded-xl border border-slate-200 border-s-4 ${border} bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c]`}><div className="flex justify-between"><div><div className="text-sm text-slate-500">{title}</div><div className="mt-1 text-xl font-extrabold">{value}</div></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>{icon}</div></div></div>
}
function Empty({text}:{text:string}){return <div className="grid min-h-[140px] place-items-center text-slate-400"><div className="text-center"><FileText size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600"/><div>{text}</div></div></div>}

function OrdersTable({rows,t}:{rows:Invoice[];t:any}){
 if(!rows.length)return <Empty text={t.none}/>
 return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#24365f] dark:text-slate-300"><th className="p-3 text-start">{t.invoice}</th><th className="p-3 text-center">{t.items}</th><th className="p-3 text-center">{t.total}</th><th className="p-3 text-center">{t.paid}</th><th className="p-3 text-center">{t.balance}</th><th className="p-3 text-center">{t.status}</th><th className="p-3 text-center">{t.date}</th></tr></thead><tbody>{rows.map(i=><tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-[#24365f]"><td className="p-3 font-mono font-bold">{invoiceNo(i)}</td><td className="p-3 text-center">{i.items?.length||0}</td><td className="p-3 text-center font-semibold">{money(invTotal(i),i.currency)}</td><td className="p-3 text-center">{money(invPaid(i),i.currency)}</td><td className="p-3 text-center text-amber-500">{money(invBalance(i),i.currency)}</td><td className="p-3 text-center"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid(i)?'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300':'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{isPaid(i)?t.paidStatus:t.pendingStatus}</span></td><td className="p-3 text-center">{fmtDate(invDate(i))}</td></tr>)}</tbody></table></div>
}

function PaymentHistory({rows,t}:{rows:{invoice:Invoice;payment:Payment}[];t:any}){
 if(!rows.length)return <Empty text={t.none}/>
 return <div className="space-y-3">{rows.map(({invoice,payment},idx)=><div key={`${invoice.id}-${payment.id||idx}`} className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono font-bold">{invoiceNo(invoice)}</div><div className="mt-1 text-xs text-slate-500">{fmtDate(payment.date||payment.createdAt||invDate(invoice))}</div></div><div className="sm:text-center"><div className="font-bold text-emerald-500">{money(n(payment.amount),payment.currency||invoice.currency)}</div><div className="text-xs text-slate-500">{t.of} {money(invTotal(invoice),invoice.currency)}</div></div><div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid(invoice)?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{isPaid(invoice)?t.paidStatus:t.pendingStatus}</span></div></div>)}</div>
}

function LoansTable({rows,t}:{rows:Invoice[];t:any}){
 if(!rows.length)return <Empty text={t.noLoans}/>
 return <OrdersTable rows={rows} t={t}/>
}

function ProfitAnalysis({rows,t,revenue,cost,profit}:{rows:Invoice[];t:any;revenue:number;cost:number;profit:number}){
 return <div>
  <div className="grid gap-4 md:grid-cols-3">
   <div className="rounded-xl bg-emerald-50 p-5 text-center text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><div className="text-sm opacity-80">{t.revenueFrom}</div><div className="mt-2 text-2xl font-extrabold">{money(revenue)}</div></div>
   <div className="rounded-xl bg-slate-50 p-5 text-center dark:bg-white/5"><div className="text-sm text-slate-500">{t.cost}</div><div className="mt-2 text-2xl font-extrabold">{money(cost)}</div></div>
   <div className="rounded-xl bg-slate-100 p-5 text-center dark:bg-white/10"><div className="text-sm text-slate-500">{t.netProfit}</div><div className="mt-2 text-2xl font-extrabold text-emerald-500">{money(profit)}</div></div>
  </div>
  <h3 className="mt-6 font-bold">{t.profitByOrder}</h3>
  {!rows.length?<Empty text={t.none}/>:<div className="mt-2 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#24365f]"><th className="p-3 text-start">{t.invoice}</th><th className="p-3 text-center">{t.revenueCol}</th><th className="p-3 text-center">{t.costCol}</th><th className="p-3 text-center">{t.profitCol}</th><th className="p-3 text-center">{t.date}</th></tr></thead><tbody>{rows.map(i=><tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-[#24365f]"><td className="p-3 font-mono font-bold">{invoiceNo(i)}</td><td className="p-3 text-center">{money(invTotal(i),i.currency)}</td><td className="p-3 text-center">{money(invoiceCost(i),i.currency)}</td><td className="p-3 text-center font-bold text-emerald-500">{money(invoiceProfit(i),i.currency)}</td><td className="p-3 text-center">{fmtDate(invDate(i))}</td></tr>)}</tbody></table></div>}
 </div>
}

function Activity({rows,t}:{rows:any[];t:any}){
 if(!rows.length)return <Empty text={t.none}/>
 return <div className="space-y-3">{rows.map(row=><div key={row.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 dark:bg-white/10">{row.kind==='payment'?<BadgeDollarSign size={17}/>:<ShoppingCart size={17}/>}</div><div><div className="font-bold">{row.kind==='payment'?t.paymentRecorded:t.newSale}</div><div className="text-sm text-slate-500">{t.activityInvoice} {invoiceNo(row.invoice)} - {money(row.amount,row.invoice.currency)}</div><div className="mt-1 text-xs text-slate-400">{fmtDate(String(row.date||'').slice(0,10))}</div></div></div>)}</div>
}
