import { ref } from 'vue'

/**
 * Führt API-Aufrufe aus und merkt sich Ladezustand und Fehlermeldung.
 * So muss nicht jede Ansicht try/catch selbst schreiben.
 */
export function useRequest() {
  const error = ref<string | null>(null)
  const busy = ref(false)

  /** Gibt true zurück, wenn der Aufruf geklappt hat. Bei Fehler steht die Meldung in error. */
  async function run(fn: () => Promise<unknown>): Promise<boolean> {
    error.value = null
    busy.value = true
    try {
      await fn()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unbekannter Fehler'
      return false
    } finally {
      busy.value = false
    }
  }

  return { error, busy, run }
}
