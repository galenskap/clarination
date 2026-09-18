<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  description: string
  value: number
  min: number
  max: number
}>()

const emit = defineEmits<{
  change: [value: number]
}>()

const input_id = useId()
const at_min = computed(() => props.value <= props.min)
const at_max = computed(() => props.value >= props.max)

function bump(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, props.value + delta))
  if (next !== props.value) {
    emit('change', next)
  }
}

function on_input(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const parsed = Number(target.value)
  if (!Number.isFinite(parsed)) return
  const next = Math.min(props.max, Math.max(props.min, Math.round(parsed)))
  emit('change', next)
}
</script>

<template>
  <section class="time-stepper">
    <div class="time-stepper__copy">
      <label class="time-stepper__label" :for="input_id">{{ label }}</label>
      <p class="time-stepper__description">{{ description }}</p>
    </div>
    <div class="time-stepper__controls">
      <button
        type="button"
        class="time-stepper__btn"
        :disabled="at_min"
        :aria-label="`Diminuer ${label}`"
        @click="bump(-1)"
      >
        −
      </button>
      <div class="time-stepper__value">
        <input
          :id="input_id"
          class="time-stepper__input"
          type="number"
          inputmode="numeric"
          :min="min"
          :max="max"
          :value="value"
          :aria-valuemin="min"
          :aria-valuemax="max"
          :aria-valuenow="value"
          @change="on_input"
        />
        <span class="time-stepper__unit" aria-hidden="true">s</span>
      </div>
      <button
        type="button"
        class="time-stepper__btn"
        :disabled="at_max"
        :aria-label="`Augmenter ${label}`"
        @click="bump(1)"
      >
        +
      </button>
    </div>
  </section>
</template>

<style scoped>
.time-stepper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-md);
  min-height: 0;
  padding: var(--space-lg);
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
}

.time-stepper__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.time-stepper__label {
  font-size: clamp(1rem, 3.6vh, 1.35rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.15;
}

.time-stepper__description {
  margin: 0;
  font-size: clamp(0.8rem, 2.6vh, 0.95rem);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  color: color-mix(in srgb, var(--color-plum) 78%, var(--color-sun));
}

.time-stepper__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.time-stepper__btn {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  border-radius: var(--shape-md);
  background: var(--color-plum);
  color: var(--color-sun);
  font-size: 1.6rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.time-stepper__btn:active:not(:disabled) {
  transform: scale(0.9);
}

.time-stepper__btn:disabled {
  opacity: 0.38;
  cursor: default;
}

.time-stepper__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.2rem;
  min-width: 5.5rem;
}

.time-stepper__input {
  width: 3.1rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-plum);
  font-family: inherit;
  font-size: clamp(1.8rem, 8vh, 2.6rem);
  font-weight: var(--font-weight-bold);
  text-align: right;
  appearance: textfield;
}

.time-stepper__input::-webkit-outer-spin-button,
.time-stepper__input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.time-stepper__input:focus-visible {
  outline: 2px solid var(--color-coral);
  outline-offset: 3px;
  border-radius: var(--shape-xs);
}

.time-stepper__unit {
  font-size: clamp(0.95rem, 3.4vh, 1.2rem);
  font-weight: var(--font-weight-bold);
}
</style>
