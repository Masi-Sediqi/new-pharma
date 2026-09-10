export type CostRow = { productId?: string; quantity?: number | string; purchase?: number | string }
export type CostEntry = { type?: string; movementType?: string; rows?: CostRow[] }

const num = (value: unknown) => Number.parseFloat(String(value ?? '0')) || 0

export function calculateWeightedAverageCost(productId: string, entries: CostEntry[], fallback = 0): number {
  let quantity = 0
  let value = 0
  for (const entry of entries) {
    const isPurchase = String(entry.type || '').toLowerCase() === 'import' || String(entry.movementType || '').toLowerCase() === 'purchase'
    if (!isPurchase) continue
    for (const row of entry.rows || []) {
      if (String(row.productId || '') !== String(productId)) continue
      const q = Math.max(0, num(row.quantity))
      const c = Math.max(0, num(row.purchase))
      quantity += q
      value += q * c
    }
  }
  return quantity > 0 ? Math.round((value / quantity + Number.EPSILON) * 100) / 100 : fallback
}
