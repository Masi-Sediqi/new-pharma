import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { CalendarDays, Camera, Minus, Plus, Printer, Search, Trash2, User } from 'lucide-react'
import type { Language } from '../i18n'
import { toast } from '../utils/toast'

const currencies = [
  ['AFN', '؋', 'Afghan Afghani'], ['USD', '$', 'US Dollar'], ['EUR', '€', 'Euro'],
  ['GBP', '£', 'British Pound'], ['SAR', 'ریال', 'Saudi Riyal'], ['PKR', 'Rs', 'Pakistani Rupee'],
] as const

type Product = { id:string; name:string; code?:string; barcode?:string; quantity:number; unit:string; selling:number; purchase:number; currency:string }
type Customer = { id:string; name?:string; customerName?:string; phone?:string }
type CartItem = Product & { qty:number; discount:number }
type Invoice = { id:string; invoiceNo:string; createdAt:string; date:string; customerId?:string; customerName:string; currency:string; discount:number; paymentMethod:string; paymentStatus:string; subtotal:number; total:number; paid:number; remaining:number; profit:number; items:Array<{productId:string;name:string;code:string;qty:number;unit:string;price:number;purchase:number;discount:number;total:number}> }

function load<T>(key:string, fallback:T):T { try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback } }
function save(key:string, value:unknown) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('pharma:data-changed')) }
const n=(v:unknown)=>Number.parseFloat(String(v??0))||0
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100
const today=()=>new Date().toISOString().slice(0,10)
const money=(v:number,c='AFN')=>`${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${currencies.find(([x])=>x===c)?.[1]??c}`
const customerName=(c?:Customer)=>c?.customerName||c?.name||''
const cleanCode=(value:unknown)=>String(value??'').trim().toLowerCase()
const cleanDigits=(value:unknown)=>String(value??'').replace(/\D/g,'')

// USB barcode scanners such as PM6300 normally work as a HID keyboard.
// event.key is affected by the active Windows keyboard layout (Dari/Pashto),
// while event.code keeps the physical US-key position. Decode scanner input from
// event.code so numeric/ASCII barcodes still work even when the UI language is RTL.
const scannerCharFromCode=(event:{code?:string;key?:string})=>{
  const code=String(event.code||'')
  if(/^Digit[0-9]$/.test(code)) return code.slice(-1)
  if(/^Numpad[0-9]$/.test(code)) return code.slice(-1)
  if(/^Key[A-Z]$/.test(code)) return code.slice(-1)
  if(code==='Minus'||code==='NumpadSubtract') return '-'
  if(code==='Equal'||code==='NumpadAdd') return '+'
  if(code==='Slash'||code==='NumpadDivide') return '/'
  if(code==='Period'||code==='NumpadDecimal') return '.'
  return event.key?.length===1 ? event.key : ''
}

const copy = {
  English:{title:'Billing',sub:'Create invoices and process sales',scanner:'Active Scanner',customer:'Customer',selectCustomer:'Select customer',or:'or',customerName:'Enter customer name',currency:'Currency',discount:'Discount',date:'Date',gregorian:'Gregorian',shamsi:'Afghan (Shamsi)',payment:'Payment Method',paymentStatus:'Payment Status',cash:'Cash',card:'Credit Card',bank:'Bank Transfer',online:'Online Payment',paid:'Paid',partial:'Partial',unpaid:'Unpaid',search:'Search product by name, code or barcode...',items:'Invoice Items',empty:'No item added yet',emptyHint:'Scan a barcode or search products',sale:'Sale',itemDiscount:'Discount',subtotal:'Subtotal',total:'Total',savePrint:'Save & Print',saveInvoice:'Save Invoice',stock:'in stock',qty:'Qty',insufficient:'Not enough stock for this product.',saved:'Invoice saved successfully.'},
  دری:{title:'صورت‌حساب',sub:'ایجاد فاکتور و پردازش فروش',scanner:'اسکنر فعال',customer:'مشتری',selectCustomer:'انتخاب مشتری',or:'یا',customerName:'نام مشتری را وارد کنید',currency:'واحد پول',discount:'تخفیف',date:'تاریخ',gregorian:'میلادی (عیسوی)',shamsi:'شمسی (افغانی)',payment:'روش پرداخت',paymentStatus:'وضعیت پرداخت',cash:'نقد',card:'کارت',bank:'انتقال بانکی',online:'پرداخت آنلاین',paid:'پرداخت شده',partial:'قسمتی',unpaid:'پرداخت نشده',search:'جستجوی محصول با نام، کد یا بارکد...',items:'اقلام فاکتور',empty:'هنوز موردی اضافه نشده',emptyHint:'بارکد اسکن کنید یا جستجو کنید',sale:'فروش',itemDiscount:'تخفیف',subtotal:'جمع فرعی',total:'مجموع',savePrint:'ذخیره و چاپ',saveInvoice:'ذخیره فاکتور',stock:'موجود',qty:'تعداد',insufficient:'موجودی این جنس کافی نیست.',saved:'فاکتور با موفقیت ذخیره شد.'},
  پښتو:{title:'بل جوړول',sub:'فاکتور جوړول او پلور ترسره کول',scanner:'فعال سکینر',customer:'پېرودونکی',selectCustomer:'پېرودونکی وټاکئ',or:'یا',customerName:'د پېرودونکي نوم ولیکئ',currency:'اسعار',discount:'تخفیف',date:'نېټه',gregorian:'میلادي',shamsi:'هجري شمسي',payment:'د تادیې طریقه',paymentStatus:'د تادیې حالت',cash:'نغد',card:'کارت',bank:'بانکي لېږد',online:'آنلاین تادیه',paid:'ورکړل شوی',partial:'جزوي',unpaid:'نه دی ورکړل شوی',search:'محصول د نوم، کوډ یا بارکوډ له مخې ولټوئ...',items:'د فاکتور توکي',empty:'تر اوسه توکی نه دی اضافه شوی',emptyHint:'بارکوډ سکین یا لټون وکړئ',sale:'پلور',itemDiscount:'تخفیف',subtotal:'فرعي مجموعه',total:'ټول',savePrint:'خوندي او چاپ',saveInvoice:'فاکتور خوندي کړئ',stock:'موجود',qty:'شمېر',insufficient:'د دې توکي موجودي کافي نه ده.',saved:'فاکتور خوندي شو.'}
} as const

export default function Billing({language,globalSearch='',editInvoiceId,onEditDone}:{language:Language;globalSearch?:string;editInvoiceId?:string|null;onEditDone?:()=>void}){
  const t=copy[language]
  const isRtl = language === 'دری' || language === 'پښتو'
  const [products,setProducts]=useState<Product[]>(()=>load('products',[]))
  const [customers,setCustomers]=useState<Customer[]>(()=>load('customers',[]))
  const [cart,setCart]=useState<CartItem[]>([])
  const [search,setSearch]=useState('')
  const [customerId,setCustomerId]=useState('')
  const [walkIn,setWalkIn]=useState('')
  const [currency,setCurrency]=useState('AFN')
  const [discount,setDiscount]=useState(0)
  const [paymentMethod,setPaymentMethod]=useState('cash')
  const [paymentStatus,setPaymentStatus]=useState('paid')
  const [date,setDate]=useState(today())
  const [message,setMessage]=useState('')
  const searchRef=useRef<HTMLInputElement | null>(null)
  const scanBuffer=useRef('')
  const lastScanAt=useRef(0)
  const inputScanBuffer=useRef('')
  const inputLastScanAt=useRef(0)

  useEffect(()=>{ const f=()=>{setProducts(load('products',[]));setCustomers(load('customers',[]))}; window.addEventListener('pharma:data-changed',f); return()=>window.removeEventListener('pharma:data-changed',f)},[])
  useEffect(()=>setSearch(globalSearch),[globalSearch])

  useEffect(()=>{ if(!editInvoiceId)return; const inv=load<any[]>('billingInvoices',[]).find(x=>String(x.id)===String(editInvoiceId)); if(!inv)return; setCustomerId(String(inv.customerId||'')); setWalkIn(inv.customerId?'':String(inv.customerName||'')); setCurrency(inv.currency||'AFN'); setDiscount(n(inv.discount)); setPaymentMethod(inv.paymentMethod||'cash'); setPaymentStatus((inv.balance??inv.remaining??0)>0?((inv.paidAmount??inv.paid??0)>0?'partial':'unpaid'):'paid'); setDate(inv.date||today()); setCart((inv.items||[]).map((i:any)=>{const p=products.find(x=>String(x.id)===String(i.productId));return {...(p||{}),id:i.productId||p?.id,name:i.name||p?.name,code:i.code||p?.code,barcode:i.barcode||p?.barcode,quantity:n(p?.quantity)+n(i.quantity??i.qty),unit:i.unit||p?.unit||'Piece',selling:n(i.price??i.selling),purchase:n(i.purchase??i.purchasePrice??p?.purchase),currency:inv.currency||p?.currency||'AFN',qty:n(i.quantity??i.qty),discount:n(i.discount)}})); },[editInvoiceId])

  const results=useMemo(()=>{const q=search.trim().toLowerCase(); if(!q)return[]; return products.filter(p=>[p.name,p.code,p.barcode].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,8)},[products,search])
  const addProduct=(p:Product)=>{ if(n(p.quantity)<=0){setMessage(t.insufficient);toast.error(t.insufficient,p.name);return}; setMessage(''); setCart(c=>{const exists=c.find(x=>x.id===p.id); return exists?c.map(x=>x.id===p.id?{...x,qty:Math.min(x.qty+1,n(p.quantity))}:x):[...c,{...p,qty:1,discount:0}]}); setSearch('') }
  const addScannedProduct=(raw:string)=>{
    const code=cleanCode(raw)
    if(!code)return false
    const digits=cleanDigits(raw)
    const product=products.find(p=>[p.barcode,p.code].some(v=>cleanCode(v)===code || (digits && cleanDigits(v)===digits)))
    if(!product)return false
    addProduct(product)
    return true
  }
  const handleSearchKeyDown=(event:ReactKeyboardEvent<HTMLInputElement>)=>{
    const now=Date.now()
    // A scanner sends characters very quickly. Keep a second buffer decoded from
    // physical key codes so Windows Dari/Pashto keyboard mapping cannot corrupt it.
    if(now-inputLastScanAt.current>140) inputScanBuffer.current=''
    inputLastScanAt.current=now

    if(event.key==='Enter'){
      const decoded=inputScanBuffer.current.trim()
      inputScanBuffer.current=''
      // Prefer the layout-independent scanner value, then fall back to what is
      // visible in the input for normal manual keyboard use.
      if((decoded&&addScannedProduct(decoded))||addScannedProduct(search)){
        event.preventDefault()
        setSearch('')
        return
      }
      if(results.length===1){event.preventDefault();addProduct(results[0])}
      return
    }

    const ch=scannerCharFromCode(event.nativeEvent)
    if(ch) inputScanBuffer.current+=ch
  }
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement | null
      const tag=target?.tagName?.toLowerCase()
      if(tag==='input'||tag==='textarea'||tag==='select'||event.ctrlKey||event.altKey||event.metaKey)return
      const now=Date.now()
      if(now-lastScanAt.current>80)scanBuffer.current=''
      lastScanAt.current=now
      if(event.key==='Enter'){
        if(addScannedProduct(scanBuffer.current))event.preventDefault()
        scanBuffer.current=''
        return
      }
      const ch=scannerCharFromCode(event)
      if(ch)scanBuffer.current+=ch
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[products])
  const updateQty=(id:string,qty:number)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:Math.max(1,Math.min(qty,n(x.quantity)))}:x))
  const subtotal=round(cart.reduce((s,x)=>s+Math.max(0,(n(x.selling)*x.qty)-n(x.discount)),0))
  const total=round(Math.max(0,subtotal-n(discount)))
  const profit=round(cart.reduce((s,x)=>s+((n(x.selling)-n(x.purchase))*x.qty)-n(x.discount),0)-n(discount))

  const persist=(shouldPrint:boolean)=>{
    if(!cart.length)return
    const selected=customers.find(c=>String(c.id)===customerId)
    let customer=customerName(selected)||walkIn.trim()||'Walk-in Customer'
    let resolvedCustomerId=customerId||undefined
    if(!selected && walkIn.trim()){ const existing=customers.find(c=>customerName(c).toLowerCase()===walkIn.trim().toLowerCase()); if(existing){resolvedCustomerId=existing.id}else{const created={id:`customer-${Date.now()}`,name:walkIn.trim(),customerName:walkIn.trim()}; const nextCustomers=[created,...customers]; setCustomers(nextCustomers); save('customers',nextCustomers); resolvedCustomerId=created.id} }
    const invoices=load<any[]>('billingInvoices',[])
    const existing=editInvoiceId?invoices.find(i=>String(i.id)===String(editInvoiceId)):null
    const seq=invoices.reduce((m,i)=>Math.max(m,n(String(i.invoiceNo||i.invoiceNumber||'').replace(/\D/g,''))),0)+1
    const paid=paymentStatus==='paid'?total:paymentStatus==='partial'?round(total/2):0
    const id=existing?.id||`invoice-${Date.now()}`; const no=existing?.invoiceNo||existing?.invoiceNumber||`INV-${String(seq).padStart(5,'0')}`
    const invoice:any={...(existing||{}),id,invoiceNo:no,invoiceNumber:no,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),date,customerId:resolvedCustomerId,customerName:customer,currency,discount:n(discount),paymentMethod,paymentStatus,subtotal,total,paid,paidAmount:paid,remaining:round(total-paid),balance:round(total-paid),profit,items:cart.map(x=>({productId:x.id,name:x.name,code:x.code||'',qty:x.qty,quantity:x.qty,unit:x.unit,price:n(x.selling),purchase:n(x.purchase),purchasePrice:n(x.purchase),discount:n(x.discount),total:round(n(x.selling)*x.qty-n(x.discount)),lineTotal:round(n(x.selling)*x.qty-n(x.discount))}))}
    if(existing){ const restored=products.map(p=>{const old=(existing.items||[]).filter((i:any)=>String(i.productId)===String(p.id)).reduce((a:number,i:any)=>a+n(i.quantity??i.qty),0);return old?{...p,quantity:n(p.quantity)+old}:p}); const nextProducts=restored.map(p=>{const row=cart.find(x=>x.id===p.id);return row?{...p,quantity:Math.max(0,n(p.quantity)-row.qty)}:p});setProducts(nextProducts);save('products',nextProducts);save('billingInvoices',invoices.map(i=>String(i.id)===String(id)?invoice:i));const tx=load<any[]>('transactions',[]);save('transactions',tx.map(x=>String(x.referenceId)===String(id)&&String(x.referenceSource||'billing')==='billing'?{...x,amount:total,currency,profit,description:`Sale ${no} - ${customer}`} : x));onEditDone?.()}else{save('billingInvoices',[invoice,...invoices]);const nextProducts=products.map(p=>{const row=cart.find(x=>x.id===p.id); return row?{...p,quantity:Math.max(0,n(p.quantity)-row.qty)}:p});setProducts(nextProducts);save('products',nextProducts);const tx=load<any[]>('transactions',[]);save('transactions',[{id:`tx-${Date.now()}`,type:'income',transactionType:'sale',date:new Date().toISOString(),referenceId:invoice.id,referenceSource:'billing',source:'billing',description:`Sale ${invoice.invoiceNo} - ${customer}`,amount:total,currency,profit},...tx])}
    setMessage(t.saved); toast.success(t.saved, invoice.invoiceNo); setCart([]); setDiscount(0)
    if(shouldPrint) printInvoice(invoice)
  }

  const printInvoice=(inv:Invoice)=>{const w=window.open('','_blank','width=900,height=900'); if(!w)return; const rows=inv.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>${money(i.price,inv.currency)}</td><td>${money(i.total,inv.currency)}</td></tr>`).join(''); w.document.write(`<html><head><title>${inv.invoiceNo}</title><style>body{font-family:Arial;padding:35px;color:#172a57}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{margin-top:25px;font-size:20px;font-weight:700}</style></head><body><h1>Pharma Pro</h1><div>${inv.invoiceNo} • ${inv.date}</div><div>${inv.customerName}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class='total'>Total: ${money(inv.total,inv.currency)}</div></body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),200)}

  return <div className={`billing-page w-full pb-8 ${isRtl ? 'billing-page-rtl' : 'billing-page-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-extrabold">{t.title}</h1><p className="mt-1 text-sm text-slate-500">{t.sub}</p></div><button onClick={()=>searchRef.current?.focus()} className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-[#172a57] px-4 text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950"><Camera size={16}/>{t.scanner}</button></div>
    {message&&<div className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</div>}
    <div className={`billing-layout mt-5 grid gap-5 ${isRtl ? 'billing-layout-rtl' : 'billing-layout-ltr'}`}>
      <aside className="billing-sidebar space-y-4">
        <Panel title={t.customer} icon={<User size={16}/>}><select className="form-control" value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">{t.selectCustomer}</option>{customers.map(c=><option key={c.id} value={c.id}>{customerName(c)||c.id}</option>)}</select><div className="my-3 text-center text-xs text-slate-400">{t.or}</div><input className="form-control" value={walkIn} onChange={e=>setWalkIn(e.target.value)} placeholder={t.customerName}/></Panel>
        <Panel title={t.currency}><select className="form-control" value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(([c,s,l])=><option value={c} key={c}>{s} {l}</option>)}</select><label className="mt-3 block text-xs font-semibold">{t.discount}</label><input className="form-control mt-1" type="number" min="0" value={discount} onChange={e=>setDiscount(n(e.target.value))}/><label className="mt-3 block text-xs font-semibold">{t.date}</label><div className="relative mt-1"><CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3"/><input className="form-control pl-9 rtl:pl-3 rtl:pr-9" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div></Panel>
        <Panel title={t.payment}><label className="mb-1 block text-xs font-semibold">{t.payment}</label><select className="form-control" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">{t.cash}</option><option value="creditCard">{t.card}</option><option value="bankTransfer">{t.bank}</option><option value="onlinePayment">{t.online}</option></select><label className="mb-1 mt-3 block text-xs font-semibold">{t.paymentStatus}</label><select className="form-control" value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)}><option value="paid">{t.paid}</option><option value="partial">{t.partial}</option><option value="unpaid">{t.unpaid}</option></select></Panel>
        <div className="app-panel rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c]"><div className="flex justify-between text-sm"><span>{t.subtotal}</span><b>{money(subtotal,currency)}</b></div><div className="mt-3 flex justify-between border-t pt-3 text-lg"><b>{t.total}</b><b>{money(total,currency)}</b></div></div>
        <div className="grid grid-cols-2 gap-2"><button onClick={()=>persist(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#172a57] text-sm font-bold text-white dark:bg-amber-500 dark:text-slate-950"><Printer size={15}/>{t.savePrint}</button><button onClick={()=>persist(false)} className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold dark:border-[#24365f] dark:bg-[#111a2c]">{t.saveInvoice}</button></div>
      </aside>
      <section className="billing-content min-w-0 space-y-4">
        <div className="app-panel relative rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c]"><Search size={17} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-7"/><input ref={searchRef} value={search} onKeyDown={handleSearchKeyDown} onChange={e=>setSearch(e.target.value)} className="form-control h-12 pl-10 rtl:pl-3 rtl:pr-10" placeholder={t.search}/>{results.length>0&&<div className="absolute left-4 right-4 top-[66px] z-20 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-[#24365f] dark:bg-[#0c1424]">{results.map(p=><button key={p.id} onClick={()=>addProduct(p)} className="flex w-full items-center justify-between rounded-lg p-3 text-start hover:bg-slate-50 dark:hover:bg-white/5"><div><div className="font-semibold">{p.name}</div><div className="text-xs text-slate-400">{p.code||p.barcode||'—'}</div></div><div className="text-end"><div className="font-bold">{money(n(p.selling),p.currency)}</div><div className="text-xs text-slate-400">{n(p.quantity)} {p.unit} {t.stock}</div></div></button>)}</div>}</div>
        <div className="app-panel min-h-[260px] rounded-xl border border-slate-200 bg-white p-5 dark:border-[#24365f] dark:bg-[#111a2c]"><h2 className="font-bold">{t.items}</h2>{!cart.length?<div className="grid h-44 place-items-center text-center"><div><div className="mx-auto mb-3 h-8 w-1 rounded bg-slate-300 shadow-[7px_0_0_#cbd5e1,14px_0_0_#cbd5e1,21px_0_0_#cbd5e1,28px_0_0_#cbd5e1]"/><div className="text-sm text-slate-500">{t.empty}</div><div className="mt-1 text-xs text-slate-400">{t.emptyHint}</div></div></div>:<div className="mt-4 space-y-3">{cart.map(x=><div key={x.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center dark:border-[#24365f]"><div><div className="font-semibold">{x.name}</div><div className="text-xs text-slate-400">{x.qty} {x.unit} × {money(n(x.selling),currency)}</div></div><div className="flex items-center gap-2"><span className="text-xs text-slate-400">{t.sale}</span><input className="h-9 w-20 rounded-lg border border-slate-200 bg-transparent px-2 text-center dark:border-[#24365f]" type="number" min="0" value={x.selling} onChange={e=>setCart(c=>c.map(y=>y.id===x.id?{...y,selling:n(e.target.value)}:y))}/><span className="text-xs text-slate-400">{t.itemDiscount}</span><input className="h-9 w-20 rounded-lg border border-slate-200 bg-transparent px-2 text-center dark:border-[#24365f]" type="number" min="0" value={x.discount} onChange={e=>setCart(c=>c.map(y=>y.id===x.id?{...y,discount:n(e.target.value)}:y))}/><button onClick={()=>updateQty(x.id,x.qty-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Minus size={15}/></button><input className="h-9 w-16 rounded-lg border border-slate-200 bg-transparent text-center dark:border-[#24365f]" type="number" value={x.qty} min="1" max={x.quantity} onChange={e=>updateQty(x.id,n(e.target.value))}/><button onClick={()=>updateQty(x.id,x.qty+1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-[#24365f]"><Plus size={15}/></button></div><div className="flex items-center justify-end gap-3"><b>{money(round(x.selling*x.qty-x.discount),currency)}</b><button onClick={()=>setCart(c=>c.filter(y=>y.id!==x.id))} className="text-red-500"><Trash2 size={16}/></button></div></div>)}</div>}</div>
      </section>
    </div>
  </div>
}
function Panel({title,icon,children}:{title:string;icon?:ReactNode;children:ReactNode}){return <div className="app-panel rounded-xl border border-slate-200 bg-white p-4 dark:border-[#24365f] dark:bg-[#111a2c]"><div className="mb-3 flex items-center gap-2 font-bold">{icon}{title}</div>{children}</div>}
