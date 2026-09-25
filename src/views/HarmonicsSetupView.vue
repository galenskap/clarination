<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import {
  CHORD_QUALITIES,
  chord_types_query,
  type ChordQualityId,
} from '@/domain/chords'

const router = useRouter()

const selected = ref<Record<ChordQualityId, boolean>>(
  Object.fromEntries(CHORD_QUALITIES.map((q) => [q.id, true])) as Record<
    ChordQualityId,
    boolean
  >,
)

const selected_ids = computed(() =>
  CHORD_QUALITIES.map((q) => q.id).filter((id) => selected.value[id]),
)

const can_play = computed(() => selected_ids.value.length > 0)

const all_selected = computed(
  () => selected_ids.value.length === CHORD_QUALITIES.length,
)

function toggle(id: ChordQualityId) {
  selected.value = { ...selected.value, [id]: !selected.value[id] }
}

function toggle_all() {
  const next = !all_selected.value
  selected.value = Object.fromEntries(
    CHORD_QUALITIES.map((q) => [q.id, next]),
  ) as Record<ChordQualityId, boolean>
}

function go_home() {
  void router.push('/')
}

function start_game() {
  if (!can_play.value) return
  void router.push({
    name: 'harmoniques-game',
    query: { types: chord_types_query(selected_ids.value) },
  })
}
</script>

<template>
  <div class="harmonics-setup app-screen">
    <header class="harmonics-setup__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Harmoniques</h1>
    </header>

    <div class="harmonics-setup__body">
      <p class="harmonics-setup__hint">
        Coche les types d’accords à travailler, puis joue.
      </p>

      <div class="harmonics-setup__actions">
        <button
          type="button"
          class="harmonics-setup__toggle-all"
          @click="toggle_all"
        >
          {{ all_selected ? 'Tout décocher' : 'Tout cocher' }}
        </button>
      </div>

      <div class="harmonics-setup__grid" role="group" aria-label="Types d’accords">
        <label
          v-for="quality in CHORD_QUALITIES"
          :key="quality.id"
          class="harmonics-chip"
          :class="{ 'harmonics-chip--on': selected[quality.id] }"
        >
          <input
            type="checkbox"
            class="harmonics-chip__input"
            :checked="selected[quality.id]"
            :aria-label="`${quality.example} ${quality.label}`"
            @click.prevent="toggle(quality.id)"
          />
          <span class="harmonics-chip__example" aria-hidden="true">{{ quality.example }}</span>
          <span class="harmonics-chip__label" aria-hidden="true">{{ quality.label }}</span>
        </label>
      </div>

      <button
        type="button"
        class="harmonics-setup__play"
        :disabled="!can_play"
        @click="start_game"
      >
        Jouer
      </button>
    </div>
  </div>
</template>

<style scoped>
.harmonics-setup {
  background: var(--color-plum);
}

.harmonics-setup__bar {
  color: var(--color-sun);
}

.harmonics-setup__body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  overflow: auto;
}

.harmonics-setup__hint {
  margin: 0;
  color: var(--color-cream);
  font-size: clamp(0.9rem, 3.2vh, 1.1rem);
  font-weight: var(--font-weight-medium);
  text-align: center;
}

.harmonics-setup__actions {
  display: flex;
  justify-content: center;
}

.harmonics-setup__toggle-all {
  min-height: calc(var(--touch-min) * 0.85);
  padding: 0.3rem 1rem;
  border-radius: var(--shape-full);
  background: color-mix(in srgb, var(--color-cream) 18%, transparent);
  color: var(--color-cream);
  font-weight: var(--font-weight-medium);
  font-size: clamp(0.8rem, 2.8vh, 0.95rem);
}

.harmonics-setup__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-sm);
  flex: 1 1 auto;
  align-content: start;
  min-height: 0;
}

.harmonics-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 4.5rem;
  padding: var(--space-sm);
  border-radius: var(--shape-md);
  background: color-mix(in srgb, var(--color-cream) 12%, transparent);
  color: var(--color-cream);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-effects),
    transform var(--duration-fast) var(--ease-spatial);
  text-align: center;
}

.harmonics-chip--on {
  background: var(--color-sun);
  color: var(--color-plum);
}

.harmonics-chip:active {
  transform: scale(0.96);
}

.harmonics-chip__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.harmonics-chip__example {
  font-size: clamp(1.05rem, 4vh, 1.4rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.harmonics-chip__label {
  font-size: clamp(0.65rem, 2.4vh, 0.8rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.9;
}

.harmonics-setup__play {
  align-self: center;
  min-height: var(--touch-min);
  min-width: 10rem;
  padding: 0.45rem 1.8rem;
  border-radius: var(--shape-full);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(1rem, 3.6vh, 1.25rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.harmonics-setup__play:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.harmonics-setup__play:not(:disabled):active {
  transform: scale(0.94);
}

@media (max-width: 720px) {
  .harmonics-setup__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
