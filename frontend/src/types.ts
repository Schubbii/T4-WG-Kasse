// Datentypen der REST-API (Spiegel von backend/src/domain/types.ts).
// Bewusst kopiert statt geteilt: Frontend und Backend bleiben unabhängig voneinander.
// Alle Geldbeträge sind ganze Cent.

export interface Member {
  id: number
  name: string
}

export interface Expense {
  id: number
  description: string
  amountCents: number
  /** YYYY-MM-DD */
  date: string
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

export type ExpenseInput = Omit<Expense, 'id'>
export type SettlementInput = Omit<Settlement, 'id'>

export interface MemberBalance {
  memberId: number
  name: string
  paidCents: number
  shareCents: number
  balanceCents: number
}

export interface SettlementSuggestion {
  fromId: number
  toId: number
  amountCents: number
}

export interface BalanceOverview {
  balances: MemberBalance[]
  suggestions: SettlementSuggestion[]
}
