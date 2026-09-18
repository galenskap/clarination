<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import StaffSvg from '@/components/StaffSvg.vue'
import PitchNeedle from '@/components/PitchNeedle.vue'
import SquareIconButton from '@/components/SquareIconButton.vue'
import MicPermissionGate from '@/components/MicPermissionGate.vue'
import MicSourceSelect from '@/components/MicSourceSelect.vue'
import MicLevelMeter from '@/components/MicLevelMeter.vue'
import { use_microphone } from '@/composables/use_microphone'
import { use_pitch_detector } from '@/composables/use_pitch_detector'
import { display_label } from '@/domain/notes'

const router = useRouter()
const mic = use_microphone()
const pitch = use_pitch_detector(mic.stream)

const note = computed(() => pitch.analysis.value?.nearest_note ?? null)
const cents = computed(() => pitch.analysis.value?.cents_offset ?? null)
const frequency_label = computed(() => {
  const hz = pitch.analysis.value?.frequency_hz
  if (hz == null) return '—'
  return `${hz.toFixed(1)} Hz`
})
const note_label = computed(() => (note.value ? display_label(note.value) : '—'))
const mic_is_hearing = computed(() => pitch.level.value >= 0.12)

async function enable_mic(device_id?: string) {
  const media_stream = await mic.request_access(device_id)
  if (media_stream) {
    await pitch.start()
  }
}

function on_select_source(device_id: string) {
  if (mic.status.value === 'granted') {
    void enable_mic(device_id)
    return
  }
  mic.prefer_device(device_id)
}

function go_home() {
  pitch.stop()
  mic.stop()
  void router.push('/')
}

watch(
  () => mic.status.value,
  async (status) => {
    if (status === 'granted' && !pitch.is_running.value) {
      await pitch.start()
    }
  },
)

onMounted(() => {
  /* L’utilisateur déclenche le micro via le gate (gesture requis iOS). */
})

onUnmounted(() => {
  pitch.stop()
  mic.stop()
})
</script>

<template>
  <div class="tuner app-screen">
    <header class="tuner__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="sun" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Accordeur</h1>
      <MicSourceSelect
        v-if="mic.status.value === 'granted'"
        class="tuner__mic"
        compact
        :devices="mic.devices.value"
        :selected_device_id="mic.selected_device_id.value"
        @change="on_select_source"
      />
      <MicLevelMeter
        v-if="mic.status.value === 'granted'"
        :level="pitch.level.value"
      />
    </header>

    <MicPermissionGate
      :status="mic.status.value"
      :error_message="mic.error_message.value"
      :devices="mic.devices.value"
      :selected_device_id="mic.selected_device_id.value"
      @request="enable_mic"
      @select_source="on_select_source"
    >
      <div class="tuner__body app-body">
        <section
          class="tuner__staff app-panel"
          :class="{ 'tuner__staff--hearing': mic_is_hearing }"
          aria-label="Partition"
        >
          <StaffSvg :note="note" duration="quarter" />
        </section>

        <section class="tuner__readout" aria-label="Lecture de hauteur">
          <div class="tuner__note-letter">{{ note_label }}</div>
          <div class="tuner__hz">{{ frequency_label }}</div>
          <PitchNeedle :cents="cents" />
        </section>
      </div>
    </MicPermissionGate>
  </div>
</template>

<style scoped>
.tuner {
  background: var(--color-plum);
}

.tuner__bar {
  color: var(--color-sun);
}

.tuner__mic {
  margin-left: auto;
  min-width: 0;
  max-width: 16rem;
}

.tuner__staff {
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow var(--duration-fast) var(--ease-effects);
}

.tuner__staff--hearing {
  box-shadow:
    0 0 0 3px var(--color-leaf),
    0 0 1.1rem color-mix(in srgb, var(--color-leaf) 62%, transparent);
}

.tuner__readout {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: stretch;
  justify-content: center;
  padding: var(--space-md);
  background: var(--color-coral);
  color: var(--color-cream);
  border-radius: var(--radius-asymmetric-flip);
}

.tuner__note-letter {
  font-size: clamp(1.7rem, 11vh, 3.75rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-cream);
  text-align: center;
  line-height: 0.95;
  animation: letter-pop var(--duration-med) var(--ease-spatial);
}

.tuner__hz {
  text-align: center;
  font-size: clamp(0.85rem, 3.2vh, 1.15rem);
  font-weight: var(--font-weight-medium);
  color: var(--color-sun);
}

@keyframes letter-pop {
  from {
    opacity: 0.35;
    transform: scale(0.82);
  }
  70% {
    transform: scale(1.08);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
