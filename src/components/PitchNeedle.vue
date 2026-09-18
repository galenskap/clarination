<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Écart en cents (−50 … +50 typiquement). null = pas de signal. */
    cents: number | null
    /** Plage visuelle en cents (±). */
    range_cents?: number
  }>(),
  {
    range_cents: 50,
  },
)

const needle_percent = computed(() => {
  if (props.cents == null) return 50
  const clamped = Math.max(-props.range_cents, Math.min(props.range_cents, props.cents))
  return ((clamped + props.range_cents) / (props.range_cents * 2)) * 100
})

const in_tune = computed(() => {
  if (props.cents == null) return false
  return Math.abs(props.cents) < 10
})

const hint = computed(() => {
  if (props.cents == null) return 'Joue une note…'
  if (Math.abs(props.cents) < 10) return 'Juste !'
  if (props.cents < 0) return 'Monte un peu'
  return 'Baisse un peu'
})
</script>

<template>
  <div class="pitch-needle" :class="{ 'pitch-needle--live': cents != null }">
    <div class="pitch-needle__labels">
      <span>♭</span>
      <span class="pitch-needle__hint">{{ hint }}</span>
      <span>♯</span>
    </div>
    <div class="pitch-needle__track" role="meter" :aria-valuenow="cents ?? undefined" aria-valuemin="-50" aria-valuemax="50">
      <div class="pitch-needle__center" />
      <div class="pitch-needle__sweet" />
      <div
        class="pitch-needle__cursor"
        :class="{ 'pitch-needle__cursor--ok': in_tune }"
        :style="{ left: `${needle_percent}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.pitch-needle {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.pitch-needle__labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.9rem, 3.2vh, 1.1rem);
  color: var(--color-cream);
}

.pitch-needle__hint {
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  font-weight: var(--font-weight-medium);
  color: var(--color-sun);
}

.pitch-needle--live .pitch-needle__hint {
  color: var(--color-cream);
}

.pitch-needle__track {
  position: relative;
  height: clamp(1.45rem, 7vh, 2.4rem);
  border-radius: var(--shape-full);
  background: var(--color-plum);
  overflow: hidden;
}

.pitch-needle__center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  transform: translateX(-50%);
  background: var(--color-sun);
  opacity: 0.45;
}

.pitch-needle__sweet {
  position: absolute;
  left: calc(50% - 8%);
  width: 16%;
  top: 0;
  bottom: 0;
  background: var(--color-leaf);
  opacity: 0.85;
  border-radius: var(--shape-sm);
}

.pitch-needle__cursor {
  position: absolute;
  top: 50%;
  width: clamp(0.95rem, 4.2vh, 1.25rem);
  height: clamp(0.95rem, 4.2vh, 1.25rem);
  border-radius: 35%;
  background: var(--color-sun);
  transform: translate(-50%, -50%);
  transition:
    left var(--duration-fast) var(--ease-spatial),
    background var(--duration-fast) var(--ease-effects);
}

.pitch-needle__cursor--ok {
  background: var(--color-leaf);
  animation: needle-pulse var(--duration-slow) var(--ease-spatial) infinite alternate;
}

@keyframes needle-pulse {
  from {
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    transform: translate(-50%, -50%) scale(1.18);
  }
}
</style>
