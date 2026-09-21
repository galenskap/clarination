<script setup lang="ts">
import { computed } from 'vue'
import { format_success_rate } from '@/domain/session_stats'

const props = defineProps<{
  success_rate: number
  /** Nombre de succès (pour accessibilité). */
  successes?: number
  /** Nombre d’échecs. */
  failures?: number
}>()

const size = 120
const stroke = 18
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

const clamped_rate = computed(() => {
  if (!Number.isFinite(props.success_rate)) return 0
  return Math.min(1, Math.max(0, props.success_rate))
})

const success_dash = computed(() => clamped_rate.value * circumference)
const fail_dash = computed(() => (1 - clamped_rate.value) * circumference)
const aria = computed(() => {
  const rate = format_success_rate(clamped_rate.value)
  if (props.successes != null && props.failures != null) {
    return `Réussite globale ${rate} : ${props.successes} réussies, ${props.failures} ratées`
  }
  return `Réussite globale ${rate}`
})
</script>

<template>
  <div class="donut" role="img" :aria-label="aria">
    <svg
      class="donut__svg"
      :viewBox="`0 0 ${size} ${size}`"
      width="100%"
      height="100%"
    >
      <circle
        class="donut__track"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
      />
      <circle
        v-if="clamped_rate < 1"
        class="donut__fail"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        :stroke-dasharray="`${fail_dash} ${circumference}`"
        :stroke-dashoffset="-success_dash"
        stroke-linecap="butt"
        transform="rotate(-90 60 60)"
      />
      <circle
        v-if="clamped_rate > 0"
        class="donut__ok"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        :stroke-dasharray="`${success_dash} ${circumference}`"
        stroke-dashoffset="0"
        stroke-linecap="butt"
        transform="rotate(-90 60 60)"
      />
    </svg>
    <div class="donut__label">
      <span class="donut__value">{{ format_success_rate(clamped_rate) }}</span>
      <span class="donut__caption">réussite</span>
    </div>
  </div>
</template>

<style scoped>
.donut {
  position: relative;
  width: min(100%, 9.5rem);
  aspect-ratio: 1;
  margin-inline: auto;
}

.donut__svg {
  display: block;
}

.donut__track {
  stroke: color-mix(in srgb, var(--color-plum) 35%, var(--color-cream));
}

.donut__ok {
  stroke: var(--color-leaf);
}

.donut__fail {
  stroke: var(--color-coral);
}

.donut__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  place-items: center;
  gap: 0.05rem;
  pointer-events: none;
}

.donut__value {
  font-size: clamp(1.1rem, 4.5vh, 1.45rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-plum);
  line-height: 1;
}

.donut__caption {
  font-size: clamp(0.65rem, 2.4vh, 0.8rem);
  color: color-mix(in srgb, var(--color-plum) 70%, var(--color-sky));
}
</style>
