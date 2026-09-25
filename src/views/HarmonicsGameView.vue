<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MicLevelMeter from '@/components/MicLevelMeter.vue'
import MicPermissionGate from '@/components/MicPermissionGate.vue'
import MicSourceSelect from '@/components/MicSourceSelect.vue'
import SessionSummaryDialog from '@/components/SessionSummaryDialog.vue'
import SquareIconButton from '@/components/SquareIconButton.vue'
import StaffSvg from '@/components/StaffSvg.vue'
import { use_game_sfx } from '@/composables/use_game_sfx'
import { use_game_stats } from '@/composables/use_game_stats'
import { use_harmonics_session } from '@/composables/use_harmonics_session'
import { use_microphone } from '@/composables/use_microphone'
import { use_pitch_detector } from '@/composables/use_pitch_detector'
import {
  chord_role_label,
  chord_types_query,
  parse_chord_types_query,
} from '@/domain/chords'
import { american_label, french_label } from '@/domain/notes'
import type { SessionSummary } from '@/domain/session_stats'

const route = useRoute()
const router = useRouter()
const mic = use_microphone()
const pitch = use_pitch_detector(mic.stream)
const game = use_harmonics_session()
const sfx = use_game_sfx()
const stats = use_game_stats()

const score_bump = ref<'ok' | 'ko' | null>(null)
let score_bump_timeout = 0

const summary_open = ref(false)
const session_summary = ref<SessionSummary | null>(null)
let session_persisted = false
let navigating_home = false

const selected_types = computed(() => parse_chord_types_query(route.query.types))

const types_key = computed(() =>
  selected_types.value ? chord_types_query(selected_types.value) : '',
)

function start_game() {
  if (!selected_types.value) return
  session_persisted = false
  game.start_session(selected_types.value)
}

async function enable_mic() {
  const media_stream = await mic.request_access()
  if (media_stream) {
    await pitch.start()
    start_game()
  }
}

async function switch_mic_source(device_id: string) {
  const media_stream = await mic.request_access(device_id)
  if (media_stream) {
    await pitch.start()
  }
}

function on_select_source(device_id: string) {
  if (mic.status.value === 'granted') {
    void switch_mic_source(device_id)
    return
  }
  mic.prefer_device(device_id)
}

function toggle_pause() {
  if (game.is_paused.value) {
    game.resume()
    pitch.resume()
  } else {
    game.pause()
    pitch.pause()
  }
}

function go_home() {
  if (summary_open.value || navigating_home) return

  game.pause()
  pitch.pause()

  const summary = game.summarize_session()
  if (summary.attempts <= 0) {
    finish_and_leave()
    return
  }

  if (!session_persisted && selected_types.value) {
    stats.record_session({
      game_id: 'harmoniques',
      started_at: game.started_at.value ?? Date.now(),
      register_id: chord_types_query(selected_types.value),
      summary,
      trials: game.trials.value.map((trial) => ({
        note_id: trial.note_id,
        success: trial.success,
        reaction_ms: trial.reaction_ms,
      })),
    })
    session_persisted = true
  }

  session_summary.value = summary
  summary_open.value = true
}

function on_summary_close() {
  summary_open.value = false
  finish_and_leave()
}

function finish_and_leave() {
  navigating_home = true
  game.stop_session()
  pitch.stop()
  void router.push('/')
}

watch(
  () => pitch.analysis.value,
  (analysis) => {
    if (!analysis) {
      game.on_pitch(null, null)
      return
    }
    game.on_pitch(analysis.frequency_hz, analysis.nearest_note.note_id)
  },
)

watch(
  () => mic.status.value,
  async (status) => {
    if (status === 'granted' && !pitch.is_running.value) {
      await pitch.start()
      if (!game.challenge.value) {
        start_game()
      }
    }
  },
)

watch(
  () => game.complete_feedback.value,
  (fb) => {
    if (!fb) return
    sfx.play('success')
    score_bump.value = 'ok'
    if (score_bump_timeout) window.clearTimeout(score_bump_timeout)
    score_bump_timeout = window.setTimeout(() => {
      score_bump.value = null
      score_bump_timeout = 0
    }, 520)
  },
)

watch(
  () => game.fault_feedback.value,
  (fb) => {
    if (!fb) return
    sfx.play('fail')
    score_bump.value = 'ko'
    if (score_bump_timeout) window.clearTimeout(score_bump_timeout)
    score_bump_timeout = window.setTimeout(() => {
      score_bump.value = null
      score_bump_timeout = 0
    }, 520)
  },
)

onMounted(async () => {
  if (!selected_types.value) {
    void router.replace({ name: 'harmoniques-setup' })
    return
  }
  const media_stream = await mic.ensure_access()
  if (media_stream) {
    await pitch.start()
    start_game()
  }
})

onUnmounted(() => {
  if (score_bump_timeout) window.clearTimeout(score_bump_timeout)
  if (!navigating_home) {
    game.stop_session()
    pitch.stop()
  }
})
</script>

<template>
  <div
    class="harmonics app-screen"
    :class="{
      'harmonics--result-ok': Boolean(game.complete_feedback.value),
      'harmonics--result-ko': Boolean(game.fault_feedback.value),
    }"
  >
    <header class="harmonics__bar app-toolbar app-toolbar--hide-title">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Harmoniques</h1>
      <span class="harmonics__types" :title="types_key">{{ types_key }}</span>
      <MicSourceSelect
        v-if="mic.status.value === 'granted'"
        class="harmonics__mic"
        compact
        :devices="mic.devices.value"
        :selected_device_id="mic.selected_device_id.value"
        @change="on_select_source"
      />
      <MicLevelMeter
        v-if="mic.status.value === 'granted'"
        :level="pitch.level.value"
      />
      <SquareIconButton
        v-if="mic.status.value === 'granted'"
        :label="game.is_paused.value ? 'Reprendre' : 'Pause'"
        variant="sun"
        @click="toggle_pause"
      >
        <svg v-if="game.is_paused.value" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 5h3v14H7V5zm7 0h3v14h-3V5z" />
        </svg>
      </SquareIconButton>
    </header>

    <MicPermissionGate
      :status="mic.status.value"
      :error_message="mic.error_message.value"
      :devices="mic.devices.value"
      :selected_device_id="mic.selected_device_id.value"
      @request="enable_mic"
      @select_source="on_select_source"
    >
      <div class="harmonics__body app-body">
        <section class="harmonics__chord app-panel" aria-label="Accord à trouver">
          <div v-if="game.is_paused.value" class="harmonics__paused">Pause</div>

          <div
            v-if="game.complete_feedback.value"
            :key="game.complete_feedback.value.token"
            class="harmonics__result harmonics__result--ok"
            role="status"
          >
            <span class="harmonics__result-mark" aria-hidden="true">✓</span>
            <span class="harmonics__result-label">Accord trouvé</span>
          </div>

          <p
            v-if="game.challenge.value"
            class="harmonics__symbol"
            :class="{ 'harmonics__symbol--done': game.complete_feedback.value }"
          >
            {{ game.challenge.value.chord.symbol }}
          </p>
        </section>

        <section class="harmonics__side">
          <div class="harmonics__score">
            <span
              class="harmonics__score-ok"
              :class="{ 'harmonics__score-ok--bump': score_bump === 'ok' }"
            >
              {{ game.success_count.value }} ✓
            </span>
            <span
              class="harmonics__score-ko"
              :class="{ 'harmonics__score-ko--bump': score_bump === 'ko' }"
            >
              {{ game.fail_count.value }} ✗
            </span>
          </div>

          <div
            v-if="game.challenge.value"
            class="harmonics__bingo"
            :class="`harmonics__bingo--${game.challenge.value.cells.length}`"
            aria-label="Composantes de l’accord"
          >
            <div
              v-for="cell in game.challenge.value.cells"
              :key="cell.role"
              class="harmonics__cell"
              :class="{ 'harmonics__cell--filled': cell.filled_note }"
            >
              <span class="harmonics__cell-role">{{ chord_role_label(cell.role) }}</span>
              <div v-if="cell.filled_note" class="harmonics__cell-staff">
                <StaffSvg :note="cell.filled_note" duration="quarter" :animate="false" />
              </div>
              <span v-if="cell.filled_note" class="harmonics__cell-name">
                {{ american_label(cell.filled_note) }}
              </span>
            </div>
          </div>

          <div
            v-if="game.fault_feedback.value"
            :key="game.fault_feedback.value.token"
            class="harmonics__fault"
            role="status"
          >
            <p class="harmonics__fault-label">Hors accord</p>
            <p class="harmonics__fault-name">
              <span>{{ american_label(game.fault_feedback.value.note) }}</span>
              <span class="harmonics__fault-fr">
                {{ french_label(game.fault_feedback.value.note) }}
              </span>
            </p>
            <div class="harmonics__fault-staff">
              <StaffSvg
                :note="game.fault_feedback.value.note"
                duration="quarter"
                :animate="false"
              />
            </div>
          </div>
        </section>
      </div>
    </MicPermissionGate>

    <SessionSummaryDialog
      :open="summary_open"
      :summary="session_summary"
      variant="chord"
      @close="on_summary_close"
    />
  </div>
</template>

<style scoped>
.harmonics {
  background: var(--color-plum);
  transition: background-color var(--duration-fast) var(--ease-effects);
}

.harmonics--result-ok {
  background: color-mix(in srgb, var(--color-leaf) 42%, var(--color-plum));
}

.harmonics--result-ko {
  background: color-mix(in srgb, var(--color-coral) 38%, var(--color-plum));
}

.harmonics__bar {
  color: var(--color-cream);
}

.harmonics__types {
  flex: 1 1 6rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(0.7rem, 2.6vh, 0.9rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.75;
}

.harmonics__mic {
  flex: 1 1 7rem;
  min-width: 0;
  max-width: 13rem;
}

.harmonics__chord {
  position: relative;
  display: grid;
  place-items: center;
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  overflow: hidden;
}

.harmonics__symbol {
  margin: 0;
  font-size: clamp(3.2rem, 22vh, 7rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.03em;
  line-height: 1;
  text-align: center;
  transition: transform var(--duration-med) var(--ease-spatial);
}

.harmonics__symbol--done {
  transform: scale(1.06);
  color: var(--color-leaf);
}

.harmonics__paused {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-plum) 72%, transparent);
  color: var(--color-sun);
  font-weight: var(--font-weight-bold);
  font-size: clamp(1.4rem, 6vh, 2rem);
  z-index: 2;
}

.harmonics__result {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-content: center;
  place-items: center;
  gap: 0.15rem;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-leaf) 82%, transparent);
  color: var(--color-cream);
  animation: result-in var(--duration-med) var(--ease-spatial) both;
}

.harmonics__result-mark {
  font-size: clamp(2.8rem, 14vh, 4.5rem);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.harmonics__result-label {
  font-size: clamp(1.05rem, 4.2vh, 1.55rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.harmonics__side {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: stretch;
}

.harmonics__score {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-shrink: 0;
}

.harmonics__score-ok,
.harmonics__score-ko {
  min-width: 3.25rem;
  padding: 0.2rem 0.7rem;
  border-radius: var(--shape-full);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.9rem, 3.4vh, 1.15rem);
  text-align: center;
}

.harmonics__score-ok {
  background: var(--color-leaf);
  color: var(--color-cream);
}

.harmonics__score-ko {
  background: var(--color-coral);
  color: var(--color-cream);
}

.harmonics__score-ok--bump,
.harmonics__score-ko--bump {
  animation: score-bump var(--duration-med) var(--ease-spatial);
}

.harmonics__bingo {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  gap: var(--space-sm);
}

.harmonics__bingo--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.harmonics__bingo--4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.harmonics__bingo--5 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.harmonics__bingo--5 .harmonics__cell:nth-child(4) {
  grid-column: 1;
}

.harmonics__bingo--5 .harmonics__cell:nth-child(5) {
  grid-column: 2;
}

.harmonics__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 0;
  min-width: 0;
  padding: var(--space-xs);
  background: var(--color-cream);
  color: var(--color-plum);
  border-radius: var(--shape-md);
  overflow: hidden;
}

.harmonics__cell--filled {
  background: color-mix(in srgb, var(--color-leaf) 22%, var(--color-cream));
}

.harmonics__cell-role {
  font-size: clamp(0.7rem, 2.6vh, 0.9rem);
  font-weight: var(--font-weight-bold);
  text-align: center;
  line-height: 1.15;
}

.harmonics__cell-staff {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-height: 7rem;
  color: var(--color-plum);
}

.harmonics__cell-name {
  font-size: clamp(0.7rem, 2.5vh, 0.85rem);
  font-weight: var(--font-weight-medium);
}

.harmonics__fault {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 0.15rem var(--space-sm);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-coral);
  color: var(--color-cream);
  border-radius: var(--shape-md);
  animation: result-in var(--duration-med) var(--ease-spatial) both;
}

.harmonics__fault-label {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.9;
}

.harmonics__fault-name {
  grid-column: 1;
  grid-row: 2;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.55rem;
  align-items: baseline;
  font-size: clamp(1rem, 3.8vh, 1.3rem);
  font-weight: var(--font-weight-bold);
}

.harmonics__fault-fr {
  font-size: 0.85em;
  font-weight: var(--font-weight-medium);
  opacity: 0.9;
}

.harmonics__fault-staff {
  grid-column: 2;
  grid-row: 1 / span 2;
  width: min(7rem, 22vw);
  height: 4.5rem;
  color: var(--color-cream);
  justify-self: end;
}

@keyframes result-in {
  from {
    opacity: 0;
    transform: scale(0.55);
  }
  62% {
    opacity: 1;
    transform: scale(1.08);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes score-bump {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.28);
  }
  100% {
    transform: scale(1);
  }
}
</style>
