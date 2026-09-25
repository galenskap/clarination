<script setup lang="ts">
import { computed } from 'vue'
import { vMaterialShape } from 'material-shapes-ts/vue'
import { tile_morph } from '@/ui/material_shapes'

const props = defineProps<{
  label: string
  to: string
  accent?: 'coral' | 'sun' | 'sky' | 'leaf' | 'cream'
}>()

const accent = computed(() => props.accent ?? 'coral')
const morph = computed(() => tile_morph[accent.value])
</script>

<template>
  <RouterLink
    v-material-shape="morph"
    class="home-tile"
    :class="`home-tile--${accent}`"
    :to="to"
  >
    <span class="home-tile__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <span class="home-tile__label">{{ label }}</span>
  </RouterLink>
</template>

<style scoped>
.home-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  aspect-ratio: 1;
  width: min(28vh, 22vw, 11.5rem);
  padding: var(--space-md);
  text-align: center;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.home-tile:active {
  transform: scale(0.92);
}

.home-tile--coral {
  background: var(--color-coral);
  color: var(--color-on-coral);
}

.home-tile--sun {
  background: var(--color-sun);
  color: var(--color-on-sun);
}

.home-tile--sky {
  background: var(--color-sky);
  color: var(--color-on-sky);
}

.home-tile--leaf {
  background: var(--color-leaf);
  color: var(--color-on-leaf);
}

.home-tile--cream {
  background: var(--color-cream);
  color: var(--color-plum);
}

.home-tile__icon {
  width: clamp(2rem, 8vh, 3.25rem);
  height: clamp(2rem, 8vh, 3.25rem);
  display: grid;
  place-items: center;
}

.home-tile__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.home-tile__label {
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.85rem, 3.2vh, 1.2rem);
  line-height: 1.1;
}
</style>
