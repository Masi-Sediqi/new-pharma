import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Check, ChevronDown, CreditCard, DollarSign, Eye, History, Pencil, Plus, Printer, RefreshCcw, Search, ShoppingCart, Trash2 } from 'lucide-react'
import type { Language } from '../i18n'

type AnyRow = Record<string, any>
type Props = { language: Language; globalSearch?: string; onEditInvoice?: (invoiceId:string)=>void }

const n=(v:unknown)=>Number.parseFloat(String(v??0))||0
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100
function load<T>(key:string,fallback:T):T{try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback}catch{return fallback}}
function save(key:string,v:unknown){localStorage.setItem(key,JSON.stringify(v));window.dispatchEvent(new CustomEvent('pharma:data-changed'))}
const symbol=(c='AFN')=>({AFN:'؋',USD:'$',EUR:'€',GBP:'£',SAR:'﷼',PKR:'Rs',INR:'₹',IRR:'﷼',AED:'د.إ',CNY:'¥'} as Record<string,string>)[c]||c
const money=(v:number,c='AFN')=>`${n(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${symbol(c)}`
const addMoney=(totals:Record<string,number>,currency:any,amount:number)=>{const code=String(currency||'AFN').toUpperCase();totals[code]=(totals[code]||0)+n(amount);return totals}
const multiMoney=(totals:Record<string,number>)=>{
 const entries=Object.entries(totals).filter(([,amount])=>Math.abs(n(amount))>0.000001)
 if(!entries.length)return money(0)
 const order=['AFN','USD','EUR','GBP','SAR','PKR','INR','IRR','AED','CNY']
 entries.sort(([a],[b])=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b)})
 return entries.map(([currency,amount])=>money(amount,currency)).join('\n')
}
const iso=(v:any)=>String(v?.date||v?.gregorianDate||v?.createdAt||'').slice(0,10)
const rowTime=(row:AnyRow)=>{const raw=[row.createdAt,row.updatedAt,row.date,row.paidAt].map(v=>v?new Date(String(v)).getTime():Number.NaN).filter(Number.isFinite) as number[];const id=String(row.id||'').match(/(\d{10,})/);return Math.max(0,...raw,id?Number(id[1]):0)}
const newestFirst=<T extends AnyRow>(rows:T[])=>[...rows].sort((a,b)=>rowTime(b)-rowTime(a))
const invoiceNo=(s:AnyRow)=>s.invoiceNumber||s.invoiceNo||'-'
const items=(s:AnyRow)=>Array.isArray(s.items)?s.items:[]
const itemQty=(i:AnyRow)=>n(i.quantity??i.qty??1)
const itemTotal=(i:AnyRow)=>n(i.lineTotal??i.total) || itemQty(i)*n(i.price??i.selling)-n(i.discount)
const saleTotal=(s:AnyRow)=>n(s.total)||items(s).reduce((a,i)=>a+itemTotal(i),0)
const salePaid=(s:AnyRow)=>n(s.paidAmount??s.paid)
const saleBalance=(s:AnyRow)=>n(s.balance??s.remaining??Math.max(0,saleTotal(s)-salePaid(s)))
const saleDiscount=(s:AnyRow)=>n(s.discountTotal)||n(s.itemDiscountTotal)+n(s.discount)
const saleProfit=(s:AnyRow,products:AnyRow[])=> round(items(s).reduce((sum,i)=>{const p=products.find(x=>String(x.id)===String(i.productId)); const cost=n(i.purchase??i.purchasePrice??i.cost??p?.purchase??p?.purchasePrice); return sum+itemTotal(i)-itemQty(i)*cost},0)-n(s.discount))
const fmtDate=(d:string)=>{if(!d)return'-';try{return new Date(`${d}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}catch{return d}}
const shamsi=(d:string)=>{if(!d)return'-';try{return new Intl.DateTimeFormat('en-CA-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(`${d}T12:00:00`))}catch{return d}}

const text={
 English:{title:'Sales Management',sub:'Track and manage all sales transactions',print:'Print Report',total:'Total Sales',paid:'Total Paid',pending:'Total Pending',discount:'Total Discounts',refunds:'Total Refunds',search:'Search customer / phone / product / barcode / amount / date / invoice...',all:'All statuses',allTime:'All time',today:'Today',week:'Weekly',month:'Monthly',year:'Yearly',custom:'Custom',paidStatus:'Paid',loan:'Pending',partial:'Partial',refunded:'Refunded',sales:'Sales',invoice:'Invoice',customer:'Customer',items:'Items',totalCol:'Total',paidCol:'Paid',status:'Status',date:'Date',actions:'Actions',none:'No sales invoice has been recorded yet.',view:'View Details',printInv:'Print Invoice',receipt:'Print Receipt',edit:'Edit Invoice',history:'Payment History',addPayment:'Add Payment',markPaid:'Mark as Paid',refund:'Refund',undoRefund:'Undo Refund',undoTitle:'Undo Refund',undoMsg:'Reverse this refund? Stock will be re-deducted and the sale restored.',delete:'Delete',close:'Close',subtotal:'Subtotal',balance:'Remaining',add:'Add Payment',amount:'Amount',note:'Note',wallet:'Add to Cash Wallet',save:'Save',cancel:'Cancel',refundReason:'Reason for Refund',refundMode:'Refund mode',byQty:'By quantity',byPercent:'By percent',byAmount:'By amount',confirmRefund:'Confirm Refund',deleteTitle:'Delete Invoice',deleteMsg:'Move this invoice to Recycle Bin? Stock and financial effects will be reversed.',confirm:'Confirm',paymentEntries:'Payment entries',noHistory:'No payment history yet.'},
 دری:{title:'مدیریت فروش',sub:'پیگیری و مدیریت تمام تراکنش‌های فروش',print:'چاپ گزارش',total:'مجموع فروش',paid:'مجموع پرداخت شده',pending:'مجموع معلق',discount:'مجموع تخفیفات',refunds:'مجموع برگشتی‌ها',search:'جستجو با فاکتور یا مشتری، تلفون، محصول، بارکد، مبلغ، تاریخ...',all:'همه وضعیت‌ها',allTime:'همه وقت',today:'امروز',week:'هفتگی',month:'ماهانه',year:'سالانه',custom:'سفارشی',paidStatus:'پرداخت شده',loan:'معلق',partial:'قسمتی',refunded:'بازپرداخت شده',sales:'فروش',invoice:'فاکتور',customer:'مشتری',items:'اقلام',totalCol:'مجموع',paidCol:'پرداخت شده',status:'وضعیت',date:'تاریخ',actions:'عملیات',none:'هنوز هیچ فروش ثبت نشده است.',view:'مشاهده جزئیات',printInv:'چاپ فاکتور',receipt:'چاپ رسید',edit:'ویرایش فاکتور',history:'تاریخچه پرداخت',addPayment:'افزودن پرداخت',markPaid:'پرداخت کامل',refund:'بازپرداخت',undoRefund:'لغو بازپرداخت',undoTitle:'لغو بازپرداخت',undoMsg:'این بازپرداخت لغو شود؟ موجودی دوباره کسر و فروش بازگردانده می‌شود.',delete:'حذف',close:'بستن',subtotal:'جمع فرعی',balance:'باقی‌مانده',add:'افزودن پرداخت',amount:'مبلغ',note:'یادداشت',wallet:'اضافه به کیف پول نقدی',save:'ذخیره',cancel:'لغو',refundReason:'دلیل بازپرداخت',refundMode:'روش بازپرداخت',byQty:'بر اساس مقدار',byPercent:'بر اساس فیصدی',byAmount:'بر اساس مبلغ',confirmRefund:'تأیید بازپرداخت',deleteTitle:'حذف فاکتور',deleteMsg:'این فاکتور به سطل بازیافت انتقال شود؟ اثر موجودی و مالی آن برگردانده می‌شود.',confirm:'تأیید',paymentEntries:'ورودی‌های پرداخت',noHistory:'هنوز سابقه پرداخت ثبت نشده است.'},
 پښتو:{title:'د پلور مدیریت',sub:'د پلور ټولې معاملې تعقیب او اداره کړئ',print:'راپور چاپ',total:'ټول پلور',paid:'ټول ورکړل شوي',pending:'ټول پاتې',discount:'ټول تخفیفونه',refunds:'ټولې بېرته ورکړې',search:'د بل، پېرودونکي، تلیفون، توکي، بارکوډ، مبلغ یا نېټې لټون...',all:'ټول حالتونه',allTime:'ټول وخت',today:'نن',week:'اوونیز',month:'میاشتنی',year:'کلنی',custom:'ځانګړی',paidStatus:'ورکړل شوی',loan:'پاتې',partial:'جزوي',refunded:'بېرته ورکړل شوی',sales:'پلور',invoice:'بل',customer:'پېرودونکی',items:'توکي',totalCol:'ټول',paidCol:'ورکړل شوي',status:'حالت',date:'نېټه',actions:'عملیات',none:'تر اوسه پلور نه دی ثبت شوی.',view:'جزئیات',printInv:'بل چاپ',receipt:'رسید چاپ',edit:'بل سمول',history:'د تادیې تاریخ',addPayment:'تادیه اضافه کړئ',markPaid:'بشپړ ورکړل شوی',refund:'بېرته ورکول',undoRefund:'بېرته ورکړه لغوه کړئ',undoTitle:'بېرته ورکړه لغوه کړئ',undoMsg:'دا بېرته ورکړه لغوه شي؟ ذخیره به بیا کمه او پلور به بېرته فعال شي.',delete:'ړنګول',close:'بندول',subtotal:'فرعي مجموعه',balance:'پاتې',add:'تادیه اضافه کړئ',amount:'مبلغ',note:'یادښت',wallet:'نغدي بټوې ته اضافه کړئ',save:'خوندي',cancel:'لغوه',refundReason:'د بېرته ورکولو دلیل',refundMode:'د بېرته ورکولو طریقه',byQty:'د مقدار له مخې',byPercent:'د سلنې له مخې',byAmount:'د مبلغ له مخې',confirmRefund:'بېرته ورکول تایید کړئ',deleteTitle:'بل ړنګول',deleteMsg:'دا بل ریسایکل بن ته ولېږدول شي؟ د موجودۍ او مالي اغېزې به بېرته وګرځول شي.',confirm:'تایید',paymentEntries:'د تادیې ثبتونه',noHistory:'د تادیې تاریخ نشته.'}
} as const


function FilterSelect({value,onChange,options,ariaLabel}:{value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];ariaLabel:string}){
 const [open,setOpen]=useState(false)
 const selected=options.find(o=>o.value===value)??options[0]
 return <div className="relative min-w-0">
  <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#172a57]/15 dark:border-[#30456f] dark:bg-[#0d1628] dark:text-slate-100 dark:hover:border-[#49608c] dark:focus:ring-amber-400/20">
   <span className="truncate">{selected?.label}</span><ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open?'rotate-180':''}`}/>
  </button>
  {open&&<><button type="button" aria-label="Close filter menu" className="fixed inset-0 z-40 cursor-default" onClick={()=>setOpen(false)}/><div className="absolute start-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#30456f] dark:bg-[#101a2d]">{options.map(o=>{const active=o.value===value;return <button type="button" key={o.value} onClick={()=>{onChange(o.value);setOpen(false)}} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${active?'bg-amber-500 font-semibold text-slate-950':'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10'}`}><span className="grid h-4 w-4 place-items-center">{active&&<Check size={15}/>}</span><span className="whitespace-nowrap">{o.label}</span></button>})}</div></>}
 </div>
}

function Stat({icon:Icon,label,value,tone}:{icon:any;label:string;value:string;tone:'blue'|'green'|'orange'|'red'}){const cls={blue:'border-l-sky-500 dark:border-l-cyan-400',green:'border-l-emerald-500',orange:'border-l-amber-500',red:'border-l-red-500'}[tone];return <div className={`app-panel flex min-h-[92px] items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#24365f] dark:bg-[#111a2c] ${cls} border-l-[3px]`}><div><div className="text-xs text-slate-500 dark:text-slate-300">{label}</div><div className="mt-1 whitespace-pre-line text-xl font-extrabold">{value}</div></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"><Icon size={19}/></div></div>}

export default function Sales({language,globalSearch='',onEditInvoice}:Props){
 const t=text[language]; const [version,setVersion]=useState(0); const [search,setSearch]=useState(globalSearch); const [status,setStatus]=useState('all'); const [period,setPeriod]=useState('all'); const [view,setView]=useState<AnyRow|null>(null); const [history,setHistory]=useState<AnyRow|null>(null); const [payment,setPayment]=useState<AnyRow|null>(null); const [refund,setRefund]=useState<AnyRow|null>(null); const [undoRefund,setUndoRefund]=useState<AnyRow|null>(null); const [del,setDel]=useState<AnyRow|null>(null); const [menu,setMenu]=useState<{id:string;top:number;left:number}|null>(null)
 useEffect(()=>setSearch(globalSearch),[globalSearch])
 useEffect(()=>{const f=()=>setVersion(v=>v+1);window.addEventListener('pharma:data-changed',f);return()=>window.removeEventListener('pharma:data-changed',f)},[])
 const sales=useMemo(()=>load<AnyRow[]>('billingInvoices',[]),[version]); const products=useMemo(()=>load<AnyRow[]>('products',[]),[version]);
 const visible=useMemo(()=>newestFirst(sales.filter(s=>{const q=search.trim().toLowerCase();const hay=[invoiceNo(s),s.customerName,s.customerPhone,s.paymentMethod,s.paymentStatus,...items(s).flatMap(i=>[i.name,i.code,i.barcode]),saleTotal(s),iso(s)].join(' ').toLowerCase();const bal=saleBalance(s),ref=n(s.refundTotal);const stat=status==='all'||(status==='paid'&&bal<=0&&ref<=0)||(status==='pending'&&bal>0)||(status==='refunded'&&ref>0);let date=true;const d=iso(s);if(period!=='all'&&d){const x=new Date(`${d}T12:00:00`),now=new Date();if(period==='today')date=d===now.toISOString().slice(0,10);if(period==='week'){const z=new Date();z.setDate(z.getDate()-7);date=x>=z}if(period==='month')date=x.getMonth()===now.getMonth()&&x.getFullYear()===now.getFullYear();if(period==='year')date=x.getFullYear()===now.getFullYear()}return(!q||hay.includes(q))&&stat&&date})),[sales,search,status,period])
 const stats=useMemo(()=>{
  const total:Record<string,number>={},paid:Record<string,number>={},pending:Record<string,number>={},discount:Record<string,number>={},refund:Record<string,number>={}
  sales.forEach((s:any)=>{const c=s.currency||'AFN';addMoney(total,c,saleTotal(s));addMoney(paid,c,salePaid(s));addMoney(pending,c,saleBalance(s));addMoney(discount,c,saleDiscount(s));addMoney(refund,c,n(s.refundTotal))})
  return {total:multiMoney(total),paid:multiMoney(paid),pending:multiMoney(pending),discount:multiMoney(discount),refund:multiMoney(refund)}
 },[sales])
 const update=(id:string,fn:(x:AnyRow)=>AnyRow)=>{save('billingInvoices',sales.map(s=>String(s.id)===String(id)?fn(s):s));setVersion(v=>v+1)}
 const addPayment=(sale:AnyRow,amount:number,note:string,toWallet:boolean)=>{amount=round(amount);if(amount<=0||amount>saleBalance(sale))return;const prev=salePaid(sale),next=round(prev+amount),balance=round(Math.max(0,saleTotal(sale)-next)),rec={id:`pay-${Date.now()}`,amount,note,cashWallet:toWallet,method:toWallet?'Cash Wallet':'Manual',currency:sale.currency||'AFN',date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()};update(sale.id,x=>({...x,paid:next,paidAmount:next,remaining:balance,balance,paymentStatus:balance<=0?'paid':'partial',paymentHistory:[...(x.paymentHistory||[]),rec],updatedAt:new Date().toISOString()}));if(toWallet){const tx=load<AnyRow[]>('transactions',[]);save('transactions',[{id:`payment-${sale.id}-${Date.now()}`,type:'income',transactionType:'deposit',title:`Payment ${invoiceNo(sale)}`,amount,currency:sale.currency||'AFN',date:new Date().toISOString().slice(0,10),source:'cash-wallet',referenceSource:'billing-payment',referenceId:sale.id,description:note||sale.customerName},...tx])}if(sale.customerId){const cs=load<AnyRow[]>('customers',[]);save('customers',cs.map(c=>String(c.id)===String(sale.customerId)?{...c,pending:Math.max(0,n(c.pending)-amount),updatedAt:new Date().toISOString()}:c))}setPayment(null)}
 const doRefund=(sale:AnyRow,request:{amount:number;note:string;mode:'quantity'|'percent'|'amount';percent?:number;items?:AnyRow[]})=>{
  const amount=round(n(request.amount))
  const note=String(request.note||'').trim()
  const refundedItems=Array.isArray(request.items)?request.items:[]
  if(amount<=0||amount>salePaid(sale)||!note)return

  const sourceItems=items(sale)
  if(refundedItems.length){
   const currentProducts=load<AnyRow[]>('products',[])
   const nextProducts=currentProducts.map(product=>{
    const returned=refundedItems.find((item:AnyRow)=>String(item.productId)===String(product.id))
    if(!returned)return product
    const original=sourceItems.find((item:AnyRow)=>String(item.productId)===String(product.id))
    const originalQty=Math.max(0,itemQty(original||{}))
    const originalStockQty=Math.max(0,n(original?.stockQty??originalQty))
    const refundQty=Math.max(0,n(returned.quantity))
    const stockToRestore=originalQty>0?originalStockQty*(refundQty/originalQty):n(returned.stockQty)
    return {...product,quantity:round(n(product.quantity)+stockToRestore),updatedAt:new Date().toISOString()}
   })
   save('products',nextProducts)
  }

  const refundId=`refund-${Date.now()}`
  const transactionId=`refund-tx-${sale.id}-${Date.now()}`
  const now=new Date().toISOString()
  const date=now.slice(0,10)
  const refundProfit=round(refundedItems.length
   ? refundedItems.reduce((sum:number,returned:AnyRow)=>{
    const original=sourceItems.find((item:AnyRow)=>String(item.productId)===String(returned.productId))
    const originalQty=Math.max(0,itemQty(original||{}))
    const unitCost=n(original?.purchase??original?.purchasePrice??original?.cost)
    const qty=Math.max(0,n(returned.quantity??returned.qty))
    const refundAmount=n(returned.amount)
    return sum+(refundAmount-qty*unitCost)
   },0)
   : (saleTotal(sale)>0 ? amount/saleTotal(sale)*saleProfit(sale,load<AnyRow[]>('products',[])) : 0))

  update(sale.id,x=>{
   const previousRefund=round(n(x.refundTotal))
   const nextRefund=round(previousRefund+amount)
   const nextPaid=round(Math.max(0,salePaid(x)-amount))
   const effectiveTotal=round(Math.max(0,saleTotal(x)-nextRefund))
   const balance=round(Math.max(0,effectiveTotal-nextPaid))
   return {
    ...x,
    paid:nextPaid,
    paidAmount:nextPaid,
    balance,
    remaining:balance,
    paymentStatus:balance<=0?'paid':nextPaid>0?'partial':'loan',
    refundTotal:nextRefund,
    refundHistory:[...(x.refundHistory||[]),{
     id:refundId,
     transactionId,
      amount,
      refundProfit,
      note,
     currency:x.currency||'AFN',
     mode:request.mode||'amount',
     percent:n(request.percent),
     items:refundedItems,
     date,
     createdAt:now
    }],
    updatedAt:now
   }
  })

  const tx=load<AnyRow[]>('transactions',[])
  save('transactions',[{
   id:transactionId,
   refundId,
   type:'expense',
   transactionType:'withdraw',
   title:`Refund ${invoiceNo(sale)}`,
   amount,
   currency:sale.currency||'AFN',
   source:'cash-wallet',
   referenceSource:'billing-refund',
   category:'Cash Wallet',
   referenceId:sale.id,
   date,
   createdAt:now,
   description:note
  },...tx])
  setRefund(null)
 }

 const undoLatestRefund=(sale:AnyRow)=>{
  const history=Array.isArray(sale.refundHistory)?sale.refundHistory:[]
  if(!history.length){setUndoRefund(null);return}
  const target=history[history.length-1]
  const amount=round(n(target.amount))
  const refundedItems=Array.isArray(target.items)?target.items:[]
  const sourceItems=items(sale)

  if(refundedItems.length){
   const currentProducts=load<AnyRow[]>('products',[])
   const nextProducts=currentProducts.map(product=>{
    const returned=refundedItems.find((item:AnyRow)=>String(item.productId)===String(product.id))
    if(!returned)return product
    const original=sourceItems.find((item:AnyRow)=>String(item.productId)===String(product.id))
    const originalQty=Math.max(0,itemQty(original||{}))
    const originalStockQty=Math.max(0,n(original?.stockQty??originalQty))
    const refundQty=Math.max(0,n(returned.quantity))
    const stockToRededuct=originalQty>0?originalStockQty*(refundQty/originalQty):n(returned.stockQty)
    return {...product,quantity:round(Math.max(0,n(product.quantity)-stockToRededuct)),updatedAt:new Date().toISOString()}
   })
   save('products',nextProducts)
  }

  update(sale.id,x=>{
   const nextHistory=(Array.isArray(x.refundHistory)?x.refundHistory:[]).filter((r:AnyRow)=>String(r.id)!==String(target.id))
   const nextRefund=round(Math.max(0,n(x.refundTotal)-amount))
   const nextPaid=round(salePaid(x)+amount)
   const effectiveTotal=round(Math.max(0,saleTotal(x)-nextRefund))
   const balance=round(Math.max(0,effectiveTotal-nextPaid))
   return {
    ...x,
    paid:nextPaid,
    paidAmount:nextPaid,
    balance,
    remaining:balance,
    paymentStatus:balance<=0?'paid':nextPaid>0?'partial':'loan',
    refundTotal:nextRefund,
    refundHistory:nextHistory,
    updatedAt:new Date().toISOString()
   }
  })

  let tx=load<AnyRow[]>('transactions',[])
  let removed=false
  tx=tx.filter((row:AnyRow)=>{
   if(removed)return true
   const exact=target.transactionId && String(row.id)===String(target.transactionId)
   const linked=String(row.referenceSource||'')==='billing-refund' &&
    String(row.referenceId||'')===String(sale.id) &&
    (!target.transactionId && Math.abs(n(row.amount)-amount)<0.0001)
   if(exact||linked){removed=true;return false}
   return true
  })
  save('transactions',tx)
  setUndoRefund(null)
 }
 const remove=(sale:AnyRow)=>{
  const deleted=load<AnyRow[]>('deletedItems',[])
  const tx=load<AnyRow[]>('transactions',[])
  const related=tx.filter(x=>String(x.referenceId)===String(sale.id))

  save('deletedItems',[{
   id:`recycle-${Date.now()}`,
   collection:'billingInvoices',
   type:'billingInvoices',
   label:invoiceNo(sale),
   data:sale,
   record:sale,
   relatedTransactions:related,
   deletedAt:new Date().toISOString()
  },...deleted])

  const refundedByProduct=(Array.isArray(sale.refundHistory)?sale.refundHistory:[]).reduce((totals:Record<string,number>,refund:AnyRow)=>{
   ;(Array.isArray(refund.items)?refund.items:[]).forEach((refunded:AnyRow)=>{
    const key=String(refunded.productId)
    totals[key]=(totals[key]||0)+Math.max(0,n(refunded.quantity))
   })
   return totals
  },{})

  const prods=load<AnyRow[]>('products',[]).map(p=>{
   const matchingItems=items(sale).filter(i=>String(i.productId)===String(p.id))
   if(!matchingItems.length)return p

   const restoreStock=matchingItems.reduce((sum:number,i:AnyRow)=>{
    const soldQty=Math.max(0,itemQty(i))

    // Billing stores the exact quantity deducted from product.quantity in stockQty.
    // Example: 1 Strip from a 10-strip box => stockQty = 0.1 Box.
    let soldStockQty=n(i.stockQty)

    // Backward-compatible fallback for older invoices that do not have stockQty.
    if(!(soldStockQty>0)){
     const stripsPerBox=Math.max(1,n(p.packHierarchy?.stripsPerBox)||10)
     const unitsPerStrip=Math.max(1,n(p.packHierarchy?.tabletsPerStrip)||n(p.packHierarchy?.unitsPerStrip)||4)
     const tier=String(i.saleTier||'box').toLowerCase()

     soldStockQty =
      tier==='strip' ? soldQty/stripsPerBox :
      (tier==='unit'||tier==='tablet') ? soldQty/(stripsPerBox*unitsPerStrip) :
      soldQty
    }

    // Refund already restores stock. When deleting the invoice, restore only
    // the part that has NOT already been refunded, otherwise stock is doubled.
    const refundedQty=Math.min(soldQty,Math.max(0,n(refundedByProduct[String(p.id)])))
    const refundedStockQty=soldQty>0 ? soldStockQty*(refundedQty/soldQty) : 0
    const netRestore=Math.max(0,soldStockQty-refundedStockQty)

    refundedByProduct[String(p.id)]=Math.max(0,n(refundedByProduct[String(p.id)])-refundedQty)
    return sum+netRestore
   },0)

   return restoreStock>0
    ? {...p,quantity:round(n(p.quantity)+restoreStock),updatedAt:new Date().toISOString()}
    : p
  })

  save('products',prods)
  save('transactions',tx.filter(x=>String(x.referenceId)!==String(sale.id)))
  save('billingInvoices',sales.filter(x=>String(x.id)!==String(sale.id)))

  if(sale.customerId){
   const cs=load<AnyRow[]>('customers',[])
   save('customers',cs.map(c=>String(c.id)===String(sale.customerId)
    ? {...c,purchases:Math.max(0,n(c.purchases)-saleTotal(sale)),pending:Math.max(0,n(c.pending)-saleBalance(sale))}
    : c))
  }

  setDel(null)
  setVersion(v=>v+1)
 }
 const printInvoice=(s:AnyRow)=>{const w=window.open('','_blank','width=900,height=900');if(!w)return;w.document.write(`<html><head><title>${invoiceNo(s)}</title><style>body{font-family:Arial;padding:35px;color:#172a57}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #ddd}</style></head><body><h1>Pharma Pro</h1><h3>${invoiceNo(s)}</h3><p>${s.customerName||''} • ${fmtDate(iso(s))}</p><table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>${items(s).map(i=>`<tr><td>${i.name||''}</td><td>${itemQty(i)} ${i.unit||''}</td><td>${money(n(i.price),s.currency)}</td><td>${money(itemTotal(i),s.currency)}</td></tr>`).join('')}</table><h2>${money(saleTotal(s),s.currency)}</h2></body></html>`);w.document.close();setTimeout(()=>w.print(),100)}
 return <div className="w-full pb-10">
  <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{t.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.sub}</p></div><button onClick={()=>window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-[#24365f] dark:bg-[#111a2c]"><Printer size={16}/>{t.print}</button></div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={ShoppingCart} label={t.total} value={stats.total} tone="blue"/><Stat icon={DollarSign} label={t.paid} value={stats.paid} tone="green"/><Stat icon={CreditCard} label={t.pending} value={stats.pending} tone="orange"/><Stat icon={RefreshCcw} label={t.discount} value={stats.discount} tone="red"/><Stat icon={RefreshCcw} label={t.refunds} value={stats.refund} tone="orange"/></div>
  <div className="app-panel mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c]">
   <div className="grid gap-3 sm:grid-cols-[145px_165px_minmax(0,1fr)]">
    <FilterSelect ariaLabel={t.allTime} value={period} onChange={setPeriod} options={[{value:'all',label:t.allTime},{value:'today',label:t.today},{value:'week',label:t.week},{value:'month',label:t.month},{value:'year',label:t.year}]}/>
    <FilterSelect ariaLabel={t.all} value={status} onChange={setStatus} options={[{value:'all',label:t.all},{value:'paid',label:t.paidStatus},{value:'pending',label:t.loan},{value:'refunded',label:t.refunded}]}/>
    <label className="relative min-w-0"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/><input className="form-control h-10 w-full pl-9 rtl:pl-3 rtl:pr-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/></label>
   </div>
  </div>
  <section className="app-panel mt-5 overflow-visible rounded-xl border border-slate-200 bg-white p-5 dark:border-[#24365f] dark:bg-[#111a2c]"><div className="mb-4 flex items-center justify-end gap-2 font-bold"><ShoppingCart size={18}/>{t.sales} ({visible.length})</div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#24365f] dark:text-slate-300"><th className="px-3 py-3 text-start">{t.invoice}</th><th className="px-3 py-3 text-start">{t.customer}</th><th className="px-3 py-3">{t.items}</th><th className="px-3 py-3">{t.totalCol}</th><th className="px-3 py-3">{t.paidCol}</th><th className="px-3 py-3">{t.status}</th><th className="px-3 py-3">{t.date}</th><th className="px-3 py-3">{t.actions}</th></tr></thead><tbody>{visible.map(s=><tr key={s.id||invoiceNo(s)} className="border-b border-slate-100 last:border-0 dark:border-[#24365f]"><td className="px-3 py-4 font-mono font-bold">{invoiceNo(s)}</td><td className="px-3 py-4">{s.customerName||'-'}</td><td className="px-3 py-4 text-center">{items(s).length}</td><td className="px-3 py-4 text-center font-semibold">{money(saleTotal(s),s.currency)}</td><td className="px-3 py-4 text-center">{money(salePaid(s),s.currency)}</td><td className="px-3 py-4 text-center"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${n(s.refundTotal)>0?'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300':saleBalance(s)<=0?'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300':'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>{n(s.refundTotal)>0?t.refunded:saleBalance(s)<=0?t.paidStatus:t.loan}</span></td><td className="px-3 py-4 text-center"><div>{fmtDate(iso(s))}</div><div className="text-xs text-slate-400">{shamsi(iso(s))}</div></td><td className="px-3 py-4 text-center"><button type="button" onClick={(e)=>{const id=String(s.id);if(menu?.id===id){setMenu(null);return}const r=e.currentTarget.getBoundingClientRect();const menuWidth=210;const estimatedHeight=saleBalance(s)>0?330:250;const left=Math.max(8,Math.min(r.left,window.innerWidth-menuWidth-8));const top=r.bottom+8+estimatedHeight<=window.innerHeight? r.bottom+8 : Math.max(8,r.top-estimatedHeight-8);setMenu({id,top,left})}} className="inline-flex h-8 min-w-9 items-center justify-center rounded-lg px-2 text-lg font-bold leading-none transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:hover:bg-white/10" aria-label={t.actions}>•••</button>{menu?.id===String(s.id)&&createPortal(<><button type="button" aria-label={t.close} className="fixed inset-0 z-[80] cursor-default bg-transparent" onClick={()=>setMenu(null)}/><div dir={language==='English'?'ltr':'rtl'} className="fixed z-[90] w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-start shadow-2xl dark:border-[#30456f] dark:bg-[#0d1628]" style={{top:menu.top,left:menu.left}}><Action icon={<Eye size={15}/>} label={t.view} onClick={()=>{setView(s);setMenu(null)}}/><Action icon={<Printer size={15}/>} label={t.printInv} onClick={()=>{printInvoice(s);setMenu(null)}}/><Action icon={<Pencil size={15}/>} label={t.edit} onClick={()=>{onEditInvoice?.(String(s.id));setMenu(null)}}/><Action icon={<History size={15}/>} label={t.history} onClick={()=>{setHistory(s);setMenu(null)}}/>{saleBalance(s)>0&&<><Action icon={<Plus size={15}/>} label={t.addPayment} onClick={()=>{setPayment(s);setMenu(null)}}/><Action icon={<DollarSign size={15}/>} label={t.markPaid} onClick={()=>{addPayment(s,saleBalance(s),'Marked as paid',true);setMenu(null)}}/></>}<div className="my-1 border-t border-slate-100 dark:border-[#24365f]"/><Action icon={<RefreshCcw size={15}/>} label={t.refund} onClick={()=>{setRefund(s);setMenu(null)}}/>{n(s.refundTotal)>0&&<Action icon={<RefreshCcw size={15}/>} label={t.undoRefund} onClick={()=>{setUndoRefund(s);setMenu(null)}}/>}<Action danger icon={<Trash2 size={15}/>} label={t.delete} onClick={()=>{setDel(s);setMenu(null)}}/></div></>,document.body)}</td></tr>)}</tbody></table></div>{!visible.length&&<div className="grid min-h-[150px] place-items-center text-sm text-slate-400">{t.none}</div>}</section>
  {view&&<Details sale={view} products={products} t={t} onClose={()=>setView(null)} onPrint={()=>printInvoice(view)}/>} {history&&<HistoryModal sale={history} t={t} onClose={()=>setHistory(null)} onAdd={()=>{setPayment(history);setHistory(null)}}/>} {payment&&<PaymentModal sale={payment} t={t} onClose={()=>setPayment(null)} onSave={(a,note,w)=>addPayment(payment,a,note,w)}/>} {refund&&<RefundModal sale={refund} t={t} onClose={()=>setRefund(null)} onSave={(request)=>doRefund(refund,request)}/>} {undoRefund&&<UndoRefundConfirm sale={undoRefund} t={t} onClose={()=>setUndoRefund(null)} onConfirm={()=>undoLatestRefund(undoRefund)}/>} {del&&<Confirm t={t} onClose={()=>setDel(null)} onConfirm={()=>remove(del)}/>} 
 </div>
}
function Action({icon,label,onClick,danger=false}:{icon:any;label:string;onClick:()=>void;danger?:boolean}){return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-slate-50 dark:hover:bg-white/5 ${danger?'text-red-500 dark:text-red-400':'text-slate-800 dark:text-slate-100'}`}><span className={`shrink-0 ${danger?'text-red-500 dark:text-red-400':'text-slate-600 dark:text-slate-200'}`}>{icon}</span><span className="min-w-0 flex-1 whitespace-nowrap">{label}</span></button>}
function Backdrop({children}:{children:ReactNode}){useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[]);return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[1px]">{children}</div>}
function ModalBox({children}:{children:ReactNode}){return <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-[#30456f] dark:bg-[#111a2c] dark:text-white">{children}</div>}
function Details({sale,products,t,onClose,onPrint}:{sale:AnyRow;products:AnyRow[];t:any;onClose:()=>void;onPrint:()=>void}){return <Backdrop><ModalBox><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{t.invoice} #{invoiceNo(sale)}</h2><div className="mt-1 text-sm text-slate-500">{sale.customerName} • {fmtDate(iso(sale))}</div></div><button onClick={onClose}>×</button></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b dark:border-[#30456f]"><th className="py-2 text-start">{t.items}</th><th>Qty</th><th>Price</th><th>{t.totalCol}</th></tr></thead><tbody>{items(sale).map((i:AnyRow,k:number)=><tr key={k} className="border-b last:border-0 dark:border-[#30456f]"><td className="py-3"><b>{i.name}</b><div className="text-xs text-slate-400">{i.code}</div></td><td className="text-center">{itemQty(i)} {i.unit}</td><td className="text-center">{money(n(i.price),sale.currency)}</td><td className="text-center">{money(itemTotal(i),sale.currency)}</td></tr>)}</tbody></table></div><div className="mt-5 space-y-2 border-t pt-4 dark:border-[#30456f]"><div className="flex justify-between"><span>{t.totalCol}</span><b>{money(saleTotal(sale),sale.currency)}</b></div><div className="flex justify-between"><span>{t.paidCol}</span><b className="text-emerald-500">{money(salePaid(sale),sale.currency)}</b></div><div className="flex justify-between"><span>{t.balance}</span><b>{money(saleBalance(sale),sale.currency)}</b></div><div className="flex justify-between"><span>Net Profit</span><b>{money(saleProfit(sale,products),sale.currency)}</b></div></div><button onClick={onPrint} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border dark:border-[#30456f]"><Printer size={15}/>{t.printInv}</button></ModalBox></Backdrop>}
function PaymentModal({sale,t,onClose,onSave}:{sale:AnyRow;t:any;onClose:()=>void;onSave:(a:number,n:string,w:boolean)=>void}){const [a,setA]=useState('');const[note,setNote]=useState('');const[w,setW]=useState(true);return <Backdrop><ModalBox><div className="flex justify-between"><h2 className="text-lg font-bold">{t.addPayment} — {invoiceNo(sale)}</h2><button onClick={onClose}>×</button></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-white/5"><div><small>{t.totalCol}</small><b className="block">{money(saleTotal(sale),sale.currency)}</b></div><div><small>{t.paidCol}</small><b className="block text-emerald-500">{money(salePaid(sale),sale.currency)}</b></div><div><small>{t.balance}</small><b className="block">{money(saleBalance(sale),sale.currency)}</b></div></div><label className="mt-4 block text-sm font-semibold">{t.amount}</label><input className="form-control mt-1" type="number" max={saleBalance(sale)} value={a} onChange={e=>setA(e.target.value)}/><label className="mt-4 block text-sm font-semibold">{t.note}</label><textarea className="form-control mt-1 min-h-[90px]" value={note} onChange={e=>setNote(e.target.value)}/><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={w} onChange={e=>setW(e.target.checked)}/>{t.wallet}</label><div className="mt-5 flex gap-2"><button className="h-10 rounded-lg bg-[#172a57] px-5 font-bold text-white dark:bg-amber-500 dark:text-slate-950" onClick={()=>onSave(n(a),note,w)}>{t.save}</button><button className="h-10 rounded-lg border px-5 dark:border-[#30456f]" onClick={onClose}>{t.cancel}</button></div></ModalBox></Backdrop>}
function HistoryModal({sale,t,onClose,onAdd}:{sale:AnyRow;t:any;onClose:()=>void;onAdd:()=>void}){const h=Array.isArray(sale.paymentHistory)?sale.paymentHistory:[];return <Backdrop><ModalBox><div className="flex justify-between"><h2 className="text-lg font-bold">{t.history} — {invoiceNo(sale)}</h2><button onClick={onClose}>×</button></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-white/5"><div>{t.totalCol}<b className="block">{money(saleTotal(sale),sale.currency)}</b></div><div>{t.paidCol}<b className="block text-emerald-500">{money(salePaid(sale),sale.currency)}</b></div><div>{t.balance}<b className="block">{money(saleBalance(sale),sale.currency)}</b></div></div><div className="mt-4 flex justify-between"><span className="text-sm text-slate-500">{h.length} {t.paymentEntries}</span>{saleBalance(sale)>0&&<button onClick={onAdd} className="rounded-lg bg-[#172a57] px-3 py-2 text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950">+ {t.addPayment}</button>}</div><div className="mt-4 space-y-2">{h.map((p:AnyRow)=><div key={p.id} className="rounded-xl border p-3 dark:border-[#30456f]"><div className="flex justify-between"><b>{money(n(p.amount),p.currency||sale.currency)}</b><span className="text-xs text-slate-400">{p.date}</span></div><div className="mt-1 text-sm text-slate-500">{p.note||p.method||''}</div></div>)}{!h.length&&<div className="py-12 text-center text-slate-400">{t.noHistory}</div>}</div></ModalBox></Backdrop>}
function RefundModal({sale,t,onClose,onSave}:{sale:AnyRow;t:any;onClose:()=>void;onSave:(request:{amount:number;note:string;mode:'quantity'|'percent'|'amount';percent?:number;items?:AnyRow[]})=>void}){
 const [mode,setMode]=useState<'quantity'|'percent'|'amount'>('quantity')
 const [amount,setAmount]=useState('')
 const [percent,setPercent]=useState('')
 const [note,setNote]=useState('')
 const [quantities,setQuantities]=useState<Record<string,number>>({})
 const previouslyRefunded=(Array.isArray(sale.refundHistory)?sale.refundHistory:[]).reduce((totals:Record<string,number>,refund:AnyRow)=>{(Array.isArray(refund.items)?refund.items:[]).forEach((item:AnyRow)=>{const key=String(item.productId);totals[key]=(totals[key]||0)+n(item.quantity)});return totals},{})
 const refundable=salePaid(sale)
 const lines=items(sale).map((item:AnyRow)=>{const key=String(item.productId);const originalQty=itemQty(item);const available=Math.max(0,originalQty-n(previouslyRefunded[key]));const refundQuantity=Math.min(available,Math.max(0,n(quantities[key])));const unitAmount=originalQty>0?itemTotal(item)/originalQty:n(item.price);return {...item,originalQty,available,refundQuantity,unitAmount,refundAmount:round(refundQuantity*unitAmount)}})
 const quantityAmount=round(lines.reduce((sum:number,item:AnyRow)=>sum+n(item.refundAmount),0))
 const refundValue=mode==='quantity'?quantityAmount:mode==='percent'?round(refundable*Math.min(100,Math.max(0,n(percent)))/100):round(n(amount))
 const remainingStockValue=lines.reduce((sum:number,item:AnyRow)=>sum+n(item.available)*n(item.unitAmount),0)
 const proportionalRatio=mode==='percent'?Math.min(1,Math.max(0,n(percent))/100):mode==='amount'&&remainingStockValue>0?Math.min(1,Math.max(0,refundValue)/remainingStockValue):0
 const calculatedLines=lines.map((line:AnyRow)=>{if(mode==='quantity')return line;const calculatedQuantity=Math.min(line.available,line.available*proportionalRatio);return {...line,refundQuantity:Number(calculatedQuantity.toFixed(4)),refundAmount:round(calculatedQuantity*line.unitAmount)}})
 const canSave=refundValue>0&&refundValue<=refundable&&note.trim().length>0&&(mode!=='quantity'||calculatedLines.some((line:AnyRow)=>n(line.refundQuantity)>0))
 const updateQuantity=(line:AnyRow,value:number)=>setQuantities(current=>({...current,[String(line.productId)]:Math.min(line.available,Math.max(0,n(value)))}))
 return <Backdrop><div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-[#30456f] dark:bg-[#111a2c] dark:text-white">
  <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-bold"><RefreshCcw size={18}/>{t.refund} — {invoiceNo(sale)}</h2><div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{sale.customerName||'-'}</div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">×</button></div>
  <div className="mt-3 flex items-center justify-between border-y border-slate-200 py-3 text-sm dark:border-[#30456f]"><span className="text-slate-500 dark:text-slate-300">Refundable</span><b>{money(refundable,sale.currency)}</b></div>
  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#30456f] dark:bg-white/5"><div className="flex flex-wrap items-center gap-2"><span className="me-1 text-sm text-slate-500 dark:text-slate-300">{t.refundMode}:</span>{([{id:'quantity',label:t.byQty},{id:'percent',label:t.byPercent},{id:'amount',label:t.byAmount}] as const).map(option=><button type="button" key={option.id} onClick={()=>setMode(option.id)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${mode===option.id?'border-[#172a57] bg-[#172a57] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950':'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#30456f] dark:bg-[#0c1424] dark:text-slate-100 dark:hover:bg-white/10'}`}>{option.label}</button>)}</div>{mode==='percent'&&<div className="mt-3 flex items-center gap-2"><input className="form-control h-10 max-w-28" type="number" min="0" max="100" value={percent} onChange={e=>setPercent(e.target.value)}/><span className="text-sm text-slate-500 dark:text-slate-300">% of remaining refundable</span></div>}{mode==='amount'&&<div className="mt-3 flex items-center gap-2"><input className="form-control h-10 max-w-36" type="number" min="0" max={refundable} value={amount} onChange={e=>setAmount(e.target.value)}/><span className="text-sm text-slate-500 dark:text-slate-300">{sale.currency||'AFN'} · refund amount</span></div>}</div>
  <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-[#30456f] dark:text-slate-300"><th className="px-2 py-3 text-start">Name</th><th className="px-2 py-3 text-center">Original Qty</th><th className="px-2 py-3 text-center">Refunded</th><th className="px-2 py-3 text-center">Refund Qty</th><th className="px-2 py-3 text-end">Refund Amount</th></tr></thead><tbody>{calculatedLines.map((line:AnyRow)=><tr key={String(line.productId)} className="border-b border-slate-100 dark:border-[#24365f]"><td className="px-2 py-3"><b>{line.name}</b><div className="text-xs text-slate-400">{line.code||''}</div></td><td className="px-2 py-3 text-center">{line.originalQty} {line.unit||''}</td><td className="px-2 py-3 text-center">{n(previouslyRefunded[String(line.productId)])||'—'}</td><td className="px-2 py-3"><div className="mx-auto flex w-fit items-center gap-1"><button type="button" disabled={mode!=='quantity'||line.refundQuantity<=0} onClick={()=>updateQuantity(line,line.refundQuantity-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-[#30456f]">−</button><input className="h-8 w-16 rounded-lg border border-slate-200 bg-transparent text-center disabled:opacity-60 dark:border-[#30456f]" type="number" min="0" max={line.available} disabled={mode!=='quantity'} value={line.refundQuantity} onChange={e=>updateQuantity(line,n(e.target.value))}/><button type="button" disabled={mode!=='quantity'||line.refundQuantity>=line.available} onClick={()=>updateQuantity(line,line.refundQuantity+1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-[#30456f]">+</button></div></td><td className="px-2 py-3 text-end font-semibold">{line.refundAmount>0?money(line.refundAmount,sale.currency):'—'}</td></tr>)}</tbody></table></div>
  <label className="mt-4 block text-sm font-semibold">{t.refundReason} *</label><textarea className="form-control mt-1 min-h-[90px]" value={note} onChange={e=>setNote(e.target.value)} placeholder="Enter the reason for this refund..."/>
  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5"><span className="text-sm text-slate-500 dark:text-slate-300">Refund total</span><b className="text-lg">{money(refundValue,sale.currency)}</b></div>
  <div className="mt-5 flex flex-wrap items-center justify-end gap-2"><button type="button" className="h-10 rounded-lg border border-slate-200 bg-white px-5 font-semibold text-slate-800 dark:border-[#30456f] dark:bg-[#0c1424] dark:text-slate-100" onClick={onClose}>{t.cancel}</button><button type="button" aria-disabled={!canSave} className={`inline-flex h-10 min-w-[155px] items-center justify-center gap-2 rounded-lg px-5 font-bold text-white shadow-sm transition ${canSave?'bg-red-500 hover:bg-red-600 active:bg-red-700':'cursor-not-allowed bg-red-300 opacity-70'}`} onClick={()=>{if(!canSave)return;onSave({amount:refundValue,note,mode,percent:n(percent),items:calculatedLines.filter((line:AnyRow)=>n(line.refundQuantity)>0).map((line:AnyRow)=>({productId:line.productId,name:line.name,quantity:n(line.refundQuantity),amount:n(line.refundAmount)}))})}}><RefreshCcw size={15}/>{t.confirmRefund||'Confirm Refund'}</button></div>
 </div></Backdrop>
}
function UndoRefundConfirm({sale,t,onClose,onConfirm}:{sale:AnyRow;t:any;onClose:()=>void;onConfirm:()=>void}){
 return <Backdrop><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-[#30456f] dark:bg-[#111a2c] dark:text-white">
  <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold">{t.undoTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{t.undoMsg} — {invoiceNo(sale)}</p></div><button type="button" onClick={onClose}>×</button></div>
  <div className="mt-5 flex justify-end gap-2"><button type="button" className="h-10 rounded-lg border border-slate-200 px-5 font-semibold dark:border-[#30456f]" onClick={onClose}>{t.cancel}</button><button type="button" className="h-10 rounded-lg bg-[#172a57] px-5 font-bold text-white dark:bg-amber-500 dark:text-slate-950" onClick={onConfirm}>{t.confirm}</button></div>
 </div></Backdrop>
}

function Confirm({t,onClose,onConfirm}:{t:any;onClose:()=>void;onConfirm:()=>void}){return <Backdrop><div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-[#111a2c] dark:text-white"><h2 className="text-lg font-bold">{t.deleteTitle}</h2><p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{t.deleteMsg}</p><div className="mt-5 flex gap-2"><button className="h-10 rounded-lg bg-red-500 px-5 font-bold text-white" onClick={onConfirm}>{t.delete}</button><button className="h-10 rounded-lg border px-5 dark:border-[#30456f]" onClick={onClose}>{t.cancel}</button></div></div></Backdrop>}
