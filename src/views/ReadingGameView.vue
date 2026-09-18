<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import StaffSvg from '@/components/StaffSvg.vue'
import FingeringPanel from '@/components/FingeringPanel.vue'
import SquareIconButton from '@/components/SquareIconButton.vue'
import MicPermissionGate from '@/components/MicPermissionGate.vue'
import MicSourceSelect from '@/components/MicSourceSelect.vue'
import RegisterSelect from '@/components/RegisterSelect.vue'
import MicLevelMeter from '@/components/MicLevelMeter.vue'
import { use_microphone } from '@/composables/use_microphone'
import { use_pitch_detector } from '@/composables/use_pitch_detector'
import { use_game_session } from '@/composables/use_game_session'
import { cents_to_target, note_proximity, type NoteProximity } from '@/domain/pitch_math'
import type { RegisterId } from '@/domain/registers'

const router = useRouter()
const mic = use_microphone()
const pitch = use_pitch_detector(mic.stream)
const game = use_game_session()
const mic_is_hearing = computed(
  () => pitch.level.value >= 0.12 && !pitch.is_paused.value && !game.is_paused.value,
)

const staff_proximity = computed<NoteProximity | null>(() => {
  if (!mic_is_hearing.value) return null
  const challenge = game.challenge.value
  const analysis = pitch.analysis.value
  if (!challenge || !analysis) return 'near'
  return note_proximity(cents_to_target(analysis.frequency_hz, challenge.note.midi))
})

async function enable_mic() {
  const media_stream = await mic.request_access()
  if (media_stream) {
    await pitch.start()
    game.start_session()
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
  mic.stop()
  void router.push('/')
}

function on_register_change(register_id: RegisterId) {
  game.set_register(register_id)
}

watch(
  mic_is_hearing,
  (hearing) => {
    game.set_hearing(hearing)
  },
  { immediate: true },
)

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
        game.start_session()
      }
    }
  },
)

onMounted(() => {
  /* gesture micro via gate */
})

onUnmounted(() => {
  game.stop_session()
  pitch.stop()
  mic.stop()
})
</script>

<template>
  <div class="game app-screen">
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
          :class="staff_proximity ? `game__staff--hearing game__staff--${staff_proximity}` : undefined"
          aria-label="Note à jouer"
        >
          <div v-if="game.is_paused.value" class="game__paused">Pause</div>
          <StaffSvg
            v-if="game.challenge.value"
            :key="`${game.challenge.value.note.note_id}-${game.challenge.value.shown_at}`"
            :note="game.challenge.value.note"
            :duration="game.challenge.value.duration"
          />
        </section>

        <section class="game__side">
          <div class="game__score">
            <span class="game__score-ok">{{ game.success_count.value }} ✓</span>
            <span class="game__score-ko">{{ game.fail_count.value }} ✗</span>
          </div>
          <FingeringPanel
            v-if="game.challenge.value"
            :note_id="game.challenge.value.note.note_id"
            :visible="game.show_fingerings.value"
          />
        </section>
      </div>
    </MicPermissionGate>
  </div>
</template>

<style scoped>
.game {
  background: var(--color-sky);
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
  transition: box-shadow var(--duration-fast) var(--ease-effects);
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
</style>
