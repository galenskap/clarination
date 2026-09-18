import {
  analyze_pitch,
  cents_from_hz,
  is_in_tune,
  median,
  note_proximity,
} from './pitch_math'
import { midi_to_hz, note_from_midi, parse_note_id, staff_steps_from_b4 } from './notes'
import { notes_for_register } from './registers'
import { concert_to_written_hz } from './transposition'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const a4 = note_from_midi(69)
assert(a4.note_id === 'A4', 'MIDI 69 → A4')
assert(Math.abs(midi_to_hz(69) - 440) < 0.001, 'A4 = 440 Hz')

const parsed = parse_note_id('F#4')
assert(parsed?.midi === 66, 'F#4 midi')
assert(parsed?.accidental === 'sharp', 'F#4 sharp')

const analysis = analyze_pitch(440)
assert(analysis?.nearest_note.note_id === 'A4', '440 Hz → A4')
assert(Math.abs(analysis?.cents_offset ?? 99) < 1, '440 Hz cents ~ 0')

const open_g_concert = midi_to_hz(parse_note_id('F4')!.midi)
const open_g_written = analyze_pitch(concert_to_written_hz(open_g_concert))
assert(open_g_written?.nearest_note.note_id === 'G4', 'sol à vide : F4 concert → G4 écrit')
assert(Math.abs(open_g_written?.cents_offset ?? 99) < 1, 'sol à vide cents ~ 0')

assert(Math.abs(cents_from_hz(midi_to_hz(66))) < 1, 'F#4 exact cents')
assert(is_in_tune(12, 50), '12 cents in tune')
assert(!is_in_tune(60, 50), '60 cents out')
assert(note_proximity(0) === 'perfect', '0 cent → parfait')
assert(note_proximity(49) === 'perfect', '49 cents → parfait')
assert(note_proximity(50) === 'near', '50 cents → orange')
assert(note_proximity(199) === 'near', '199 cents → orange')
assert(note_proximity(200) === 'far', 'un ton → rouge')
assert(note_proximity(-240) === 'far', 'plus d’un ton → rouge')

assert(median([3, 1, 2]) === 2, 'median odd')
assert(median([1, 2, 3, 4]) === 2.5, 'median even')

const e4 = parse_note_id('E4')!
const b4 = parse_note_id('B4')!
assert(staff_steps_from_b4(b4) === 0, 'B4 middle line')
assert(staff_steps_from_b4(e4) === -4, 'E4 bottom line')

const beginner = notes_for_register('beginner')
assert(beginner[0]?.note_id === 'G3', 'débutant commence à G3')
assert(beginner[beginner.length - 1]?.note_id === 'G4', 'débutant finit à G4')
assert(
  beginner.every((note) => note.accidental == null),
  'débutant sans altérations',
)
assert(beginner.length === 8, 'débutant : 8 notes naturelles')

const chalumeau = notes_for_register('chalumeau')
assert(chalumeau[0]?.note_id === 'E3', 'chalumeau commence à E3')
assert(chalumeau[chalumeau.length - 1]?.note_id === 'F#4', 'chalumeau finit à F#4')

const throat = notes_for_register('throat')
assert(throat[0]?.note_id === 'G4', 'gorge commence à G4')
assert(throat[throat.length - 1]?.note_id === 'Bb4', 'gorge finit à Bb4')

const clarion = notes_for_register('clarion')
assert(clarion[0]?.note_id === 'B4', 'clairon commence à B4')
assert(clarion[clarion.length - 1]?.note_id === 'C6', 'clairon finit à C6')

const altissimo = notes_for_register('altissimo')
assert(altissimo[0]?.note_id === 'C#6', 'suraigu commence à C#6')
assert(altissimo[altissimo.length - 1]?.note_id === 'G6', 'suraigu finit à G6')

const intermediate = notes_for_register('intermediate')
assert(intermediate[0]?.note_id === 'E3', 'intermédiaire commence à E3')
assert(intermediate[intermediate.length - 1]?.note_id === 'C6', 'intermédiaire finit à C6')
assert(
  intermediate.length === chalumeau.length + throat.length + clarion.length,
  'intermédiaire = union des 3 registres',
)

const advanced = notes_for_register('advanced')
assert(advanced[0]?.note_id === 'E3', 'avancé commence à E3')
assert(advanced[advanced.length - 1]?.note_id === 'G6', 'avancé finit à G6')
assert(
  advanced.length === intermediate.length + altissimo.length,
  'avancé = intermédiaire + suraigu',
)

console.log('domain checks OK')
