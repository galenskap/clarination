import { computed, ref } from 'vue'
import {
  american_label,
  french_label,
  parse_note_id,
} from '@/domain/notes'
import type { RegisterId } from '@/domain/registers'
import type {
  NotePerformance,
  SessionSummary,
  SessionTrialInput,
} from '@/domain/session_stats'

export const GAME_IDS = ['reading'] as const
export type GameId = (typeof GAME_IDS)[number]

export const GAME_LABELS: Record<GameId, string> = {
  reading: 'Lecture de notes',
}

const STORAGE_KEY = 'clarina.game_stats'
const STORAGE_VERSION = 1
const MAX_SESSIONS = 100

export interface StoredSessionRecord {
  started_at: number
  duration_ms: number
  attempts: number
  successes: number
  avg_reaction_ms: number | null
  register_id: RegisterId
}

export interface StoredNoteAggregate {
  attempts: number
  successes: number
  reaction_sum: number
  reaction_count: number
}

export interface GameStatsBucket {
  total_duration_ms: number
  total_attempts: number
  total_successes: number
  sessions: StoredSessionRecord[]
  notes: Record<string, StoredNoteAggregate>
}

export interface GameStatsStore {
  version: number
  games: Partial<Record<GameId, GameStatsBucket>>
}

export interface GameStatsSnapshot {
  total_duration_ms: number
  total_attempts: number
  total_successes: number
  success_rate: number
  session_count: number
  sessions: StoredSessionRecord[]
  avg_reaction_ms: number | null
  last_avg_reaction_ms: number | null
  best_note: NotePerformance | null
  worst_note: NotePerformance | null
  /** Jusqu’à 3 notes les plus réussies. */
  best_notes: NotePerformance[]
  /** Jusqu’à 3 notes les moins réussies (sans chevauchement avec best_notes). */
  worst_notes: NotePerformance[]
}

function empty_bucket(): GameStatsBucket {
  return {
    total_duration_ms: 0,
    total_attempts: 0,
    total_successes: 0,
    sessions: [],
    notes: {},
  }
}

function is_game_id(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value)
}

function is_note_aggregate(value: unknown): value is StoredNoteAggregate {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.attempts === 'number' &&
    typeof data.successes === 'number' &&
    typeof data.reaction_sum === 'number' &&
    typeof data.reaction_count === 'number'
  )
}

function is_session_record(value: unknown): value is StoredSessionRecord {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.started_at === 'number' &&
    typeof data.duration_ms === 'number' &&
    typeof data.attempts === 'number' &&
    typeof data.successes === 'number' &&
    (data.avg_reaction_ms === null || typeof data.avg_reaction_ms === 'number') &&
    typeof data.register_id === 'string'
  )
}

function sanitize_bucket(raw: unknown): GameStatsBucket {
  const bucket = empty_bucket()
  if (!raw || typeof raw !== 'object') return bucket
  const data = raw as Record<string, unknown>

  if (typeof data.total_duration_ms === 'number' && Number.isFinite(data.total_duration_ms)) {
    bucket.total_duration_ms = Math.max(0, Math.round(data.total_duration_ms))
  }
  if (typeof data.total_attempts === 'number' && Number.isFinite(data.total_attempts)) {
    bucket.total_attempts = Math.max(0, Math.round(data.total_attempts))
  }
  if (typeof data.total_successes === 'number' && Number.isFinite(data.total_successes)) {
    bucket.total_successes = Math.max(0, Math.round(data.total_successes))
  }

  if (Array.isArray(data.sessions)) {
    bucket.sessions = data.sessions.filter(is_session_record).slice(-MAX_SESSIONS)
  }

  if (data.notes && typeof data.notes === 'object') {
    for (const [note_id, aggregate] of Object.entries(data.notes as Record<string, unknown>)) {
      if (is_note_aggregate(aggregate)) {
        bucket.notes[note_id] = {
          attempts: Math.max(0, Math.round(aggregate.attempts)),
          successes: Math.max(0, Math.round(aggregate.successes)),
          reaction_sum: Math.max(0, aggregate.reaction_sum),
          reaction_count: Math.max(0, Math.round(aggregate.reaction_count)),
        }
      }
    }
  }

  return bucket
}

function create_empty_store(): GameStatsStore {
  return { version: STORAGE_VERSION, games: {} }
}

function sanitize_store(raw: unknown): GameStatsStore {
  const store = create_empty_store()
  if (!raw || typeof raw !== 'object') return store
  const data = raw as Record<string, unknown>
  if (data.version !== STORAGE_VERSION) return store
  if (!data.games || typeof data.games !== 'object') return store

  for (const [key, value] of Object.entries(data.games as Record<string, unknown>)) {
    if (is_game_id(key)) {
      store.games[key] = sanitize_bucket(value)
    }
  }
  return store
}

const store_ref = ref<GameStatsStore>(create_empty_store())
let hydrated = false

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store_ref.value))
  } catch {
    /* stockage indisponible */
  }
}

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    store_ref.value = sanitize_store(JSON.parse(raw) as unknown)
  } catch {
    /* JSON invalide ou stockage illisible */
  }
}

function ensure_bucket(game_id: GameId): GameStatsBucket {
  const existing = store_ref.value.games[game_id]
  if (existing) return existing
  const created = empty_bucket()
  store_ref.value.games[game_id] = created
  return created
}

function note_labels(note_id: string): { american: string; french: string } {
  const note = parse_note_id(note_id)
  if (!note) return { american: note_id, french: note_id }
  return { american: american_label(note), french: french_label(note) }
}

function note_aggregates_to_performances(
  notes: Record<string, StoredNoteAggregate>,
): NotePerformance[] {
  return Object.entries(notes).map(([note_id, entry]) => {
    const labels = note_labels(note_id)
    return {
      note_id,
      american: labels.american,
      french: labels.french,
      attempts: entry.attempts,
      successes: entry.successes,
      success_rate: entry.attempts > 0 ? entry.successes / entry.attempts : 0,
      avg_reaction_ms:
        entry.reaction_count > 0
          ? Math.round(entry.reaction_sum / entry.reaction_count)
          : null,
    }
  })
}

function pick_best_notes(notes: NotePerformance[], count: number): NotePerformance[] {
  return [...notes]
    .sort((a, b) => {
      if (b.success_rate !== a.success_rate) return b.success_rate - a.success_rate
      const a_ms = a.avg_reaction_ms ?? Number.POSITIVE_INFINITY
      const b_ms = b.avg_reaction_ms ?? Number.POSITIVE_INFINITY
      return a_ms - b_ms
    })
    .slice(0, count)
}

function pick_worst_notes(
  notes: NotePerformance[],
  count: number,
  exclude_ids: Set<string>,
): NotePerformance[] {
  return [...notes]
    .filter((note) => !exclude_ids.has(note.note_id))
    .sort((a, b) => {
      if (a.success_rate !== b.success_rate) return a.success_rate - b.success_rate
      const a_ms = a.avg_reaction_ms ?? Number.NEGATIVE_INFINITY
      const b_ms = b.avg_reaction_ms ?? Number.NEGATIVE_INFINITY
      return b_ms - a_ms
    })
    .slice(0, count)
}

function snapshot_for(bucket: GameStatsBucket | undefined): GameStatsSnapshot {
  if (!bucket) {
    return {
      total_duration_ms: 0,
      total_attempts: 0,
      total_successes: 0,
      success_rate: 0,
      session_count: 0,
      sessions: [],
      avg_reaction_ms: null,
      last_avg_reaction_ms: null,
      best_note: null,
      worst_note: null,
      best_notes: [],
      worst_notes: [],
    }
  }

  const performances = note_aggregates_to_performances(bucket.notes)
  const best_notes = pick_best_notes(performances, 3)
  const best_ids = new Set(best_notes.map((note) => note.note_id))
  const worst_notes = pick_worst_notes(performances, 3, best_ids)
  const best_note = best_notes[0] ?? null
  const worst_note = worst_notes[0] ?? null

  const reaction_totals = Object.values(bucket.notes).reduce(
    (acc, note) => {
      acc.sum += note.reaction_sum
      acc.count += note.reaction_count
      return acc
    },
    { sum: 0, count: 0 },
  )

  const last_session = bucket.sessions[bucket.sessions.length - 1] ?? null

  return {
    total_duration_ms: bucket.total_duration_ms,
    total_attempts: bucket.total_attempts,
    total_successes: bucket.total_successes,
    success_rate:
      bucket.total_attempts > 0 ? bucket.total_successes / bucket.total_attempts : 0,
    session_count: bucket.sessions.length,
    sessions: bucket.sessions,
    avg_reaction_ms:
      reaction_totals.count > 0
        ? Math.round(reaction_totals.sum / reaction_totals.count)
        : null,
    last_avg_reaction_ms: last_session?.avg_reaction_ms ?? null,
    best_note,
    worst_note,
    best_notes,
    worst_notes,
  }
}

export interface RecordSessionInput {
  game_id: GameId
  started_at: number
  register_id: RegisterId
  summary: SessionSummary
  trials: SessionTrialInput[]
}

export function use_game_stats() {
  hydrate()

  function record_session(input: RecordSessionInput) {
    if (input.summary.attempts <= 0) return

    const bucket = ensure_bucket(input.game_id)
    bucket.total_duration_ms += input.summary.duration_ms
    bucket.total_attempts += input.summary.attempts
    bucket.total_successes += input.summary.successes

    bucket.sessions.push({
      started_at: input.started_at,
      duration_ms: input.summary.duration_ms,
      attempts: input.summary.attempts,
      successes: input.summary.successes,
      avg_reaction_ms: input.summary.avg_reaction_ms,
      register_id: input.register_id,
    })
    if (bucket.sessions.length > MAX_SESSIONS) {
      bucket.sessions = bucket.sessions.slice(-MAX_SESSIONS)
    }

    for (const trial of input.trials) {
      let note = bucket.notes[trial.note_id]
      if (!note) {
        note = { attempts: 0, successes: 0, reaction_sum: 0, reaction_count: 0 }
        bucket.notes[trial.note_id] = note
      }
      note.attempts += 1
      if (trial.success) {
        note.successes += 1
        if (trial.reaction_ms != null && Number.isFinite(trial.reaction_ms)) {
          note.reaction_sum += trial.reaction_ms
          note.reaction_count += 1
        }
      }
    }

    /* Déclenche la réactivité Vue (mutation profonde). */
    store_ref.value = {
      version: STORAGE_VERSION,
      games: { ...store_ref.value.games, [input.game_id]: { ...bucket, sessions: [...bucket.sessions], notes: { ...bucket.notes } } },
    }
    persist()
  }

  function stats_for(game_id: GameId): GameStatsSnapshot {
    return snapshot_for(store_ref.value.games[game_id])
  }

  const reading_stats = computed(() => stats_for('reading'))

  return {
    store: store_ref,
    record_session,
    stats_for,
    reading_stats,
  }
}
