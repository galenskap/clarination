<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import fingerings from '@/data/fingerings.json'
import { american_label, french_label, parse_note_id } from '@/domain/notes'

const props = defineProps<{
  open: boolean
  note_id: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

interface FingeringEntry {
  variants: string[]
}

const dialog_el = ref<HTMLDialogElement | null>(null)

const note = computed(() => (props.note_id ? parse_note_id(props.note_id) : null))
const american = computed(() =>
  note.value ? american_label(note.value) : (props.note_id ?? ''),
)
const french = computed(() => (note.value ? french_label(note.value) : '—'))

const variants = computed(() => {
  if (!props.note_id) return [] as string[]
  const map = fingerings as Record<string, FingeringEntry>
  return (map[props.note_id]?.variants ?? []).slice(0, 2)
})

function close() {
  emit('close')
}

function on_cancel(event: Event) {
  event.preventDefault()
  close()
}

/** Clic sur le fond (backdrop) : fermer. */
function on_backdrop_click(event: MouseEvent) {
  if (event.target === dialog_el.value) close()
}

watch(
  () => props.open,
  (is_open) => {
    const el = dialog_el.value
    if (!el) return
    if (is_open && !el.open) {
      el.showModal()
    } else if (!is_open && el.open) {
      el.close()
    }
  },
)

onMounted(() => {
  if (props.open && dialog_el.value && !dialog_el.value.open) {
    dialog_el.value.showModal()
  }
})

onUnmounted(() => {
  if (dialog_el.value?.open) dialog_el.value.close()
})
</script>

<template>
  <dialog
    ref="dialog_el"
    class="fingering-dialog"
    aria-labelledby="fingering-dialog-title"
    @cancel="on_cancel"
    @click="on_backdrop_click"
  >
    <div v-if="note_id" class="fingering-dialog__card">
      <header class="fingering-dialog__header">
        <h2 id="fingering-dialog-title" class="fingering-dialog__title">
          Doigté
        </h2>
        <p class="fingering-dialog__note">
          <span>{{ american }}</span>
          <span class="fingering-dialog__note-fr">{{ french }}</span>
        </p>
      </header>

      <div v-if="variants.length" class="fingering-dialog__grid">
        <figure
          v-for="(src, index) in variants"
          :key="src"
          class="fingering-dialog__item"
        >
          <img :src="src" :alt="`Doigté ${index + 1} pour ${american}`" />
          <figcaption v-if="variants.length > 1">Variante {{ index + 1 }}</figcaption>
        </figure>
      </div>
      <p v-else class="fingering-dialog__fallback">
        Doigté indisponible pour cette note (bientôt ajouté).
      </p>

      <button type="button" class="fingering-dialog__cta" @click="close">
        Fermer
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.fingering-dialog {
  border: none;
  padding: 0;
  background: transparent;
  max-width: min(22rem, 88vw);
  max-height: min(92vh, 100%);
  color: var(--color-cream);
}

.fingering-dialog::backdrop {
  background: color-mix(in srgb, var(--color-plum) 78%, transparent);
}

.fingering-dialog__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: clamp(0.7rem, 2.8vh, 1.1rem) clamp(0.85rem, 2.5vw, 1.25rem);
  background: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  box-shadow: 0 0.35rem 1.6rem color-mix(in srgb, var(--color-plum) 45%, transparent);
  overflow: hidden;
  max-height: min(88vh, 100%);
}

.fingering-dialog__header {
  text-align: center;
  flex-shrink: 0;
}

.fingering-dialog__title {
  margin: 0;
  font-size: clamp(0.8rem, 2.8vh, 1rem);
  color: var(--color-sun);
}

.fingering-dialog__note {
  margin: 0.1rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.45rem;
  justify-content: center;
  align-items: baseline;
  font-size: clamp(1rem, 3.8vh, 1.35rem);
  font-weight: var(--font-weight-bold);
}

.fingering-dialog__note-fr {
  font-size: 0.85em;
  font-weight: var(--font-weight-medium);
  color: color-mix(in srgb, var(--color-cream) 82%, var(--color-sun));
}

.fingering-dialog__grid {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  align-items: center;
  flex: 0 1 auto;
  min-height: 0;
}

.fingering-dialog__item {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  flex: 0 1 auto;
  max-width: min(9rem, 38vw);
  min-width: 0;
  min-height: 0;
}

.fingering-dialog__item img {
  display: block;
  width: 100%;
  height: auto;
  max-height: min(28vh, 10rem);
  object-fit: contain;
  background: var(--color-cream);
  border-radius: var(--shape-md);
}

.fingering-dialog__item figcaption {
  font-size: clamp(0.6rem, 2.2vh, 0.75rem);
  font-weight: var(--font-weight-medium);
  color: var(--color-sun);
}

.fingering-dialog__fallback {
  margin: 0;
  text-align: center;
  font-size: clamp(0.85rem, 3vh, 1rem);
  line-height: 1.3;
}

.fingering-dialog__cta {
  align-self: center;
  flex-shrink: 0;
  min-height: calc(var(--touch-min) * 0.9);
  padding: 0.35rem 1.2rem;
  border-radius: var(--shape-full);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.85rem, 3vh, 1.05rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.fingering-dialog__cta:active {
  transform: scale(0.94);
}
</style>
