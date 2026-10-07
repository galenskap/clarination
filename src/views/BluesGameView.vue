<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MicLevelMeter from '@/components/MicLevelMeter.vue'
import MicPermissionGate from '@/components/MicPermissionGate.vue'
import MicSourceSelect from '@/components/MicSourceSelect.vue'
import SessionSummaryDialog from '@/components/SessionSummaryDialog.vue'
import SquareIconButton from '@/components/SquareIconButton.vue'
import StaffSvg from '@/components/StaffSvg.vue'
import { use_blues_session } from '@/composables/use_blues_session'
import { use_game_sfx } from '@/composables/use_game_sfx'
import { use_game_stats } from '@/composables/use_game_stats'
import { use_microphone } from '@/composables/use_microphone'
import { use_pitch_detector } from '@/composables/use_pitch_detector'
import {
  BLUES_BLUE_NOTE_OPTIONS,
  blues_session_key,
  has_any_blues_blue_note,
  parse_blues_blue_notes_query,
  parse_blues_bpm_query,
  parse_blues_grid_query,
} from '@/domain/blues'
import { american_label, french_label } from '@/domain/notes'
import type { SessionSummary } from '@/domain/session_stats'

const route = useRoute()
const router = useRouter()
const mic = use_microphone()
const pitch = use_pitch_detector(mic.stream)
const game = use_blues_session()
const sfx = use_game_sfx()
const stats = use_game_stats()

const score_bump = ref<'ok' | 'ko' | null>(null)
let score_bump_timeout = 0

const summary_open = ref(false)
const session_summary = ref<SessionSummary | null>(null)
let session_persisted = false
let navigating_home = false

const selected_grid = computed(() => parse_blues_grid_query(route.query.grid))
const selected_bpm = computed(() => parse_blues_bpm_query(route.query.bpm))
const selected_blue = computed(() => parse_blues_blue_notes_query(route.query.blue))

const blue_meta_label = computed(() => {
  const options = selected_blue.value
  if (!has_any_blues_blue_note(options)) return ''
  return BLUES_BLUE_NOTE_OPTIONS.filter((entry) => options[entry.id])
    .map((entry) => entry.short_label)
    .join(' · ')
})

const config_ok = computed(
  () => selected_grid.value != null && selected_bpm.value != null,
)

function start_game() {
  if (!selected_grid.value || selected_bpm.value == null) return
  session_persisted = false
  game.set_metronome_handler((kind) => {
    sfx.play(kind === 'accent' ? 'click_accent' : 'click')
  })
  game.start_session(selected_grid.value, selected_bpm.value, selected_blue.value)
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
  if (game.is_finished.value) return
  if (game.is_paused.value) {
    game.resume()
    pitch.resume()
  } else {
    game.pause()
    pitch.pause()
  }
}

function persist_and_summarize() {
  const summary = game.summarize_session()
  if (
    !session_persisted &&
    selected_grid.value &&
    selected_bpm.value != null &&
    summary.attempts > 0
  ) {
    stats.record_session({
      game_id: 'blues',
      started_at: game.started_at.value ?? Date.now(),
      register_id: blues_session_key(selected_bpm.value, selected_blue.value),
      summary,
      trials: game.trials.value.map((trial) => ({
        note_id: trial.note_id,
        success: trial.success,
        reaction_ms: trial.reaction_ms,
      })),
    })
    session_persisted = true
  }
  return summary
}

function go_home() {
  if (summary_open.value || navigating_home) return

  game.pause()
  pitch.pause()

  const summary = persist_and_summarize()
  if (summary.attempts <= 0 && !game.is_finished.value) {
    finish_and_leave()
    return
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
      if (!game.measure.value && !game.is_finished.value) {
        start_game()
      }
    }
  },
)

watch(
  () => game.fill_feedback.value,
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

watch(
  () => game.is_finished.value,
  (finished) => {
    if (!finished || summary_open.value || navigating_home) return
    pitch.pause()
    const summary = persist_and_summarize()
    session_summary.value = summary
    summary_open.value = true
  },
)

onMounted(async () => {
  if (!config_ok.value) {
    void router.replace({ name: 'blues-setup' })
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
    class="blues app-screen"
    :class="{
      'blues--result-ok': Boolean(game.fill_feedback.value),
      'blues--result-ko': Boolean(game.fault_feedback.value),
    }"
  >
    <header class="blues__bar app-toolbar app-toolbar--hide-title">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Blues</h1>
      <span v-if="selected_bpm != null" class="blues__meta">
        {{ selected_bpm }} BPM
        <template v-if="blue_meta_label"> · {{ blue_meta_label }}</template>
      </span>
      <MicSourceSelect
        v-if="mic.status.value === 'granted'"
        class="blues__mic"
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
        v-if="mic.status.value === 'granted' && !game.is_finished.value"
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
      <div class="blues__body app-body">
        <section class="blues__chart app-panel" aria-label="Grille blues">
          <div v-if="game.is_paused.value && !game.is_finished.value" class="blues__paused">
            Pause
          </div>
          <div v-if="game.is_finished.value" class="blues__paused">Chorus terminé</div>

          <div class="blues__grid" role="list">
            <div
              v-for="(chord, index) in game.grid.value"
              :key="`${chord.symbol}-${index}`"
              class="blues__beat"
              :class="{
                'blues__beat--current':
                  index === game.measure_index.value && !game.is_finished.value,
                'blues__beat--past': index < game.measure_index.value,
              }"
              role="listitem"
            >
              <span class="blues__beat-index">{{ index + 1 }}</span>
              <span class="blues__beat-symbol">{{ chord.symbol }}</span>
            </div>
          </div>

          <div class="blues__beats" aria-hidden="true">
            <span
              v-for="beat in 4"
              :key="beat"
              class="blues__beat-dot"
              :class="{
                'blues__beat-dot--on':
                  beat - 1 === game.beat_in_measure.value && !game.is_finished.value,
              }"
            />
          </div>
        </section>

        <section class="blues__side">
          <div class="blues__score">
            <span
              class="blues__score-ok"
              :class="{ 'blues__score-ok--bump': score_bump === 'ok' }"
            >
              {{ game.point_count.value }} ✓
            </span>
            <span
              class="blues__score-ko"
              :class="{ 'blues__score-ko--bump': score_bump === 'ko' }"
            >
              {{ game.fault_count.value }} ✗
            </span>
            <span class="blues__score-max">/ {{ game.max_points.value }}</span>
          </div>

          <p v-if="game.measure.value" class="blues__current-chord">
            {{ game.measure.value.chord.symbol }}
          </p>

          <div
            v-if="game.measure.value"
            class="blues__bingo"
            :class="`blues__bingo--${game.measure.value.cells.length}`"
            aria-label="Composantes de l’accord"
          >
            <div
              v-for="cell in game.measure.value.cells"
              :key="cell.role"
              class="blues__cell"
              :class="{ 'blues__cell--filled': cell.filled_note }"
            >
              <span class="blues__cell-role">{{ cell.label }}</span>
              <div v-if="cell.filled_note" class="blues__cell-staff">
                <StaffSvg :note="cell.filled_note" duration="quarter" :animate="false" />
              </div>
              <span v-if="cell.filled_note" class="blues__cell-name">
                {{ american_label(cell.filled_note) }}
              </span>
            </div>
          </div>

          <div
            v-if="game.fault_feedback.value"
            :key="game.fault_feedback.value.token"
            class="blues__fault"
            role="status"
          >
            <p class="blues__fault-label">Hors accord</p>
            <p class="blues__fault-name">
              <span>{{ american_label(game.fault_feedback.value.note) }}</span>
              <span class="blues__fault-fr">
                {{ french_label(game.fault_feedback.value.note) }}
              </span>
            </p>
            <div class="blues__fault-staff">
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
.blues {
  background: var(--color-plum);
  transition: background-color var(--duration-fast) var(--ease-effects);
}

.blues--result-ok {
  background: color-mix(in srgb, var(--color-leaf) 36%, var(--color-plum));
}

.blues--result-ko {
  background: color-mix(in srgb, var(--color-coral) 34%, var(--color-plum));
}

.blues__bar {
  color: var(--color-cream);
}

.blues__meta {
  flex: 1 1 5rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(0.7rem, 2.6vh, 0.9rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.8;
}

.blues__mic {
  flex: 1 1 7rem;
  min-width: 0;
  max-width: 13rem;
}

.blues__chart {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: stretch;
  justify-content: center;
  background: color-mix(in srgb, var(--color-cream) 10%, transparent);
  color: var(--color-cream);
  border-radius: var(--radius-asymmetric);
  overflow: hidden;
}

.blues__paused {
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

.blues__grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}

.blues__beat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 0;
  padding: var(--space-xs);
  border-radius: var(--shape-md);
  background: color-mix(in srgb, var(--color-cream) 18%, transparent);
  transition:
    background-color var(--duration-fast) var(--ease-effects),
    color var(--duration-fast) var(--ease-effects),
    transform var(--duration-fast) var(--ease-spatial);
}

.blues__beat--past {
  opacity: 0.55;
}

.blues__beat--current {
  background: var(--color-sun);
  color: var(--color-plum);
  transform: scale(1.03);
}

.blues__beat-index {
  font-size: clamp(0.65rem, 2.2vh, 0.8rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.75;
}

.blues__beat-symbol {
  font-size: clamp(1.05rem, 4.4vh, 1.7rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.blues__beats {
  display: flex;
  justify-content: center;
  gap: 0.55rem;
  flex-shrink: 0;
}

.blues__beat-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-cream) 28%, transparent);
}

.blues__beat-dot--on {
  background: var(--color-sun);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-sun) 35%, transparent);
}

.blues__side {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: stretch;
}

.blues__score {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  align-items: baseline;
  flex-shrink: 0;
}

.blues__score-ok,
.blues__score-ko {
  min-width: 3.25rem;
  padding: 0.2rem 0.7rem;
  border-radius: var(--shape-full);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.9rem, 3.4vh, 1.15rem);
  text-align: center;
}

.blues__score-ok {
  background: var(--color-leaf);
  color: var(--color-cream);
}

.blues__score-ko {
  background: var(--color-coral);
  color: var(--color-cream);
}

.blues__score-max {
  color: var(--color-cream);
  font-weight: var(--font-weight-medium);
  opacity: 0.75;
  font-size: clamp(0.8rem, 2.8vh, 0.95rem);
}

.blues__score-ok--bump,
.blues__score-ko--bump {
  animation: score-bump var(--duration-med) var(--ease-spatial);
}

.blues__current-chord {
  margin: 0;
  text-align: center;
  color: var(--color-sun);
  font-size: clamp(1.4rem, 6vh, 2.2rem);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  flex-shrink: 0;
}

.blues__bingo {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  gap: var(--space-sm);
}

.blues__bingo--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.blues__bingo--4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.blues__bingo--5 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.blues__bingo--6 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.blues__bingo--7 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.blues__bingo--7 .blues__cell:nth-child(5) {
  grid-column: 1;
}

.blues__bingo--7 .blues__cell:nth-child(6) {
  grid-column: 2;
}

.blues__bingo--7 .blues__cell:nth-child(7) {
  grid-column: 3;
}

.blues__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 0;
  min-width: 0;
  padding: var(--space-xs);
  background: var(--color-cream);
  color: var(--color-plum);
  border-radius: var(--shape-md);
  overflow: hidden;
}

.blues__cell--filled {
  background: color-mix(in srgb, var(--color-leaf) 22%, var(--color-cream));
}

.blues__cell-role {
  font-size: clamp(0.65rem, 2.4vh, 0.85rem);
  font-weight: var(--font-weight-bold);
  text-align: center;
  line-height: 1.15;
}

.blues__cell-staff {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-height: 5.5rem;
  color: var(--color-plum);
}

.blues__cell-name {
  font-size: clamp(0.65rem, 2.3vh, 0.8rem);
  font-weight: var(--font-weight-medium);
}

.blues__fault {
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

.blues__fault-label {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.9;
}

.blues__fault-name {
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

.blues__fault-fr {
  font-size: 0.85em;
  font-weight: var(--font-weight-medium);
  opacity: 0.9;
}

.blues__fault-staff {
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

/*
 * Paysage court (iPhone SE) : la grille reste lisible à gauche,
 * le bingo garde assez de largeur pour ses libellés.
 */
@media (max-height: 450px) {
  .blues__body {
    grid-template-columns: minmax(8.5rem, 0.68fr) minmax(16rem, 1.32fr);
  }

  .blues__beat-symbol {
    font-size: clamp(0.85rem, 3.4vh, 1.2rem);
  }

  .blues__current-chord {
    font-size: clamp(1.1rem, 4.8vh, 1.6rem);
  }

  .blues__cell-role {
    font-size: clamp(0.58rem, 2vh, 0.72rem);
    line-height: 1.05;
  }
}
</style>
