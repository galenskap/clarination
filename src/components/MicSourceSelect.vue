<script setup lang="ts">
import { computed, useId } from 'vue'
import type { MicDevice } from '@/composables/use_microphone'

const props = withDefaults(
  defineProps<{
    devices: MicDevice[]
    selected_device_id: string | null
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{
  change: [device_id: string]
}>()

const select_id = useId()

const current_id = computed(() => {
  if (props.devices.some((device) => device.device_id === props.selected_device_id)) {
    return props.selected_device_id
  }
  return props.devices[0]?.device_id ?? ''
})

function on_change(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || !target.value) return
  emit('change', target.value)
}
</script>

<template>
  <div v-if="devices.length" class="mic-source" :class="{ 'mic-source--compact': compact }">
    <label class="mic-source__label" :for="select_id">Source</label>
    <div class="mic-source__field">
      <select
        :id="select_id"
        class="mic-source__select"
        :value="current_id"
        :disabled="disabled"
        @change="on_change"
      >
        <option
          v-for="device in devices"
          :key="device.device_id"
          :value="device.device_id"
        >
          {{ device.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.mic-source {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-xs);
  width: 100%;
}

.mic-source__label {
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
  color: var(--color-plum);
}

.mic-source__field {
  position: relative;
  min-width: 0;
}

.mic-source__select {
  width: 100%;
  min-height: var(--touch-min);
  padding: 0.35rem 2rem 0.35rem 0.75rem;
  border: none;
  border-radius: var(--shape-full);
  background-color: var(--color-cream);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235d0045'%3E%3Cpath d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.2rem;
  color: var(--color-plum);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
  appearance: none;
}

.mic-source__select:disabled {
  opacity: 0.6;
}

.mic-source--compact {
  flex-direction: row;
  align-items: center;
  gap: var(--space-xs);
}

.mic-source--compact .mic-source__label {
  display: none;
}

.mic-source--compact .mic-source__field {
  flex: 1;
  min-width: 0;
}

.mic-source--compact .mic-source__select {
  min-height: calc(var(--touch-min) - 0.15rem);
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  font-size: 0.82rem;
}
</style>
