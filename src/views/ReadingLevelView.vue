<script setup lang="ts">
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import {
  grouped_registers,
  type RegisterGroup,
  type RegisterId,
} from '@/domain/registers'

const router = useRouter()
const groups = grouped_registers()

const CARD_ACCENTS: Record<RegisterId, 'coral' | 'sun' | 'sky' | 'leaf'> = {
  beginner: 'leaf',
  intermediate: 'sun',
  advanced: 'coral',
  chalumeau: 'sky',
  throat: 'sun',
  clarion: 'coral',
  altissimo: 'leaf',
}

function group_class(id: RegisterGroup): string {
  return `level-setup__group--${id}`
}

function go_home() {
  void router.push('/')
}
</script>

<template>
  <div class="level-setup app-screen">
    <header class="level-setup__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Lecture de notes</h1>
    </header>

    <div class="level-setup__body">
      <section
        v-for="group in groups"
        :key="group.id"
        class="level-setup__group"
        :class="group_class(group.id)"
      >
        <h2>{{ group.label }}</h2>
        <div class="level-setup__items">
          <RouterLink
            v-for="item in group.items"
            :key="item.id"
            class="level-card"
            :class="`level-card--${CARD_ACCENTS[item.id]}`"
            :to="{ name: 'reading', params: { register: item.id } }"
          >
            <span class="level-card__label">{{ item.label }}</span>
            <span class="level-card__hint">{{ item.hint }}</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.level-setup {
  background: var(--color-plum);
}

.level-setup__bar {
  color: var(--color-sun);
}

.level-setup__body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: var(--space-sm);
}

.level-setup__group {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.level-setup__group h2 {
  flex-shrink: 0;
  color: var(--color-cream);
  font-size: clamp(0.85rem, 3.2vh, 1.1rem);
  letter-spacing: 0.02em;
}

.level-setup__items {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  gap: var(--space-xs);
}

.level-setup__group--level .level-setup__items {
  grid-template-rows: repeat(3, minmax(0, 1fr));
}

.level-setup__group--register .level-setup__items {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.level-card {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  padding: var(--space-sm) clamp(0.85rem, 2.8vw, 1.35rem);
  border-radius: var(--radius-asymmetric);
  transition: transform var(--duration-fast) var(--ease-spatial);
}

.level-card:active {
  transform: scale(0.96);
}

.level-card:focus-visible {
  outline: 2px solid var(--color-sun);
  outline-offset: 3px;
}

.level-card--coral {
  background: var(--color-coral);
  color: var(--color-on-coral);
}

.level-card--sun {
  background: var(--color-sun);
  color: var(--color-on-sun);
}

.level-card--sky {
  background: var(--color-sky);
  color: var(--color-on-sky);
}

.level-card--leaf {
  background: var(--color-leaf);
  color: var(--color-on-leaf);
}

.level-card__label {
  font-weight: var(--font-weight-bold);
  font-size: clamp(0.9rem, 3.6vh, 1.2rem);
  line-height: 1.1;
}

.level-card__hint {
  font-size: clamp(0.82rem, 3vh, 1.05rem);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  opacity: 0.88;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
