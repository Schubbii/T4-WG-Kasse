// Fachliche Typen der WG-Kasse.
// Alle Geldbeträge sind ganze Cent (siehe docs/adr/0002-geldbetraege-in-cent.md).

export interface Member {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  description: string;
  amountCents: number;
  /** Datum im Format YYYY-MM-DD */
  date: string;
  /** Mitglied, das bezahlt hat */
  paidBy: number;
  /** Mitglieder, auf die die Ausgabe gleichmäßig aufgeteilt wird */
  participants: number[];
}

/** Rückzahlung: fromId hat toId Geld überwiesen. */
export interface Settlement {
  id: number;
  fromId: number;
  toId: number;
  amountCents: number;
  date: string;
}

export type ExpenseInput = Omit<Expense, "id">;
export type SettlementInput = Omit<Settlement, "id">;

export interface MemberBalance {
  memberId: number;
  name: string;
  /** Summe aller Ausgaben, die dieses Mitglied bezahlt hat */
  paidCents: number;
  /** Summe aller Anteile dieses Mitglieds an Ausgaben */
  shareCents: number;
  /** > 0: bekommt Geld zurück, < 0: schuldet Geld */
  balanceCents: number;
}

/** Vorschlag: fromId soll toId amountCents überweisen. */
export interface SettlementSuggestion {
  fromId: number;
  toId: number;
  amountCents: number;
}

export interface BalanceOverview {
  balances: MemberBalance[];
  suggestions: SettlementSuggestion[];
}
