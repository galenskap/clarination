<script setup lang="ts">
import { useId } from 'vue'
import {
  FINGERING_HINT_MODE_DESCRIPTIONS,
  FINGERING_HINT_MODE_LABELS,
  FINGERING_HINT_MODES,
  type FingeringHintMode,
} from '@/composables/use_game_options'

defineProps<{
  value: FingeringHintMode
}>()

const emit = defineEmits<{
  change: [value: FingeringHintMode]
}>()

const group_id = useId()

function on_select(mode: FingeringHintMode) {
  emit('change', mode)
}
</script>

<template>
  <section class="hint-mode" :aria-labelledby="`${group_id}-title`">
    <div class="hint-mode__copy">
      <h2 :id="`${group_id}-title`" class="hint-mode__label">Aide à la lecture</h2>
      <p class="hint-mode__description">
        Choisis ce qui s’affiche pendant le jeu de lecture de notes.
      </p>
    </div>
    <div
      class="hint-mode__choices"
      role="radiogroup"
      :aria-labelledby="`${group_id}-title`"
    >
      <label
        v-for="mode in FINGERING_HINT_MODES"
        :key="mode"
        class="hint-mode__choice"
        :class="{ 'hint-mode__choice--active': value === mode }"
      >
        <input
          class="hint-mode__radio"
          type="radio"
          name="fingering-hint-mode"
          :value="mode"
          :checked="value === mode"
          @change="on_select(mode)"
        />
        <span class="hint-mode__choice-label">{{ FINGERING_HINT_MODE_LABELS[mode] }}</span>
        <span class="hint-mode__choice-hint">{{ FINGERING_HINT_MODE_DESCRIPTIONS[mode] }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.hint-mode {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 0;
  padding: clamp(1.25rem, 5.5vh, 2rem) clamp(0.85rem, 4vh, 1.6rem)
    clamp(0.85rem, 4vh, 1.6rem);
  background: var(--color-sun);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  overflow: auto;
}

.hint-mode__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.hint-mode__label {
  font-size: clamp(1rem, 3.6vh, 1.35rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.15;
}

.hint-mode__description {
  margin: 0;
  font-size: clamp(0.8rem, 2.6vh, 0.95rem);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  color: color-mix(in srgb, var(--color-plum) 78%, var(--color-sun));
}

.hint-mode__choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
}

.hint-mode__choice {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: var(--space-sm);
  row-gap: 0.1rem;
  align-items: start;
  padding: clamp(0.55rem, 2.4vh, 0.85rem) clamp(0.65rem, 2.8vh, 1rem);
  border-radius: var(--shape-md);
  background: color-mix(in srgb, var(--color-cream) 55%, var(--color-sun));
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-effects),
    transform var(--duration-fast) var(--ease-spatial);
}

.hint-mode__choice--active {
  background: var(--color-plum);
  color: var(--color-cream);
}

.hint-mode__choice:active {
  transform: scale(0.985);
}

.hint-mode__radio {
  grid-row: 1 / span 2;
  align-self: center;
  width: 1.05rem;
  height: 1.05rem;
  margin: 0;
  accent-color: var(--color-coral);
  flex-shrink: 0;
}

.hint-mode__choice--active .hint-mode__radio {
  accent-color: var(--color-sun);
}

.hint-mode__choice-label {
  font-size: clamp(0.9rem, 3vh, 1.1rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.hint-mode__choice-hint {
  font-size: clamp(0.72rem, 2.3vh, 0.88rem);
  font-weight: var(--font-weight-medium);
  line-height: 1.25;
  color: color-mix(in srgb, var(--color-plum) 72%, var(--color-sun));
}

.hint-mode__choice--active .hint-mode__choice-hint {
  color: color-mix(in srgb, var(--color-cream) 78%, var(--color-sun));
}
</style>
