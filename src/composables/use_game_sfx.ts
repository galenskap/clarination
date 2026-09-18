/** Sons de feedback légers (Web Audio), sans fichiers. */

type SfxKind = 'success' | 'fail'

let audio_context: AudioContext | null = null

function ensure_context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!audio_context) {
    audio_context = new AudioCtx()
  }
  if (audio_context.state === 'suspended') {
    void audio_context.resume()
  }
  return audio_context
}

function play_tone(
  ctx: AudioContext,
  frequency_hz: number,
  start_at: number,
  duration_s: number,
  type: OscillatorType,
  peak_gain: number,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency_hz
  gain.gain.setValueAtTime(0.0001, start_at)
  gain.gain.exponentialRampToValueAtTime(peak_gain, start_at + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, start_at + duration_s)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start_at)
  oscillator.stop(start_at + duration_s + 0.02)
}

function play_success(ctx: AudioContext) {
  const t0 = ctx.currentTime
  play_tone(ctx, 523.25, t0, 0.09, 'triangle', 0.11)
  play_tone(ctx, 659.25, t0 + 0.07, 0.11, 'triangle', 0.13)
  play_tone(ctx, 783.99, t0 + 0.14, 0.16, 'sine', 0.1)
}

function play_fail(ctx: AudioContext) {
  const t0 = ctx.currentTime
  play_tone(ctx, 196, t0, 0.14, 'sawtooth', 0.07)
  play_tone(ctx, 155.5, t0 + 0.06, 0.22, 'triangle', 0.09)
}

export function use_game_sfx() {
  function play(kind: SfxKind) {
    const ctx = ensure_context()
    if (!ctx) return
    if (kind === 'success') play_success(ctx)
    else play_fail(ctx)
  }

  return { play }
}
