// Kleine Hilfsfunktionen für die Anzeige.

import type { Member } from './types'

// 1250 → "12,50 €"
export function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

// "12,50" → 1250. Bei ungültiger Eingabe kommt NaN heraus ("Not a Number").
// Math.round gleicht kleine Rechenungenauigkeiten aus (z. B. 0.29 * 100 = 28.999...).
export function euroToCents(text: string): number {
  return Math.round(Number(text.replace(',', '.')) * 100)
}

// 1250 → "12,50" (für das Eingabefeld beim Bearbeiten)
export function centsToText(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

// "2026-11-09" → "09.11.2026"
export function formatDate(date: string): string {
  return date.split('-').reverse().join('.')
}

// Heutiges Datum als "JJJJ-MM-TT"
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0') // Januar ist 0, deshalb + 1
  const day = String(now.getDate()).padStart(2, '0')
  return now.getFullYear() + '-' + month + '-' + day
}

// Sucht den Namen zu einer Mitglieds-ID.
export function memberName(members: Member[], id: number): string {
  const member = members.find((m) => m.id === id)
  return member ? member.name : '?'
}
