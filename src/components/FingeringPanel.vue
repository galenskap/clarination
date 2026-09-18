<script setup lang="ts">
import { computed } from 'vue'
import fingerings from '@/data/fingerings.json'

const props = defineProps<{
  note_id: string
  visible: boolean
}>()

interface FingeringEntry {
  variants: string[]
}

const entry = computed(() => {
  const map = fingerings as Record<string, FingeringEntry>
  return map[props.note_id] ?? null
})

const variants = computed(() => (entry.value?.variants ?? []).slice(0, 2))
</script>

<template>
  <Transition name="fingering">
    <aside v-if="visible" class="fingering-panel" aria-live="polite">
      <h3 class="fingering-panel__title">Doigtés — {{ note_id }}</h3>
      <div v-if="variants.length" class="fingering-panel__grid">
        <figure v-for="(src, i) in variants" :key="src" class="fingering-panel__item">
          <img :src="src" :alt="`Doigté ${i + 1} pour ${note_id}`" />
          <figcaption v-if="variants.length > 1">Variante {{ i + 1 }}</figcaption>
        </figure>
      </div>
      <p v-else class="fingering-panel__fallback">
        Doigté indisponible pour cette note (bientôt ajouté).
      </p>
    </aside>
  </Transition>
</template>

<style scoped>
.fingering-panel {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-plum);
  border-radius: var(--shape-md) var(--shape-xxl) var(--shape-xxl) var(--shape-md);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-cream);
  overflow: hidden;
}

.fingering-panel__title {
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  margin-bottom: var(--space-xs);
  color: var(--color-sun);
  flex-shrink: 0;
}

.fingering-panel__grid {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  align-items: stretch;
}

.fingering-panel__item {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.fingering-panel__item img {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: auto;
  object-fit: contain;
  background: var(--color-cream);
  border-radius: var(--shape-md);
}

.fingering-panel__item figcaption {
  font-size: 0.65rem;
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
  color: var(--color-sun);
}

.fingering-panel__fallback {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.3;
}

.fingering-enter-active,
.fingering-leave-active {
  transition:
    opacity var(--duration-med) var(--ease-effects),
    transform var(--duration-med) var(--ease-spatial);
}

.fingering-enter-from,
.fingering-leave-to {
  opacity: 0;
  transform: translateX(1rem) scale(0.92);
}
</style>
