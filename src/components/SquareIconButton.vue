<script setup lang="ts">
import { vMaterialShape } from 'material-shapes-ts/vue'
import { button_morph } from '@/ui/material_shapes'

defineProps<{
  label: string
  variant?: 'plum' | 'coral' | 'sun' | 'sky'
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <span class="square-btn-wrap">
    <button
      v-material-shape="button_morph"
      type="button"
      class="square-btn"
      :class="`square-btn--${variant ?? 'plum'}`"
      :aria-label="label"
      @click="$emit('click')"
    >
      <slot />
    </button>
  </span>
</template>

<style scoped>
.square-btn-wrap {
  flex-shrink: 0;
  display: grid;
  border-radius: var(--shape-md);
}

.square-btn-wrap:focus-within {
  outline: 2px solid var(--color-sun);
  outline-offset: 2px;
}

.square-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.square-btn:active {
  transform: scale(0.9);
}

.square-btn--plum {
  background: var(--color-plum);
  color: var(--color-cream);
}

.square-btn--coral {
  background: var(--color-coral);
  color: var(--color-cream);
}

.square-btn--sun {
  background: var(--color-sun);
  color: var(--color-plum);
}

.square-btn--sky {
  background: var(--color-sky);
  color: var(--color-cream);
}

.square-btn :deep(svg) {
  width: 1.35rem;
  height: 1.35rem;
}
</style>
