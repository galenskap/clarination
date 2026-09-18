import { ref, computed } from 'vue'
import {
  parse_note_id,
  type MusicalNote,
  type NoteDuration,
} from '@/domain/notes'
import { random_duration } from '@/domain/durations'
import { cents_to_target, IN_TUNE_CENTS, is_in_tune } from '@/domain/pitch_math'
import {
  DEFAULT_REGISTER_ID,
  notes_for_register,
  type RegisterId,
} from '@/domain/registers'
import { use_game_options } from '@/composables/use_game_options'

export interface GameTrial {
  note_id: string
  success: boolean
  reaction_ms: number | null
  shown_at: number
}

export interface ActiveChallenge {
  note: MusicalNote
  duration: NoteDuration
  shown_at: number
}

export interface TrialFeedback {
  success: boolean
  /** Jeton unique pour relancer les animations à chaque essai. */
  token: number
}

const CONFIRM_FRAMES = 4
/** Temps d’affichage du feedback avant la note suivante. */
const FEEDBACK_MS = 560

export function use_game_session() {
  const options = use_game_options()
  const register_id = ref<RegisterId>(DEFAULT_REGISTER_ID)
  const range = computed(() => notes_for_register(register_id.value))
  const trials = ref<GameTrial[]>([])
  const challenge = ref<ActiveChallenge | null>(null)
  const feedback = ref<TrialFeedback | null>(null)
  const show_fingerings = ref(false)
  const is_paused = ref(false)
  const elapsed_ms = ref(0)

  let confirm_count = 0
  let raf_id = 0
  let last_tick = 0
  let accumulated_while_running = 0
  let feedback_timeout_id = 0

  const success_count = computed(() => trials.value.filter((t) => t.success).length)
  const fail_count = computed(() => trials.value.filter((t) => !t.success).length)
  const is_resolving = computed(() => feedback.value != null)

  function pick_random_note(): MusicalNote {
    const pool = range.value
    const index = Math.floor(Math.random() * pool.length)
    return pool[index]
  }

  function set_register(id: RegisterId) {
    if (register_id.value === id) return
    register_id.value = id
    if (challenge.value) {
      next_challenge()
    }
  }

  function next_challenge() {
    clear_feedback_timeout()
    feedback.value = null
    show_fingerings.value = false
    confirm_count = 0
    accumulated_while_running = 0
    elapsed_ms.value = 0
    last_tick = performance.now()
    challenge.value = {
      note: pick_random_note(),
      duration: random_duration(),
      shown_at: Date.now(),
    }
  }

  function record_trial(success: boolean, reaction_ms: number | null) {
    if (!challenge.value) return
    trials.value.push({
      note_id: challenge.value.note.note_id,
      success,
      reaction_ms,
      shown_at: challenge.value.shown_at,
    })
  }

  function clear_feedback_timeout() {
    if (feedback_timeout_id) {
      window.clearTimeout(feedback_timeout_id)
      feedback_timeout_id = 0
    }
  }

  /** Enregistre l’essai, affiche le feedback, puis passe à la note suivante. */
  function resolve_trial(success: boolean, reaction_ms: number | null) {
    if (!challenge.value || feedback.value) return
    record_trial(success, reaction_ms)
    confirm_count = 0
    feedback.value = { success, token: Date.now() }
    clear_feedback_timeout()
    feedback_timeout_id = window.setTimeout(() => {
      feedback_timeout_id = 0
      feedback.value = null
      next_challenge()
    }, FEEDBACK_MS)
  }

  function start_session(id?: RegisterId) {
    if (id) register_id.value = id
    clear_feedback_timeout()
    feedback.value = null
    trials.value = []
    is_paused.value = false
    next_challenge()
    start_clock()
  }

  function start_clock() {
    cancelAnimationFrame(raf_id)
    last_tick = performance.now()
    const loop = (now: number) => {
      if (!is_paused.value && challenge.value && !feedback.value) {
        const delta = now - last_tick
        accumulated_while_running += delta
        elapsed_ms.value = accumulated_while_running

        /* Doigté puis note perdue : durée totale d’affichage. */
        const hint_ms = options.hint_seconds.value * 1000
        const fail_ms = options.fail_seconds.value * 1000

        if (elapsed_ms.value >= hint_ms) {
          show_fingerings.value = true
        }

        if (elapsed_ms.value >= fail_ms) {
          resolve_trial(false, null)
        }
      }
      last_tick = now
      raf_id = requestAnimationFrame(loop)
    }
    raf_id = requestAnimationFrame(loop)
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
    feedback.value = null
    challenge.value = null
    show_fingerings.value = false
  }

  function on_pitch(
    frequency_hz: number | null,
    nearest_note_id: string | null,
  ) {
    if (
      is_paused.value ||
      !challenge.value ||
      feedback.value ||
      frequency_hz == null
    ) {
      confirm_count = 0
      return
    }

    const target = challenge.value.note
    const cents = cents_to_target(frequency_hz, target.midi)

    if (nearest_note_id === target.note_id && is_in_tune(cents, IN_TUNE_CENTS)) {
      confirm_count += 1
      if (confirm_count >= CONFIRM_FRAMES) {
        resolve_trial(true, Math.round(elapsed_ms.value))
      }
    } else {
      confirm_count = 0
    }
  }

  /** Utilitaire test / debug */
  function force_note(note_id: string) {
    const note = parse_note_id(note_id)
    if (!note) return
    clear_feedback_timeout()
    feedback.value = null
    show_fingerings.value = false
    confirm_count = 0
    accumulated_while_running = 0
    elapsed_ms.value = 0
    challenge.value = {
      note,
      duration: 'quarter',
      shown_at: Date.now(),
    }
  }

  return {
    trials,
    challenge,
    feedback,
    is_resolving,
    show_fingerings,
    is_paused,
    elapsed_ms,
    success_count,
    fail_count,
    register_id,
    set_register,
    start_session,
    stop_session,
    pause,
    resume,
    on_pitch,
    force_note,
  }
}
