<script setup lang="ts">
import { computed } from 'vue'

export interface LineChartPoint {
  /** Timestamp ou index. */
  x: number
  /** Temps moyen en ms. */
  y: number
  label?: string
  /** Date de session affichée sous le point (ex. 21/09). */
  date_label?: string
  /** Registre / niveau de la session (ex. Débutant). */
  register_label?: string
}

const props = defineProps<{
  points: LineChartPoint[]
  x_label?: string
  y_label?: string
}>()

const width = 360
const height = 220
const pad = { top: 14, right: 12, bottom: 68, left: 52 }

const plot = computed(() => {
  const points = props.points

  if (points.length === 0) {
    return {
      path: '',
      dots: [] as {
        cx: number
        cy: number
        label: string
        date_label: string
        register_label: string
      }[],
      y_ticks: [] as { y: number; label: string }[],
      x_ticks: [] as { cx: number; date_label: string; register_label: string }[],
    }
  }

  const ys = points.map((p) => p.y)
  const min_y = Math.min(...ys)
  const max_y = Math.max(...ys)
  const span_y = Math.max(max_y - min_y, 1)
  const padded_min = Math.max(0, min_y - span_y * 0.1)
  const padded_max = max_y + span_y * 0.1
  const range_y = Math.max(padded_max - padded_min, 1)

  const inner_w = width - pad.left - pad.right
  const inner_h = height - pad.top - pad.bottom

  function x_at(index: number): number {
    if (points.length === 1) return pad.left + inner_w / 2
    return pad.left + (index / (points.length - 1)) * inner_w
  }

  function y_at(value: number): number {
    return pad.top + inner_h - ((value - padded_min) / range_y) * inner_h
  }

  const coords = points.map((point, index) => ({
    cx: x_at(index),
    cy: y_at(point.y),
    label: point.label ?? `${Math.round(point.y)}`,
    date_label: point.date_label ?? '',
    register_label: point.register_label ?? '',
  }))

  const path = coords
    .map((c, index) => `${index === 0 ? 'M' : 'L'} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`)
    .join(' ')

  const tick_count = 3
  const y_ticks = Array.from({ length: tick_count }, (_, index) => {
    const ratio = index / (tick_count - 1)
    const value = padded_min + (1 - ratio) * range_y
    return {
      y: pad.top + ratio * inner_h,
      label: format_axis_ms(value),
    }
  })

  /* Affiche toutes les dates si peu de points, sinon un sous-échantillon lisible. */
  const max_x_labels = 5
  const step =
    points.length <= max_x_labels
      ? 1
      : Math.ceil((points.length - 1) / (max_x_labels - 1))
  const x_tick_indexes = new Set<number>()
  for (let index = 0; index < points.length; index += step) {
    x_tick_indexes.add(index)
  }
  x_tick_indexes.add(points.length - 1)

  const x_ticks = [...x_tick_indexes]
    .sort((a, b) => a - b)
    .map((index) => ({
      cx: x_at(index),
      date_label: coords[index]?.date_label ?? '',
      register_label: coords[index]?.register_label ?? '',
    }))
    .filter((tick) => tick.date_label.length > 0 || tick.register_label.length > 0)

  return { path, dots: coords, y_ticks, x_ticks }
})

function format_axis_ms(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms)} ms`
}
</script>

<template>
  <div class="line-chart" role="img" aria-label="Évolution du temps moyen par note">
    <svg
      v-if="points.length > 0"
      class="line-chart__svg"
      :viewBox="`0 0 ${width} ${height}`"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        v-for="(tick, index) in plot.y_ticks"
        :key="`grid-${index}`"
        class="line-chart__grid"
        :x1="pad.left"
        :x2="width - pad.right"
        :y1="tick.y"
        :y2="tick.y"
      />
      <text
        v-for="(tick, index) in plot.y_ticks"
        :key="`ylabel-${index}`"
        class="line-chart__axis"
        :x="pad.left - 8"
        :y="tick.y + 4"
        text-anchor="end"
      >
        {{ tick.label }}
      </text>
      <path
        v-if="plot.path"
        class="line-chart__path"
        :d="plot.path"
        fill="none"
      />
      <circle
        v-for="(dot, index) in plot.dots"
        :key="index"
        class="line-chart__dot"
        :cx="dot.cx"
        :cy="dot.cy"
        r="4"
      >
        <title>
          {{
            [dot.date_label, dot.register_label, dot.label]
              .filter(Boolean)
              .join(' · ')
          }}
        </title>
      </circle>
      <g v-for="(tick, index) in plot.x_ticks" :key="`xlabel-${index}`">
        <text
          class="line-chart__axis line-chart__axis--x"
          :x="tick.cx"
          :y="height - 42"
          text-anchor="middle"
        >
          {{ tick.date_label }}
        </text>
        <text
          v-if="tick.register_label"
          class="line-chart__axis line-chart__axis--register"
          :x="tick.cx"
          :y="height - 28"
          text-anchor="middle"
        >
          {{ tick.register_label }}
        </text>
      </g>
      <text
        class="line-chart__axis-title line-chart__axis-title--y"
        :x="14"
        :y="height / 2 - 16"
        text-anchor="middle"
        :transform="`rotate(-90 14 ${height / 2 - 16})`"
      >
        {{ y_label ?? 'Temps moyen' }}
      </text>
      <text
        class="line-chart__axis-title line-chart__axis-title--x"
        :x="pad.left + (width - pad.left - pad.right) / 2"
        :y="height - 8"
        text-anchor="middle"
      >
        {{ x_label ?? 'Sessions' }}
      </text>
    </svg>
    <p v-else class="line-chart__empty">Pas encore de données</p>
  </div>
</template>

<style scoped>
.line-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
}

.line-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.line-chart__grid {
  stroke: color-mix(in srgb, var(--color-plum) 18%, transparent);
  stroke-width: 1;
}

.line-chart__axis {
  fill: color-mix(in srgb, var(--color-plum) 70%, var(--color-sky));
  font-size: 12px;
  font-family: var(--font-family);
  font-weight: 500;
}

.line-chart__axis--x {
  font-size: 11px;
}

.line-chart__axis--register {
  font-size: 10px;
  font-weight: 700;
  fill: var(--color-plum);
}

.line-chart__axis-title {
  fill: var(--color-plum);
  font-size: 13px;
  font-family: var(--font-family);
  font-weight: 700;
}

.line-chart__path {
  stroke: var(--color-sky);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-chart__dot {
  fill: var(--color-coral);
  stroke: var(--color-cream);
  stroke-width: 1.5;
}

.line-chart__empty {
  margin: 0;
  font-size: clamp(0.8rem, 3vh, 1rem);
  color: color-mix(in srgb, var(--color-plum) 60%, var(--color-sky));
  text-align: center;
}
</style>
