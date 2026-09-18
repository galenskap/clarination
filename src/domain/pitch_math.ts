import {
  hz_to_midi,
  midi_to_hz,
  note_from_midi,
  type MusicalNote,
} from './notes'

export interface PitchAnalysis {
  frequency_hz: number
  nearest_note: MusicalNote
  cents_offset: number
  midi_exact: number
}

/** Écart en cents entre une fréquence et le MIDI entier le plus proche. */
export function cents_from_hz(frequency_hz: number, a4_hz = 440): number {
  const midi_exact = hz_to_midi(frequency_hz, a4_hz)
  const nearest = Math.round(midi_exact)
  return (midi_exact - nearest) * 100
}

export function analyze_pitch(
  frequency_hz: number,
  a4_hz = 440,
): PitchAnalysis | null {
  if (!Number.isFinite(frequency_hz) || frequency_hz <= 0) return null
  const midi_exact = hz_to_midi(frequency_hz, a4_hz)
  const nearest_note = note_from_midi(midi_exact)
  const cents_offset = (midi_exact - nearest_note.midi) * 100
  return {
    frequency_hz,
    nearest_note,
    cents_offset,
    midi_exact,
  }
}

/** Écart en cents par rapport à une note cible (pas forcément la plus proche). */
export function cents_to_target(
  frequency_hz: number,
  target_midi: number,
  a4_hz = 440,
): number {
  const midi_exact = hz_to_midi(frequency_hz, a4_hz)
  return (midi_exact - target_midi) * 100
}

/** Justesse acceptée pour une note « parfaite » (un quart de ton). */
export const IN_TUNE_CENTS = 50
/** Un ton entier = deux demi-tons = 200 cents. */
export const TONE_CENTS = 200

export type NoteProximity = 'perfect' | 'near' | 'far'

export function is_in_tune(
  cents_offset: number,
  tolerance_cents = IN_TUNE_CENTS,
): boolean {
  return Math.abs(cents_offset) < tolerance_cents
}

/** Un demi-ton = 100 cents. */
export function is_half_tone_or_more(cents_offset: number): boolean {
  return Math.abs(cents_offset) >= 100
}

/** Un ton ou plus d’écart avec la cible. */
export function is_tone_or_more(cents_offset: number): boolean {
  return Math.abs(cents_offset) >= TONE_CENTS
}

/** Couleur de feedback : vert / orange / rouge selon l’écart à la note attendue. */
export function note_proximity(cents_offset: number): NoteProximity {
  if (is_in_tune(cents_offset)) return 'perfect'
  if (is_tone_or_more(cents_offset)) return 'far'
  return 'near'
}

export function target_frequency(midi: number, a4_hz = 440): number {
  return midi_to_hz(midi, a4_hz)
}

/** Médiane simple pour lisser les détections. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}
