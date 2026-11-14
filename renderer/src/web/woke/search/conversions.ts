// Round amounts of a currency in chaos and divines, for the search detail pane
// (Guy's pick B, 2026-11-14).

export interface ConversionRow {
  amount: number
  /** null when the currency is the Chaos Orb itself. */
  chaos: number | null
  /** null when the currency is the Divine Orb itself, or no divine price. */
  div: number | null
}

export interface Conversions {
  rows: ConversionRow[]
  /** How many one divine buys, for anything but the Divine Orb. */
  perDivine: number | null
}

export function currencyConversions (name: string, each: number, divine: number | null | undefined): Conversions | null {
  if (!(each > 0)) return null
  const isChaos = name === 'Chaos Orb'
  const isDivine = name === 'Divine Orb'
  const div = divine && divine > 0 ? divine : null
  if (isChaos && !div) return null
  const amounts = isDivine || (div != null && each >= div)
    ? [1, 2, 5, 10]
    : each < 1 ? [10, 100, 1000] : [1, 10, 100]
  const rows = amounts.map(amount => ({
    amount,
    chaos: isChaos ? null : amount * each,
    div: isDivine || !div ? null : amount * each / div
  }))
  return { rows, perDivine: isDivine || !div ? null : div / each }
}

// "1,000", "90.35", "0.011": enough digits to be useful, never more.
export function convNumber (n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) return Math.round(n).toLocaleString('en-US')
  if (abs >= 100) return String(Math.round(n))
  if (abs >= 1) return String(+n.toFixed(2))
  if (abs === 0) return '0'
  return String(+n.toPrecision(2))
}
