import { ref } from 'vue'

export const DEFAULT_HINT_SECONDS = 5
export const DEFAULT_FAIL_SECONDS = 10
export const MIN_HINT_SECONDS = 1
export const MAX_HINT_SECONDS = 30
export const MIN_FAIL_SECONDS = 3
export const MAX_FAIL_SECONDS = 60

export const FINGERING_HINT_MODES = [
  'always',
  'delayed',
  'note_name',
  'never',
] as const

export type FingeringHintMode = (typeof FINGERING_HINT_MODES)[number]

export const DEFAULT_FINGERING_HINT_MODE: FingeringHintMode = 'delayed'

export const FINGERING_HINT_MODE_LABELS: Record<FingeringHintMode, string> = {
  always: 'Tout le temps',
  delayed: 'Après un délai',
  note_name: 'Nom de la note seulement',
  never: 'Jamais',
}

export const FINGERING_HINT_MODE_DESCRIPTIONS: Record<FingeringHintMode, string> = {
  always: 'Affiche les doigtés dès l’apparition de la note.',
  delayed: 'Affiche les doigtés après X secondes.',
  note_name: 'Pas de doigté : affiche le nom (américain + français).',
  never: 'Aucune aide affichée.',
}

const STORAGE_KEY = 'clarina.game_options'

const fingering_hint_mode = ref<FingeringHintMode>(DEFAULT_FINGERING_HINT_MODE)
const hint_seconds = ref(DEFAULT_HINT_SECONDS)
const fail_seconds = ref(DEFAULT_FAIL_SECONDS)
let hydrated = false

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function is_fingering_hint_mode(value: unknown): value is FingeringHintMode {
  return (
    typeof value === 'string' &&
    (FINGERING_HINT_MODES as readonly string[]).includes(value)
  )
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fingering_hint_mode: fingering_hint_mode.value,
        hint_seconds: hint_seconds.value,
        fail_seconds: fail_seconds.value,
      }),
    )
  } catch {
    /* stockage indisponible (mode privé, quotas, etc.) */
  }
}

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    const data = parsed as Record<string, unknown>
    if (is_fingering_hint_mode(data.fingering_hint_mode)) {
      fingering_hint_mode.value = data.fingering_hint_mode
    }
    if (typeof data.hint_seconds === 'number') {
      hint_seconds.value = clamp(data.hint_seconds, MIN_HINT_SECONDS, MAX_HINT_SECONDS)
    }
    if (typeof data.fail_seconds === 'number') {
      fail_seconds.value = clamp(data.fail_seconds, MIN_FAIL_SECONDS, MAX_FAIL_SECONDS)
    }
  } catch {
    /* JSON invalide ou stockage illisible */
  }
}

export function use_game_options() {
  hydrate()

  function set_fingering_hint_mode(mode: FingeringHintMode) {
    if (!is_fingering_hint_mode(mode)) return
    fingering_hint_mode.value = mode
    persist()
  }

  function set_hint_seconds(value: number) {
    hint_seconds.value = clamp(value, MIN_HINT_SECONDS, MAX_HINT_SECONDS)
    persist()
  }

  function set_fail_seconds(value: number) {
    fail_seconds.value = clamp(value, MIN_FAIL_SECONDS, MAX_FAIL_SECONDS)
    persist()
  }

  return {
    fingering_hint_mode,
    hint_seconds,
    fail_seconds,
    set_fingering_hint_mode,
    set_hint_seconds,
    set_fail_seconds,
  }
}
