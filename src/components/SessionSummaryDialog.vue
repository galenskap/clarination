<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import FingeringDialog from '@/components/FingeringDialog.vue'
import type { SessionSummary } from '@/domain/session_stats'
import {
  format_duration,
  format_reaction_ms,
  format_success_rate,
} from '@/domain/session_stats'

const props = withDefaults(
  defineProps<{
    open: boolean
    summary: SessionSummary | null
    /** `chord` : libellés accords / fautes, sans doigté. */
    variant?: 'note' | 'chord'
  }>(),
  {
    variant: 'note',
  },
)

const emit = defineEmits<{
  close: []
}>()

const dialog_el = ref<HTMLDialogElement | null>(null)
const fingering_note_id = ref<string | null>(null)
const fingering_open = ref(false)
const is_chord = computed(() => props.variant === 'chord')

const fail_count = computed(() => {
  if (!props.summary) return 0
  return Math.max(0, props.summary.attempts - props.summary.successes)
})

function close() {
  fingering_open.value = false
  fingering_note_id.value = null
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

function show_fingering(note_id: string) {
  if (is_chord.value) return
  fingering_note_id.value = note_id
  fingering_open.value = true
}

function close_fingering() {
  fingering_open.value = false
  fingering_note_id.value = null
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
    if (!is_open) {
      fingering_open.value = false
      fingering_note_id.value = null
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
    class="session-summary"
    aria-labelledby="session-summary-title"
    @cancel="on_cancel"
    @click="on_backdrop_click"
  >
    <div v-if="summary" class="session-summary__card">
      <h2 id="session-summary-title" class="session-summary__title">
        Fin de partie
      </h2>

      <div class="session-summary__grid">
        <dl class="session-summary__stats">
          <div class="session-summary__stat session-summary__stat--duration">
            <dt>Durée de la partie</dt>
            <dd>{{ format_duration(summary.duration_ms) }}</dd>
          </div>
          <template v-if="is_chord">
            <div class="session-summary__stat session-summary__stat--attempts">
              <dt>Accords réussis</dt>
              <dd>{{ summary.successes }}</dd>
            </div>
            <div class="session-summary__stat">
              <dt>Fautes</dt>
              <dd>{{ fail_count }}</dd>
            </div>
            <div class="session-summary__stat session-summary__stat--rate">
              <dt>Réussite</dt>
              <dd>{{ format_success_rate(summary.success_rate) }}</dd>
            </div>
          </template>
          <template v-else>
            <div class="session-summary__stat session-summary__stat--attempts">
              <dt>Notes jouées</dt>
              <dd>{{ summary.attempts }}</dd>
            </div>
            <div class="session-summary__stat">
              <dt>Réussite</dt>
              <dd>{{ format_success_rate(summary.success_rate) }}</dd>
            </div>
          </template>
        </dl>

        <div class="session-summary__notes">
          <component
            :is="is_chord ? 'div' : 'button'"
            v-if="summary.best_note"
            type="button"
            class="session-summary__note session-summary__note--best"
            :class="{ 'session-summary__note--static': is_chord }"
            :aria-label="
              is_chord
                ? undefined
                : `Voir le doigté de ${summary.best_note.american}`
            "
            @click="show_fingering(summary.best_note.note_id)"
          >
            <h3>{{ is_chord ? 'Accord le + réussi' : 'Note la + réussie' }}</h3>
            <p class="session-summary__note-name">
              <span>{{ summary.best_note.american }}</span>
              <span v-if="!is_chord" class="session-summary__note-fr">
                {{ summary.best_note.french }}
              </span>
            </p>
            <p class="session-summary__note-meta">
              {{ format_success_rate(summary.best_note.success_rate) }}
              ·
              {{ format_reaction_ms(summary.best_note.avg_reaction_ms) }}
            </p>
          </component>

          <component
            :is="is_chord ? 'div' : 'button'"
            v-if="summary.worst_note"
            type="button"
            class="session-summary__note session-summary__note--worst"
            :class="{ 'session-summary__note--static': is_chord }"
            :aria-label="
              is_chord
                ? undefined
                : `Voir le doigté de ${summary.worst_note.american}`
            "
            @click="show_fingering(summary.worst_note.note_id)"
          >
            <h3>{{ is_chord ? 'Accord le − réussi' : 'Note la − réussie' }}</h3>
            <p class="session-summary__note-name">
              <span>{{ summary.worst_note.american }}</span>
              <span v-if="!is_chord" class="session-summary__note-fr">
                {{ summary.worst_note.french }}
              </span>
            </p>
            <p class="session-summary__note-meta">
              {{ format_success_rate(summary.worst_note.success_rate) }}
              ·
              {{ format_reaction_ms(summary.worst_note.avg_reaction_ms) }}
            </p>
          </component>
        </div>
      </div>

      <button type="button" class="session-summary__cta" @click="close">
        Retour à l’accueil
      </button>
    </div>
  </dialog>

  <FingeringDialog
    :open="fingering_open"
    :note_id="fingering_note_id"
    @close="close_fingering"
  />
</template>

<style scoped>
.session-summary {
  border: none;
  padding: 0;
  background: transparent;
  max-width: min(42rem, 94vw);
  max-height: min(92vh, 100%);
  color: var(--color-plum);
}

.session-summary::backdrop {
  background: color-mix(in srgb, var(--color-plum) 72%, transparent);
}

.session-summary__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: clamp(0.85rem, 3.2vh, 1.35rem) clamp(1rem, 3vw, 1.6rem);
  background: var(--color-cream);
  border-radius: var(--radius-asymmetric);
  box-shadow: 0 0.35rem 1.6rem color-mix(in srgb, var(--color-plum) 40%, transparent);
  overflow: auto;
  max-height: min(88vh, 100%);
}

.session-summary__title {
  font-size: clamp(1.15rem, 4.5vh, 1.6rem);
  color: var(--color-plum);
  text-align: center;
}

.session-summary__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: var(--space-md);
  align-items: stretch;
  min-width: 0;
}

.session-summary__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  margin: 0;
  align-content: start;
}

.session-summary__stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-sun);
  border-radius: var(--shape-none);
  text-align: center;
  color: var(--color-plum);
}

/* Raccord avec --radius-asymmetric du parent (xxl / sm / xxl / sm). */
.session-summary__stat--duration {
  grid-column: 1 / -1;
  background: var(--color-sky);
  color: var(--color-cream);
  border-top-left-radius: var(--shape-xl);
}

.session-summary__stat--attempts {
  border-bottom-left-radius: var(--shape-sm);
}

.session-summary__stats:has(.session-summary__stat--rate) .session-summary__stat--attempts {
  border-bottom-left-radius: var(--shape-none);
}

.session-summary__stat--rate {
  grid-column: 1 / -1;
  background: var(--color-leaf);
  color: var(--color-cream);
  border-bottom-left-radius: var(--shape-sm);
}

.session-summary__stat dt {
  font-size: clamp(0.7rem, 2.6vh, 0.85rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.85;
}

.session-summary__stat dd {
  margin: 0;
  font-size: clamp(1.1rem, 4.2vh, 1.45rem);
  font-weight: var(--font-weight-bold);
}

.session-summary__notes {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
  min-width: 0;
}

.session-summary__notes:has(.session-summary__note:nth-child(2)) {
  grid-template-columns: 1fr 1fr;
}

.session-summary__note {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--shape-none);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  min-width: 0;
  width: 100%;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spatial);
  border: none;
  font: inherit;
  color: inherit;
}

.session-summary__note--static {
  cursor: default;
}

.session-summary__note:not(.session-summary__note--static):active {
  transform: scale(0.97);
}

.session-summary__note--best {
  background: var(--color-leaf);
  color: var(--color-cream);
}

.session-summary__note--worst {
  background: var(--color-coral);
  color: var(--color-cream);
  border-top-right-radius: var(--shape-sm);
  border-bottom-right-radius: var(--shape-xl);
}

/* Sans note − réussie, la note + occupe le coin droit du bloc. */
.session-summary__notes:not(:has(.session-summary__note--worst)) .session-summary__note--best {
  border-top-right-radius: var(--shape-sm);
  border-bottom-right-radius: var(--shape-xl);
}

.session-summary__note h3 {
  font-size: clamp(0.7rem, 2.6vh, 0.85rem);
  font-weight: var(--font-weight-medium);
  margin: 0;
  opacity: 0.9;
}

.session-summary__note-name {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.55rem;
  justify-content: center;
  align-items: baseline;
  font-size: clamp(1rem, 3.8vh, 1.3rem);
  font-weight: var(--font-weight-bold);
}

.session-summary__note-fr {
  font-size: 0.85em;
  font-weight: var(--font-weight-medium);
  opacity: 0.9;
}

.session-summary__note-meta {
  margin: 0;
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  font-weight: var(--font-weight-medium);
}

.session-summary__cta {
  margin-top: var(--space-xs);
  align-self: center;
  min-height: var(--touch-min);
  padding: 0.45rem 1.4rem;
  border-radius: var(--shape-full);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.95rem, 3.4vh, 1.15rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.session-summary__cta:active {
  transform: scale(0.94);
}

@media (max-width: 640px) {
  .session-summary__grid {
    grid-template-columns: 1fr;
  }

  .session-summary__notes:has(.session-summary__note:nth-child(2)) {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
