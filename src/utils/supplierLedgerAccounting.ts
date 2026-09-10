export type SupplierLedgerEntry = {
  currency?: string
  total?: number | string
  paid?: number | string
  quantity?: number | string
  purchase?: number | string
  selling?: number | string
}

export type SupplierAdjustment = {
  currency?: string
  amount?: number | string
  type?: 'credit' | 'debit' | string
  balanceDelta?: number | string
}

export type SupplierLike = {
  currency?: string
  balance?: number | string
  openingBalance?: number | string
}

export type SupplierCurrencySummary = {
  currency: string
  purchaseValue: number
  paid: number
  remaining: number
  profit: number
}

const toNumber = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0

export const roundSupplierMoney = (value: unknown) =>
  Math.round((toNumber(value) + Number.EPSILON) * 100) / 100

export const calculateSupplierRowPaid = ({
  rowTotal = 0,
  rowPaid,
  billPaid = 0,
  billTotal = 0,
}: {
  rowTotal?: number | string
  rowPaid?: number | string | null
  billPaid?: number | string
  billTotal?: number | string
} = {}) => {
  const total = Math.max(0, roundSupplierMoney(rowTotal))
  if (rowPaid !== undefined && rowPaid !== null && rowPaid !== '') {
    return Math.min(total, Math.max(0, roundSupplierMoney(rowPaid)))
  }

  const paid = Math.min(
    Math.max(0, roundSupplierMoney(billPaid)),
    Math.max(0, roundSupplierMoney(billTotal)),
  )
  const totalBill = Math.max(0, roundSupplierMoney(billTotal))
  if (!total || !totalBill || !paid) return 0

  return Math.min(total, roundSupplierMoney((paid * total) / totalBill))
}

export const getSupplierAdjustmentDelta = (adjustment: SupplierAdjustment = {}) => {
  const amount = Math.max(0, roundSupplierMoney(adjustment.amount))
  const type = String(adjustment.type || '').toLowerCase()

  if (type === 'credit') return -amount
  if (type === 'debit') return amount

  if (Number.isFinite(Number(adjustment.balanceDelta))) {
    return roundSupplierMoney(adjustment.balanceDelta)
  }
  return 0
}

const ensureCurrency = (
  summary: Record<string, SupplierCurrencySummary>,
  currency: string,
) => {
  const code = String(currency || 'AFN').toUpperCase()
  if (!summary[code]) {
    summary[code] = {
      currency: code,
      purchaseValue: 0,
      paid: 0,
      remaining: 0,
      profit: 0,
    }
  }
  return summary[code]
}

export const calculateSupplierSummaryByCurrency = ({
  supplier = {},
  entries = [],
  adjustments = [],
  baseCurrency = 'AFN',
}: {
  supplier?: SupplierLike
  entries?: SupplierLedgerEntry[]
  adjustments?: SupplierAdjustment[]
  baseCurrency?: string
} = {}) => {
  const summary: Record<string, SupplierCurrencySummary> = {}
  const openingCurrency = String(supplier.currency || baseCurrency || 'AFN').toUpperCase()
  const openingBalance = roundSupplierMoney(supplier.openingBalance ?? supplier.balance)

  if (openingBalance) ensureCurrency(summary, openingCurrency).remaining += openingBalance

  entries.forEach((entry) => {
    const currency = String(entry.currency || openingCurrency).toUpperCase()
    const bucket = ensureCurrency(summary, currency)
    const total = roundSupplierMoney(entry.total)
    const paid = Math.min(total, Math.max(0, roundSupplierMoney(entry.paid)))
    const quantity = toNumber(entry.quantity)
    const unitProfit = Math.max(0, toNumber(entry.selling) - toNumber(entry.purchase))

    bucket.purchaseValue += total
    bucket.paid += paid
    bucket.remaining += total - paid
    bucket.profit += unitProfit * quantity
  })

  adjustments.forEach((adjustment) => {
    const currency = String(adjustment.currency || openingCurrency).toUpperCase()
    const bucket = ensureCurrency(summary, currency)
    bucket.remaining += getSupplierAdjustmentDelta(adjustment)
    if (String(adjustment.type || '').toLowerCase() === 'credit') {
      bucket.paid += Math.max(0, roundSupplierMoney(adjustment.amount))
    }
  })

  Object.values(summary).forEach((bucket) => {
    bucket.purchaseValue = roundSupplierMoney(bucket.purchaseValue)
    bucket.paid = roundSupplierMoney(bucket.paid)
    bucket.remaining = roundSupplierMoney(bucket.remaining)
    bucket.profit = roundSupplierMoney(bucket.profit)
  })

  if (!Object.keys(summary).length) ensureCurrency(summary, openingCurrency)
  return summary
}
