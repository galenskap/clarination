import { NOTE_LETTERS, note_from_midi, type MusicalNote, type NoteLetter } from './notes'

/** Qualités d’accords proposées au joueur. */
export const CHORD_QUALITY_IDS = [
  'major',
  'minor',
  'aug',
  'dim',
  'dom7',
  'maj7',
  'min7',
  'dom9',
  'maj9',
  'min9',
] as const

export type ChordQualityId = (typeof CHORD_QUALITY_IDS)[number]

export type ChordRoleId = 'root' | 'third' | 'fifth' | 'seventh' | 'ninth'

export interface ChordTone {
  role: ChordRoleId
  /** Classe de hauteur 0–11 (C = 0). */
  pitch_class: number
  /** Lettre préférée pour cette composante (orthographe de l’app). */
  letter: NoteLetter
}

export interface ChordDefinition {
  symbol: string
  quality: ChordQualityId
  root: NoteLetter
  tones: ChordTone[]
}

export interface ChordQualityMeta {
  id: ChordQualityId
  /** Libellé court pour les cases à cocher. */
  label: string
  /** Exemple de symbole (sur C). */
  example: string
  /** Libellé compact pour les stats (survol). */
  short_label: string
}

const ROLE_LABELS: Record<ChordRoleId, string> = {
  root: 'Fondamentale',
  third: 'Tierce',
  fifth: 'Quinte',
  seventh: 'Septième',
  ninth: 'Neuvième',
}

/** Intervalles en demi-tons depuis la fondamentale, dans l’ordre des rôles. */
const QUALITY_INTERVALS: Record<
  ChordQualityId,
  { roles: ChordRoleId[]; intervals: number[]; suffix: string }
> = {
  major: { roles: ['root', 'third', 'fifth'], intervals: [0, 4, 7], suffix: '' },
  minor: { roles: ['root', 'third', 'fifth'], intervals: [0, 3, 7], suffix: 'm' },
  aug: { roles: ['root', 'third', 'fifth'], intervals: [0, 4, 8], suffix: '+' },
  dim: { roles: ['root', 'third', 'fifth'], intervals: [0, 3, 6], suffix: 'dim' },
  dom7: {
    roles: ['root', 'third', 'fifth', 'seventh'],
    intervals: [0, 4, 7, 10],
    suffix: '7',
  },
  maj7: {
    roles: ['root', 'third', 'fifth', 'seventh'],
    intervals: [0, 4, 7, 11],
    suffix: 'maj7',
  },
  min7: {
    roles: ['root', 'third', 'fifth', 'seventh'],
    intervals: [0, 3, 7, 10],
    suffix: 'm7',
  },
  dom9: {
    roles: ['root', 'third', 'fifth', 'seventh', 'ninth'],
    intervals: [0, 4, 7, 10, 2],
    suffix: '9',
  },
  maj9: {
    roles: ['root', 'third', 'fifth', 'seventh', 'ninth'],
    intervals: [0, 4, 7, 11, 2],
    suffix: 'maj9',
  },
  min9: {
    roles: ['root', 'third', 'fifth', 'seventh', 'ninth'],
    intervals: [0, 3, 7, 10, 2],
    suffix: 'm9',
  },
}

export const CHORD_QUALITIES: ChordQualityMeta[] = [
  { id: 'major', label: 'Majeur', example: 'C', short_label: 'M' },
  { id: 'minor', label: 'Mineur', example: 'Cm', short_label: 'm' },
  { id: 'aug', label: 'Augmenté', example: 'C+', short_label: '+' },
  { id: 'dim', label: 'Diminué', example: 'Cdim', short_label: 'dim' },
  { id: 'dom7', label: 'Septième', example: 'C7', short_label: '7' },
  { id: 'maj7', label: 'Septième majeure', example: 'Cmaj7', short_label: 'maj7' },
  { id: 'min7', label: 'Septième mineure', example: 'Cm7', short_label: 'm7' },
  { id: 'dom9', label: 'Neuvième', example: 'C9', short_label: '9' },
  { id: 'maj9', label: 'Neuvième majeure', example: 'Cmaj9', short_label: 'maj9' },
  { id: 'min9', label: 'Neuvième mineure', example: 'Cm9', short_label: 'm9' },
]

const LETTER_TO_PC: Record<NoteLetter, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
}

export function is_chord_quality_id(value: unknown): value is ChordQualityId {
  return (
    typeof value === 'string' &&
    (CHORD_QUALITY_IDS as readonly string[]).includes(value)
  )
}

export function chord_role_label(role: ChordRoleId): string {
  return ROLE_LABELS[role]
}

/** Note midi → classe de hauteur 0–11. */
export function pitch_class_of_midi(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12
}

export function pitch_class_of_note(note: MusicalNote): number {
  return pitch_class_of_midi(note.midi)
}

/**
 * Symbole d’accord du catalogue (sans octave), ex. `Em`, `Bb7`, `Cmaj9`.
 * Distingue `C7` (accord) de `C4` (note).
 */
export function is_chord_symbol(value: string): boolean {
  return /^(?:[A-G](?:#|b)?)(?:m|dim|\+|maj7|m7|maj9|m9|7|9)?$/.test(value)
}

function letter_for_pitch_class(pc: number): NoteLetter {
  return NOTE_LETTERS[((pc % 12) + 12) % 12]
}

export function chord_symbol(root: NoteLetter, quality: ChordQualityId): string {
  return `${root}${QUALITY_INTERVALS[quality].suffix}`
}

export function build_chord(root: NoteLetter, quality: ChordQualityId): ChordDefinition {
  const spec = QUALITY_INTERVALS[quality]
  const root_pc = LETTER_TO_PC[root]
  const tones: ChordTone[] = spec.roles.map((role, index) => {
    const pitch_class = (root_pc + spec.intervals[index]) % 12
    return {
      role,
      pitch_class,
      letter: letter_for_pitch_class(pitch_class),
    }
  })
  return {
    symbol: chord_symbol(root, quality),
    quality,
    root,
    tones,
  }
}

/** Catalogue complet pour les qualités demandées (12 fondamentales × qualités). */
export function chords_for_qualities(qualities: readonly ChordQualityId[]): ChordDefinition[] {
  const unique = [...new Set(qualities.filter(is_chord_quality_id))]
  const chords: ChordDefinition[] = []
  for (const root of NOTE_LETTERS) {
    for (const quality of unique) {
      chords.push(build_chord(root, quality))
    }
  }
  return chords
}

export function parse_chord_types_query(raw: unknown): ChordQualityId[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const qualities: ChordQualityId[] = []
  for (const part of parts) {
    if (!is_chord_quality_id(part)) return null
    if (!qualities.includes(part)) qualities.push(part)
  }
  return qualities.length > 0 ? qualities : null
}

export function chord_types_query(qualities: readonly ChordQualityId[]): string {
  return qualities.filter(is_chord_quality_id).join(',')
}

/** Libellé compact pour le survol des stats (ex. `M m + 7 9`). */
export function chord_types_short_label(qualities: readonly ChordQualityId[]): string {
  return qualities
    .filter(is_chord_quality_id)
    .map((id) => CHORD_QUALITIES.find((q) => q.id === id)?.short_label ?? id)
    .join(' ')
}

/** Parse une clé de session (`major,minor,aug`) pour l’affichage stats. */
export function parse_session_chord_types(raw: string): ChordQualityId[] | null {
  return parse_chord_types_query(raw)
}

/**
 * Trouve le rôle correspondant à une note jouée (toute octave).
 * Retourne null si la classe de hauteur n’appartient pas à l’accord.
 */
export function match_chord_tone(
  chord: ChordDefinition,
  note: MusicalNote,
): ChordTone | null {
  const pc = pitch_class_of_note(note)
  return chord.tones.find((tone) => tone.pitch_class === pc) ?? null
}

/** Note affichable à partir d’une lettre + octave (pour StaffSvg). */
export function note_from_letter_octave(letter: NoteLetter, octave: number): MusicalNote {
  return note_from_midi((octave + 1) * 12 + LETTER_TO_PC[letter])
}
