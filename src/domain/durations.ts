import type { NoteDuration } from './notes'

export const NOTE_DURATIONS: NoteDuration[] = ['quarter']

export const DURATION_LABELS: Record<NoteDuration, string> = {
  quarter: 'noire',
  half: 'blanche',
  whole: 'ronde',
}

export function random_duration(): NoteDuration {
  const index = Math.floor(Math.random() * NOTE_DURATIONS.length)
  return NOTE_DURATIONS[index]
}
