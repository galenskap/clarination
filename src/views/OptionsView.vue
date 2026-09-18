<script setup lang="ts">
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import TimeStepper from '@/components/TimeStepper.vue'
import FingeringHintModeSelect from '@/components/FingeringHintModeSelect.vue'
import {
  MAX_FAIL_SECONDS,
  MAX_HINT_SECONDS,
  MIN_FAIL_SECONDS,
  MIN_HINT_SECONDS,
  use_game_options,
} from '@/composables/use_game_options'

const router = useRouter()
const options = use_game_options()

function go_home() {
  void router.push('/')
}
</script>

<template>
  <div class="options app-screen">
    <header class="options__bar app-toolbar">
      <SquareIconButton label="Accueil" variant="coral" @click="go_home">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4 3 12h3v7h5v-5h2v5h5v-7h3L12 4z" />
        </svg>
      </SquareIconButton>
      <h1>Options</h1>
    </header>

    <div class="options__body">
      <FingeringHintModeSelect
        class="options__hint-mode"
        :value="options.fingering_hint_mode.value"
        @change="options.set_fingering_hint_mode"
      />
      <div class="options__timers">
        <TimeStepper
          v-if="options.fingering_hint_mode.value === 'delayed'"
          label="Délai du doigté"
          description="Secondes avant d’afficher le doigté de la note."
          :value="options.hint_seconds.value"
          :min="MIN_HINT_SECONDS"
          :max="MAX_HINT_SECONDS"
          @change="options.set_hint_seconds"
        />
        <TimeStepper
          label="Note perdue"
          description="Délai avant de passer à la note suivante si elle n’est pas jouée."
          :value="options.fail_seconds.value"
          :min="MIN_FAIL_SECONDS"
          :max="MAX_FAIL_SECONDS"
          @change="options.set_fail_seconds"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.options {
  background: var(--color-leaf);
}

.options__bar {
  color: var(--color-cream);
}

.options__body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
  gap: var(--space-md);
  align-items: stretch;
}

.options__hint-mode {
  min-height: 0;
}

.options__timers {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 0;
  min-width: 0;
}

.options__timers > * {
  flex: 1 1 0;
  min-height: 0;
}
</style>
