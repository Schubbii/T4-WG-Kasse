// Alle Anfragen an das Backend stehen in dieser Datei.
// Die Komponenten rufen nur diese Funktionen auf und wissen nichts über URLs oder fetch.

import type { Balance, Expense, Member, Settlement, Suggestion, User } from './types'

// Schickt eine Anfrage an /api/... und gibt die JSON-Antwort zurück.
// Bei einem Fehler wird die Fehlermeldung des Backends als Error geworfen.
// Das Session-Cookie schickt der Browser automatisch mit (gleiche Adresse wie die Seite).
async function request(method: string, path: string, body?: object) {
  const response = await fetch('/api' + path, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  // 204 = Erfolg ohne Inhalt (z. B. nach dem Löschen)
  if (response.status === 204) {
    return null
  }

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error)
  }
  return data
}

// ---------- Anmeldung ----------

export function register(username: string, password: string): Promise<User> {
  return request('POST', '/auth/register', { username: username, password: password })
}

export function login(username: string, password: string): Promise<User> {
  return request('POST', '/auth/login', { username: username, password: password })
}

export function logout() {
  return request('POST', '/auth/logout')
}

// Gibt das angemeldete Konto zurück, oder null wenn niemand angemeldet ist.
export async function getMe(): Promise<User | null> {
  try {
    return await request('GET', '/auth/me')
  } catch {
    return null
  }
}

// ---------- Mitglieder ----------

export function getMembers(): Promise<Member[]> {
  return request('GET', '/members')
}

export function addMember(name: string): Promise<Member> {
  return request('POST', '/members', { name: name })
}

export function renameMember(id: number, name: string): Promise<Member> {
  return request('PATCH', '/members/' + id, { name: name })
}

export function deleteMember(id: number) {
  return request('DELETE', '/members/' + id)
}

// ---------- Ausgaben ----------

export function getExpenses(): Promise<Expense[]> {
  return request('GET', '/expenses')
}

export function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  return request('POST', '/expenses', expense)
}

export function updateExpense(id: number, expense: Omit<Expense, 'id'>): Promise<Expense> {
  return request('PUT', '/expenses/' + id, expense)
}

export function deleteExpense(id: number) {
  return request('DELETE', '/expenses/' + id)
}

// ---------- Rückzahlungen ----------

export function getSettlements(): Promise<Settlement[]> {
  return request('GET', '/settlements')
}

export function addSettlement(settlement: Omit<Settlement, 'id'>): Promise<Settlement> {
  return request('POST', '/settlements', settlement)
}

export function deleteSettlement(id: number) {
  return request('DELETE', '/settlements/' + id)
}

// ---------- Salden ----------

export function getBalances(): Promise<{ balances: Balance[]; suggestions: Suggestion[] }> {
  return request('GET', '/balances')
}
