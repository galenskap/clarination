<script setup lang="ts">
import { vMaterialShape } from 'material-shapes-ts/vue'
import { use_orientation } from '@/composables/use_orientation'

const { is_landscape } = use_orientation()
</script>

<template>
  <div class="landscape-gate">
    <div class="landscape-gate__content" :aria-hidden="!is_landscape">
      <slot />
    </div>
    <div v-if="!is_landscape" class="landscape-gate__overlay" role="alert">
      <div v-material-shape="'Arch'" class="landscape-gate__card">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <rect x="18" y="8" width="28" height="48" rx="4" fill="currentColor" opacity="0.35" />
          <rect x="8" y="18" width="48" height="28" rx="4" fill="currentColor" />
        </svg>
        <p>Tourne ton appareil en mode paysage pour jouer</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landscape-gate {
  position: relative;
  width: 100%;
  height: 100%;
}

.landscape-gate__content {
  width: 100%;
  height: 100%;
}

.landscape-gate__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: var(--color-coral);
  color: var(--color-cream);
  padding: var(--space-xl);
  text-align: center;
}

.landscape-gate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  width: min(18rem, 80vw);
  aspect-ratio: 1;
  padding: var(--space-lg);
  background: var(--color-plum);
  color: var(--color-sun);
}

.landscape-gate__card p {
  margin: 0;
  font-weight: var(--font-weight-bold);
  font-size: clamp(1rem, 4.5vw, 1.25rem);
  line-height: 1.25;
  color: var(--color-cream);
}
</style>
