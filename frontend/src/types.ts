// Die Datentypen, die die REST-API liefert (gleich wie im Backend).
// Alle Geldbeträge sind ganze Cent: 1250 bedeutet 12,50 €.

export interface Member {
  id: number
  name: string
}

export interface Expense {
  id: number
  description: string
  amountCents: number
  date: string // Format: JJJJ-MM-TT
  paidBy: number
  participants: number[]
}

export interface Settlement {
  id: number
  fromId: number
  toId: number
  amountCents: number
  date: string
}

export interface Balance {
  memberId: number
  name: string
  paidCents: number
  shareCents: number
  balanceCents: number
}

export interface Suggestion {
  fromId: number
  toId: number
  amountCents: number
}
