import { ref, onMounted, onUnmounted } from 'vue'

export function use_orientation() {
  const is_landscape = ref(true)

  function update() {
    if (typeof window === 'undefined') return
    is_landscape.value = window.matchMedia('(orientation: landscape)').matches
      || window.innerWidth > window.innerHeight
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
  })

  return { is_landscape }
}
