<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  grouped_registers,
  is_register_id,
  register_of,
  type RegisterId,
} from '@/domain/registers'

const props = defineProps<{
  register_id: RegisterId
}>()

const emit = defineEmits<{
  change: [register_id: RegisterId]
}>()

const select_id = useId()
const groups = grouped_registers()
const current_hint = computed(() => register_of(props.register_id).hint)

function on_change(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || !target.value) return
  if (!is_register_id(target.value)) return
  emit('change', target.value)
}
</script>

<template>
  <div class="register-select">
    <label class="register-select__label" :for="select_id">Registre</label>
    <div class="register-select__field">
      <select
        :id="select_id"
        class="register-select__select"
        :value="register_id"
        :title="current_hint"
        @change="on_change"
      >
        <optgroup
          v-for="group in groups"
          :key="group.id"
          :label="group.label"
        >
          <option
            v-for="item in group.items"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </option>
        </optgroup>
      </select>
    </div>
  </div>
</template>

<style scoped>
.register-select {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.register-select__label {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: var(--font-weight-medium);
  color: inherit;
}

.register-select__field {
  position: relative;
  flex: 1;
  min-width: 0;
}

@media (max-width: 740px) {
  .register-select__label {
    display: none;
  }
}

.register-select__select {
  width: 100%;
  min-height: calc(var(--touch-min) - 0.2rem);
  padding: 0.2rem 1.8rem 0.2rem 0.65rem;
  border: none;
  outline: none;
  box-shadow: none;
  border-radius: var(--shape-full);
  background-color: var(--color-sun);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235d0045'%3E%3Cpath d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.4rem center;
  background-size: 1.15rem;
  color: var(--color-plum);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  appearance: none;
}

.register-select__select:focus-visible {
  outline: 2px solid var(--color-cream);
  outline-offset: 2px;
}
</style>
