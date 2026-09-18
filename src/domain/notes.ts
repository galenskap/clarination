/** Orthographes préférées pour la clarinette (tempérament égal). */
export const NOTE_LETTERS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

export type NoteLetter = (typeof NOTE_LETTERS)[number]
export type Accidental = 'sharp' | 'flat' | 'natural' | null

export type NoteDuration = 'quarter' | 'half' | 'whole'

export interface MusicalNote {
  note_id: string
  letter: NoteLetter
  octave: number
  midi: number
  accidental: Accidental
  /** Degrés diatoniques depuis C0 (pour position portée). */
  diatonic_index: number
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

const NATURAL_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

function accidental_of(letter: NoteLetter): Accidental {
  if (letter.includes('#')) return 'sharp'
  if (letter.includes('b') && letter.length > 1) return 'flat'
  return null
}

function natural_letter(letter: NoteLetter): string {
  return letter.replace('#', '').replace('b', '')
}

function diatonic_index_of(letter: NoteLetter, octave: number): number {
  const natural = natural_letter(letter)
  const idx = NATURAL_ORDER.indexOf(natural as (typeof NATURAL_ORDER)[number])
  return octave * 7 + idx
}

export function midi_to_hz(midi: number, a4_hz = 440): number {
  return a4_hz * 2 ** ((midi - 69) / 12)
}

export function hz_to_midi(hz: number, a4_hz = 440): number {
  return 69 + 12 * Math.log2(hz / a4_hz)
}

export function note_from_midi(midi: number): MusicalNote {
  const rounded = Math.round(midi)
  const pc = ((rounded % 12) + 12) % 12
  const octave = Math.floor(rounded / 12) - 1
  const letter = NOTE_LETTERS[pc]
  return {
    note_id: `${letter}${octave}`,
    letter,
    octave,
    midi: rounded,
    accidental: accidental_of(letter),
    diatonic_index: diatonic_index_of(letter, octave),
  }
}

export function parse_note_id(note_id: string): MusicalNote | null {
  const match = note_id.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!match) return null
  const letter = match[1] as NoteLetter
  if (!(letter in LETTER_TO_PC)) return null
  const octave = Number(match[2])
  const midi = (octave + 1) * 12 + LETTER_TO_PC[letter]
  return {
    note_id: `${letter}${octave}`,
    letter,
    octave,
    midi,
    accidental: accidental_of(letter),
    diatonic_index: diatonic_index_of(letter, octave),
  }
}

export function build_range(midi_min: number, midi_max: number): MusicalNote[] {
  const notes: MusicalNote[] = []
  for (let midi = midi_min; midi <= midi_max; midi += 1) {
    notes.push(note_from_midi(midi))
  }
  return notes
}

/** Position verticale relative à B4 (ligne du milieu en clé de sol) : +1 = un degré plus haut. */
export function staff_steps_from_b4(note: MusicalNote): number {
  const b4 = diatonic_index_of('B', 4)
  return note.diatonic_index - b4
}

export function display_label(note: MusicalNote): string {
  return note.note_id
}

const FRENCH_LETTER: Record<NoteLetter, string> = {
  C: 'Do',
  'C#': 'Do♯',
  D: 'Ré',
  Eb: 'Mi♭',
  E: 'Mi',
  F: 'Fa',
  'F#': 'Fa♯',
  G: 'Sol',
  Ab: 'La♭',
  A: 'La',
  Bb: 'Si♭',
  B: 'Si',
}

/** Libellé américain (notation scientifique du projet), ex. F#5. */
export function american_label(note: MusicalNote): string {
  return note.note_id
}

/** Libellé français (solfège + octave scientifique), ex. Fa♯5. */
export function french_label(note: MusicalNote): string {
  return `${FRENCH_LETTER[note.letter]}${note.octave}`
}
