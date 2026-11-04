// Schnittstellen der Datenhaltung.
// Services kennen nur diese Interfaces, nicht SQLite. Eine andere Umsetzung
// (z. B. Deno KV) müsste nur diese Methoden bereitstellen.
// Die Methoden sind async, damit auch asynchrone Speicher passen.

import type {
  Expense,
  ExpenseInput,
  Member,
  Settlement,
  SettlementInput,
} from "../domain/types.ts";

export interface MemberRepository {
  list(): Promise<Member[]>;
  get(id: number): Promise<Member | undefined>;
  findByName(name: string): Promise<Member | undefined>;
  create(name: string): Promise<Member>;
  rename(id: number, name: string): Promise<Member | undefined>;
  delete(id: number): Promise<boolean>;
  /** true, wenn das Mitglied in Ausgaben oder Ausgleichszahlungen vorkommt */
  isReferenced(id: number): Promise<boolean>;
}

export interface ExpenseRepository {
  list(): Promise<Expense[]>;
  get(id: number): Promise<Expense | undefined>;
  create(input: ExpenseInput): Promise<Expense>;
  update(id: number, input: ExpenseInput): Promise<Expense | undefined>;
  delete(id: number): Promise<boolean>;
}

export interface SettlementRepository {
  list(): Promise<Settlement[]>;
  create(input: SettlementInput): Promise<Settlement>;
  delete(id: number): Promise<boolean>;
}

export interface Repositories {
  members: MemberRepository;
  expenses: ExpenseRepository;
  settlements: SettlementRepository;
}
