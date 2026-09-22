<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import StatsLineChart from '@/components/StatsLineChart.vue'
import FingeringDialog from '@/components/FingeringDialog.vue'
import {
  GAME_IDS,
  GAME_LABELS,
  use_game_stats,
  type GameId,
} from '@/composables/use_game_stats'
import {
  format_duration,
  format_reaction_ms,
  format_success_rate,
} from '@/domain/session_stats'
import { is_register_id, register_of } from '@/domain/registers'

const router = useRouter()
const stats = use_game_stats()
const active_game = ref<GameId>('reading')
const fingering_note_id = ref<string | null>(null)
const fingering_open = ref(false)

const current = computed(() => stats.stats_for(active_game.value))
const has_data = computed(() => current.value.session_count > 0)

const date_formatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
})

function format_session_date(started_at: number): string {
  return date_formatter.format(new Date(started_at))
}

function register_label(register_id: string): string {
  if (!is_register_id(register_id)) return register_id
  return register_of(register_id).label
}

const line_points = computed(() =>
  current.value.sessions
    .filter((session) => session.avg_reaction_ms != null)
    .map((session) => ({
      x: session.started_at,
      y: session.avg_reaction_ms as number,
      label: format_reaction_ms(session.avg_reaction_ms),
      date_label: format_session_date(session.started_at),
      register_label: register_label(session.register_id),
    })),
)

const best_slots = computed(() =>
  Array.from({ length: 3 }, (_, index) => current.value.best_notes[index] ?? null),
)

const worst_slots = computed(() =>
  Array.from({ length: 3 }, (_, index) => current.value.worst_notes[index] ?? null),
)

function go_home() {
  void router.push('/')
}

function select_game(game_id: GameId) {
  active_game.value = game_id
}

function show_fingering(note_id: string) {
  fingering_note_id.value = note_id
  fingering_open.value = true
}

function close_fingering() {
  fingering_open.value = false
  fingering_note_id.value = null
}
</script>

<template>
  <div class="stats app-screen">
    <header class="stats__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Statistiques</h1>
      <div class="stats__tabs" role="tablist" aria-label="Jeux">
        <button
          v-for="game_id in GAME_IDS"
          :key="game_id"
          type="button"
          role="tab"
          class="stats__tab"
          :class="{ 'stats__tab--active': active_game === game_id }"
          :aria-selected="active_game === game_id"
          @click="select_game(game_id)"
        >
          {{ GAME_LABELS[game_id] }}
        </button>
      </div>
    </header>

    <div class="stats__panel" role="tabpanel">
      <p v-if="!has_data" class="stats__empty">
        Aucune partie enregistrée pour {{ GAME_LABELS[active_game] }}.
        Joue une session puis reviens ici !
      </p>

      <div v-else class="stats__grid">
        <div class="stats__stat stats__stat--duration">
          <span class="stats__stat-label">Durée totale</span>
          <span class="stats__stat-value">{{ format_duration(current.total_duration_ms) }}</span>
          <span class="stats__stat-hint">toutes parties confondues</span>
        </div>

        <div class="stats__kpis">
          <div class="stats__stat stats__stat--attempts">
            <span class="stats__stat-label">Notes jouées</span>
            <span class="stats__stat-value">{{ current.total_attempts }}</span>
          </div>
          <div class="stats__stat">
            <span class="stats__stat-label">Parties</span>
            <span class="stats__stat-value">{{ current.session_count }}</span>
          </div>
          <div class="stats__stat stats__stat--rate">
            <span class="stats__stat-label">Réussite</span>
            <span class="stats__stat-value">{{ format_success_rate(current.success_rate) }}</span>
          </div>
        </div>

        <div class="stats__rank" aria-label="Notes les plus et moins réussies">
          <div class="stats__rank-row stats__rank-row--best">
            <button
              v-for="(note, index) in best_slots"
              :key="`best-${index}`"
              type="button"
              class="stats__rank-item stats__rank-item--best"
              :class="{ 'stats__rank-item--empty': !note }"
              :disabled="!note"
              :aria-label="note ? `Voir le doigté de ${note.american}` : undefined"
              @click="note && show_fingering(note.note_id)"
            >
              <template v-if="note">
                <span class="stats__rank-name">{{ note.american }}</span>
                <span class="stats__rank-meta">
                  {{ format_success_rate(note.success_rate) }}
                  ·
                  {{ format_reaction_ms(note.avg_reaction_ms) }}
                </span>
              </template>
              <span v-else class="stats__rank-placeholder">—</span>
            </button>
          </div>
          <div class="stats__rank-row stats__rank-row--worst">
            <button
              v-for="(note, index) in worst_slots"
              :key="`worst-${index}`"
              type="button"
              class="stats__rank-item stats__rank-item--worst"
              :class="{
                'stats__rank-item--empty': !note,
                'stats__rank-item--bl': index === 0,
              }"
              :disabled="!note"
              :aria-label="note ? `Voir le doigté de ${note.american}` : undefined"
              @click="note && show_fingering(note.note_id)"
            >
              <template v-if="note">
                <span class="stats__rank-name">{{ note.american }}</span>
                <span class="stats__rank-meta">
                  {{ format_success_rate(note.success_rate) }}
                  ·
                  {{ format_reaction_ms(note.avg_reaction_ms) }}
                </span>
              </template>
              <span v-else class="stats__rank-placeholder">—</span>
            </button>
          </div>
        </div>

        <section class="stats__chart" aria-label="Temps moyen par note">
          <h2 class="stats__chart-title">Temps moyen / note</h2>
          <StatsLineChart
            :points="line_points"
            x_label="Sessions"
            y_label="Temps moyen"
          />
        </section>
      </div>
    </div>

    <FingeringDialog
      :open="fingering_open"
      :note_id="fingering_note_id"
      @close="close_fingering"
    />
  </div>
</template>

<style scoped>
.stats {
  background: var(--color-sky);
}

.stats__bar {
  color: var(--color-cream);
}

.stats__tabs {
  display: flex;
  gap: var(--space-sm);
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-end;
  overflow-x: auto;
}

.stats__tab {
  flex: 0 0 auto;
  min-height: calc(var(--touch-min) * 0.85);
  padding: 0.35rem 1rem;
  border-radius: var(--shape-full);
  background: color-mix(in srgb, var(--color-plum) 35%, var(--color-sky));
  color: var(--color-cream);
  font-weight: var(--font-weight-medium);
  font-size: clamp(0.8rem, 3vh, 1rem);
  transition:
    background-color var(--duration-fast) var(--ease-effects),
    transform var(--duration-fast) var(--ease-spatial);
}

.stats__tab--active {
  background: var(--color-sun);
  color: var(--color-plum);
  font-weight: var(--font-weight-bold);
}

.stats__tab:active {
  transform: scale(0.96);
}

.stats__panel {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl);
  background: var(--color-cream);
  color: var(--color-plum);
  border-radius: var(--radius-asymmetric);
  overflow: hidden;
}

.stats__empty {
  margin: auto;
  max-width: 22rem;
  text-align: center;
  font-weight: var(--font-weight-medium);
  font-size: clamp(0.95rem, 3.5vh, 1.15rem);
  line-height: 1.35;
}

.stats__grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: stretch;
}

.stats__kpis {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
  min-width: 0;
  min-height: 0;
  align-self: stretch;
}

.stats__kpis > .stats__stat {
  min-height: 100%;
  height: 100%;
}

.stats__rank {
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: var(--space-sm);
  min-width: 0;
  min-height: 0;
}

.stats__chart {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  min-height: 0;
  padding: var(--space-sm);
  background: color-mix(in srgb, var(--color-sun) 40%, var(--color-cream));
  border-radius: var(--shape-none);
  border-bottom-right-radius: var(--shape-xxl);
}

.stats__stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.1rem;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-sun);
  border-radius: var(--shape-none);
  text-align: center;
  color: var(--color-plum);
  min-width: 0;
}

.stats__stat--duration {
  grid-column: 1;
  grid-row: 1;
  background: var(--color-sky);
  color: var(--color-cream);
  border-top-left-radius: var(--shape-xxl);
}

.stats__stat--rate {
  background: var(--color-leaf);
  color: var(--color-cream);
  border-top-right-radius: var(--shape-sm);
}

.stats__stat-label {
  font-size: clamp(0.65rem, 2.4vh, 0.8rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.85;
}

.stats__stat-value {
  font-size: clamp(1.05rem, 4.2vh, 1.45rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.stats__stat-hint {
  font-size: clamp(0.6rem, 2.2vh, 0.75rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.85;
}

.stats__chart-title {
  margin: 0;
  flex-shrink: 0;
  font-size: clamp(0.75rem, 2.8vh, 0.95rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-plum);
  text-align: center;
}

.stats__chart :deep(.line-chart) {
  flex: 1;
  min-height: 0;
}

.stats__rank-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
  min-width: 0;
  min-height: 0;
}

.stats__rank-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
  width: 100%;
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--shape-none);
  text-align: center;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.stats__rank-item:enabled:active {
  transform: scale(0.96);
}

.stats__rank-item:disabled {
  cursor: default;
}

.stats__rank-item--best {
  background: var(--color-leaf);
  color: var(--color-cream);
}

.stats__rank-item--worst {
  background: var(--color-coral);
  color: var(--color-cream);
}

.stats__rank-item--bl {
  border-bottom-left-radius: var(--shape-sm);
}

.stats__rank-item--empty {
  opacity: 0.45;
}

.stats__rank-name {
  font-size: clamp(0.9rem, 3.4vh, 1.15rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.stats__rank-meta {
  font-size: clamp(0.65rem, 2.4vh, 0.8rem);
  font-weight: var(--font-weight-medium);
  opacity: 0.92;
}

.stats__rank-placeholder {
  font-size: clamp(1rem, 3.5vh, 1.25rem);
  font-weight: var(--font-weight-bold);
  opacity: 0.7;
}
</style>
