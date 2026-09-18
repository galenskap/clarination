<script setup lang="ts">
import { useRouter } from 'vue-router'
import SquareIconButton from '@/components/SquareIconButton.vue'
import TimeStepper from '@/components/TimeStepper.vue'
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

    <div class="options__body app-body">
      <TimeStepper
        label="Doigté"
        description="Délai sans son avant d’afficher le doigté de la note."
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
</template>

<style scoped>
.options {
  background: var(--color-leaf);
}

.options__bar {
  color: var(--color-cream);
}
</style>
