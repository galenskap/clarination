import { computed, ref } from 'vue'
import {
  beat_duration_ms,
  BLUES_BEATS_PER_MEASURE,
  BLUES_GRID_SIZE,
  is_blue_note_pitch,
  match_blues_bingo_tone,
  tones_for_blues_bingo,
  type BluesBingoRoleId,
  type BluesBingoTone,
} from '@/domain/blues'
import type { ChordDefinition } from '@/domain/chords'
import { parse_note_id, type MusicalNote } from '@/domain/notes'
import { cents_from_hz, IN_TUNE_CENTS, is_in_tune } from '@/domain/pitch_math'
import {
  summarize_trials,
  type SessionSummary,
  type SessionTrialInput,
} from '@/domain/session_stats'

export interface BluesTrial {
  note_id: string
  success: boolean
  reaction_ms: number | null
  shown_at: number
}

export interface BluesBingoCell {
  role: BluesBingoRoleId
  label: string
  filled_note: MusicalNote | null
}

export interface BluesMeasureState {
  chord: ChordDefinition
  cells: BluesBingoCell[]
  tones: BluesBingoTone[]
  shown_at: number
}

export interface BluesFaultFeedback {
  note: MusicalNote
  token: number
}

export interface BluesFillFeedback {
  role: BluesBingoRoleId
  token: number
}

const CONFIRM_FRAMES = 4
const FAULT_FEEDBACK_MS = 700

export type BluesMetronomeClick = 'accent' | 'beat'

export function use_blues_session() {
  const grid = ref<ChordDefinition[]>([])
  const bpm = ref(90)
  const count_blue_notes = ref(false)
  const measure_index = ref(0)
  const beat_in_measure = ref(0)
  const measure = ref<BluesMeasureState | null>(null)
  const trials = ref<BluesTrial[]>([])
  const fault_feedback = ref<BluesFaultFeedback | null>(null)
  const fill_feedback = ref<BluesFillFeedback | null>(null)
  const is_paused = ref(false)
  const is_finished = ref(false)
  const played_ms = ref(0)
  const started_at = ref<number | null>(null)
  const point_count = ref(0)
  const fault_count = ref(0)

  let confirm_count = 0
  let confirm_pitch_class: number | null = null
  let locked_note_id: string | null = null
  let raf_id = 0
  let last_tick = 0
  let session_played_ms = 0
  let beat_elapsed_ms = 0
  let feedback_timeout_id = 0
  let on_metronome: ((kind: BluesMetronomeClick) => void) | null = null

  const max_points = computed(() => {
    if (grid.value.length === 0) return 0
    return grid.value.reduce(
      (sum, chord) => sum + tones_for_blues_bingo(chord, count_blue_notes.value).length,
      0,
    )
  })

  const progress_ratio = computed(() => {
    if (is_finished.value) return 1
    const beats_done =
      measure_index.value * BLUES_BEATS_PER_MEASURE + beat_in_measure.value
    const total = BLUES_GRID_SIZE * BLUES_BEATS_PER_MEASURE
    return Math.min(1, beats_done / total)
  })

  function clear_feedback_timeout() {
    if (feedback_timeout_id) {
      window.clearTimeout(feedback_timeout_id)
      feedback_timeout_id = 0
    }
  }

  function set_measure(index: number) {
    const chord = grid.value[index]
    if (!chord) {
      measure.value = null
      return
    }
    const tones = tones_for_blues_bingo(chord, count_blue_notes.value)
    measure.value = {
      chord,
      tones,
      cells: tones.map((tone) => ({
        role: tone.role,
        label: tone.label,
        filled_note: null,
      })),
      shown_at: Date.now(),
    }
    /* Note tenue : jugée une fois sur le nouvel accord. */
    locked_note_id = null
    confirm_count = 0
    confirm_pitch_class = null
    fault_feedback.value = null
    fill_feedback.value = null
  }

  function record_trial(
    note_id: string,
    success: boolean,
    reaction_ms: number | null,
    shown_at: number,
  ) {
    trials.value.push({
      note_id,
      success,
      reaction_ms,
      shown_at,
    })
  }

  function emit_click(kind: BluesMetronomeClick) {
    on_metronome?.(kind)
  }

  function finish_chorus() {
    is_finished.value = true
    is_paused.value = true
    cancelAnimationFrame(raf_id)
    raf_id = 0
    measure_index.value = BLUES_GRID_SIZE - 1
    beat_in_measure.value = BLUES_BEATS_PER_MEASURE - 1
  }

  function advance_beat() {
    if (is_finished.value) return

    const next_beat = beat_in_measure.value + 1
    if (next_beat >= BLUES_BEATS_PER_MEASURE) {
      const next_measure = measure_index.value + 1
      if (next_measure >= BLUES_GRID_SIZE) {
        finish_chorus()
        return
      }
      measure_index.value = next_measure
      beat_in_measure.value = 0
      set_measure(next_measure)
      emit_click('accent')
      return
    }

    beat_in_measure.value = next_beat
    emit_click('beat')
  }

  function start_clock() {
    cancelAnimationFrame(raf_id)
    last_tick = performance.now()
    beat_elapsed_ms = 0
    const loop = (now: number) => {
      const delta = now - last_tick
      last_tick = now
      if (!is_paused.value && !is_finished.value) {
        session_played_ms += delta
        played_ms.value = Math.round(session_played_ms)
        beat_elapsed_ms += delta
        const beat_ms = beat_duration_ms(bpm.value)
        while (beat_elapsed_ms >= beat_ms && !is_finished.value && !is_paused.value) {
          beat_elapsed_ms -= beat_ms
          advance_beat()
        }
      }
      raf_id = requestAnimationFrame(loop)
    }
    raf_id = requestAnimationFrame(loop)
  }

  function start_session(
    selected_grid: readonly ChordDefinition[],
    selected_bpm: number,
    blue_notes: boolean,
  ) {
    if (selected_grid.length !== BLUES_GRID_SIZE) {
      throw new Error('La grille blues doit contenir 12 accords')
    }
    grid.value = selected_grid.map((chord) => ({ ...chord, tones: [...chord.tones] }))
    bpm.value = selected_bpm
    count_blue_notes.value = blue_notes
    clear_feedback_timeout()
    fault_feedback.value = null
    fill_feedback.value = null
    trials.value = []
    point_count.value = 0
    fault_count.value = 0
    is_paused.value = false
    is_finished.value = false
    session_played_ms = 0
    played_ms.value = 0
    started_at.value = Date.now()
    measure_index.value = 0
    beat_in_measure.value = 0
    set_measure(0)
    emit_click('accent')
    start_clock()
  }

  function pause() {
    is_paused.value = true
  }

  function resume() {
    if (is_finished.value) return
    is_paused.value = false
    last_tick = performance.now()
  }

  function stop_session() {
    cancelAnimationFrame(raf_id)
    raf_id = 0
    clear_feedback_timeout()
    fault_feedback.value = null
    fill_feedback.value = null
    measure.value = null
    on_metronome = null
  }

  function set_metronome_handler(handler: ((kind: BluesMetronomeClick) => void) | null) {
    on_metronome = handler
  }

  function summarize_session(): SessionSummary {
    return summarize_trials(trials.value as SessionTrialInput[], played_ms.value)
  }

  function show_fault(note: MusicalNote) {
    if (!measure.value || is_finished.value) return
    fault_count.value += 1
    record_trial(measure.value.chord.symbol, false, null, measure.value.shown_at)
    fault_feedback.value = { note, token: Date.now() }
    confirm_count = 0
    confirm_pitch_class = null
    locked_note_id = note.note_id
    clear_feedback_timeout()
    feedback_timeout_id = window.setTimeout(() => {
      feedback_timeout_id = 0
      fault_feedback.value = null
    }, FAULT_FEEDBACK_MS)
  }

  function fill_cell(role: BluesBingoRoleId, note: MusicalNote) {
    if (!measure.value) return
    const cell = measure.value.cells.find((entry) => entry.role === role)
    if (!cell || cell.filled_note) return

    const reaction_ms = Math.round(Date.now() - measure.value.shown_at)
    point_count.value += 1
    record_trial(measure.value.chord.symbol, true, reaction_ms, measure.value.shown_at)

    measure.value = {
      ...measure.value,
      cells: measure.value.cells.map((entry) =>
        entry.role === role ? { ...entry, filled_note: note } : entry,
      ),
    }

    locked_note_id = note.note_id
    confirm_count = 0
    confirm_pitch_class = null
    fill_feedback.value = { role, token: Date.now() }
  }

  function on_pitch(
    frequency_hz: number | null,
    nearest_note_id: string | null,
  ) {
    if (
      is_paused.value ||
      is_finished.value ||
      !measure.value ||
      frequency_hz == null ||
      nearest_note_id == null
    ) {
      confirm_count = 0
      confirm_pitch_class = null
      if (frequency_hz == null) {
        locked_note_id = null
      }
      return
    }

    if (fault_feedback.value) {
      return
    }

    const cents = cents_from_hz(frequency_hz)
    if (!is_in_tune(cents, IN_TUNE_CENTS)) {
      confirm_count = 0
      confirm_pitch_class = null
      return
    }

    const note = parse_note_id(nearest_note_id)
    if (!note) {
      confirm_count = 0
      return
    }

    if (locked_note_id === note.note_id) {
      return
    }

    const pc = ((note.midi % 12) + 12) % 12
    if (confirm_pitch_class !== pc) {
      confirm_pitch_class = pc
      confirm_count = 1
      return
    }

    confirm_count += 1
    if (confirm_count < CONFIRM_FRAMES) return

    const tone = match_blues_bingo_tone(measure.value.tones, note)
    if (!tone) {
      /* Blue notes neutres si l’option est décochée. */
      if (
        !count_blue_notes.value &&
        is_blue_note_pitch(measure.value.chord, pc)
      ) {
        locked_note_id = note.note_id
        confirm_count = 0
        confirm_pitch_class = null
        return
      }
      show_fault(note)
      return
    }

    const cell = measure.value.cells.find((entry) => entry.role === tone.role)
    if (cell?.filled_note) {
      locked_note_id = note.note_id
      confirm_count = 0
      confirm_pitch_class = null
      return
    }

    fill_cell(tone.role, note)
  }

  return {
    grid,
    bpm,
    count_blue_notes,
    measure_index,
    beat_in_measure,
    measure,
    trials,
    fault_feedback,
    fill_feedback,
    is_paused,
    is_finished,
    played_ms,
    started_at,
    point_count,
    fault_count,
    max_points,
    progress_ratio,
    start_session,
    stop_session,
    summarize_session,
    pause,
    resume,
    on_pitch,
    set_metronome_handler,
  }
}
