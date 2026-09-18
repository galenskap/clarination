import { onMounted, onUnmounted, ref } from 'vue'

export type MicStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export type MicDevice = {
  device_id: string
  label: string
}

const STORAGE_KEY = 'clarina.mic_device_id'

const BASE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

function read_stored_device_id(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function store_device_id(device_id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, device_id)
  } catch {
    /* stockage indisponible (mode privé, quotas, etc.) */
  }
}

function stop_tracks(media_stream: MediaStream | null) {
  media_stream?.getTracks().forEach((track) => track.stop())
}

export function use_microphone() {
  const status = ref<MicStatus>('idle')
  const error_message = ref<string | null>(null)
  const stream = ref<MediaStream | null>(null)
  const devices = ref<MicDevice[]>([])
  const selected_device_id = ref<string | null>(read_stored_device_id())

  async function refresh_devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return

    const listed = await navigator.mediaDevices.enumerateDevices()
    devices.value = listed
      .filter((device) => device.kind === 'audioinput' && device.deviceId)
      .map((device, index) => ({
        device_id: device.deviceId,
        label: device.label.trim() || `Micro ${index + 1}`,
      }))

    const current_id = stream.value?.getAudioTracks()[0]?.getSettings().deviceId
    if (current_id) {
      selected_device_id.value = current_id
    }
  }

  async function open_stream(device_id: string | null, exact: boolean): Promise<MediaStream> {
    const audio: MediaTrackConstraints = { ...BASE_AUDIO_CONSTRAINTS }
    if (device_id) {
      audio.deviceId = exact ? { exact: device_id } : { ideal: device_id }
    }
    return navigator.mediaDevices.getUserMedia({
      audio,
      video: false,
    })
  }

  function listen_track_ended(media_stream: MediaStream) {
    const track = media_stream.getAudioTracks()[0]
    track?.addEventListener('ended', () => {
      if (stream.value !== media_stream || status.value !== 'granted') return
      void request_access()
    })
  }

  async function request_access(device_id?: string): Promise<MediaStream | null> {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = 'error'
      error_message.value = 'Le micro n’est pas disponible sur cet appareil.'
      return null
    }

    const preferred = device_id ?? selected_device_id.value ?? read_stored_device_id()
    const already_granted = status.value === 'granted'
    const user_picked_device = Boolean(device_id)

    if (!already_granted) {
      status.value = 'requesting'
    }
    error_message.value = null

    const previous_stream = stream.value
    stream.value = null
    stop_tracks(previous_stream)

    try {
      let media_stream: MediaStream
      try {
        media_stream = await open_stream(preferred, user_picked_device)
      } catch (error) {
        if (!preferred || !user_picked_device) throw error
        media_stream = await open_stream(null, false)
        error_message.value = 'Ce micro n’est pas disponible. Un autre a été utilisé.'
      }

      stream.value = media_stream
      status.value = 'granted'
      listen_track_ended(media_stream)

      const actual_id = media_stream.getAudioTracks()[0]?.getSettings().deviceId
      if (actual_id) {
        selected_device_id.value = actual_id
        store_device_id(actual_id)
      } else if (preferred) {
        selected_device_id.value = preferred
        store_device_id(preferred)
      }

      await refresh_devices()
      return media_stream
    } catch (error) {
      if (already_granted) {
        try {
          const fallback = await open_stream(null, false)
          stream.value = fallback
          status.value = 'granted'
          listen_track_ended(fallback)
          error_message.value = 'Impossible d’utiliser ce micro. Un autre a été ouvert.'
          await refresh_devices()
          return fallback
        } catch {
          status.value = 'error'
          error_message.value = 'Impossible d’accéder au micro.'
          return null
        }
      }

      status.value = 'denied'
      error_message.value =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Accès au micro refusé. Active-le pour utiliser clarina.'
          : 'Impossible d’accéder au micro.'
      return null
    }
  }

  function prefer_device(device_id: string) {
    selected_device_id.value = device_id
    store_device_id(device_id)
  }

  function stop() {
    const current = stream.value
    stream.value = null
    if (status.value === 'granted') {
      status.value = 'idle'
    }
    stop_tracks(current)
  }

  function on_device_change() {
    void refresh_devices()
  }

  onMounted(() => {
    void refresh_devices()
    navigator.mediaDevices?.addEventListener?.('devicechange', on_device_change)
  })

  onUnmounted(() => {
    navigator.mediaDevices?.removeEventListener?.('devicechange', on_device_change)
    stop()
  })

  return {
    status,
    error_message,
    stream,
    devices,
    selected_device_id,
    request_access,
    prefer_device,
    stop,
    refresh_devices,
  }
}
