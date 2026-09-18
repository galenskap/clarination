import { ref } from 'vue'

export const DEFAULT_HINT_SECONDS = 5
export const DEFAULT_FAIL_SECONDS = 10
export const MIN_HINT_SECONDS = 1
export const MAX_HINT_SECONDS = 30
export const MIN_FAIL_SECONDS = 3
export const MAX_FAIL_SECONDS = 60

const STORAGE_KEY = 'clarina.game_options'

const hint_seconds = ref(DEFAULT_HINT_SECONDS)
const fail_seconds = ref(DEFAULT_FAIL_SECONDS)
let hydrated = false

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
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

  function set_hint_seconds(value: number) {
    hint_seconds.value = clamp(value, MIN_HINT_SECONDS, MAX_HINT_SECONDS)
    persist()
  }

  function set_fail_seconds(value: number) {
    fail_seconds.value = clamp(value, MIN_FAIL_SECONDS, MAX_FAIL_SECONDS)
    persist()
  }

  return {
    hint_seconds,
    fail_seconds,
    set_hint_seconds,
    set_fail_seconds,
  }
}
