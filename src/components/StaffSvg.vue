<script setup lang="ts">
import { computed } from 'vue'
import type { Accidental, NoteDuration } from '@/domain/notes'
import { staff_steps_from_b4, type MusicalNote } from '@/domain/notes'

const props = withDefaults(
  defineProps<{
    note: MusicalNote | null
    duration?: NoteDuration
    animate?: boolean
  }>(),
  {
    duration: 'quarter',
    animate: true,
  },
)

const LINE_GAP = 14
const STAFF_TOP = 70
const NOTE_X = 170

const staff_lines = [0, 1, 2, 3, 4].map((i) => STAFF_TOP + i * LINE_GAP)

const note_y = computed(() => {
  if (!props.note) return null
  const steps = staff_steps_from_b4(props.note)
  return STAFF_TOP + 2 * LINE_GAP - steps * (LINE_GAP / 2)
})

const ledger_lines = computed(() => {
  if (!props.note) return [] as number[]
  const steps = staff_steps_from_b4(props.note)
  const extra: number[] = []
  if (steps >= 5) {
    for (
      let line_steps = 6;
      line_steps <= steps + (steps % 2 === 0 ? 0 : -1);
      line_steps += 2
    ) {
      extra.push(STAFF_TOP + 2 * LINE_GAP - line_steps * (LINE_GAP / 2))
    }
  }
  if (steps <= -5) {
    for (
      let line_steps = -6;
      line_steps >= steps - (steps % 2 === 0 ? 0 : 1);
      line_steps -= 2
    ) {
      extra.push(STAFF_TOP + 2 * LINE_GAP - line_steps * (LINE_GAP / 2))
    }
  }
  return extra
})

function accidental_symbol(accidental: Accidental): string {
  if (accidental === 'sharp') return '♯'
  if (accidental === 'flat') return '♭'
  return ''
}
</script>

<template>
  <svg
    class="staff-svg"
    viewBox="0 0 280 220"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="note ? `Note ${note.note_id}` : 'Portée vide'"
  >
    <g class="staff-svg__lines">
      <line
        v-for="(y, i) in staff_lines"
        :key="i"
        x1="16"
        :y1="y"
        x2="264"
        :y2="y"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </g>

    <!-- Clé de sol : Wikimedia Commons File:GClef.svg (domaine public).
         La boucle intérieure doit cerner la 2e ligne (sol) : y = STAFF_TOP + 3 * LINE_GAP. -->
    <g class="staff-svg__clef" transform="translate(22, 28) scale(3.05)">
      <path
        fill="currentColor"
        d="m12.049 3.5296c0.305 3.1263-2.019 5.6563-4.0772 7.7014-0.9349 0.897-0.155 0.148-0.6437 0.594-0.1022-0.479-0.2986-1.731-0.2802-2.11 0.1304-2.6939 2.3198-6.5875 4.2381-8.0236 0.309 0.5767 0.563 0.6231 0.763 1.8382zm0.651 16.142c-1.232-0.906-2.85-1.144-4.3336-0.885-0.1913-1.255-0.3827-2.51-0.574-3.764 2.3506-2.329 4.9066-5.0322 5.0406-8.5394 0.059-2.232-0.276-4.6714-1.678-6.4836-1.7004 0.12823-2.8995 2.156-3.8019 3.4165-1.4889 2.6705-1.1414 5.9169-0.57 8.7965-0.8094 0.952-1.9296 1.743-2.7274 2.734-2.3561 2.308-4.4085 5.43-4.0046 8.878 0.18332 3.334 2.5894 6.434 5.8702 7.227 1.2457 0.315 2.5639 0.346 3.8241 0.099 0.2199 2.25 1.0266 4.629 0.0925 6.813-0.7007 1.598-2.7875 3.004-4.3325 2.192-0.5994-0.316-0.1137-0.051-0.478-0.252 1.0698-0.257 1.9996-1.036 2.26-1.565 0.8378-1.464-0.3998-3.639-2.1554-3.358-2.262 0.046-3.1904 3.14-1.7356 4.685 1.3468 1.52 3.833 1.312 5.4301 0.318 1.8125-1.18 2.0395-3.544 1.8325-5.562-0.07-0.678-0.403-2.67-0.444-3.387 0.697-0.249 0.209-0.059 1.193-0.449 2.66-1.053 4.357-4.259 3.594-7.122-0.318-1.469-1.044-2.914-2.302-3.792zm0.561 5.757c0.214 1.991-1.053 4.321-3.079 4.96-0.136-0.795-0.172-1.011-0.2626-1.475-0.4822-2.46-0.744-4.987-1.116-7.481 1.6246-0.168 3.4576 0.543 4.0226 2.184 0.244 0.577 0.343 1.197 0.435 1.812zm-5.1486 5.196c-2.5441 0.141-4.9995-1.595-5.6343-4.081-0.749-2.153-0.5283-4.63 0.8207-6.504 1.1151-1.702 2.6065-3.105 4.0286-4.543 0.183 1.127 0.366 2.254 0.549 3.382-2.9906 0.782-5.0046 4.725-3.215 7.451 0.5324 0.764 1.9765 2.223 2.7655 1.634-1.102-0.683-2.0033-1.859-1.8095-3.227-0.0821-1.282 1.3699-2.911 2.6513-3.198 0.4384 2.869 0.9413 6.073 1.3797 8.943-0.5054 0.1-1.0211 0.143-1.536 0.143z"
      />
    </g>

    <line
      v-for="(y, i) in ledger_lines"
      :key="`ledger-${i}`"
      :x1="NOTE_X - 18"
      :y1="y"
      :x2="NOTE_X + 18"
      :y2="y"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />

    <!-- Position SVG et animation CSS sur deux groupes : sinon `transform`
         CSS écrase le translate et la note flash en (0, 0). -->
    <g
      v-if="note && note_y != null"
      :transform="`translate(${NOTE_X}, ${note_y})`"
    >
      <g
        class="staff-svg__note"
        :class="{ 'staff-svg__note--animate': animate }"
      >
        <text
          v-if="note.accidental"
          class="staff-svg__accidental"
          x="-28"
          y="6"
          text-anchor="middle"
          fill="currentColor"
        >
          {{ accidental_symbol(note.accidental) }}
        </text>

        <ellipse
          v-if="duration === 'whole'"
          cx="0"
          cy="0"
          rx="11"
          ry="8"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          transform="rotate(-15)"
        />
        <ellipse
          v-else-if="duration === 'half'"
          cx="0"
          cy="0"
          rx="10"
          ry="7.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          transform="rotate(-20)"
        />
        <ellipse
          v-else
          cx="0"
          cy="0"
          rx="10"
          ry="7.5"
          fill="currentColor"
          transform="rotate(-20)"
        />

        <line
          v-if="duration !== 'whole'"
          x1="9"
          y1="0"
          x2="9"
          y2="-42"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.staff-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  color: currentColor;
  overflow: hidden;
}

.staff-svg__accidental {
  font-family: var(--font-family);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
}

.staff-svg__note--animate {
  animation: note-pop var(--duration-med) var(--ease-spatial) backwards;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes note-pop {
  from {
    opacity: 0;
    transform: scale(0.55);
  }
  68% {
    transform: scale(1.14);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
