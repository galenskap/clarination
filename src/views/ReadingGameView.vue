<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StaffSvg from '@/components/StaffSvg.vue'
import FingeringPanel from '@/components/FingeringPanel.vue'
import NoteNamePanel from '@/components/NoteNamePanel.vue'
import SquareIconButton from '@/components/SquareIconButton.vue'
import MicPermissionGate from '@/components/MicPermissionGate.vue'
import MicSourceSelect from '@/components/MicSourceSelect.vue'
import RegisterSelect from '@/components/RegisterSelect.vue'
import MicLevelMeter from '@/components/MicLevelMeter.vue'
import { use_microphone } from '@/composables/use_microphone'
import { use_pitch_detector } from '@/composables/use_pitch_detector'
import { use_game_session } from '@/composables/use_game_session'
import { use_game_sfx } from '@/composables/use_game_sfx'
import { cents_to_target, note_proximity, type NoteProximity } from '@/domain/pitch_math'
import { parse_register_id, type RegisterId } from '@/domain/registers'

const route = useRoute()
const router = useRouter()
const mic = use_microphone()
const pitch = use_pitch_detector(mic.stream)
const game = use_game_session()
const sfx = use_game_sfx()
const mic_is_hearing = computed(
  () => pitch.level.value >= 0.12 && !pitch.is_paused.value && !game.is_paused.value,
)

const score_bump = ref<'ok' | 'ko' | null>(null)
let score_bump_timeout = 0

const staff_proximity = computed<NoteProximity | null>(() => {
  if (game.feedback.value) return null
  if (!mic_is_hearing.value) return null
  const challenge = game.challenge.value
  const analysis = pitch.analysis.value
  if (!challenge || !analysis) return 'near'
  return note_proximity(cents_to_target(analysis.frequency_hz, challenge.note.midi))
})

const result_label = computed(() => {
  const fb = game.feedback.value
  if (!fb) return ''
  return fb.success ? 'Juste !' : 'Raté'
})

function selected_register(): RegisterId | null {
  return parse_register_id(route.params.register)
}

function start_game() {
  const register_id = selected_register()
  if (!register_id) return
  game.start_session(register_id)
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
  game.stop_session()
  pitch.stop()
  void router.push('/')
}

function on_register_change(register_id: RegisterId) {
  game.set_register(register_id)
  if (route.params.register !== register_id) {
    void router.replace({ name: 'reading', params: { register: register_id } })
  }
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
  () => game.feedback.value,
  (fb) => {
    if (!fb) return
    sfx.play(fb.success ? 'success' : 'fail')
    score_bump.value = fb.success ? 'ok' : 'ko'
    if (score_bump_timeout) window.clearTimeout(score_bump_timeout)
    score_bump_timeout = window.setTimeout(() => {
      score_bump.value = null
      score_bump_timeout = 0
    }, 520)
  },
)

watch(
  () => selected_register(),
  (register_id) => {
    if (register_id) game.set_register(register_id)
  },
)

onMounted(async () => {
  const register_id = selected_register()
  if (!register_id) {
    void router.replace({ name: 'reading-setup' })
    return
  }
  game.set_register(register_id)
  const media_stream = await mic.ensure_access()
  if (media_stream) {
    await pitch.start()
    start_game()
  }
})

onUnmounted(() => {
  if (score_bump_timeout) window.clearTimeout(score_bump_timeout)
  game.stop_session()
  pitch.stop()
})
</script>

<template>
  <div
    class="game app-screen"
    :class="{
      'game--result-ok': game.feedback.value?.success === true,
      'game--result-ko': game.feedback.value?.success === false,
    }"
  >
    <header class="game__bar app-toolbar app-toolbar--hide-title">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Lecture de notes</h1>
      <RegisterSelect
        class="game__register"
        :register_id="game.register_id.value"
        @change="on_register_change"
      />
      <MicSourceSelect
        v-if="mic.status.value === 'granted'"
        class="game__mic"
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
      <div class="game__body app-body">
        <section
          class="game__staff app-panel"
          :class="{
            'game__staff--hearing': Boolean(staff_proximity),
            [`game__staff--${staff_proximity}`]: Boolean(staff_proximity),
            'game__staff--result-ok': game.feedback.value?.success === true,
            'game__staff--result-ko': game.feedback.value?.success === false,
          }"
          aria-label="Note à jouer"
          :aria-live="game.feedback.value ? 'assertive' : undefined"
        >
          <div v-if="game.is_paused.value" class="game__paused">Pause</div>

          <div
            v-if="game.feedback.value"
            :key="game.feedback.value.token"
            class="game__result"
            :class="
              game.feedback.value.success
                ? 'game__result--ok'
                : 'game__result--ko'
            "
            role="status"
          >
            <span class="game__result-mark" aria-hidden="true">
              {{ game.feedback.value.success ? '✓' : '✗' }}
            </span>
            <span class="game__result-label">{{ result_label }}</span>
            <span
              v-if="game.feedback.value.success"
              class="game__burst"
              aria-hidden="true"
            >
              <i
                v-for="n in 8"
                :key="n"
                class="game__burst-dot"
                :style="{ '--i': n }"
              />
            </span>
          </div>

          <div
            v-if="game.challenge.value"
            class="game__staff-svg"
            :class="{
              'game__staff-svg--ok': game.feedback.value?.success === true,
              'game__staff-svg--ko': game.feedback.value?.success === false,
            }"
          >
            <StaffSvg
              :key="`${game.challenge.value.note.note_id}-${game.challenge.value.shown_at}`"
              :note="game.challenge.value.note"
              :duration="game.challenge.value.duration"
              :animate="!game.feedback.value"
            />
          </div>
        </section>

        <section class="game__side">
          <div class="game__score">
            <span
              class="game__score-ok"
              :class="{ 'game__score-ok--bump': score_bump === 'ok' }"
            >
              {{ game.success_count.value }} ✓
            </span>
            <span
              class="game__score-ko"
              :class="{ 'game__score-ko--bump': score_bump === 'ko' }"
            >
              {{ game.fail_count.value }} ✗
            </span>
          </div>
          <FingeringPanel
            v-if="game.challenge.value"
            :note_id="game.challenge.value.note.note_id"
            :visible="game.show_fingerings.value"
          />
          <NoteNamePanel
            v-if="game.challenge.value"
            :note_id="game.challenge.value.note.note_id"
            :visible="game.show_note_name.value"
          />
        </section>
      </div>
    </MicPermissionGate>
  </div>
</template>

<style scoped>
.game {
  background: var(--color-sky);
  transition: background-color var(--duration-fast) var(--ease-effects);
}

.game--result-ok {
  background: color-mix(in srgb, var(--color-leaf) 42%, var(--color-sky));
}

.game--result-ko {
  background: color-mix(in srgb, var(--color-coral) 38%, var(--color-sky));
}

.game__bar {
  color: var(--color-cream);
}

.game__register {
  flex: 1 1 8rem;
  min-width: 0;
  max-width: 18rem;
}

.game__mic {
  flex: 1 1 7rem;
  min-width: 0;
  max-width: 13rem;
}

.game__staff {
  position: relative;
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  --hearing-glow: var(--color-leaf);
  box-shadow: 0 0 0 0 transparent;
  transition:
    box-shadow var(--duration-fast) var(--ease-effects),
    background-color var(--duration-fast) var(--ease-effects),
    color var(--duration-fast) var(--ease-effects);
}

.game__staff--hearing {
  box-shadow:
    0 0 0 3px var(--hearing-glow),
    0 0 1.1rem color-mix(in srgb, var(--hearing-glow) 62%, transparent);
}

.game__staff--perfect {
  --hearing-glow: var(--color-leaf);
}

.game__staff--near {
  /* Orange lisible sur le fond soleil, sans élargir la palette. */
  --hearing-glow: color-mix(in srgb, var(--color-coral) 72%, var(--color-sun));
}

.game__staff--far {
  --hearing-glow: var(--color-coral);
}

.game__staff--result-ok {
  background: var(--color-leaf);
  color: var(--color-cream);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-cream) 55%, transparent),
    0 0 1.6rem color-mix(in srgb, var(--color-leaf) 70%, transparent);
  animation: staff-pop-ok var(--duration-med) var(--ease-spatial);
}

.game__staff--result-ko {
  background: var(--color-coral);
  color: var(--color-cream);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-cream) 45%, transparent),
    0 0 1.4rem color-mix(in srgb, var(--color-coral) 65%, transparent);
  animation: staff-shake-ko var(--duration-med) var(--ease-effects);
}

.game__staff-svg {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.game__staff-svg--ok {
  animation: note-celebrate var(--duration-med) var(--ease-spatial);
}

.game__staff-svg--ko {
  animation: note-miss var(--duration-med) var(--ease-effects);
  opacity: 0.72;
}

.game__paused {
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

.game__result {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-content: center;
  place-items: center;
  gap: 0.15rem;
  pointer-events: none;
  animation: result-in var(--duration-med) var(--ease-spatial) both;
}

.game__result-mark {
  font-size: clamp(2.8rem, 14vh, 4.5rem);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  text-shadow: 0 0.12em 0 color-mix(in srgb, var(--color-plum) 28%, transparent);
}

.game__result-label {
  font-size: clamp(1.05rem, 4.2vh, 1.55rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.game__result--ok .game__result-mark,
.game__result--ok .game__result-label {
  color: var(--color-cream);
}

.game__result--ko .game__result-mark,
.game__result--ko .game__result-label {
  color: var(--color-cream);
}

.game__burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.game__burst-dot {
  position: absolute;
  left: 50%;
  top: 42%;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: var(--shape-full);
  background: var(--color-sun);
  transform: rotate(calc(var(--i) * 45deg)) translateY(0) scale(0.4);
  opacity: 0;
  animation: burst-fly var(--duration-med) var(--ease-emphasized-decel) both;
  animation-delay: calc(var(--i) * 18ms);
}

.game__side {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: stretch;
}

.game__score {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-shrink: 0;
}

.game__score-ok,
.game__score-ko {
  min-width: 3.25rem;
  padding: 0.2rem 0.7rem;
  border-radius: var(--shape-full);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.9rem, 3.4vh, 1.15rem);
  text-align: center;
}

.game__score-ok {
  background: var(--color-leaf);
  color: var(--color-cream);
}

.game__score-ko {
  background: var(--color-coral);
  color: var(--color-cream);
}

.game__score-ok--bump {
  animation: score-bump var(--duration-med) var(--ease-spatial);
}

.game__score-ko--bump {
  animation: score-bump var(--duration-med) var(--ease-spatial);
}

@keyframes result-in {
  from {
    opacity: 0;
    transform: scale(0.55);
  }
  62% {
    opacity: 1;
    transform: scale(1.12);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes staff-pop-ok {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.035);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes staff-shake-ko {
  0%,
  100% {
    transform: translateX(0);
  }
  18% {
    transform: translateX(-0.45rem) rotate(-0.6deg);
  }
  36% {
    transform: translateX(0.4rem) rotate(0.5deg);
  }
  54% {
    transform: translateX(-0.28rem);
  }
  72% {
    transform: translateX(0.22rem);
  }
}

@keyframes note-celebrate {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.16);
  }
  100% {
    transform: scale(1.04);
  }
}

@keyframes note-miss {
  0% {
    transform: scale(1) translateY(0);
  }
  55% {
    transform: scale(0.92) translateY(0.35rem);
  }
  100% {
    transform: scale(0.96) translateY(0.15rem);
  }
}

@keyframes burst-fly {
  0% {
    opacity: 0;
    transform: rotate(calc(var(--i) * 45deg)) translateY(0) scale(0.3);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(calc(var(--i) * 45deg)) translateY(-4.2rem) scale(1);
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
