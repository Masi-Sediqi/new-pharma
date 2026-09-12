import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  Eye,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { Language } from '../i18n'

type AnyRow = Record<string, any>
type Props = { language: Language; onEditInvoice?: (invoiceId:string)=>void }

const read = (key:string):AnyRow[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
const save = (key:string,value:unknown) => {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('pharma:data-changed'))
}
const n=(v:any)=>Number.parseFloat(String(v??0))||0
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100
const symbol=(c='AFN')=>({AFN:'؋',USD:'$',EUR:'€',GBP:'£',SAR:'﷼',PKR:'Rs',INR:'₹',IRR:'﷼',AED:'د.إ',CNY:'¥'} as Record<string,string>)[c]||c
const money=(v:number,c='AFN')=>`${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${symbol(c)}`
const dateOf=(x:any)=>String(x.date||x.gregorianDate||x.createdAt||x.invoiceDate||'').slice(0,10)
const invoiceNo=(x:any)=>x.invoiceNumber||x.invoiceNo||x.invoice||x.id||'-'
const shamsi=(d:string)=>{
  if(!d)return ''
  try{
    return new Intl.DateTimeFormat('en-CA-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'})
      .format(new Date(`${d}T12:00:00`))
      .replace(/\//g,'-')
  }catch{return ''}
}
const fmtDate=(d:string)=>{
  if(!d)return '—'
  try{return new Date(`${d}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}
  catch{return d}
}
const inRange=(d:string,f:string)=>{
  if(!d||f==='all')return true
  const x=new Date(`${d}T12:00:00`),now=new Date()
  if(Number.isNaN(x.getTime()))return true
  if(f==='today')return x.toDateString()===now.toDateString()
  if(f==='week'){const z=new Date();z.setDate(z.getDate()-7);return x>=z}
  if(f==='month')return x.getMonth()===now.getMonth()&&x.getFullYear()===now.getFullYear()
  if(f==='year')return x.getFullYear()===now.getFullYear()
  return true
}
const totalOf=(x:any)=>n(x.total??x.grandTotal??x.subtotal)
const paidOf=(x:any)=>n(x.paidAmount??x.paid)
const balanceOf=(x:any)=>Math.max(0,n(x.balance??x.remaining??(totalOf(x)-paidOf(x))))
const isOriginalLoan=(x:any)=>{
  if(x.loanRecordDeleted)return false
  if(x.isLoan===true)return true
  if(String(x.creditType||'').toLowerCase()==='loan')return true
  if(String(x.paymentMode||'').toLowerCase()==='installment')return true
  const initialStatus=String(x.originalPaymentStatus||x.initialPaymentStatus||'').toLowerCase()
  if(['loan','partial','unpaid','debt','pending'].includes(initialStatus))return true
  // Backward compatibility: older invoices may not have isLoan/creditType,
  // but a remaining balance means the sale was created on credit.
  return balanceOf(x)>0
}

const txt={
 English:{
  title:'Loan Management',sub:'Track and manage customer loans',print:'Print Report',active:'Active Loans',paid:'Paid Loans',
  pending:'Pending Loans',overdue:'Overdue Loans',search:'Search by invoice or customer...',activeOnly:'Active Only',
  allLoans:'All Loans',pendingS:'Pending',paidS:'Paid',overdueS:'Overdue',allTime:'All Time',today:'Today',week:'Weekly',
  month:'Monthly',year:'Yearly',invoice:'Invoice',customer:'Customer',total:'Total',paidCol:'Paid',balance:'Remaining',
  status:'Status',date:'Date',actions:'Actions',empty:'No loan found',view:'View',makePayment:'Make Payment',
  markPaid:'Mark as Paid',editBill:'Edit Bill',delete:'Delete',loanDetails:'Loan Details',paymentProgress:'Payment Progress',
  totalAmount:'Total Amount',created:'Created',recordPayment:'Record Payment',paymentAmount:'Payment Amount',
  alreadyPaid:'Already Paid',notes:'Notes (optional)',paymentReference:'Payment reference...',wallet:'Add to Cash Wallet',
  cancel:'Cancel',deleteRecord:'Delete Loan Record',confirmDelete:'Delete this loan record from the Loans page?',
  close:'Close'
 },
 دری:{
  title:'مدیریت قرض‌ها',sub:'پیگیری و مدیریت قرض‌های مشتریان',print:'چاپ گزارش',active:'قرض‌های فعال',paid:'قرض‌های پرداخت شده',
  pending:'قرض‌های معلق',overdue:'قرض‌های معوق',search:'جستجو با فاکتور یا مشتری...',activeOnly:'فقط فعال',
  allLoans:'همه قرض‌ها',pendingS:'معلق',paidS:'پرداخت شده',overdueS:'معوق',allTime:'همه وقت',today:'امروز',week:'هفتگی',
  month:'ماهانه',year:'سالانه',invoice:'فاکتور',customer:'مشتری',total:'مجموع',paidCol:'پرداخت شده',balance:'باقیمانده',
  status:'وضعیت',date:'تاریخ',actions:'عملیات',empty:'قرضی یافت نشد',view:'مشاهده',makePayment:'ثبت پرداخت',
  markPaid:'پرداخت کامل',editBill:'ویرایش بل',delete:'حذف',loanDetails:'جزئیات قرض',paymentProgress:'پیشرفت پرداخت',
  totalAmount:'مبلغ مجموعی',created:'ایجاد شده',recordPayment:'ثبت پرداخت',paymentAmount:'مبلغ پرداخت',
  alreadyPaid:'قبلاً پرداخت شده',notes:'یادداشت (اختیاری)',paymentReference:'مرجع پرداخت...',wallet:'اضافه به کیف پول نقدی',
  cancel:'لغو',deleteRecord:'حذف ریکارد قرض',confirmDelete:'این ریکارد از صفحه قرض‌ها حذف شود؟',
  close:'بستن'
 },
 پښتو:{
  title:'د قرضونو مدیریت',sub:'د پیرودونکو قرضونه تعقیب او اداره کړئ',print:'راپور چاپ',active:'فعال قرضونه',paid:'ورکړل شوي قرضونه',
  pending:'پاتې قرضونه',overdue:'ځنډېدلي قرضونه',search:'د فاکتور یا پیرودونکي له مخې لټون...',activeOnly:'یوازې فعال',
  allLoans:'ټول قرضونه',pendingS:'پاتې',paidS:'ورکړل شوی',overdueS:'ځنډېدلی',allTime:'ټول وخت',today:'نن',week:'اونیز',
  month:'میاشتنی',year:'کلنی',invoice:'فاکتور',customer:'پیرودونکی',total:'ټول',paidCol:'ورکړل شوی',balance:'پاتې',
  status:'حالت',date:'نېټه',actions:'عملیات',empty:'قرض ونه موندل شو',view:'کتل',makePayment:'تادیه ثبت کړئ',
  markPaid:'بشپړ ورکړل شوی',editBill:'بل سمول',delete:'ړنګول',loanDetails:'د قرض تفصیل',paymentProgress:'د تادیې پرمختګ',
  totalAmount:'ټول مبلغ',created:'جوړ شوی',recordPayment:'تادیه ثبت کړئ',paymentAmount:'د تادیې مبلغ',
  alreadyPaid:'مخکې ورکړل شوی',notes:'یادښت (اختیاري)',paymentReference:'د تادیې مرجع...',wallet:'نغدي بټوې ته اضافه کړئ',
  cancel:'لغوه',deleteRecord:'د قرض ریکارډ ړنګول',confirmDelete:'دا قرض ریکارډ د قرضونو له پاڼې لرې شي؟',
  close:'بندول'
 }
} as const

function FilterSelect({value,onChange,options,ariaLabel}:{value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];ariaLabel:string}){
 const [open,setOpen]=useState(false)
 const selected=options.find(o=>o.value===value)??options[0]
 return <div className="relative min-w-0">
  <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={()=>setOpen(v=>!v)}
   className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#30456f] dark:bg-[#0d1628] dark:text-slate-100 dark:hover:border-[#49608c]">
   <span className="truncate">{selected?.label}</span><ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open?'rotate-180':''}`}/>
  </button>
  {open&&<><button type="button" aria-label="Close filter menu" className="fixed inset-0 z-40 cursor-default" onClick={()=>setOpen(false)}/>
   <div className="absolute start-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#101a2d]">
    {options.map(o=>{const active=o.value===value;return <button type="button" key={o.value} onClick={()=>{onChange(o.value);setOpen(false)}} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${active?'bg-amber-500 font-semibold text-slate-950':'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'}`}><span className="grid h-4 w-4 place-items-center">{active&&<Check size={15}/>}</span><span className="whitespace-nowrap">{o.label}</span></button>})}
   </div></>}
 </div>
}

function Backdrop({children}:{children:ReactNode}){
 useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[])
 return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[1px]">{children}</div>
}

function Action({icon,label,onClick,danger=false}:{icon:ReactNode;label:string;onClick:()=>void;danger?:boolean}){
 return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-slate-50 dark:hover:bg-white/5 ${danger?'text-red-500':'text-slate-800 dark:text-slate-100'}`}>{icon}<span className="flex-1 whitespace-nowrap">{label}</span></button>
}

export default function Loans({language,onEditInvoice}:Props){
 const t=txt[language]
 const [version,setVersion]=useState(0)
 const [q,setQ]=useState('')
 const [status,setStatus]=useState('active')
 const [period,setPeriod]=useState('all')
 const [menu,setMenu]=useState<{id:string;top:number;left:number}|null>(null)
 const [view,setView]=useState<AnyRow|null>(null)
 const [payment,setPayment]=useState<AnyRow|null>(null)
 const [del,setDel]=useState<AnyRow|null>(null)

 useEffect(()=>{const f=()=>setVersion(x=>x+1);addEventListener('pharma:data-changed',f);addEventListener('storage',f);return()=>{removeEventListener('pharma:data-changed',f);removeEventListener('storage',f)}},[])

 const rows=useMemo(()=>read('billingInvoices')
  .filter(isOriginalLoan)
  .map((x:any)=>{
   const total=totalOf(x),paid=paidOf(x),balance=balanceOf(x)
   const due=String(x.dueDate||'')
   const overdue=balance>0&&due&&new Date(`${due}T23:59:59`)<new Date()
   return {...x,total,paid,balance,_status:balance<=0?'paid':overdue?'overdue':'pending'}
  }),[version])

 const filtered=useMemo(()=>rows.filter((x:any)=>{
  const s=`${invoiceNo(x)} ${x.customerName||x.customer||''}`.toLowerCase()
  const matchesStatus=status==='all'||(status==='active'&&x.balance>0)||x._status===status
  return (!q||s.includes(q.toLowerCase()))&&matchesStatus&&inRange(dateOf(x),period)
 }),[rows,q,status,period])

 const activeTotal=rows.filter(x=>x.balance>0).reduce((a,x)=>a+x.total,0)
 const paidTotal=rows.filter(x=>x._status==='paid').reduce((a,x)=>a+x.total,0)
 const pendingTotal=rows.filter(x=>x._status==='pending').reduce((a,x)=>a+x.balance,0)
 const overdueTotal=rows.filter(x=>x._status==='overdue').reduce((a,x)=>a+x.balance,0)

 const updateInvoice=(id:string,fn:(x:AnyRow)=>AnyRow)=>{
  const invoices=read('billingInvoices')
  save('billingInvoices',invoices.map(x=>String(x.id)===String(id)?fn(x):x))
  setVersion(v=>v+1)
 }

 const recordPayment=(sale:AnyRow,amount:number,note:string,toWallet:boolean)=>{
  amount=round(amount)
  const remaining=balanceOf(sale)
  if(amount<=0||amount>remaining)return
  const nextPaid=round(paidOf(sale)+amount)
  const nextBalance=round(Math.max(0,totalOf(sale)-nextPaid))
  const rec={id:`pay-${Date.now()}`,amount,note,method:'Loan payment',cashWallet:toWallet,currency:sale.currency||'AFN',date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()}
  updateInvoice(String(sale.id),x=>({...x,paid:nextPaid,paidAmount:nextPaid,remaining:nextBalance,balance:nextBalance,paymentStatus:nextBalance<=0?'paid':'partial',isLoan:true,creditType:'loan',paymentHistory:[...(x.paymentHistory||[]),rec],updatedAt:new Date().toISOString()}))
  if(toWallet){
   const tx=read('transactions')
   save('transactions',[{id:`loan-payment-${sale.id}-${Date.now()}`,type:'income',transactionType:'deposit',title:`Loan payment ${invoiceNo(sale)}`,amount,currency:sale.currency||'AFN',date:new Date().toISOString().slice(0,10),source:'cash-wallet',referenceSource:'billing-payment',referenceId:sale.id,description:note||sale.customerName},...tx])
  }
  if(sale.customerId){
   const customers=read('customers')
   save('customers',customers.map(c=>String(c.id)===String(sale.customerId)?{...c,pending:Math.max(0,n(c.pending)-amount),updatedAt:new Date().toISOString()}:c))
  }
  setPayment(null);setView(null)
 }

 const hideLoanRecord=(sale:AnyRow)=>{
  updateInvoice(String(sale.id),x=>({...x,loanRecordDeleted:true,updatedAt:new Date().toISOString()}))
  setDel(null);setView(null)
 }

 return <div className="w-full pb-10">
  <div className="flex items-start justify-between gap-3">
   <div><h1 className="text-2xl font-extrabold">{t.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.sub}</p></div>
   <button onClick={()=>window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-[#24365f] dark:bg-[#111a2c]"><Printer size={16}/>{t.print}</button>
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {[
    [CreditCard,t.active,money(activeTotal),'blue'],
    [DollarSign,t.paid,money(paidTotal),'green'],
    [CircleDollarSign,t.pending,money(pendingTotal),'orange'],
    [AlertTriangle,t.overdue,money(overdueTotal),'red']
   ].map(([I,l,v,c]:any)=><div key={l} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#314260] dark:bg-[#111a2c] border-s-[3px] ${c==='blue'?'border-s-sky-500':c==='green'?'border-s-emerald-500':c==='orange'?'border-s-amber-500':'border-s-red-500'}`}>
    <div className="flex items-center justify-between"><div><div className="text-xs text-slate-500 dark:text-slate-300">{l}</div><div className="mt-1 text-xl font-extrabold">{v}</div></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${c==='blue'?'bg-sky-50':c==='green'?'bg-emerald-50':c==='orange'?'bg-amber-50':'bg-red-50'} dark:bg-white/10`}><I size={19}/></span></div>
   </div>)}
  </div>

  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#314260] dark:bg-[#111a2c]">
   <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_145px_145px]">
    <label className="relative min-w-0"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} className="h-10 w-full rounded-lg border border-slate-200 bg-transparent ps-10 pe-3 text-sm outline-none focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#314260]"/></label>
    <FilterSelect ariaLabel={t.activeOnly} value={status} onChange={setStatus} options={[{value:'active',label:t.activeOnly},{value:'all',label:t.allLoans},{value:'pending',label:t.pendingS},{value:'paid',label:t.paidS},{value:'overdue',label:t.overdueS}]}/>
    <FilterSelect ariaLabel={t.allTime} value={period} onChange={setPeriod} options={[{value:'all',label:t.allTime},{value:'today',label:t.today},{value:'week',label:t.week},{value:'month',label:t.month},{value:'year',label:t.year}]}/>
   </div>
  </div>

  <section className="mt-5 overflow-visible rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#314260] dark:bg-[#111a2c]">
   <div className="mb-4 flex items-center gap-2 font-bold"><CreditCard size={18}/>{t.title.replace('Management','').trim()} ({filtered.length})</div>
   {filtered.length?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm">
    <thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#314260] dark:text-slate-300">{[t.invoice,t.customer,t.total,t.paidCol,t.balance,t.status,t.date,t.actions].map(h=><th key={h} className="px-3 py-3 text-start">{h}</th>)}</tr></thead>
    <tbody>{filtered.map((x:any)=><tr key={x.id||invoiceNo(x)} className="border-b border-slate-100 last:border-0 dark:border-[#273653]">
     <td className="px-3 py-4 font-mono font-semibold">{invoiceNo(x)}</td>
     <td className="px-3 py-4">{x.customerName||x.customer||'Walk-in Customer'}</td>
     <td className="px-3 py-4">{money(x.total,x.currency)}</td>
     <td className="px-3 py-4 text-emerald-600">{money(x.paid,x.currency)}</td>
     <td className="px-3 py-4 text-red-500">{money(x.balance,x.currency)}</td>
     <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${x._status==='paid'?'bg-emerald-100 text-emerald-700':x._status==='overdue'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{x._status==='paid'?t.paidS:x._status==='overdue'?t.overdueS:t.pendingS}</span></td>
     <td className="px-3 py-4"><div>{fmtDate(dateOf(x))}</div><div className="text-xs text-slate-400">{shamsi(dateOf(x))}</div></td>
     <td className="px-3 py-4 text-center">
      <button type="button" onClick={(e)=>{const id=String(x.id);if(menu?.id===id){setMenu(null);return}const r=e.currentTarget.getBoundingClientRect();const width=170,height=220;const left=Math.max(8,Math.min(r.left-width+30,window.innerWidth-width-8));const top=r.bottom+8+height<=window.innerHeight?r.bottom+8:Math.max(8,r.top-height-8);setMenu({id,top,left})}} className="inline-flex h-8 min-w-9 items-center justify-center rounded-lg px-2 text-lg font-bold leading-none hover:bg-slate-100 dark:hover:bg-white/10">•••</button>
      {menu?.id===String(x.id)&&createPortal(<><button type="button" className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={()=>setMenu(null)}/><div dir={language==='English'?'ltr':'rtl'} className="fixed z-[90] w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[#30456f] dark:bg-[#0d1628]" style={{top:menu.top,left:menu.left}}>
       <Action icon={<Eye size={15}/>} label={t.view} onClick={()=>{setView(x);setMenu(null)}}/>
       {x.balance>0&&<><Action icon={<DollarSign size={15}/>} label={t.makePayment} onClick={()=>{setPayment(x);setMenu(null)}}/><Action icon={<CheckCircle2 size={15}/>} label={t.markPaid} onClick={()=>{recordPayment(x,x.balance,'Marked as paid',true);setMenu(null)}}/></>}
       <Action icon={<Pencil size={15}/>} label={t.editBill} onClick={()=>{onEditInvoice?.(String(x.id));setMenu(null)}}/>
       <Action danger icon={<Trash2 size={15}/>} label={t.delete} onClick={()=>{setDel(x);setMenu(null)}}/>
      </div></>,document.body)}
     </td>
    </tr>)}</tbody>
   </table></div>:<div className="grid min-h-[180px] place-items-center text-center"><div><CalendarDays className="mx-auto text-slate-300" size={42}/><div className="mt-3 font-bold">{t.empty}</div></div></div>}
  </section>

  {view&&<Backdrop><div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-[#111a2c] dark:text-white">
   <div className="flex items-start justify-between"><h2 className="text-lg font-bold">{t.loanDetails}</h2><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${view._status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{view._status==='paid'?t.paidS:t.pendingS}</span><button onClick={()=>setView(null)}><X size={16}/></button></div></div>
   <div className="mt-6 grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 dark:border-[#30456f]"><div><div className="text-sm text-slate-500">{t.invoice}</div><div className="font-mono font-semibold">{invoiceNo(view)}</div></div><div className="text-end"><div className="text-sm text-slate-500">{t.customer}</div><div className="font-semibold">{view.customerName||'Walk-in Customer'}</div></div></div>
   <div className="mt-4"><div className="flex justify-between text-sm"><span>{t.paymentProgress}</span><span>{Math.min(100,Math.round((view.paid/Math.max(1,view.total))*100))}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full bg-[#172a57]" style={{width:`${Math.min(100,(view.paid/Math.max(1,view.total))*100)}%`}}/></div></div>
   <div className="mt-4 space-y-2 border-b border-slate-200 pb-4 text-sm dark:border-[#30456f]"><div className="flex justify-between"><span className="text-slate-500">{t.totalAmount}</span><b>{money(view.total,view.currency)}</b></div><div className="flex justify-between"><span className="text-emerald-600">{t.paidCol}</span><b className="text-emerald-600">{money(view.paid,view.currency)}</b></div><div className="flex justify-between"><span className="text-red-500">{t.balance}</span><b className="text-red-500">{money(view.balance,view.currency)}</b></div></div>
   <div className="mt-4 border-b border-slate-200 pb-4 text-sm dark:border-[#30456f]"><div className="text-slate-500">{t.created}</div><div>{fmtDate(dateOf(view))}</div></div>
   {view.balance>0&&<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>{setPayment(view);setView(null)}} className="h-10 rounded-lg border border-slate-200 font-semibold dark:border-[#30456f]"><DollarSign size={15} className="inline me-2"/>{t.recordPayment}</button><button onClick={()=>recordPayment(view,view.balance,'Marked as paid',true)} className="h-10 rounded-lg bg-[#172a57] font-semibold text-white"><CheckCircle2 size={15} className="inline me-2"/>{t.markPaid}</button></div>}
   <button onClick={()=>{setDel(view);setView(null)}} className="mt-5 h-10 w-full rounded-lg bg-red-500 font-semibold text-white">{t.deleteRecord}</button>
  </div></Backdrop>}

  {payment&&<PaymentModal sale={payment} t={t} onClose={()=>setPayment(null)} onSave={(a,note,w)=>recordPayment(payment,a,note,w)}/>}

  {del&&<Backdrop><div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-[#111a2c] dark:text-white"><h2 className="text-lg font-bold">{t.deleteRecord}</h2><p className="mt-3 text-sm text-slate-500">{t.confirmDelete}</p><div className="mt-5 flex gap-2"><button onClick={()=>hideLoanRecord(del)} className="h-10 rounded-lg bg-red-500 px-5 font-bold text-white">{t.delete}</button><button onClick={()=>setDel(null)} className="h-10 rounded-lg border px-5 dark:border-[#30456f]">{t.cancel}</button></div></div></Backdrop>}
 </div>
}

function PaymentModal({sale,t,onClose,onSave}:{sale:AnyRow;t:any;onClose:()=>void;onSave:(a:number,note:string,w:boolean)=>void}){
 const [amount,setAmount]=useState('')
 const [note,setNote]=useState('')
 const [wallet,setWallet]=useState(true)
 const max=balanceOf(sale)
 const valid=n(amount)>0&&n(amount)<=max
 return <Backdrop><div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-[#111a2c] dark:text-white">
  <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t.recordPayment}</h2><button onClick={onClose}><X size={16}/></button></div>
  <div className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><span className="text-slate-500">{t.invoice}:</span><b className="text-end font-mono">{invoiceNo(sale)}</b><span className="text-slate-500">{t.total}:</span><b className="text-end">{money(totalOf(sale),sale.currency)}</b><span className="text-slate-500">{t.alreadyPaid}:</span><b className="text-end text-emerald-600">{money(paidOf(sale),sale.currency)}</b><span className="text-slate-500">{t.balance}:</span><b className="text-end text-red-500">{money(max,sale.currency)}</b></div>
  <label className="mt-5 block text-sm font-semibold">{t.paymentAmount}</label>
  <input autoFocus type="number" min="0" max={max} value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Max: ${max}`} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3 outline-none focus:ring-2 focus:ring-[#172a57]/30 dark:border-[#30456f]"/>
  <label className="mt-4 block text-sm font-semibold">{t.notes}</label>
  <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={t.paymentReference} className="mt-1 min-h-[76px] w-full rounded-lg border border-slate-200 bg-transparent p-3 outline-none focus:ring-2 focus:ring-[#172a57]/30 dark:border-[#30456f]"/>
  <label className="mt-4 flex h-10 items-center justify-between rounded-lg border border-slate-200 px-3 text-sm dark:border-[#30456f]"><span><CreditCard size={15} className="inline me-2"/>{t.wallet}</span><input type="checkbox" checked={wallet} onChange={e=>setWallet(e.target.checked)}/></label>
  <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 font-semibold dark:border-[#30456f]">{t.cancel}</button><button disabled={!valid} onClick={()=>valid&&onSave(n(amount),note,wallet)} className="h-10 rounded-lg bg-[#172a57] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">{t.recordPayment}</button></div>
 </div></Backdrop>
}
