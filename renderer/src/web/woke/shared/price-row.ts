// Which price row an item takes when several match, and one divine rate:
// pure, so calculators and tests use it without loading prices.
export interface PriceRowLike { type?: string, variant?: string | null, chaos: number }

// The row for an item known by name, of all its rows:
// - a variant asked for: that variant only (with `fallback`, else as below);
// - else the plain row (a currency's, when two types name it);
// - else the cheapest variant, so values lean conservative.
export function pickRow<T extends PriceRowLike> (rows: readonly T[], variant?: string | null, opts: { fallback?: boolean } = {}): T | null {
  if (!rows.length) return null
  if (variant) {
    const exact = rows.find(r => r.variant === variant)
    if (exact || !opts.fallback) return exact ?? null
  }
  let plain: T | undefined
  for (const r of rows) {
    if (r.variant) continue
    if (!plain || (r.type === 'Currency' && plain.type !== 'Currency')) plain = r
  }
  if (plain) return plain
  return rows.reduce((a, b) => b.chaos < a.chaos ? b : a)
}

// One divine rate: live poe.ninja's, else the snapshot the window shows.
export function divineRate (live: number | null | undefined, snapshot?: number | null): number | null {
  return live ?? snapshot ?? null
}
