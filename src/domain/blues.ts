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

/** Intervalles blue notes relatifs à la fondamentale : ♭3, 4, ♭5. */
const BLUE_SPECS: {
  role: Extract<BluesBingoRoleId, 'blue_third' | 'blue_fourth' | 'blue_fifth'>
  interval: number
  label: string
}[] = [
  { role: 'blue_third', interval: 3, label: '♭3' },
  { role: 'blue_fourth', interval: 5, label: 'Quarte' },
  { role: 'blue_fifth', interval: 6, label: '♭5' },
]

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

export function parse_blues_blue_notes_query(raw: unknown): boolean {
  if (raw === '1' || raw === 'true' || raw === true || raw === 1) return true
  return false
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

/** Blue notes absentes de l’accord (relatives à sa fondamentale). */
export function blue_note_tones(chord: ChordDefinition): BluesBingoTone[] {
  const root_pc = LETTER_TO_PC[chord.root]
  const occupied = chord_pitch_classes(chord)
  const tones: BluesBingoTone[] = []
  for (const spec of BLUE_SPECS) {
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

/** Cases du bingo pour une mesure (notes d’accord ± blue notes). */
export function tones_for_blues_bingo(
  chord: ChordDefinition,
  count_blue_notes: boolean,
): BluesBingoTone[] {
  const tones = chord.tones.map((tone) => chord_tone_as_bingo(chord, tone))
  if (count_blue_notes) {
    tones.push(...blue_note_tones(chord))
  }
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

/** Clé compacte pour les stats (`90bpm+blue` / `90bpm`). */
export function blues_session_key(bpm: number, count_blue_notes: boolean): string {
  return count_blue_notes ? `${bpm}bpm+blue` : `${bpm}bpm`
}

export function blues_session_key_label(raw: string): string {
  const match = raw.match(/^(\d+)bpm(\+blue)?$/)
  if (!match) return raw
  const bpm = match[1]
  return match[2] ? `${bpm} BPM · blue notes` : `${bpm} BPM`
}

export const BLUES_ROOT_OPTIONS: NoteLetter[] = [...NOTE_LETTERS]
