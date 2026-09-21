<script setup lang="ts">
import { computed } from 'vue'
import { american_label, french_label, parse_note_id } from '@/domain/notes'

const props = defineProps<{
  note_id: string
  visible: boolean
}>()

const note = computed(() => parse_note_id(props.note_id))
const american = computed(() => (note.value ? american_label(note.value) : props.note_id))
const french = computed(() => (note.value ? french_label(note.value) : '—'))
</script>

<template>
  <Transition name="note-hint">
    <aside v-if="visible" class="note-name-panel" aria-live="polite">
      <h3 class="note-name-panel__title">Note</h3>
      <p class="note-name-panel__american">{{ american }}</p>
      <p class="note-name-panel__french">{{ french }}</p>
    </aside>
  </Transition>
</template>

<style scoped>
.note-name-panel {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--space-xs);
  background: var(--color-plum);
  border-radius: var(--shape-md) var(--shape-xxl) var(--shape-xxl) var(--shape-md);
  padding: clamp(0.85rem, 4vh, 1.6rem);
  color: var(--color-cream);
  text-align: center;
  overflow: hidden;
}

.note-name-panel__title {
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  color: var(--color-sun);
  flex-shrink: 0;
}

.note-name-panel__american {
  margin: 0;
  font-size: clamp(1.6rem, 8vh, 2.6rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.note-name-panel__french {
  margin: 0;
  font-size: clamp(1.1rem, 5vh, 1.7rem);
  font-weight: var(--font-weight-medium);
  line-height: 1.15;
  color: color-mix(in srgb, var(--color-cream) 82%, var(--color-sun));
}

.note-hint-enter-active,
.note-hint-leave-active {
  transition:
    opacity var(--duration-med) var(--ease-effects),
    transform var(--duration-med) var(--ease-spatial);
}

.note-hint-enter-from,
.note-hint-leave-to {
  opacity: 0;
  transform: translateX(1rem) scale(0.92);
}
</style>
