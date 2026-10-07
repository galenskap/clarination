import {
  build_chord,
  chord_tone_detail_label,
  letter_for_pitch_class,
  parse_chord_symbol,
  pitch_class_of_note,
  type ChordDefinition,
  type ChordRoleId,
  type ChordTone,
} from '@/domain/chords'
import { NOTE_LETTERS, type MusicalNote, type NoteLetter } from '@/domain/notes'

export const BLUES_GRID_SIZE = 12
export const BLUES_BEATS_PER_MEASURE = 4
export const BLUES_BPM_MIN = 40
export const BLUES_BPM_MAX = 200
export const BLUES_BPM_DEFAULT = 90

/** Rôles du bingo blues (notes d’accord + blue notes optionnelles). */
export type BluesBingoRoleId =
  | ChordRoleId
  | 'blue_third'
  | 'blue_fourth'
  | 'blue_fifth'

export interface BluesBingoTone {
  role: BluesBingoRoleId
  pitch_class: number
  letter: NoteLetter
  label: string
}

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

/** Blue notes optionnelles relatives à la fondamentale de l’accord. */
export type BluesBlueNoteId = 'blue_third' | 'blue_fourth' | 'blue_fifth'

export type BluesBlueNotesOptions = Readonly<Record<BluesBlueNoteId, boolean>>

export const BLUES_BLUE_NOTE_IDS: readonly BluesBlueNoteId[] = [
  'blue_third',
  'blue_fourth',
  'blue_fifth',
] as const

/** Intervalles blue notes relatifs à la fondamentale : ♭3, 4, ♭5. */
const BLUE_SPECS: {
  role: BluesBlueNoteId
  interval: number
  label: string
  /** Jeton compact pour l’URL / les stats. */
  token: string
}[] = [
  { role: 'blue_third', interval: 3, label: '♭3', token: 'b3' },
  { role: 'blue_fourth', interval: 5, label: 'Quarte', token: '4' },
  { role: 'blue_fifth', interval: 6, label: '♭5', token: 'b5' },
]

const BLUE_TOKEN_TO_ID: Record<string, BluesBlueNoteId> = {
  b3: 'blue_third',
  '3': 'blue_third',
  '4': 'blue_fourth',
  b5: 'blue_fifth',
  '5': 'blue_fifth',
}

export const BLUES_BLUE_NOTE_OPTIONS: {
  id: BluesBlueNoteId
  label: string
  short_label: string
}[] = [
  { id: 'blue_third', label: 'Tierce dim (♭3)', short_label: '♭3' },
  { id: 'blue_fourth', label: 'Quarte', short_label: '4' },
  { id: 'blue_fifth', label: 'Quinte dim (♭5)', short_label: '♭5' },
]

export function empty_blues_blue_notes(): BluesBlueNotesOptions {
  return { blue_third: false, blue_fourth: false, blue_fifth: false }
}

export function all_blues_blue_notes(): BluesBlueNotesOptions {
  return { blue_third: true, blue_fourth: true, blue_fifth: true }
}

export function has_any_blues_blue_note(options: BluesBlueNotesOptions): boolean {
  return BLUES_BLUE_NOTE_IDS.some((id) => options[id])
}

export function is_blues_bpm(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= BLUES_BPM_MIN &&
    value <= BLUES_BPM_MAX
  )
}

export function parse_blues_bpm_query(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return null
  const bpm = Math.round(value)
  return is_blues_bpm(bpm) ? bpm : null
}

/** Encode les blue notes cochées (`b3,4,b5` / `0`). */
export function blues_blue_notes_query(options: BluesBlueNotesOptions): string {
  const tokens = BLUE_SPECS.filter((spec) => options[spec.role]).map((spec) => spec.token)
  return tokens.length > 0 ? tokens.join(',') : '0'
}

/**
 * Parse `blue` : `1` / `true` = les trois (ancien format),
 * `0` / vide = aucune, sinon liste `b3,4,b5`.
 */
export function parse_blues_blue_notes_query(raw: unknown): BluesBlueNotesOptions {
  if (raw === '1' || raw === 'true' || raw === true || raw === 1) {
    return all_blues_blue_notes()
  }
  if (raw == null || raw === '' || raw === '0' || raw === 'false' || raw === false) {
    return empty_blues_blue_notes()
  }
  if (typeof raw !== 'string') return empty_blues_blue_notes()

  const options = {
    blue_third: false,
    blue_fourth: false,
    blue_fifth: false,
  }
  for (const part of raw.split(/[,+|]/).map((token) => token.trim().toLowerCase())) {
    if (!part) continue
    const id = BLUE_TOKEN_TO_ID[part]
    if (id) options[id] = true
  }
  return options
}

export function blues_grid_query(chords: readonly ChordDefinition[]): string {
  return chords.map((chord) => chord.symbol).join(',')
}

export function parse_blues_grid_query(raw: unknown): ChordDefinition[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length !== BLUES_GRID_SIZE) return null
  const chords: ChordDefinition[] = []
  for (const part of parts) {
    const chord = parse_chord_symbol(part)
    if (!chord) return null
    chords.push(chord)
  }
  return chords
}

/** Grille blues classique I7×4 / IV7×2 I7×2 / V7 IV7 I7 I7. */
export function classic_blues_grid(root: NoteLetter): ChordDefinition[] {
  const root_pc = LETTER_TO_PC[root]
  const one = build_chord(root, 'dom7')
  const four = build_chord(letter_for_pitch_class(root_pc + 5), 'dom7')
  const five = build_chord(letter_for_pitch_class(root_pc + 7), 'dom7')
  return [
    one,
    one,
    one,
    one,
    four,
    four,
    one,
    one,
    five,
    four,
    one,
    one,
  ]
}

export function empty_blues_grid(): (ChordDefinition | null)[] {
  return Array.from({ length: BLUES_GRID_SIZE }, () => null)
}

function chord_pitch_classes(chord: ChordDefinition): Set<number> {
  return new Set(chord.tones.map((tone) => tone.pitch_class))
}

/**
 * Blue notes absentes de l’accord (relatives à sa fondamentale).
 * Sans `options`, renvoie les trois candidates (pour neutralité hors bingo).
 */
export function blue_note_tones(
  chord: ChordDefinition,
  options?: BluesBlueNotesOptions,
): BluesBingoTone[] {
  const root_pc = LETTER_TO_PC[chord.root]
  const occupied = chord_pitch_classes(chord)
  const tones: BluesBingoTone[] = []
  for (const spec of BLUE_SPECS) {
    if (options && !options[spec.role]) continue
    const pitch_class = (root_pc + spec.interval) % 12
    if (occupied.has(pitch_class)) continue
    tones.push({
      role: spec.role,
      pitch_class,
      letter: letter_for_pitch_class(pitch_class),
      label: spec.label,
    })
  }
  return tones
}

export function is_blue_note_pitch(chord: ChordDefinition, pitch_class: number): boolean {
  return blue_note_tones(chord).some((tone) => tone.pitch_class === pitch_class)
}

function chord_tone_as_bingo(chord: ChordDefinition, tone: ChordTone): BluesBingoTone {
  return {
    role: tone.role,
    pitch_class: tone.pitch_class,
    letter: tone.letter,
    label: chord_tone_detail_label(chord, tone.role),
  }
}

/** Cases du bingo pour une mesure (notes d’accord ± blue notes cochées). */
export function tones_for_blues_bingo(
  chord: ChordDefinition,
  blue_notes: BluesBlueNotesOptions,
): BluesBingoTone[] {
  const tones = chord.tones.map((tone) => chord_tone_as_bingo(chord, tone))
  tones.push(...blue_note_tones(chord, blue_notes))
  return tones
}

export function match_blues_bingo_tone(
  tones: readonly BluesBingoTone[],
  note: MusicalNote,
): BluesBingoTone | null {
  const pc = pitch_class_of_note(note)
  return tones.find((tone) => tone.pitch_class === pc) ?? null
}

export function measure_duration_ms(bpm: number): number {
  return (BLUES_BEATS_PER_MEASURE * 60_000) / bpm
}

export function beat_duration_ms(bpm: number): number {
  return 60_000 / bpm
}

/** Clé compacte pour les stats (`90bpm+b3+4+b5` / `90bpm` ; ancien `+blue`). */
export function blues_session_key(bpm: number, blue_notes: BluesBlueNotesOptions): string {
  const tokens = BLUE_SPECS.filter((spec) => blue_notes[spec.role]).map((spec) => spec.token)
  if (tokens.length === 0) return `${bpm}bpm`
  return `${bpm}bpm+${tokens.join('+')}`
}

export function blues_session_key_label(raw: string): string {
  const match = raw.match(/^(\d+)bpm(.*)$/)
  if (!match) return raw
  const bpm = match[1]
  const suffix = match[2] ?? ''
  if (!suffix) return `${bpm} BPM`
  if (suffix === '+blue') return `${bpm} BPM · ♭3 · 4 · ♭5`

  const labels: string[] = []
  for (const part of suffix.split('+').filter(Boolean)) {
    const id = BLUE_TOKEN_TO_ID[part.toLowerCase()]
    const meta = BLUES_BLUE_NOTE_OPTIONS.find((entry) => entry.id === id)
    if (meta) labels.push(meta.short_label)
  }
  return labels.length > 0 ? `${bpm} BPM · ${labels.join(' · ')}` : `${bpm} BPM`
}

export const BLUES_ROOT_OPTIONS: NoteLetter[] = [...NOTE_LETTERS]
