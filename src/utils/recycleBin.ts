export type RecycleEntry = {
  [key: string]: unknown
  id: string
  recycleId: string
  collection: string
  module: string
  type: string
  label: string
  data: unknown
  record: unknown
  relatedTransactions?: unknown[]
  deletedAt: string
}

const recordKey = (record: any) =>
  record?.id ?? record?.productId ?? record?.customerId ?? record?.supplierId ?? record?.staffId ?? record?.invoiceNo ?? record?.invoiceNumber ?? record?.billNumber ?? record?.code ?? record?.name
const num = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0
const rowsOf = (record: any, key = 'items') => Array.isArray(record?.[key]) ? record[key] : []

export function readCollection<T = any>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCollection(key: string, value: unknown[]) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('pharma:data-changed'))
  window.dispatchEvent(new CustomEvent('storage'))
}

export function moveRecordToRecycleBin(collection: string, record: any, label?: string, extras: Partial<RecycleEntry> = {}) {
  const deletedItems = readCollection<RecycleEntry>('deletedItems')
  const key = String(recordKey(record) ?? Date.now())
  const stamp = Date.now()
  const entry: RecycleEntry = {
    id: `recycle-${collection}-${key}-${stamp}`,
    recycleId: `recycle-${collection}-${key}-${stamp}`,
    collection,
    module: collection,
    type: collection,
    label: label || record?.name || record?.productName || record?.customerName || record?.supplierName || record?.description || record?.invoiceNo || record?.invoiceNumber || 'Deleted record',
    data: record,
    record,
    deletedAt: new Date().toISOString(),
    ...extras,
  }
  saveCollection('deletedItems', [entry, ...deletedItems.filter((item) => String(item.collection) !== collection || String(recordKey(item.data ?? item.record)) !== key)])
  return entry
}

export function restoreRecycleEntry(entry: any) {
  const collection = entry.collection || entry.module || entry.type
  const record = entry.data ?? entry.record ?? entry.item
  if (!collection || !record) return false
  const key = String(recordKey(record) ?? '')
  const current = readCollection(collection)
  saveCollection(collection, [record, ...current.filter((item) => String(recordKey(item)) !== key)])

  if (collection === 'billingInvoices') {
    const products = readCollection('products')
    const nextProducts = products.map((product: any) => {
      const sold = rowsOf(record).filter((item: any) => String(item.productId) === String(product.id)).reduce((sum: number, item: any) => sum + num(item.quantity ?? item.qty ?? 1), 0)
      return sold ? { ...product, quantity: Math.max(0, num(product.quantity) - sold) } : product
    })
    saveCollection('products', nextProducts)
    if (record.customerId) {
      const total = num(record.total) || rowsOf(record).reduce((sum: number, item: any) => sum + (num(item.lineTotal ?? item.total) || num(item.quantity ?? item.qty ?? 1) * num(item.price ?? item.selling)), 0)
      const paid = num(record.paidAmount ?? record.paid)
      const balance = num(record.balance ?? record.remaining ?? Math.max(0, total - paid))
      saveCollection('customers', readCollection('customers').map((customer: any) => String(customer.id) === String(record.customerId) ? {
        ...customer,
        purchases: num(customer.purchases) + total,
        pending: num(customer.pending) + balance,
      } : customer))
    }
  }

  if (collection === 'godownEntries') {
    const purchasedRows = rowsOf(record, 'rows')
    if (purchasedRows.length) {
      saveCollection('products', readCollection('products').map((product: any) => {
        const added = purchasedRows.filter((row: any) => String(row.productId) === String(product.id)).reduce((sum: number, row: any) => sum + num(row.quantity), 0)
        return added ? { ...product, quantity: num(product.quantity) + added, status: 'In Stock' } : product
      }))
    }
  }

  const restoreRelated = (targetCollection: string, relatedKey: string) => {
    if (!Array.isArray(entry[relatedKey]) || !entry[relatedKey].length) return
    const currentRows = readCollection(targetCollection)
    const existing = new Set(currentRows.map((item) => String(recordKey(item))))
    saveCollection(targetCollection, [...entry[relatedKey].filter((item: any) => !existing.has(String(recordKey(item)))), ...currentRows])
  }
  restoreRelated('transactions', 'relatedTransactions')
  restoreRelated('godownEntries', 'relatedGodownEntries')
  restoreRelated('supplierPurchases', 'relatedSupplierPurchases')
  const recycleId = String(entry.recycleId || entry.id)
  saveCollection('deletedItems', readCollection('deletedItems').filter((item: any) => String(item.recycleId || item.id) !== recycleId))
  return true
}
