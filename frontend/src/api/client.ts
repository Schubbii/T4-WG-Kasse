// Einzige Stelle im Frontend, die mit dem Backend spricht.
// Komponenten rufen nur diese Funktionen auf und kennen keine URLs oder fetch-Details.

import type {
  BalanceOverview,
  Expense,
  ExpenseInput,
  Member,
  Settlement,
  SettlementInput,
} from '../types'

/** Fehler aus der API, mit der Meldung aus dem einheitlichen Fehlerformat des Backends. */
export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Server nicht erreichbar', 0, 'NETWORK_ERROR')
  }

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      data?.error?.message ?? `Fehler ${res.status}`,
      res.status,
      data?.error?.code ?? 'UNKNOWN',
    )
  }
  return data as T
}

export const api = {
  members: {
    list: () => request<Member[]>('GET', '/members'),
    create: (name: string) => request<Member>('POST', '/members', { name }),
    rename: (id: number, name: string) => request<Member>('PATCH', `/members/${id}`, { name }),
    remove: (id: number) => request<void>('DELETE', `/members/${id}`),
  },
  expenses: {
    list: () => request<Expense[]>('GET', '/expenses'),
    create: (input: ExpenseInput) => request<Expense>('POST', '/expenses', input),
    update: (id: number, input: ExpenseInput) => request<Expense>('PUT', `/expenses/${id}`, input),
    remove: (id: number) => request<void>('DELETE', `/expenses/${id}`),
  },
  settlements: {
    list: () => request<Settlement[]>('GET', '/settlements'),
    create: (input: SettlementInput) => request<Settlement>('POST', '/settlements', input),
    remove: (id: number) => request<void>('DELETE', `/settlements/${id}`),
  },
  balances: {
    get: () => request<BalanceOverview>('GET', '/balances'),
  },
}
