// Umrechnung zwischen Anzeige (Euro, deutsches Format) und API (ganze Cent).

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function formatCents(cents: number): string {
  return euro.format(cents / 100)
}

/**
 * "12,50" oder "12.5" → 1250. Ungültige Eingaben → null.
 * Rechnet über Strings statt über Kommazahlen, damit keine Rundungsfehler entstehen.
 */
export function parseEuroToCents(input: string): number | null {
  const match = input.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/)
  if (!match) return null
  const euros = Number(match[1])
  const cents = Number((match[2] ?? '').padEnd(2, '0'))
  return euros * 100 + cents
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00`))
}

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit. */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
