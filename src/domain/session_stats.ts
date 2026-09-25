import {
  american_label,
  french_label,
  parse_note_id,
} from '@/domain/notes'
import { is_chord_symbol } from '@/domain/chords'

export interface SessionTrialInput {
  note_id: string
  success: boolean
  reaction_ms: number | null
}

export interface NotePerformance {
  note_id: string
  american: string
  french: string
  attempts: number
  successes: number
  success_rate: number
  /** Moyenne des temps de réaction des succès uniquement (ms), ou null. */
  avg_reaction_ms: number | null
}

export interface SessionSummary {
  attempts: number
  successes: number
  success_rate: number
  duration_ms: number
  avg_reaction_ms: number | null
  best_note: NotePerformance | null
  worst_note: NotePerformance | null
  per_note: NotePerformance[]
}

function note_labels(note_id: string): { american: string; french: string } {
  if (is_chord_symbol(note_id)) {
    return { american: note_id, french: note_id }
  }
  const note = parse_note_id(note_id)
  if (!note) return { american: note_id, french: note_id }
  return { american: american_label(note), french: french_label(note) }
}

function aggregate_notes(trials: SessionTrialInput[]): NotePerformance[] {
  const map = new Map<
    string,
    { attempts: number; successes: number; reaction_sum: number; reaction_count: number }
  >()

  for (const trial of trials) {
    let entry = map.get(trial.note_id)
    if (!entry) {
      entry = { attempts: 0, successes: 0, reaction_sum: 0, reaction_count: 0 }
      map.set(trial.note_id, entry)
    }
    entry.attempts += 1
    if (trial.success) {
      entry.successes += 1
      if (trial.reaction_ms != null && Number.isFinite(trial.reaction_ms)) {
        entry.reaction_sum += trial.reaction_ms
        entry.reaction_count += 1
      }
    }
  }

  return [...map.entries()].map(([note_id, entry]) => {
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

/** Plus réussie : meilleur %, puis temps moyen des succès le plus bas. */
function pick_best(notes: NotePerformance[]): NotePerformance | null {
  if (notes.length === 0) return null
  return [...notes].sort((a, b) => {
    if (b.success_rate !== a.success_rate) return b.success_rate - a.success_rate
    const a_ms = a.avg_reaction_ms ?? Number.POSITIVE_INFINITY
    const b_ms = b.avg_reaction_ms ?? Number.POSITIVE_INFINITY
    return a_ms - b_ms
  })[0]
}

/** Moins réussie : pire %, puis temps moyen le plus haut. */
function pick_worst(notes: NotePerformance[]): NotePerformance | null {
  if (notes.length === 0) return null
  return [...notes].sort((a, b) => {
    if (a.success_rate !== b.success_rate) return a.success_rate - b.success_rate
    const a_ms = a.avg_reaction_ms ?? Number.NEGATIVE_INFINITY
    const b_ms = b.avg_reaction_ms ?? Number.NEGATIVE_INFINITY
    return b_ms - a_ms
  })[0]
}

export function summarize_trials(
  trials: SessionTrialInput[],
  duration_ms: number,
): SessionSummary {
  const successes = trials.filter((t) => t.success).length
  const attempts = trials.length
  const reaction_values = trials
    .filter((t) => t.success && t.reaction_ms != null && Number.isFinite(t.reaction_ms))
    .map((t) => t.reaction_ms as number)
  const avg_reaction_ms =
    reaction_values.length > 0
      ? Math.round(
          reaction_values.reduce((sum, value) => sum + value, 0) / reaction_values.length,
        )
      : null

  const per_note = aggregate_notes(trials)
  const best_note = pick_best(per_note)
  /* Une seule note distincte : uniquement la plus réussie. */
  let worst_note: NotePerformance | null = null
  if (per_note.length > 1) {
    const candidate = pick_worst(per_note)
    if (candidate && candidate.note_id !== best_note?.note_id) {
      worst_note = candidate
    }
  }

  return {
    attempts,
    successes,
    success_rate: attempts > 0 ? successes / attempts : 0,
    duration_ms: Math.max(0, Math.round(duration_ms)),
    avg_reaction_ms,
    best_note,
    worst_note,
    per_note,
  }
}

/** Durée lisible : `45 s`, `1 min 23 s`, `1 h 02 min`. */
export function format_duration(ms: number): string {
  const total_seconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total_seconds / 3600)
  const minutes = Math.floor((total_seconds % 3600) / 60)
  const seconds = total_seconds % 60

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, '0')} min`
  }
  if (minutes > 0) {
    return `${minutes} min ${String(seconds).padStart(2, '0')} s`
  }
  return `${seconds} s`
}

export function format_success_rate(rate: number): string {
  if (!Number.isFinite(rate)) return '0 %'
  return `${Math.round(rate * 100)} %`
}

export function format_reaction_ms(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1).replace(/\.0$/, '')} s`
}
