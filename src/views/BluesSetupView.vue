<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import {
  BLUES_BLUE_NOTE_OPTIONS,
  BLUES_BPM_DEFAULT,
  BLUES_BPM_MAX,
  BLUES_BPM_MIN,
  BLUES_GRID_SIZE,
  BLUES_ROOT_OPTIONS,
  all_blues_blue_notes,
  blues_blue_notes_query,
  blues_grid_query,
  classic_blues_grid,
  empty_blues_grid,
  type BluesBlueNoteId,
  type BluesBlueNotesOptions,
} from '@/domain/blues'
import {
  CHORD_QUALITIES,
  build_chord,
  type ChordDefinition,
  type ChordQualityId,
} from '@/domain/chords'
import { french_pitch_name, type NoteLetter } from '@/domain/notes'

const router = useRouter()

const cells = ref<(ChordDefinition | null)[]>(empty_blues_grid())
const bpm = ref(BLUES_BPM_DEFAULT)
const blue_notes = ref<BluesBlueNotesOptions>(all_blues_blue_notes())

function set_blue_note(id: BluesBlueNoteId, checked: boolean) {
  blue_notes.value = { ...blue_notes.value, [id]: checked }
}
const preset_root = ref<NoteLetter>('C')

const editing_index = ref<number | null>(null)
const draft_root = ref<NoteLetter>('C')
const draft_quality = ref<ChordQualityId>('dom7')

const filled_count = computed(
  () => cells.value.filter((cell) => cell != null).length,
)
const can_play = computed(() => filled_count.value === BLUES_GRID_SIZE)

const draft_symbol = computed(() =>
  build_chord(draft_root.value, draft_quality.value).symbol,
)

const preset_root_label = computed(() => french_pitch_name(preset_root.value))

const preset_root_index = computed(() =>
  BLUES_ROOT_OPTIONS.indexOf(preset_root.value),
)

function go_home() {
  void router.push('/')
}

function bump_preset_root(delta: number) {
  const current = preset_root_index.value
  if (current < 0) {
    preset_root.value = 'C'
    return
  }
  const next = Math.min(
    BLUES_ROOT_OPTIONS.length - 1,
    Math.max(0, current + delta),
  )
  preset_root.value = BLUES_ROOT_OPTIONS[next]
}

function apply_blues_preset() {
  cells.value = classic_blues_grid(preset_root.value)
}

function open_editor(index: number) {
  const current = cells.value[index]
  editing_index.value = index
  if (current) {
    draft_root.value = current.root
    draft_quality.value = current.quality
  } else {
    draft_root.value = 'C'
    draft_quality.value = 'dom7'
  }
}

function close_editor() {
  editing_index.value = null
}

function apply_editor() {
  if (editing_index.value == null) return
  const next = [...cells.value]
  next[editing_index.value] = build_chord(draft_root.value, draft_quality.value)
  cells.value = next
  editing_index.value = null
}

function clear_editor_cell() {
  if (editing_index.value == null) return
  const next = [...cells.value]
  next[editing_index.value] = null
  cells.value = next
  editing_index.value = null
}

function bump_bpm(delta: number) {
  bpm.value = Math.min(BLUES_BPM_MAX, Math.max(BLUES_BPM_MIN, bpm.value + delta))
}

function on_bpm_input(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const parsed = Number(target.value)
  if (!Number.isFinite(parsed)) return
  bpm.value = Math.min(BLUES_BPM_MAX, Math.max(BLUES_BPM_MIN, Math.round(parsed)))
}

function start_game() {
  if (!can_play.value) return
  const grid = cells.value.filter((cell): cell is ChordDefinition => cell != null)
  if (grid.length !== BLUES_GRID_SIZE) return
  void router.push({
    name: 'blues-game',
    query: {
      grid: blues_grid_query(grid),
      bpm: String(bpm.value),
      blue: blues_blue_notes_query(blue_notes.value),
    },
  })
}
</script>

<template>
  <div class="blues-setup app-screen">
    <header class="blues-setup__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Blues</h1>
    </header>

    <div class="blues-setup__body">
      <section class="blues-setup__grid-panel" aria-label="Grille de 12 accords">
        <p class="blues-setup__hint">
          Compose ta grille (4 × 3), ou charge un blues classique.
        </p>
        <div class="blues-setup__grid" role="group" aria-label="Mesures">
          <button
            v-for="(cell, index) in cells"
            :key="index"
            type="button"
            class="blues-cell"
            :class="{ 'blues-cell--empty': !cell }"
            :aria-label="
              cell
                ? `Mesure ${index + 1} : ${cell.symbol}`
                : `Mesure ${index + 1} : vide`
            "
            @click="open_editor(index)"
          >
            <span class="blues-cell__index">{{ index + 1 }}</span>
            <span class="blues-cell__symbol">{{ cell?.symbol ?? '+' }}</span>
          </button>
        </div>
      </section>

      <aside class="blues-setup__controls">
        <div class="blues-setup__controls-scroll">
          <section class="blues-setup__card" aria-label="Preset blues">
            <h2 class="blues-setup__card-title">Blues classique</h2>
            <div class="blues-setup__root-stepper" role="group" aria-label="Tonalité">
              <button
                type="button"
                class="blues-setup__root-btn"
                :disabled="preset_root_index <= 0"
                aria-label="Tonalité précédente"
                @click="bump_preset_root(-1)"
              >
                −
              </button>
              <span class="blues-setup__root-value" aria-live="polite">
                {{ preset_root_label }}
              </span>
              <button
                type="button"
                class="blues-setup__root-btn"
                :disabled="preset_root_index >= BLUES_ROOT_OPTIONS.length - 1"
                aria-label="Tonalité suivante"
                @click="bump_preset_root(1)"
              >
                +
              </button>
            </div>
            <button type="button" class="blues-setup__preset" @click="apply_blues_preset">
              Remplir la grille
            </button>
          </section>
        </div>

        <section class="blues-setup__card blues-setup__card--tempo" aria-label="Tempo">
          <h2 class="blues-setup__card-title">Tempo</h2>
          <div class="blues-setup__tempo">
            <button
              type="button"
              class="blues-setup__tempo-btn"
              :disabled="bpm <= BLUES_BPM_MIN"
              aria-label="Diminuer le tempo"
              @click="bump_bpm(-5)"
            >
              −
            </button>
            <div class="blues-setup__tempo-value">
              <input
                class="blues-setup__tempo-input"
                type="number"
                inputmode="numeric"
                :min="BLUES_BPM_MIN"
                :max="BLUES_BPM_MAX"
                :value="bpm"
                aria-label="Battements par minute"
                @change="on_bpm_input"
              />
              <span aria-hidden="true">BPM</span>
            </div>
            <button
              type="button"
              class="blues-setup__tempo-btn"
              :disabled="bpm >= BLUES_BPM_MAX"
              aria-label="Augmenter le tempo"
              @click="bump_bpm(5)"
            >
              +
            </button>
          </div>
        </section>

        <fieldset class="blues-setup__blue" aria-label="Blue notes à compter">
          <legend class="blues-setup__blue-legend">Compter</legend>
          <label
            v-for="option in BLUES_BLUE_NOTE_OPTIONS"
            :key="option.id"
            class="blues-setup__blue-item"
          >
            <input
              type="checkbox"
              :checked="blue_notes[option.id]"
              @change="
                set_blue_note(
                  option.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span>{{ option.label }}</span>
          </label>
        </fieldset>

        <button
          type="button"
          class="blues-setup__play"
          :disabled="!can_play"
          @click="start_game"
        >
          Jouer
          <span v-if="!can_play" class="blues-setup__play-hint">
            {{ filled_count }}/{{ BLUES_GRID_SIZE }}
          </span>
        </button>
      </aside>
    </div>

    <div
      v-if="editing_index != null"
      class="blues-editor"
      role="dialog"
      aria-modal="true"
      :aria-label="`Choisir l’accord de la mesure ${(editing_index ?? 0) + 1}`"
    >
      <div class="blues-editor__card">
        <div class="blues-editor__scroll">
          <header class="blues-editor__head">
            <h2>Mesure {{ (editing_index ?? 0) + 1 }}</h2>
            <p class="blues-editor__preview">{{ draft_symbol }}</p>
          </header>

          <div class="blues-editor__section">
            <h3>Fondamentale</h3>
            <div class="blues-setup__roots">
              <button
                v-for="root in BLUES_ROOT_OPTIONS"
                :key="root"
                type="button"
                class="blues-chip"
                :class="{ 'blues-chip--on': draft_root === root }"
                :aria-pressed="draft_root === root"
                @click="draft_root = root"
              >
                {{ french_pitch_name(root) }}
              </button>
            </div>
          </div>

          <div class="blues-editor__section">
            <h3>Qualité</h3>
            <div class="blues-editor__qualities">
              <button
                v-for="quality in CHORD_QUALITIES"
                :key="quality.id"
                type="button"
                class="blues-chip blues-chip--quality"
                :class="{ 'blues-chip--on': draft_quality === quality.id }"
                :aria-pressed="draft_quality === quality.id"
                @click="draft_quality = quality.id"
              >
                <span>{{ quality.example }}</span>
                <small>{{ quality.label }}</small>
              </button>
            </div>
          </div>
        </div>

        <div class="blues-editor__actions">
          <button type="button" class="blues-editor__ghost" @click="clear_editor_cell">
            Vider
          </button>
          <button type="button" class="blues-editor__ghost" @click="close_editor">
            Annuler
          </button>
          <button type="button" class="blues-editor__ok" @click="apply_editor">
            Valider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blues-setup {
  background: var(--color-plum);
}

.blues-setup__bar {
  color: var(--color-sun);
}

.blues-setup__body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(18rem, 0.95fr);
  gap: 1.35rem;
  padding: 0 1.25rem 0.85rem;
  overflow: hidden;
}

.blues-setup__grid-panel {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.blues-setup__controls {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.15rem 0.85rem 0.35rem 0.35rem;
  overflow: hidden;
}

.blues-setup__controls-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 0.15rem;
}

.blues-setup__hint {
  margin: 0;
  flex-shrink: 0;
  color: var(--color-cream);
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
  text-align: center;
}

.blues-setup__grid {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 24rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(4.5rem, 1fr));
  gap: 0.55rem;
  align-content: center;
}

.blues-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  min-height: 0;
  padding: 0.35rem;
  border-radius: var(--shape-md);
  background: var(--color-sun);
  color: var(--color-plum);
  font-weight: var(--font-weight-bold);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.blues-cell--empty {
  background: color-mix(in srgb, var(--color-cream) 16%, transparent);
  color: var(--color-cream);
}

.blues-cell:active {
  transform: scale(0.96);
}

.blues-cell__index {
  font-size: 1.5rem;
  line-height: 1;
  opacity: 0.88;
}

.blues-cell__symbol {
  font-size: 1.85rem;
  line-height: 1.1;
}

.blues-cell--empty .blues-cell__symbol {
  font-size: 3.25rem;
  line-height: 0.95;
  opacity: 0.96;
}

.blues-setup__card {
  flex-shrink: 0;
  padding: 1rem 1.2rem;
  border-radius: var(--shape-md);
  background: color-mix(in srgb, var(--color-cream) 12%, transparent);
  color: var(--color-cream);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.blues-setup__card--tempo {
  flex-shrink: 0;
  background: var(--color-sun);
  color: var(--color-plum);
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem 0.75rem;
  padding: 0.55rem 0.95rem;
}

.blues-setup__card-title {
  margin: 0;
  font-size: 1.15rem;
}

.blues-setup__card--tempo .blues-setup__card-title {
  font-size: 0.95rem;
}

.blues-setup__root-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.blues-setup__root-btn {
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;
  border-radius: var(--shape-md);
  background: color-mix(in srgb, var(--color-cream) 18%, transparent);
  color: var(--color-cream);
  font-size: 1.4rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.blues-setup__root-btn:disabled {
  opacity: 0.38;
}

.blues-setup__root-value {
  min-width: 4.5rem;
  text-align: center;
  font-size: 1.55rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.blues-setup__roots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.blues-chip {
  min-height: 2.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--shape-full);
  background: color-mix(in srgb, var(--color-cream) 16%, transparent);
  color: inherit;
  font-weight: var(--font-weight-bold);
  font-size: 1rem;
}

.blues-chip--on {
  background: var(--color-coral);
  color: var(--color-cream);
}

.blues-chip--quality {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  border-radius: var(--shape-md);
  min-width: 4.8rem;
  min-height: 3.4rem;
  padding: 0.45rem 0.5rem;
  font-size: clamp(1rem, 3.2vh, 1.2rem);
}

.blues-chip--quality small {
  font-size: 0.72em;
  font-weight: var(--font-weight-medium);
  opacity: 0.85;
}

.blues-setup__preset {
  align-self: stretch;
  min-height: var(--touch-min);
  padding: 0.45rem 1.8rem;
  border-radius: var(--shape-full);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(1rem, 3.6vh, 1.25rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.blues-setup__preset:active {
  transform: scale(0.94);
}

.blues-setup__tempo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin-left: auto;
}

.blues-setup__tempo-btn {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: var(--shape-md);
  background: var(--color-plum);
  color: var(--color-sun);
  font-size: 1.2rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.blues-setup__tempo-btn:disabled {
  opacity: 0.38;
}

.blues-setup__tempo-value {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  font-weight: var(--font-weight-bold);
  font-size: 0.9rem;
}

.blues-setup__tempo-input {
  width: 2.6rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.35rem;
  text-align: right;
  appearance: textfield;
}

.blues-setup__tempo-input::-webkit-outer-spin-button,
.blues-setup__tempo-input::-webkit-inner-spin-button {
  appearance: none;
}

.blues-setup__blue {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.85rem;
  flex-shrink: 0;
  margin: 0;
  padding: 0.15rem 0.35rem;
  border: none;
  color: var(--color-cream);
  font-weight: var(--font-weight-medium);
  font-size: 0.9rem;
}

.blues-setup__blue-legend {
  padding: 0;
  margin-right: 0.15rem;
}

.blues-setup__blue-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.blues-setup__blue input {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  accent-color: var(--color-coral);
}

.blues-setup__play {
  flex-shrink: 0;
  align-self: stretch;
  min-height: var(--touch-min);
  padding: 0.45rem 1.8rem;
  border-radius: var(--shape-full);
  background: var(--color-coral);
  color: var(--color-cream);
  font-weight: var(--font-weight-bold);
  font-size: clamp(1rem, 3.6vh, 1.25rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.blues-setup__play:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.blues-setup__play:not(:disabled):active {
  transform: scale(0.94);
}

.blues-setup__play-hint {
  font-size: 0.8em;
  opacity: 0.85;
}

.blues-editor {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--color-plum) 72%, transparent);
}

.blues-editor__card {
  width: min(52rem, 100%);
  max-height: min(92vh, 44rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  border-radius: var(--radius-asymmetric);
  background: var(--color-cream);
  color: var(--color-plum);
}

.blues-editor__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.5rem 1.75rem 1rem;
}

.blues-editor__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.blues-editor__head h2 {
  margin: 0;
  font-size: 1.55rem;
}

.blues-editor__section h3 {
  margin: 0;
}

.blues-editor__preview {
  margin: 0;
  font-size: 2.2rem;
  font-weight: var(--font-weight-bold);
}

.blues-editor__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.blues-editor__section h3 {
  font-size: 1.2rem;
}

.blues-editor__qualities {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.7rem;
}

.blues-editor .blues-chip {
  background: color-mix(in srgb, var(--color-plum) 10%, transparent);
  color: var(--color-plum);
  font-size: 1.1rem;
  min-height: 2.6rem;
  padding: 0.5rem 0.9rem;
}

.blues-editor .blues-chip--quality {
  min-height: 4.1rem;
  font-size: 1.25rem;
  padding: 0.55rem 0.45rem;
}

.blues-editor .blues-chip--quality small {
  font-size: 0.74em;
}

.blues-editor .blues-chip--on {
  background: var(--color-coral);
  color: var(--color-cream);
}

.blues-editor__actions {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.85rem 1.75rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--color-plum) 14%, transparent);
  background: var(--color-cream);
}

.blues-editor__ghost,
.blues-editor__ok {
  min-height: var(--touch-min);
  padding: 0.45rem 1.8rem;
  border-radius: var(--shape-full);
  font-weight: var(--font-weight-bold);
  font-size: clamp(1rem, 3.6vh, 1.25rem);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.blues-editor__ghost:active,
.blues-editor__ok:active {
  transform: scale(0.94);
}

.blues-editor__ghost {
  background: color-mix(in srgb, var(--color-plum) 12%, transparent);
  color: var(--color-plum);
}

.blues-editor__ok {
  background: var(--color-coral);
  color: var(--color-cream);
}

/*
 * Paysage court (iPhone SE, ~375px de haut) : la grille reste à gauche
 * et se cale sur la hauteur utile, les réglages restent visibles à droite.
 */
@media (max-height: 430px) and (orientation: landscape) {
  .blues-setup__body {
    grid-template-columns: minmax(0, 1fr) minmax(12.5rem, 0.92fr);
    gap: 0.5rem;
    padding: 0 0.55rem 0.3rem;
  }

  .blues-setup__grid-panel {
    gap: 0.25rem;
  }

  .blues-setup__hint {
    font-size: 0.75rem;
  }

  .blues-setup__grid {
    max-height: none;
    gap: 0.3rem;
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }

  .blues-cell {
    padding: 0.15rem;
  }

  .blues-cell__index {
    font-size: 0.8rem;
  }

  .blues-cell__symbol {
    font-size: 1.05rem;
  }

  .blues-cell--empty .blues-cell__symbol {
    font-size: 1.45rem;
  }

  .blues-setup__controls {
    gap: 0.35rem;
    padding: 0 0.1rem 0;
  }

  .blues-setup__card {
    padding: 0.45rem 0.7rem;
    gap: 0.35rem;
  }

  .blues-setup__card--tempo {
    padding: 0.3rem 0.65rem;
  }

  .blues-setup__card-title {
    font-size: 0.9rem;
  }

  .blues-setup__root-btn {
    width: 1.9rem;
    height: 1.9rem;
    font-size: 1.1rem;
  }

  .blues-setup__root-value {
    min-width: 3.4rem;
    font-size: 1.15rem;
  }

  .blues-setup__preset,
  .blues-setup__play {
    min-height: 2rem;
    padding: 0.25rem 0.9rem;
    font-size: 0.95rem;
  }

  .blues-setup__blue {
    font-size: 0.75rem;
    gap: 0.25rem 0.55rem;
    padding: 0;
  }

  .blues-setup__tempo-btn {
    width: 1.85rem;
    height: 1.85rem;
  }
}

/* Éditeur en paysage court : fondamentales à gauche, qualités à droite. */
@media (max-height: 430px) and (orientation: landscape) {
  .blues-editor__card {
    max-height: calc(100dvh - 0.8rem);
  }

  .blues-editor__scroll {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr);
    gap: 0.45rem 0.9rem;
    align-content: start;
    padding: 0.7rem 1rem 0.45rem;
  }

  .blues-editor__head {
    grid-column: 1 / -1;
  }

  .blues-editor__head h2 {
    font-size: 1.2rem;
  }

  .blues-editor__preview {
    font-size: 1.6rem;
  }

  .blues-editor__section {
    gap: 0.4rem;
    min-height: 0;
  }

  .blues-editor__section h3 {
    font-size: 0.95rem;
  }

  .blues-editor .blues-chip {
    min-height: 1.9rem;
    padding: 0.2rem 0.65rem;
    font-size: 0.95rem;
  }

  .blues-editor__qualities {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .blues-editor .blues-chip--quality {
    min-height: 2.35rem;
    font-size: 0.9rem;
    padding: 0.25rem 0.3rem;
  }

  .blues-editor__actions {
    padding: 0.4rem 1rem 0.55rem;
  }
}

/* Portrait étroit : la grille passe au-dessus des réglages. */
@media (max-width: 820px) and (orientation: portrait) {
  .blues-setup__body {
    grid-template-columns: 1fr;
    overflow: auto;
    gap: 1rem;
    padding: 0 1rem 0.85rem;
  }

  .blues-setup__controls {
    padding: 0.5rem 0 0;
  }

  .blues-setup__grid {
    min-height: 16rem;
    flex: 0 0 auto;
    height: 16rem;
  }

  .blues-editor__card {
    padding: 1.25rem;
  }

  .blues-editor__qualities {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
