<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    level: number
  }>(),
  {
    level: 0,
  },
)

const BAR_WEIGHTS = [0.22, 0.4, 0.62, 0.82, 1]

const is_live = computed(() => props.level >= 0.12)

const bar_scales = computed(() =>
  BAR_WEIGHTS.map((weight) => {
    const fill = props.level / weight
    return Math.max(0.16, Math.min(1, fill))
  }),
)

const percent = computed(() => Math.round(props.level * 100))
</script>

<template>
  <div
    class="mic-level"
    :class="{ 'mic-level--live': is_live }"
    role="meter"
    aria-label="Niveau du micro"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <span
      v-for="(scale, index) in bar_scales"
      :key="index"
      class="mic-level__bar"
      :style="{ transform: `scaleY(${scale})` }"
    />
  </div>
</template>

<style scoped>
.mic-level {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.16rem;
  width: 1.55rem;
  height: calc(var(--touch-min) - 0.2rem);
  padding: 0.15rem 0;
}

.mic-level__bar {
  flex: 1;
  height: 100%;
  border-radius: var(--shape-xs);
  background: currentColor;
  opacity: 0.38;
  transform-origin: center bottom;
  transition:
    transform 90ms linear,
    background-color var(--duration-fast) var(--ease-effects),
    opacity var(--duration-fast) var(--ease-effects);
}

.mic-level--live .mic-level__bar {
  background: var(--color-leaf);
  opacity: 1;
}

.mic-level--live {
  animation: mic-level-pulse 0.85s var(--ease-spatial) infinite;
}

@keyframes mic-level-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
</style>
