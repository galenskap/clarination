declare module 'pitchfinder' {
  export type PitchDetector = (data: Float32Array) => number | null

  export interface YinConfig {
    threshold?: number
    sampleRate?: number
    probabilityThreshold?: number
  }

  export function YIN(config?: YinConfig): PitchDetector
  export function AMDF(config?: Record<string, unknown>): PitchDetector
  export function Macleod(config?: Record<string, unknown>): PitchDetector
  export function DynamicWavelet(config?: Record<string, unknown>): PitchDetector
}
