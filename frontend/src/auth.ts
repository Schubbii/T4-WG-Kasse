// Wer ist angemeldet? Diese Information brauchen mehrere Stellen:
// der Router (darf die Seite geöffnet werden?), App.vue (Name und Abmelden-Knopf)
// und die Login-Seite (nach dem Anmelden setzen).
//
// Ein ref außerhalb einer Komponente wird von allen Dateien geteilt, die es importieren.
// Für diesen einen Wert reicht das, dafür brauchen wir keine Bibliothek wie Pinia.

import { ref } from 'vue'
import type { User } from './types'

export const currentUser = ref<User | null>(null)
