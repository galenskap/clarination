<script setup lang="ts">
import type { MicDevice, MicStatus } from '@/composables/use_microphone'
import MicSourceSelect from '@/components/MicSourceSelect.vue'

defineProps<{
  status: MicStatus
  error_message: string | null
  devices: MicDevice[]
  selected_device_id: string | null
}>()

defineEmits<{
  request: []
  select_source: [device_id: string]
}>()
</script>

<template>
  <div v-if="status !== 'granted'" class="mic-gate">
    <div class="mic-gate__card">
      <h2>Micro requis</h2>
      <p>
        Clarination a besoin d'accéder à ton micro pour écouter la hauteur de tes notes.
      </p>
      <p v-if="error_message" class="mic-gate__error">{{ error_message }}</p>
      <MicSourceSelect
        :devices="devices"
        :selected_device_id="selected_device_id"
        :disabled="status === 'requesting'"
        @change="$emit('select_source', $event)"
      />
      <button
        type="button"
        class="mic-gate__btn"
        :disabled="status === 'requesting'"
        @click="$emit('request')"
      >
        {{ status === 'requesting' ? 'Ouverture…' : 'Activer le micro' }}
      </button>
    </div>
  </div>
  <div v-else class="mic-gate__granted">
    <p v-if="error_message" class="mic-gate__error mic-gate__error--bar">{{ error_message }}</p>
    <div class="mic-gate__slot">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.mic-gate {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  width: 100%;
  padding: var(--space-sm);
}

.mic-gate__card {
  max-width: min(28rem, 92%);
  width: 100%;
  max-height: 100%;
  overflow: auto;
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  padding: clamp(1.15rem, 5.5vh, 1.9rem) clamp(1.35rem, 4.5vw, 2.1rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  text-align: center;
}

.mic-gate__card h2 {
  font-size: clamp(1.15rem, 4.5vh, 1.6rem);
  color: var(--color-plum);
}

.mic-gate__card p {
  margin: 0;
  line-height: 1.3;
  font-size: clamp(0.85rem, 3vh, 1rem);
}

.mic-gate__error {
  color: var(--color-coral);
  font-weight: var(--font-weight-medium);
}

.mic-gate__error--bar {
  margin: 0;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.mic-gate__btn {
  margin-top: var(--space-xs);
  align-self: center;
  min-height: var(--touch-min);
  padding: 0.45rem 1.4rem;
  border-radius: var(--shape-md);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.95rem, 3.4vh, 1.1rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.mic-gate__btn:active {
  transform: scale(0.94);
}

.mic-gate__btn:disabled {
  opacity: 0.6;
}

.mic-gate__granted {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.mic-gate__slot {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mic-gate__card :deep(.mic-source) {
  text-align: left;
}
</style>
