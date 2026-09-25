import { computed, ref } from 'vue'
import {
  chords_for_qualities,
  match_chord_tone,
  type ChordDefinition,
  type ChordQualityId,
  type ChordRoleId,
} from '@/domain/chords'
import { parse_note_id, type MusicalNote } from '@/domain/notes'
import { cents_from_hz, IN_TUNE_CENTS, is_in_tune } from '@/domain/pitch_math'
import {
  summarize_trials,
  type SessionSummary,
  type SessionTrialInput,
} from '@/domain/session_stats'

export interface HarmonicsTrial {
  note_id: string
  success: boolean
  reaction_ms: number | null
  shown_at: number
}

export interface BingoCell {
  role: ChordRoleId
  /** Note jouée qui a validé la case, ou null si encore vide. */
  filled_note: MusicalNote | null
}

export interface ActiveChordChallenge {
  chord: ChordDefinition
  cells: BingoCell[]
  shown_at: number
}

export interface FaultFeedback {
  note: MusicalNote
  token: number
}

export interface ChordCompleteFeedback {
  token: number
}

const CONFIRM_FRAMES = 4
const FAULT_FEEDBACK_MS = 700
const COMPLETE_FEEDBACK_MS = 800

export function use_harmonics_session() {
  const qualities = ref<ChordQualityId[]>([])
  const trials = ref<HarmonicsTrial[]>([])
  const challenge = ref<ActiveChordChallenge | null>(null)
  const fault_feedback = ref<FaultFeedback | null>(null)
  const complete_feedback = ref<ChordCompleteFeedback | null>(null)
  const is_paused = ref(false)
  const played_ms = ref(0)
  const started_at = ref<number | null>(null)

  let confirm_count = 0
  let confirm_pitch_class: number | null = null
  /** Note déjà validée (tenue) : ignore jusqu’au silence ou changement. */
  let locked_note_id: string | null = null
  let raf_id = 0
  let last_tick = 0
  let session_played_ms = 0
  /** Temps hors pause sur l’accord courant. */
  let chord_elapsed_ms = 0
  let feedback_timeout_id = 0
  let last_chord_symbol: string | null = null

  const pool = computed(() => chords_for_qualities(qualities.value))

  const success_count = computed(
    () => trials.value.filter((trial) => trial.success).length,
  )
  const fail_count = computed(
    () => trials.value.filter((trial) => !trial.success).length,
  )
  const is_resolving = computed(
    () => fault_feedback.value != null || complete_feedback.value != null,
  )
  const filled_count = computed(() => {
    if (!challenge.value) return 0
    return challenge.value.cells.filter((cell) => cell.filled_note != null).length
  })
  const cell_count = computed(() => challenge.value?.cells.length ?? 0)

  function clear_feedback_timeout() {
    if (feedback_timeout_id) {
      window.clearTimeout(feedback_timeout_id)
      feedback_timeout_id = 0
    }
  }

  function pick_chord(): ChordDefinition {
    const chords = pool.value
    if (chords.length === 0) {
      throw new Error('Aucun type d’accord sélectionné')
    }
    if (chords.length === 1) return chords[0]

    let candidate = chords[Math.floor(Math.random() * chords.length)]
    let guard = 0
    while (candidate.symbol === last_chord_symbol && guard < 20) {
      candidate = chords[Math.floor(Math.random() * chords.length)]
      guard += 1
    }
    return candidate
  }

  function next_challenge() {
    clear_feedback_timeout()
    fault_feedback.value = null
    complete_feedback.value = null
    confirm_count = 0
    confirm_pitch_class = null
    locked_note_id = null
    chord_elapsed_ms = 0

    const chord = pick_chord()
    last_chord_symbol = chord.symbol
    challenge.value = {
      chord,
      cells: chord.tones.map((tone) => ({
        role: tone.role,
        filled_note: null,
      })),
      shown_at: Date.now(),
    }
  }

  function record_trial(
    symbol: string,
    success: boolean,
    reaction_ms: number | null,
    shown_at: number,
  ) {
    trials.value.push({
      note_id: symbol,
      success,
      reaction_ms,
      shown_at,
    })
  }

  function start_clock() {
    cancelAnimationFrame(raf_id)
    last_tick = performance.now()
    const loop = (now: number) => {
      const delta = now - last_tick
      if (!is_paused.value) {
        session_played_ms += delta
        played_ms.value = Math.round(session_played_ms)
        if (challenge.value && !complete_feedback.value) {
          chord_elapsed_ms += delta
        }
      }
      last_tick = now
      raf_id = requestAnimationFrame(loop)
    }
    raf_id = requestAnimationFrame(loop)
  }

  function start_session(selected: readonly ChordQualityId[]) {
    qualities.value = [...selected]
    clear_feedback_timeout()
    fault_feedback.value = null
    complete_feedback.value = null
    trials.value = []
    is_paused.value = false
    session_played_ms = 0
    played_ms.value = 0
    started_at.value = Date.now()
    last_chord_symbol = null
    next_challenge()
    start_clock()
  }

  function pause() {
    is_paused.value = true
  }

  function resume() {
    is_paused.value = false
    last_tick = performance.now()
  }

  function stop_session() {
    cancelAnimationFrame(raf_id)
    raf_id = 0
    clear_feedback_timeout()
    fault_feedback.value = null
    complete_feedback.value = null
    challenge.value = null
  }

  function summarize_session(): SessionSummary {
    return summarize_trials(trials.value as SessionTrialInput[], played_ms.value)
  }

  function show_fault(note: MusicalNote) {
    if (!challenge.value || complete_feedback.value) return
    record_trial(challenge.value.chord.symbol, false, null, challenge.value.shown_at)
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

  function complete_chord() {
    if (!challenge.value || complete_feedback.value) return
    record_trial(
      challenge.value.chord.symbol,
      true,
      Math.round(chord_elapsed_ms),
      challenge.value.shown_at,
    )
    complete_feedback.value = { token: Date.now() }
    confirm_count = 0
    confirm_pitch_class = null
    clear_feedback_timeout()
    feedback_timeout_id = window.setTimeout(() => {
      feedback_timeout_id = 0
      complete_feedback.value = null
      next_challenge()
    }, COMPLETE_FEEDBACK_MS)
  }

  function fill_cell(role: ChordRoleId, note: MusicalNote) {
    if (!challenge.value) return
    const cell = challenge.value.cells.find((entry) => entry.role === role)
    if (!cell || cell.filled_note) return

    cell.filled_note = note
    /* Déclenche la réactivité Vue (mutation profonde). */
    challenge.value = {
      ...challenge.value,
      cells: challenge.value.cells.map((entry) =>
        entry.role === role ? { ...entry, filled_note: note } : entry,
      ),
    }

    locked_note_id = note.note_id
    confirm_count = 0
    confirm_pitch_class = null

    const all_filled = challenge.value.cells.every((entry) => entry.filled_note != null)
    if (all_filled) {
      complete_chord()
    }
  }

  function on_pitch(
    frequency_hz: number | null,
    nearest_note_id: string | null,
  ) {
    if (
      is_paused.value ||
      !challenge.value ||
      complete_feedback.value ||
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

    /* Pendant le flash de faute, on ignore sauf pour déverrouiller au silence. */
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

    /* Même note tenue : ne recompte pas. */
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

    const tone = match_chord_tone(challenge.value.chord, note)
    if (!tone) {
      show_fault(note)
      return
    }

    const cell = challenge.value.cells.find((entry) => entry.role === tone.role)
    if (cell?.filled_note) {
      /* Case déjà remplie : verrouille sans faute. */
      locked_note_id = note.note_id
      confirm_count = 0
      confirm_pitch_class = null
      return
    }

    fill_cell(tone.role, note)
  }

  return {
    qualities,
    trials,
    challenge,
    fault_feedback,
    complete_feedback,
    is_resolving,
    is_paused,
    played_ms,
    started_at,
    success_count,
    fail_count,
    filled_count,
    cell_count,
    start_session,
    stop_session,
    summarize_session,
    pause,
    resume,
    on_pitch,
  }
}
