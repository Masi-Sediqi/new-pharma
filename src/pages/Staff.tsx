import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Language } from '../i18n'
import { moveRecordToRecycleBin } from '../utils/recycleBin'
import { toast } from '../utils/toast'

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
const Plus = (p:IconProps)=><SvgIcon {...p}><path d="M12 5v14M5 12h14"/></SvgIcon>
const Eye = (p:IconProps)=><SvgIcon {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></SvgIcon>
const Edit3 = (p:IconProps)=><SvgIcon {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></SvgIcon>
const Trash2 = (p:IconProps)=><SvgIcon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></SvgIcon>
const X = (p:IconProps)=><SvgIcon {...p}><path d="m6 6 12 12M18 6 6 18"/></SvgIcon>
const ArrowLeft = (p:IconProps)=><SvgIcon {...p}><path d="m15 18-6-6 6-6M9 12h11"/></SvgIcon>


type Payroll={id:string;start:string;end:string;period:string;salary:number;paidAmount:number;payable:number;currency:string;method:string;notes?:string;createdAt:string}
export type StaffRecord={id:string;name:string;phone?:string;email?:string;role:string;department?:string;employmentType:string;joiningDate:string;salaryType:string;salary:number;currency:string;status:string;notes?:string;payrollHistory:Payroll[];createdAt:string;updatedAt:string}
const n=(v:unknown)=>Number.parseFloat(String(v??0))||0
const load=<T,>(k:string,f:T):T=>{try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}}
const save=(k:string,v:unknown)=>{localStorage.setItem(k,JSON.stringify(v));window.dispatchEvent(new CustomEvent('pharma:data-changed'))}
const money=(v:number,c='AFN')=>`${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${c==='AFN'?'؋':c}`
const paid=(s:StaffRecord)=>s.payrollHistory.reduce((a,p)=>a+n(p.paidAmount),0)
const monthKey=(value?:string)=>String(value||'').slice(0,7)
const currentMonthKey=()=>new Date().toISOString().slice(0,7)
const monthlyPaid=(s:StaffRecord,month=currentMonthKey())=>(s.payrollHistory||[]).filter(p=>monthKey(p.start||p.createdAt)===month).reduce((a,p)=>a+n(p.paidAmount),0)
const payable=(s:StaffRecord)=>Math.max(0,n(s.salary)-monthlyPaid(s))
const copy={
English:{title:'Staff Management',sub:'Manage your team members',add:'Add Staff',payroll:'Payroll',report:'Print Report',total:'Total Staff',salary:'Monthly Salary',paid:'Paid Payroll',payable:'Payable Payroll',search:'Search by name or role...',all:'All statuses',active:'Active',inactive:'Inactive',members:'Staff Members',none:'No staff member found',hint:'Add your first staff member',name:'Name',role:'Role',dept:'Department',type:'Type',salaryCol:'Salary',status:'Status',joined:'Joining Date',view:'View Profile',edit:'Edit',pay:'Pay Salary',del:'Delete',formTitle:'Add New Staff',phone:'Phone',email:'Email',employment:'Employment Type',joinDate:'Joining Date',baseSalary:'Base Salary',currency:'Currency',notes:'Notes',cancel:'Cancel',save:'Save Staff',staffMembers:'Staff Members',period:'Period',daily:'Daily',weekly:'Weekly',monthly:'Monthly',start:'Start',end:'End',paidAmount:'Paid Amount',suggested:'Suggested',days:'days',alreadyPaid:'Already paid for this period',remainingPeriod:'Remaining for this period',paymentMethod:'Payment Method',cash:'Cash',card:'Debit/Credit Card',bank:'Bank Transfer',online:'Online Payment',saveChanges:'Save Changes',selectStaff:'Select staff member'},
'دری':{title:'مدیریت کارمندان',sub:'مدیریت اعضای تیم',add:'افزودن کارمند',payroll:'لیست حقوق',report:'چاپ گزارش',total:'مجموع کارمندان',salary:'معاش ماهانه',paid:'حقوق پرداخت شده',payable:'حقوق قابل پرداخت',search:'جستجو با نام یا نقش...',all:'همه وضعیت‌ها',active:'فعال',inactive:'غیرفعال',members:'اعضای کارمندان',none:'کارمندی یافت نشد',hint:'اولین کارمند را اضافه کنید',name:'نام',role:'نقش',dept:'بخش',type:'نوع',salaryCol:'معاش',status:'وضعیت',joined:'تاریخ پیوستن',view:'مشاهده پروفایل',edit:'ویرایش',pay:'پرداخت معاش',del:'حذف',formTitle:'افزودن کارمند جدید',phone:'تلفون',email:'ایمیل',employment:'نوع استخدام',joinDate:'تاریخ پیوستن',baseSalary:'معاش پایه',currency:'واحد پول',notes:'یادداشت',cancel:'لغو',save:'ذخیره کارمند',staffMembers:'کارمندان',period:'دوره',daily:'روزانه',weekly:'هفتگی',monthly:'ماهانه',start:'شروع',end:'پایان',paidAmount:'مبلغ پرداخت',suggested:'پیشنهادی',days:'روز',alreadyPaid:'قبلاً برای این دوره پرداخت شده',remainingPeriod:'باقی‌مانده این دوره',paymentMethod:'روش پرداخت',cash:'نقدی',card:'کارت دیبت/کریدت',bank:'انتقال بانکی',online:'پرداخت آنلاین',saveChanges:'ذخیره تغییرات',selectStaff:'انتخاب کارمند'},
'پښتو':{title:'د کارکوونکو مدیریت',sub:'د ټیم غړي اداره کړئ',add:'کارکوونکی زیات کړئ',payroll:'د معاش لېست',report:'راپور چاپ',total:'ټول کارکوونکي',salary:'میاشتنی معاش',paid:'ورکړل شوی معاش',payable:'پاتې معاش',search:'د نوم یا دندې له مخې لټون...',all:'ټول حالتونه',active:'فعال',inactive:'غیرفعال',members:'کارکوونکي',none:'کارکوونکی ونه موندل شو',hint:'لومړی کارکوونکی اضافه کړئ',name:'نوم',role:'دنده',dept:'څانګه',type:'ډول',salaryCol:'معاش',status:'حالت',joined:'د شاملېدو نېټه',view:'پروفایل',edit:'سمون',pay:'معاش ورکول',del:'ړنګول',formTitle:'نوی کارکوونکی',phone:'تلیفون',email:'برېښنالیک',employment:'د کار ډول',joinDate:'د شاملېدو نېټه',baseSalary:'بنسټیز معاش',currency:'اسعار',notes:'یادښت',cancel:'لغوه',save:'خوندي کول',staffMembers:'کارکوونکي',period:'دوره',daily:'ورځنی',weekly:'اونیز',monthly:'میاشتنی',start:'پیل',end:'پای',paidAmount:'ورکړل شوې اندازه',suggested:'وړاندیز شوی',days:'ورځې',alreadyPaid:'د دې دورې لپاره مخکې ورکړل شوی',remainingPeriod:'د دې دورې پاتې',paymentMethod:'د تادیې طریقه',cash:'نغدي',card:'ډیبیټ/کریډیټ کارت',bank:'بانکي لېږد',online:'آنلاین تادیه',saveChanges:'بدلونونه خوندي کړئ',selectStaff:'کارکوونکی وټاکئ'}} as const

export default function Staff({language,onOpenStaff,globalSearch=''}:{language:Language;onOpenStaff:(id:string)=>void;globalSearch?:string}){
 const t=copy[language], [rows,setRows]=useState<StaffRecord[]>(()=>load('staff',[])),[q,setQ]=useState(''),[status,setStatus]=useState('all'),[modal,setModal]=useState<StaffRecord|null|undefined>(undefined),[payrollOpen,setPayrollOpen]=useState(false),[payrollStaffId,setPayrollStaffId]=useState(''),[menu,setMenu]=useState('')
 useEffect(()=>{const f=()=>setRows(load('staff',[]));window.addEventListener('pharma:data-changed',f);return()=>window.removeEventListener('pharma:data-changed',f)},[])
 useEffect(()=>setQ(globalSearch),[globalSearch])
 const list=useMemo(()=>rows.filter(s=>(status==='all'||String(s.status).toLowerCase()===status)&&[s.name,s.role,s.department,s.phone].some(x=>String(x||'').toLowerCase().includes(q.toLowerCase()))),[rows,q,status])
 const totalSalary=rows.reduce((a,s)=>a+n(s.salary),0), totalPaid=rows.reduce((a,s)=>a+paid(s),0), totalPayable=rows.reduce((a,s)=>a+payable(s),0)
 const persist=(s:StaffRecord)=>{const now=new Date().toISOString();const exists=rows.some(x=>x.id===s.id);const next={...s,id:s.id||`staff-${Date.now()}`,name:s.name.trim(),role:s.role.trim(),salary:n(s.salary),payrollHistory:Array.isArray(s.payrollHistory)?s.payrollHistory:[],createdAt:s.createdAt||now,updatedAt:now};const out=exists?rows.map(x=>x.id===next.id?next:x):[next,...rows];setRows(out);save('staff',out);setModal(undefined);toast.success(exists?t.edit:t.add,next.name)}
 const remove=(id:string)=>{
  const staff=rows.find(x=>String(x.id)===String(id))
  if(!staff)return

  // Keep the staff record itself recoverable in Recycle Bin.
  moveRecordToRecycleBin('staff',staff,staff.name)

  // A salary payment changes both Cash Wallet (transaction) and Net Profit
  // (payroll expense/staff payment). When the employee is deleted, remove all
  // financial records created by that employee's payroll so the dashboard
  // automatically returns those amounts to their pre-payment values.
  const payrollIds=new Set((staff.payrollHistory||[]).map((p:any)=>String(p.id||'')).filter(Boolean))
  const staffId=String(staff.id)
  const staffName=String(staff.name||'').trim().toLowerCase()

  const transactions=load<any[]>('transactions',[])
  const nextTransactions=transactions.filter((tx:any)=>{
    const txPayrollId=String(tx.payrollEntryId||'')
    if(txPayrollId&&payrollIds.has(txPayrollId))return false
    if(String(tx.id||'').startsWith(`salary-${staffId}-`))return false

    const sameStaff=String(tx.staffId||tx.employeeId||'')===staffId || String(tx.referenceId||'')===staffId
    if(!sameStaff)return true

    const source=String(tx.source||'').toLowerCase()
    const module=String(tx.module||'').toLowerCase()
    const category=String(tx.category||'').toLowerCase()
    const title=String(tx.title||'').toLowerCase()
    const payrollRecord=/staff-payroll|payroll|salary/.test(`${source} ${module} ${category} ${title}`)
    const namedSalary=staffName&&title.includes(staffName)&&/salary|payroll/.test(title)
    return !(payrollRecord||namedSalary)
  })
  if(nextTransactions.length!==transactions.length)save('transactions',nextTransactions)

  const expenses=load<any[]>('expenses',[])
  const nextExpenses=expenses.filter((ex:any)=>{
    const exPayrollId=String(ex.payrollEntryId||'')
    if(exPayrollId&&payrollIds.has(exPayrollId))return false
    if(String(ex.id||'').startsWith(`staff-payroll-${staffId}-`))return false

    const sameStaff=String(ex.staffId||ex.employeeId||'')===staffId || String(ex.referenceId||'')===staffId
    if(!sameStaff)return true

    const source=String(ex.source||'').toLowerCase()
    const category=String(ex.category||'').toLowerCase()
    const description=String(ex.description||'').toLowerCase()
    const payrollRecord=/staff-payroll|payroll|salary/.test(`${source} ${category} ${description}`)
    const namedSalary=staffName&&description.includes(staffName)&&/salary|payroll/.test(description)
    return !(payrollRecord||namedSalary)
  })
  if(nextExpenses.length!==expenses.length)save('expenses',nextExpenses)

  const out=rows.filter(x=>String(x.id)!==staffId)
  setRows(out)
  save('staff',out)
  setMenu('')
  toast.warning(t.del,staff.name)
}
 const savePayroll=(staffId:string,entry:{period:string;start:string;end:string;salary:number;paidAmount:number;currency:string;method:string;notes:string;payable:number})=>{
  const now=new Date().toISOString()
  const staff=rows.find(s=>String(s.id)===String(staffId))
  if(!staff)return
  const pe:Payroll={id:`payroll-${Date.now()}`,start:entry.start,end:entry.end,period:entry.period,salary:n(entry.salary),paidAmount:n(entry.paidAmount),payable:Math.max(0,n(entry.payable)),currency:entry.currency||staff.currency||'AFN',method:entry.method||'Cash',notes:entry.notes||'',createdAt:now}
  const nextRows=rows.map(s=>String(s.id)===String(staffId)?{...s,payrollHistory:[pe,...(s.payrollHistory||[])],updatedAt:now}:s)
  setRows(nextRows);save('staff',nextRows)
  if(pe.paidAmount>0){
   const transactions=load<any[]>('transactions',[])
   save('transactions',[{id:`salary-${staff.id}-${pe.id}`,transactionType:'withdraw',type:'expense',title:`Salary paid to ${staff.name}`,amount:pe.paidAmount,date:now.slice(0,10),createdAt:now,description:pe.notes||`${pe.start} to ${pe.end}`,source:'cash-wallet',category:'Cash Wallet',module:'staff-payroll',payrollEntryId:pe.id,referenceId:staff.id,staffId:staff.id,staffName:staff.name,currency:pe.currency},...transactions])
   const expenses=load<any[]>('expenses',[])
   save('expenses',[{id:`staff-payroll-${staff.id}-${pe.id}`,category:'Salary',description:`Salary paid to ${staff.name}`,amount:pe.paidAmount,currency:pe.currency,method:pe.method,notes:pe.notes||'',date:now.slice(0,10),source:'staff-payroll',payrollEntryId:pe.id,referenceId:staff.id,staffId:staff.id,staffName:staff.name,createdAt:now},...expenses])
  }
  setPayrollOpen(false);setPayrollStaffId('')
  toast.success(t.pay,staff.name)
 }
 return <div className="w-full pb-8">
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-extrabold">{t.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.sub}</p></div><div className="flex flex-wrap gap-2"><button className="app-btn-secondary"><Printer size={16}/>{t.report}</button><button onClick={()=>{setPayrollStaffId(rows[0]?.id||'');setPayrollOpen(true)}} className="app-btn-secondary"><CreditCard size={16}/>{t.payroll}</button><button onClick={()=>setModal(null)} className="app-btn-primary"><Plus size={16}/>{t.add}</button></div></div>
  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Card icon={<Users/>} label={t.total} value={String(rows.length)} tone="blue"/><Card icon={<CircleDollarSign/>} label={t.salary} value={money(totalSalary)} tone="orange"/><Card icon={<WalletCards/>} label={t.paid} value={money(totalPaid)} tone="green"/><Card icon={<UserPlus/>} label={t.payable} value={money(totalPayable)} tone="orange"/></div>
  <div className="app-panel mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c] sm:flex-row">
   <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/><input className="form-control pl-9 rtl:pl-3 rtl:pr-9" value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search}/></div>
   <div className="sm:w-44"><SmoothSelect value={status} onChange={setStatus} options={[{value:'all',label:t.all},{value:'active',label:t.active},{value:'inactive',label:t.inactive}]}/></div>
  </div>
  <div className="app-panel mt-5 overflow-visible rounded-xl border border-slate-200 bg-white p-5 dark:border-[#24365f] dark:bg-[#111a2c]"><div className="mb-4 flex items-center gap-2 font-bold"><BriefcaseBusiness size={18}/>{t.members} ({list.length})</div>{!list.length?<div className="grid min-h-[240px] place-items-center text-center"><div><Users size={42} className="mx-auto text-slate-300 dark:text-slate-500"/><div className="mt-3 font-bold">{t.none}</div><div className="mt-1 text-sm text-slate-400">{t.hint}</div></div></div>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#24365f]"><Th>{t.name}</Th><Th>{t.role}</Th><Th>{t.dept}</Th><Th>{t.type}</Th><Th>{t.salaryCol}</Th><Th>{t.status}</Th><Th>{t.joined}</Th><Th>•••</Th></tr></thead><tbody>{list.map(s=><tr key={s.id} onClick={()=>onOpenStaff(s.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-[#1b2948] dark:hover:bg-white/5"><Td><b>{s.name}</b></Td><Td>{s.role||'-'}</Td><Td>{s.department||'-'}</Td><Td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-white/10">{s.employmentType}</span></Td><Td>{money(n(s.salary),s.currency)}</Td><Td><span className="rounded-full bg-[#172a57] px-2 py-1 text-xs text-white dark:bg-sky-500/20 dark:text-sky-200">{String(s.status).toLowerCase()==='active'?t.active:t.inactive}</span></Td><Td>{s.joiningDate||'-'}</Td><Td><StaffActionMenu language={language} t={t} onView={()=>onOpenStaff(s.id)} onEdit={()=>setModal(s)} onPay={()=>{setPayrollStaffId(s.id);setPayrollOpen(true)}} onDelete={()=>remove(s.id)}/></Td></tr>)}</tbody></table></div>}</div>
  {payrollOpen&&<PayrollManagerModal t={t} language={language} rows={rows} initialStaffId={payrollStaffId} onClose={()=>{setPayrollOpen(false);setPayrollStaffId('')}} onSave={savePayroll}/>} 
  {modal!==undefined&&<StaffModal t={t} initial={modal} onClose={()=>setModal(undefined)} onSave={persist}/>} 
 </div>
}
function Th({children}:{children:React.ReactNode}){return <th className="px-3 py-3 text-start font-semibold">{children}</th>} function Td({children}:{children:React.ReactNode}){return <td className="px-3 py-4">{children}</td>}
function Card({icon,label,value,tone}:{icon:React.ReactNode;label:string;value:string;tone:string}){return <div className={`stat-lite tone-${tone}`}><div><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-2xl font-extrabold">{value}</div></div><span className="icon-box">{icon}</span></div>}
function StaffActionMenu({language,t,onView,onEdit,onPay,onDelete}:{language:Language;t:any;onView:()=>void;onEdit:()=>void;onPay:()=>void;onDelete:()=>void}){
 const [pos,setPos]=useState<{top:number;left:number}|null>(null)
 const toggle=(button:HTMLButtonElement)=>{
  if(pos){setPos(null);return}
  const r=button.getBoundingClientRect()
  const width=176,height=184
  const left=Math.max(8,Math.min(r.right-width,window.innerWidth-width-8))
  const top=r.bottom+8+height<=window.innerHeight?r.bottom+8:Math.max(8,r.top-height-8)
  setPos({top,left})
 }
 const run=(fn:()=>void)=>{setPos(null);fn()}
 return <>
  <button type="button" onClick={e=>{e.stopPropagation();toggle(e.currentTarget)}} className="grid h-8 w-9 place-items-center rounded-lg border border-transparent text-lg font-bold transition hover:border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:hover:border-[#31466f] dark:hover:bg-white/10">•••</button>
  {pos&&createPortal(<>
   <button type="button" aria-label="Close actions" className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={()=>setPos(null)}/>
   <div dir={language==='English'?'ltr':'rtl'} onClick={e=>e.stopPropagation()} className="fixed z-[90] w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[#2b3a60] dark:bg-[#0d1628]" style={{top:pos.top,left:pos.left}}>
    <Action icon={<Eye size={15}/>} label={t.view} onClick={()=>run(onView)}/>
    <Action icon={<Edit3 size={15}/>} label={t.edit} onClick={()=>run(onEdit)}/>
    <Action icon={<CreditCard size={15}/>} label={t.pay} onClick={()=>run(onPay)}/>
    <Action danger icon={<Trash2 size={15}/>} label={t.del} onClick={()=>run(onDelete)}/>
   </div>
  </>,document.body)}
 </>
}

function Action({icon,label,onClick,danger}:{icon:React.ReactNode;label:string;onClick:()=>void;danger?:boolean}){return <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/10 ${danger?'text-red-500':''}`}>{icon}{label}</button>}

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
 const [open,setOpen]=useState(false),selected=options.find(o=>o.value===value)||options[0]
 return <div className="relative">
  <button type="button" onClick={()=>setOpen(v=>!v)} className="form-control flex items-center justify-between text-start"><span>{selected?.label}</span><span className={`transition ${open?'rotate-180':''}`}>⌄</span></button>
  {open&&<><button type="button" className="fixed inset-0 z-[119]" onClick={()=>setOpen(false)}/><div className="absolute inset-x-0 top-[calc(100%+5px)] z-[120] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#0d1628]">{options.map(o=><button key={o.value} type="button" onClick={()=>{onChange(o.value);setOpen(false)}} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm ${o.value===value?'bg-amber-500 font-semibold text-slate-950':'hover:bg-slate-100 dark:hover:bg-white/10'}`}><span className="w-4">{o.value===value?'✓':''}</span>{o.label}</button>)}</div></>}
 </div>
}
function PayrollManagerModal({t,language,rows,initialStaffId,onClose,onSave}:{t:any;language:Language;rows:StaffRecord[];initialStaffId:string;onClose:()=>void;onSave:(staffId:string,entry:any)=>void}){
 const activeRows=rows.filter(s=>String(s.status||'active').toLowerCase()==='active')
 const [staffId,setStaffId]=useState(initialStaffId||activeRows[0]?.id||rows[0]?.id||'')
 const [period,setPeriod]=useState('Monthly')
 const initialDates=periodDates('Monthly')
 const [start,setStart]=useState(initialDates.start),[end,setEnd]=useState(initialDates.end)
 const [paidAmount,setPaidAmount]=useState(''),[method,setMethod]=useState('Cash'),[notes,setNotes]=useState('')
 const staff=rows.find(s=>String(s.id)===String(staffId))||activeRows[0]||rows[0]
 const baseSalary=n(staff?.salary),currency=staff?.currency||'AFN'
 const days=daysInclusive(start,end)
 const suggested=period==='Monthly'?baseSalary:baseSalary*(days/30)
 const prior=(staff?.payrollHistory||[]).filter(p=>p.start===start&&p.end===end&&String(p.currency||currency)===String(currency)).reduce((a,p)=>a+n(p.paidAmount),0)
 const entitlement=Math.max(0,suggested)
 const remaining=Math.max(0,entitlement-prior)
 useEffect(()=>{const d=periodDates(period);setStart(d.start);setEnd(d.end)},[period])
 useEffect(()=>{setPaidAmount(remaining>0?remaining.toFixed(2):'0.00')},[staffId,period,start,end,remaining])
 useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[])
 const saveIt=()=>{const amount=Math.max(0,Math.min(remaining,n(paidAmount)));if(!staff||amount<=0)return;onSave(staff.id,{period,start,end,salary:baseSalary,paidAmount:amount,currency,method,notes,payable:Math.max(0,remaining-amount)})}
 return <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[1px]" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <div dir={language==='English'?'ltr':'rtl'} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-[#30456f] dark:bg-[#111a2c] dark:text-white">
   <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{t.pay} — {staff?.name||''}</h2><button type="button" onClick={onClose}><X size={18}/></button></div>
   <label className="mt-5 block text-sm font-semibold">{t.staffMembers}</label>
   <SmoothSelect value={staffId} onChange={setStaffId} options={rows.map(s=>({value:s.id,label:`${s.name} — ${s.role||'-'} (${n(s.salary)} ${s.currency||'AFN'})`}))}/>
   <label className="mt-4 block text-sm font-semibold">{t.period}</label>
   <SmoothSelect value={period} onChange={setPeriod} options={[{value:'Daily',label:t.daily},{value:'Weekly',label:t.weekly},{value:'Monthly',label:t.monthly}]}/>
   <div className="mt-4 grid grid-cols-2 gap-3"><Field l={t.start}><input type="date" className="form-control" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field l={t.end}><input type="date" className="form-control" value={end} onChange={e=>setEnd(e.target.value)}/></Field></div>
   <div className="mt-4 grid grid-cols-2 gap-3"><Field l={t.baseSalary}><input type="number" className="form-control" value={baseSalary} readOnly/></Field><Field l={t.currency}><input className="form-control" value={`؋ ${currency}`} readOnly/></Field></div>
   <label className="mt-4 block text-sm font-semibold">{t.paidAmount} <span className="ms-1 text-xs font-normal text-slate-500">({t.suggested}: {money(suggested,currency)} • {days} {t.days})</span></label>
   <input type="number" min="0" max={remaining} step="0.01" className="form-control mt-1" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/>
   <div className="mt-2 text-xs text-slate-500">{t.alreadyPaid}: <b>{money(prior,currency)}</b> · {t.remainingPeriod}: <b className="text-amber-500">{money(remaining,currency)}</b></div>
   <label className="mt-4 block text-sm font-semibold">{t.paymentMethod}</label>
   <SmoothSelect value={method} onChange={setMethod} options={[{value:'Cash',label:t.cash},{value:'Debit/Credit Card',label:t.card},{value:'Bank Transfer',label:t.bank},{value:'Online Payment',label:t.online}]}/>
   <label className="mt-4 block text-sm font-semibold">{t.notes}</label>
   <textarea className="form-control mt-1 min-h-20" value={notes} onChange={e=>setNotes(e.target.value)}/>
   <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="app-btn-secondary">{t.cancel}</button><button type="button" disabled={!staff||remaining<=0||n(paidAmount)<=0} onClick={saveIt} className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-50">{t.saveChanges}</button></div>
  </div>
 </div>
}

function StaffModal({t,initial,onClose,onSave}:{t:any;initial:StaffRecord|null;onClose:()=>void;onSave:(s:StaffRecord)=>void}){const blank:StaffRecord={id:'',name:'',phone:'',email:'',role:'',department:'',employmentType:'Full-time',joiningDate:new Date().toISOString().slice(0,10),salaryType:'fixed',salary:0,currency:'AFN',status:'Active',notes:'',payrollHistory:[],createdAt:'',updatedAt:''};const [f,setF]=useState<StaffRecord>(initial?{...blank,...initial}:blank);const submit=(e:FormEvent)=>{e.preventDefault();if(!f.name.trim()||!f.role.trim())return;onSave(f)};useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow=''}},[]);return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><form onSubmit={submit} className="modal-card max-w-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold">{initial?t.edit:t.formTitle}</h2><button type="button" onClick={onClose}><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2"><Field l={t.name}><input className="form-control" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field l={t.role}><input className="form-control" value={f.role} onChange={e=>setF({...f,role:e.target.value})}/></Field><Field l={t.phone}><input className="form-control" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field><Field l={t.email}><input className="form-control" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field><Field l={t.dept}><input className="form-control" value={f.department} onChange={e=>setF({...f,department:e.target.value})}/></Field><Field l={t.employment}><select className="form-control" value={f.employmentType} onChange={e=>setF({...f,employmentType:e.target.value})}><option>Full-time</option><option>Part-time</option><option>Contract</option></select></Field><Field l={t.joinDate}><input type="date" className="form-control" value={f.joiningDate} onChange={e=>setF({...f,joiningDate:e.target.value})}/></Field><Field l={t.baseSalary}><input type="number" className="form-control" value={f.salary} onChange={e=>setF({...f,salary:n(e.target.value)})}/></Field><Field l={t.currency}><select className="form-control" value={f.currency} onChange={e=>setF({...f,currency:e.target.value})}><option>AFN</option><option>USD</option><option>EUR</option></select></Field><Field l={t.status}><select className="form-control" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Active</option><option>Inactive</option></select></Field></div><Field l={t.notes}><textarea className="form-control mt-3 min-h-24" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></Field><div className="mt-5 flex gap-2"><button className="app-btn-primary flex-1">{t.save}</button><button type="button" onClick={onClose} className="app-btn-secondary">{t.cancel}</button></div></form></div>}
function Field({l,children}:{l:string;children:React.ReactNode}){return <label className="block text-sm font-semibold"><span className="mb-1 block">{l}</span>{children}</label>}
