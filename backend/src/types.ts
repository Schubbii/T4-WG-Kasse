// Die Datentypen der WG-Kasse.
// Alle Geldbeträge sind ganze Cent: 1250 bedeutet 12,50 €.

export interface Member {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  description: string;
  amountCents: number;
  date: string; // Format: JJJJ-MM-TT
  paidBy: number; // ID des Mitglieds, das bezahlt hat
  participants: number[]; // IDs der Mitglieder, auf die aufgeteilt wird
}

// Eine Rückzahlung: Mitglied fromId hat Mitglied toId Geld gegeben.
export interface Settlement {
  id: number;
  fromId: number;
  toId: number;
  amountCents: number;
  date: string;
}

export interface Balance {
  memberId: number;
  name: string;
  paidCents: number; // so viel hat das Mitglied insgesamt bezahlt
  shareCents: number; // so viel war sein Anteil an allen Ausgaben
  balanceCents: number; // positiv: bekommt Geld, negativ: schuldet Geld
}

// Vorschlag: fromId soll toId den Betrag amountCents überweisen.
export interface Suggestion {
  fromId: number;
  toId: number;
  amountCents: number;
}
