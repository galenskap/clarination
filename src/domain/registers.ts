import { build_range, parse_note_id, type MusicalNote } from '@/domain/notes'

/**
 * Tessitures écrites de la clarinette Sib.
 *
 * Les bornes suivent la notation scientifique du projet (mi grave = E3),
 * soit une octave au-dessus de la numérotation française des méthodes
 * (mi2, sol2, si3, do5…).
 */
export const REGISTER_IDS = [
  'beginner',
  'chalumeau',
  'throat',
  'clarion',
  'altissimo',
  'intermediate',
  'advanced',
] as const

export type RegisterId = (typeof REGISTER_IDS)[number]
export type RegisterGroup = 'level' | 'register'

interface RegisterSpan {
  from: string
  to: string
  naturals_only?: boolean
}

export interface RegisterDefinition {
  id: RegisterId
  group: RegisterGroup
  label: string
  hint: string
  spans: RegisterSpan[]
}

const SPAN_BEGINNER: RegisterSpan = { from: 'G3', to: 'G4', naturals_only: true }
const SPAN_CHALUMEAU: RegisterSpan = { from: 'E3', to: 'F#4' }
const SPAN_THROAT: RegisterSpan = { from: 'G4', to: 'Bb4' }
const SPAN_CLARION: RegisterSpan = { from: 'B4', to: 'C6' }
const SPAN_ALTISSIMO: RegisterSpan = { from: 'C#6', to: 'G6' }

export const REGISTERS: RegisterDefinition[] = [
  {
    id: 'beginner',
    group: 'level',
    label: 'Débutant',
    hint: 'Chalumeau simplifié · G3 à G4, sans dièses ni bémols',
    spans: [SPAN_BEGINNER],
  },
  {
    id: 'intermediate',
    group: 'level',
    label: 'Intermédiaire',
    hint: 'Chalumeau complet, notes de gorge et clairon',
    spans: [SPAN_CHALUMEAU, SPAN_THROAT, SPAN_CLARION],
  },
  {
    id: 'advanced',
    group: 'level',
    label: 'Avancé',
    hint: 'Tous les registres confondus',
    spans: [SPAN_CHALUMEAU, SPAN_THROAT, SPAN_CLARION, SPAN_ALTISSIMO],
  },
  {
    id: 'chalumeau',
    group: 'register',
    label: 'Chalumeau complet',
    hint: 'E3 à F♯4, avec dièses et bémols',
    spans: [SPAN_CHALUMEAU],
  },
  {
    id: 'throat',
    group: 'register',
    label: 'Notes de gorge',
    hint: 'G4 à B♭4',
    spans: [SPAN_THROAT],
  },
  {
    id: 'clarion',
    group: 'register',
    label: 'Clairon',
    hint: 'B4 à C6',
    spans: [SPAN_CLARION],
  },
  {
    id: 'altissimo',
    group: 'register',
    label: 'Suraigu',
    hint: 'C♯6 à G6',
    spans: [SPAN_ALTISSIMO],
  },
]

export const DEFAULT_REGISTER_ID: RegisterId = 'beginner'

const REGISTER_GROUPS: { id: RegisterGroup; label: string }[] = [
  { id: 'level', label: 'Niveaux' },
  { id: 'register', label: 'Registres' },
]

export function is_register_id(value: string): value is RegisterId {
  return (REGISTER_IDS as readonly string[]).includes(value)
}

export function parse_register_id(value: unknown): RegisterId | null {
  if (typeof value !== 'string' || !is_register_id(value)) return null
  return value
}

export function register_of(id: RegisterId): RegisterDefinition {
  const found = REGISTERS.find((register) => register.id === id)
  if (!found) {
    throw new Error(`Registre inconnu : ${id}`)
  }
  return found
}

export function grouped_registers(): {
  id: RegisterGroup
  label: string
  items: RegisterDefinition[]
}[] {
  return REGISTER_GROUPS.map((group) => ({
    ...group,
    items: REGISTERS.filter((register) => register.group === group.id),
  }))
}

function notes_from_span(span: RegisterSpan): MusicalNote[] {
  const start = parse_note_id(span.from)
  const end = parse_note_id(span.to)
  if (!start || !end) return []
  const notes = build_range(start.midi, end.midi)
  if (!span.naturals_only) return notes
  return notes.filter((note) => note.accidental == null)
}

export function notes_for_register(id: RegisterId): MusicalNote[] {
  const seen = new Set<number>()
  const notes: MusicalNote[] = []
  for (const span of register_of(id).spans) {
    for (const note of notes_from_span(span)) {
      if (seen.has(note.midi)) continue
      seen.add(note.midi)
      notes.push(note)
    }
  }
  return notes
}
