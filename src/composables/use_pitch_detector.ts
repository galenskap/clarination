import { ref, onUnmounted, type Ref } from 'vue'
import { YIN } from 'pitchfinder'
import { analyze_pitch, median, type PitchAnalysis } from '@/domain/pitch_math'
import { concert_to_written_hz } from '@/domain/transposition'

const BUFFER_SIZE = 2048
const RMS_THRESHOLD = 0.01
const RMS_DISPLAY_MAX = 0.12
const LEVEL_STEPS = 16
const HISTORY_SIZE = 5
const MIN_HZ = 80
const MAX_HZ = 2200

function quantize_level(rms: number): number {
  const normalized = Math.min(1, Math.max(0, rms / RMS_DISPLAY_MAX))
  return Math.round(normalized * LEVEL_STEPS) / LEVEL_STEPS
}

export function use_pitch_detector(stream: Ref<MediaStream | null>) {
  const analysis = ref<PitchAnalysis | null>(null)
  const level = ref(0)
  const is_running = ref(false)
  const is_paused = ref(false)

  let audio_context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let detect_pitch: ((data: Float32Array) => number | null) | null = null
  let raf_id = 0
  let time_domain: Float32Array<ArrayBuffer> | null = null
  const frequency_history: number[] = []

  function compute_rms(buffer: Float32Array): number {
    let sum = 0
    for (let i = 0; i < buffer.length; i += 1) {
      sum += buffer[i] * buffer[i]
    }
    return Math.sqrt(sum / buffer.length)
  }

  function set_level(rms: number) {
    const next = quantize_level(rms)
    if (level.value !== next) {
      level.value = next
    }
  }

  function tick() {
    if (!is_running.value || is_paused.value || !analyser || !detect_pitch || !time_domain) {
      if (level.value !== 0) {
        level.value = 0
      }
      raf_id = requestAnimationFrame(tick)
      return
    }

    analyser.getFloatTimeDomainData(time_domain)
    const rms = compute_rms(time_domain)
    set_level(rms)

    if (rms < RMS_THRESHOLD) {
      analysis.value = null
      raf_id = requestAnimationFrame(tick)
      return
    }

    const raw_hz = detect_pitch(time_domain)
    if (raw_hz && raw_hz >= MIN_HZ && raw_hz <= MAX_HZ) {
      frequency_history.push(raw_hz)
      if (frequency_history.length > HISTORY_SIZE) {
        frequency_history.shift()
      }
      const smoothed = median(frequency_history)
      if (smoothed) {
        analysis.value = analyze_pitch(concert_to_written_hz(smoothed))
      }
    }

    raf_id = requestAnimationFrame(tick)
  }

  async function start(): Promise<boolean> {
    if (!stream.value) return false
    stop()

    audio_context = new AudioContext()
    if (audio_context.state === 'suspended') {
      await audio_context.resume()
    }

    source = audio_context.createMediaStreamSource(stream.value)
    analyser = audio_context.createAnalyser()
    analyser.fftSize = BUFFER_SIZE * 2
    source.connect(analyser)

    detect_pitch = YIN({
      sampleRate: audio_context.sampleRate,
      threshold: 0.15,
    })

    time_domain = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
    frequency_history.length = 0
    is_running.value = true
    is_paused.value = false
    raf_id = requestAnimationFrame(tick)
    return true
  }

  function pause() {
    is_paused.value = true
  }

  function resume() {
    is_paused.value = false
  }

  function stop() {
    is_running.value = false
    is_paused.value = false
    cancelAnimationFrame(raf_id)
    raf_id = 0
    frequency_history.length = 0
    analysis.value = null
    level.value = 0

    try {
      source?.disconnect()
    } catch {
      /* ignore */
    }
    source = null
    analyser = null
    detect_pitch = null
    time_domain = null

    if (audio_context) {
      void audio_context.close()
      audio_context = null
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    analysis,
    level,
    is_running,
    is_paused,
    start,
    stop,
    pause,
    resume,
  }
}
