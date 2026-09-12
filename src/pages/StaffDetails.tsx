import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Language } from '../i18n'

type IconProps = { size?: number; className?: string }
function SvgIcon({ size = 18, className = '', children }: IconProps & { children: React.ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
}
const Users = (p:IconProps)=><SvgIcon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>
const UserPlus = (p:IconProps)=><SvgIcon {...p}><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></SvgIcon>
const BriefcaseBusiness = (p:IconProps)=><SvgIcon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></SvgIcon>
const CircleDollarSign = (p:IconProps)=><SvgIcon {...p}><circle cx="12" cy="12" r="9"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/></SvgIcon>
const CreditCard = (p:IconProps)=><SvgIcon {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></SvgIcon>
const WalletCards = (p:IconProps)=><SvgIcon {...p}><path d="M18 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6"/><path d="M16 13h2"/></SvgIcon>
const Search = (p:IconProps)=><SvgIcon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></SvgIcon>
const Printer = (p:IconProps)=><SvgIcon {...p}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></SvgIcon>
const ChevronDownIcon = (p:IconProps)=><SvgIcon {...p}><path d="m6 9 6 6 6-6"/></SvgIcon>
const Plus = (p:IconProps)=><SvgIcon {...p}><path d="M12 5v14M5 12h14"/></SvgIcon>
const Eye = (p:IconProps)=><SvgIcon {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></SvgIcon>
const Edit3 = (p:IconProps)=><SvgIcon {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></SvgIcon>
const Trash2 = (p:IconProps)=><SvgIcon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></SvgIcon>
const X = (p:IconProps)=><SvgIcon {...p}><path d="m6 6 12 12M18 6 6 18"/></SvgIcon>
const ArrowLeft = (p:IconProps)=><SvgIcon {...p}><path d="m15 18-6-6 6-6M9 12h11"/></SvgIcon>

import type { StaffRecord } from './Staff'
const n=(v:unknown)=>Number.parseFloat(String(v??0))||0
const load=<T,>(k:string,f:T):T=>{try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}}
const save=(k:string,v:unknown)=>{localStorage.setItem(k,JSON.stringify(v));window.dispatchEvent(new CustomEvent('pharma:data-changed'))}
const money=(v:number,c='AFN')=>`${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${c==='AFN'?'؋':c}`
const monthKey=(value?:string)=>String(value||'').slice(0,7)
const currentMonthKey=()=>new Date().toISOString().slice(0,7)
const paidForMonth=(history:any[],month:string)=>history.filter(p=>monthKey(p.start||p.createdAt)===month).reduce((a,p)=>a+n(p.paidAmount),0)

const copy={
 English:{
  pay:'Pay Salary',base:'Base Salary',paid:'Paid Payroll',due:'Payable',history:'Payment History',none:'No payroll history has been recorded yet.',
  period:'Period',start:'Start',end:'End',amount:'Paid Amount',method:'Payment Method',notes:'Notes',save:'Save Changes',cancel:'Cancel',
  currency:'Currency',suggested:'Suggested',days:'days',alreadyPaid:'Already paid for this period',remaining:'Remaining for this period',
  daily:'Daily',weekly:'Weekly',monthly:'Monthly',cash:'Cash',card:'Debit/Credit Card',bank:'Bank Transfer',online:'Online Payment',
  del:'Delete',deleteTitle:'Delete Payment',deleteText:'Are you sure you want to delete this salary payment record?'
 },
 'دری':{
  pay:'پرداخت معاش',base:'معاش پایه',paid:'حقوق پرداخت شده',due:'حقوق قابل پرداخت',history:'تاریخچه پرداخت',none:'هنوز سابقه حقوق ثبت نشده',
  period:'دوره',start:'شروع',end:'پایان',amount:'مبلغ پرداخت‌شده',method:'روش پرداخت',notes:'یادداشت',save:'ذخیره تغییرات',cancel:'لغو',
  currency:'واحد پول',suggested:'پیشنهادی',days:'روز',alreadyPaid:'قبلاً برای این دوره پرداخت شده',remaining:'باقی‌مانده این دوره',
  daily:'روزانه',weekly:'هفتگی',monthly:'ماهانه',cash:'نقدی',card:'کارت دیبت/کریدت',bank:'انتقال بانکی',online:'پرداخت آنلاین',
  del:'حذف',deleteTitle:'حذف پرداخت',deleteText:'آیا مطمئن هستید که این ریکارد پرداخت معاش حذف شود؟'
 },
 'پښتو':{
  pay:'معاش ورکول',base:'بنسټیز معاش',paid:'ورکړل شوی معاش',due:'پاتې معاش',history:'د تادیاتو تاریخ',none:'تر اوسه د معاش سابقه نشته',
  period:'دوره',start:'پیل',end:'پای',amount:'ورکړل شوې اندازه',method:'د تادیې طریقه',notes:'یادښت',save:'بدلونونه خوندي کړئ',cancel:'لغوه',
  currency:'اسعار',suggested:'وړاندیز شوی',days:'ورځې',alreadyPaid:'د دې دورې لپاره مخکې ورکړل شوی',remaining:'د دې دورې پاتې',
  daily:'ورځنی',weekly:'اونیز',monthly:'میاشتنی',cash:'نغدي',card:'ډیبیټ/کریډیټ کارت',bank:'بانکي لېږد',online:'آنلاین تادیه',
  del:'ړنګول',deleteTitle:'تادیه ړنګول',deleteText:'ایا دا د معاش تادیې ریکارډ ړنګ شي؟'
 }
} as const
export default function StaffDetails({staffId,language,onBack}:{staffId:string;language:Language;onBack:()=>void}){
 const t=copy[language]
 const [version,setVersion]=useState(0)
 const [show,setShow]=useState(false)
 const [deleting,setDeleting]=useState<any|null>(null)
 const staff=useMemo(()=>load<StaffRecord[]>('staff',[]).find(s=>String(s.id)===String(staffId)),[staffId,version])
 if(!staff)return <div className="app-panel rounded-xl p-8">Staff not found</div>

 const h=Array.isArray(staff.payrollHistory)?staff.payrollHistory:[]
 const paid=h.reduce((a,p)=>a+n(p.paidAmount),0)
 const month=currentMonthKey()
 const paidThisMonth=paidForMonth(h,month)
 const due=Math.max(0,n(staff.salary)-paidThisMonth)

 const add=(entry:any)=>{
  const now=new Date().toISOString()
  const salary=n(staff.salary)
  const paidAmount=n(entry.paidAmount)
  const entryMonth=monthKey(entry.start||now)
  const priorPaid=paidForMonth(h,entryMonth)
  const payable=Math.max(0,salary-priorPaid-paidAmount)
  const pe={...entry,id:`payroll-${Date.now()}`,salary,paidAmount,payable,currency:staff.currency,createdAt:now}

  const all=load<StaffRecord[]>('staff',[]).map(s=>s.id===staff.id?{...s,payrollHistory:[pe,...(s.payrollHistory||[])],updatedAt:now}:s)
  save('staff',all)

  const transactions=load<any[]>('transactions',[])
  save('transactions',[{
   id:`salary-${staff.id}-${pe.id}`,transactionType:'withdraw',type:'expense',title:`Salary paid to ${staff.name}`,amount:paidAmount,
   date:now.slice(0,10),createdAt:now,description:entry.notes||`${entry.start} to ${entry.end}`,source:'cash-wallet',
   category:'Cash Wallet',module:'staff-payroll',payrollEntryId:pe.id,referenceId:staff.id,staffId:staff.id,staffName:staff.name,currency:staff.currency
  },...transactions])

  const expenses=load<any[]>('expenses',[])
  save('expenses',[{
   id:`staff-payroll-${staff.id}-${pe.id}`,category:'Salary',description:`Salary paid to ${staff.name}`,amount:paidAmount,
   currency:staff.currency,method:entry.method||'Cash',notes:entry.notes||'',date:now.slice(0,10),source:'staff-payroll',
   payrollEntryId:pe.id,referenceId:staff.id,staffId:staff.id,staffName:staff.name,createdAt:now
  },...expenses])

  setShow(false)
  setVersion(v=>v+1)
 }

 const removePayment=(entry:any)=>{
  const all=load<StaffRecord[]>('staff',[]).map(s=>String(s.id)===String(staff.id)
   ? {...s,payrollHistory:(s.payrollHistory||[]).filter((p:any)=>String(p.id)!==String(entry.id)),updatedAt:new Date().toISOString()}
   : s)
  save('staff',all)

  const transactions=load<any[]>('transactions',[])
  save('transactions',transactions.filter(tx=>
   String(tx.payrollEntryId||'')!==String(entry.id) &&
   String(tx.id||'')!==`salary-${staff.id}-${entry.id}`
  ))

  const expenses=load<any[]>('expenses',[])
  save('expenses',expenses.filter(ex=>
   String(ex.payrollEntryId||'')!==String(entry.id) &&
   String(ex.id||'')!==`staff-payroll-${staff.id}-${entry.id}`
  ))

  setDeleting(null)
  setVersion(v=>v+1)
 }

 return <div className="w-full pb-8">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <button onClick={onBack} className="app-btn-secondary"><ArrowLeft size={16}/></button>
   <div className={`flex-1 ${language==='English'?'text-start':'text-end'}`}>
    <h1 className="text-2xl font-extrabold">{staff.name}</h1>
    <p className="text-sm text-slate-500 dark:text-slate-400">{staff.role} • {staff.employmentType}</p>
   </div>
   <button onClick={()=>setShow(true)} className="app-btn-primary"><CreditCard size={16}/>{t.pay}</button>
  </div>

  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
   <Card icon={<BriefcaseBusiness/>} l={t.base} v={money(n(staff.salary),staff.currency)}/>
   <Card icon={<CircleDollarSign/>} l={t.paid} v={money(paid,staff.currency)} green/>
   <Card icon={<WalletCards/>} l={t.due} v={money(due,staff.currency)}/>
   <Card icon={<CreditCard/>} l={t.history} v={String(h.length)}/>
  </div>

  <div className="app-panel mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#24365f] dark:bg-[#111a2c]">
   <div className="mb-4 flex items-center justify-between">
    <h2 className="font-bold">{t.history} ({h.length})</h2>
    <button className="app-btn-secondary"><Printer size={15}/></button>
   </div>

   {!h.length
    ? <div className="grid min-h-[220px] place-items-center text-slate-400">{t.none}</div>
    : <div className="overflow-x-auto">
       <table className="w-full min-w-[820px] text-sm">
        <thead>
         <tr className="border-b border-slate-200 text-slate-500 dark:border-[#24365f]">
          <th className="p-3 text-start">{t.period}</th>
          <th className="p-3 text-start">{t.start}</th>
          <th className="p-3 text-start">{t.end}</th>
          <th className="p-3 text-start">{t.amount}</th>
          <th className="p-3 text-start">{t.due}</th>
          <th className="p-3 text-start">{t.method}</th>
          <th className="p-3 text-end"></th>
         </tr>
        </thead>
        <tbody>
         {h.map(p=><tr key={p.id} className="border-b border-slate-100 dark:border-[#1b2948]">
          <td className="p-3">{p.period}</td>
          <td className="p-3">{p.start}</td>
          <td className="p-3">{p.end}</td>
          <td className="p-3 text-emerald-500">{money(n(p.paidAmount),p.currency)}</td>
          <td className="p-3 text-amber-500">{money(Math.max(0,n(staff.salary)-paidForMonth(h,monthKey(p.start||p.createdAt))),p.currency)}</td>
          <td className="p-3">{p.method}</td>
          <td className="p-3 text-end">
           <button type="button" onClick={()=>setDeleting(p)} title={t.del} className="inline-grid h-8 w-8 place-items-center rounded-lg text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={16}/></button>
          </td>
         </tr>)}
        </tbody>
       </table>
      </div>
   }
  </div>

  {show&&<PayrollModal t={t} language={language} staff={staff} history={h} onClose={()=>setShow(false)} onSave={add}/>}

  {deleting&&<div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setDeleting(null)}}>
   <div className="modal-card max-w-md">
    <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{t.deleteTitle}</h2><button onClick={()=>setDeleting(null)}><X size={18}/></button></div>
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">{t.deleteText}</p>
    <div className="mt-5 flex justify-end gap-2">
     <button type="button" onClick={()=>setDeleting(null)} className="app-btn-secondary">{t.cancel}</button>
     <button type="button" onClick={()=>removePayment(deleting)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-500 px-5 font-semibold text-white"><Trash2 size={15}/>{t.del}</button>
    </div>
   </div>
  </div>}
 </div>
}
function Card({icon,l,v,green}:{icon:React.ReactNode;l:string;v:string;green?:boolean}){return <div className="stat-lite tone-blue"><div><div className="text-xs text-slate-500 dark:text-slate-400">{l}</div><div className={`mt-1 text-2xl font-extrabold ${green?'text-emerald-500':''}`}>{v}</div></div><span className="icon-box">{icon}</span></div>}
function isoLocal(d:Date){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function daysInclusive(start:string,end:string){const a=new Date(`${start}T12:00:00`),b=new Date(`${end}T12:00:00`);return Math.max(1,Math.round((b.getTime()-a.getTime())/86400000)+1)}
function periodDates(period:string){
 const d=new Date()
 if(period==='Daily'){const x=isoLocal(d);return {start:x,end:x}}
 if(period==='Weekly'){const e=new Date(d);e.setDate(e.getDate()+6);return {start:isoLocal(d),end:isoLocal(e)}}
 const start=new Date(d.getFullYear(),d.getMonth(),1),end=new Date(d.getFullYear(),d.getMonth()+1,0)
 return {start:isoLocal(start),end:isoLocal(end)}
}
function SmoothSelect({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
 const [open,setOpen]=useState(false)
 const selected=options.find(o=>o.value===value)||options[0]
 return <div className="relative mt-1">
  <button type="button" onClick={()=>setOpen(v=>!v)} className="form-control flex items-center justify-between gap-2 text-start">
   <span className="truncate">{selected?.label}</span><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-500 dark:bg-white/10 dark:text-slate-200"><ChevronDownIcon size={15} className={`transition-transform ${open?'rotate-180':''}`}/></span>
  </button>
  {open&&<>
   <button type="button" className="fixed inset-0 z-[119] cursor-default" onClick={()=>setOpen(false)}/>
   <div className="absolute inset-x-0 top-[calc(100%+5px)] z-[120] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#0d1628]">
    {options.map(o=><button key={o.value} type="button" onClick={()=>{onChange(o.value);setOpen(false)}} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${o.value===value?'bg-amber-500 font-semibold text-slate-950':'hover:bg-slate-100 dark:hover:bg-white/10'}`}><span className="w-4">{o.value===value?'✓':''}</span><span>{o.label}</span></button>)}
   </div>
  </>}
 </div>
}
function PayrollModal({t,language,staff,history,onClose,onSave}:{t:any;language:Language;staff:StaffRecord;history:any[];onClose:()=>void;onSave:(x:any)=>void}){
 const [period,setPeriod]=useState('Monthly')
 const initial=periodDates('Monthly')
 const [start,setStart]=useState(initial.start)
 const [end,setEnd]=useState(initial.end)
 const [paidAmount,setPaidAmount]=useState('')
 const [method,setMethod]=useState('Cash')
 const [notes,setNotes]=useState('')

 const baseSalary=n(staff.salary)
 const currency=staff.currency||'AFN'
 const days=daysInclusive(start,end)
 const suggested=period==='Monthly'?baseSalary:baseSalary*(days/30)
 const prior=(history||[]).filter(p=>p.start===start&&p.end===end&&String(p.currency||currency)===String(currency)).reduce((a,p)=>a+n(p.paidAmount),0)
 const remaining=Math.max(0,suggested-prior)

 useEffect(()=>{const d=periodDates(period);setStart(d.start);setEnd(d.end)},[period])
 useEffect(()=>{setPaidAmount(remaining>0?remaining.toFixed(2):'0.00')},[period,start,end,remaining])

 const submit=(e:FormEvent)=>{
  e.preventDefault()
  const amount=Math.max(0,Math.min(remaining,n(paidAmount)))
  if(amount<=0)return
  onSave({period,start,end,salary:baseSalary,paidAmount:amount,currency,method,notes,payable:Math.max(0,remaining-amount)})
 }

 return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <form onSubmit={submit} dir={language==='English'?'ltr':'rtl'} className="modal-card max-w-md">
   <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">{t.pay} — {staff.name}</h2><button type="button" onClick={onClose}><X size={18}/></button></div>

   <label className="block text-sm font-semibold">{t.period}
    <SmoothSelect value={period} onChange={setPeriod} options={[{value:'Daily',label:t.daily},{value:'Weekly',label:t.weekly},{value:'Monthly',label:t.monthly}]}/>
   </label>

   <div className="mt-4 grid grid-cols-2 gap-3">
    <label className="text-sm font-semibold">{t.start}<input type="date" className="form-control mt-1" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label className="text-sm font-semibold">{t.end}<input type="date" className="form-control mt-1" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   </div>

   <div className="mt-4 grid grid-cols-2 gap-3">
    <label className="text-sm font-semibold">{t.base}<input type="number" className="form-control mt-1" value={baseSalary} readOnly/></label>
    <label className="text-sm font-semibold">{t.currency}<input className="form-control mt-1" value={`؋ ${currency}`} readOnly/></label>
   </div>

   <label className="mt-4 block text-sm font-semibold">{t.amount}
    <span className="ms-2 text-xs font-normal text-slate-500">({t.suggested}: {money(suggested,currency)} • {days} {t.days})</span>
    <input type="number" min="0" max={remaining} step="0.01" className="form-control mt-1" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/>
   </label>

   <div className="mt-2 text-xs text-slate-500">{t.alreadyPaid}: <b>{money(prior,currency)}</b> · {t.remaining}: <b className="text-amber-500">{money(remaining,currency)}</b></div>

   <label className="mt-4 block text-sm font-semibold">{t.method}
    <SmoothSelect value={method} onChange={setMethod} options={[{value:'Cash',label:t.cash},{value:'Debit/Credit Card',label:t.card},{value:'Bank Transfer',label:t.bank},{value:'Online Payment',label:t.online}]}/>
   </label>

   <label className="mt-4 block text-sm font-semibold">{t.notes}<textarea className="form-control mt-1 min-h-20" value={notes} onChange={e=>setNotes(e.target.value)}/></label>

   <div className="mt-5 flex justify-end gap-2">
    <button type="button" onClick={onClose} className="app-btn-secondary">{t.cancel}</button>
    <button type="submit" disabled={remaining<=0||n(paidAmount)<=0} className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-50">{t.save}</button>
   </div>
  </form>
 </div>
}
