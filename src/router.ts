import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TunerView from '@/views/TunerView.vue'
import ReadingLevelView from '@/views/ReadingLevelView.vue'
import ReadingGameView from '@/views/ReadingGameView.vue'
import HarmonicsSetupView from '@/views/HarmonicsSetupView.vue'
import HarmonicsGameView from '@/views/HarmonicsGameView.vue'
import OptionsView from '@/views/OptionsView.vue'
import StatsView from '@/views/StatsView.vue'
import { parse_chord_types_query } from '@/domain/chords'
import { is_register_id } from '@/domain/registers'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/accordeur', name: 'tuner', component: TunerView },
    { path: '/lecture', name: 'reading-setup', component: ReadingLevelView },
    {
      path: '/lecture/:register',
      name: 'reading',
      component: ReadingGameView,
      beforeEnter(to) {
        const raw = to.params.register
        if (typeof raw !== 'string' || !is_register_id(raw)) {
          return { name: 'reading-setup' }
        }
      },
    },
    { path: '/harmoniques', name: 'harmoniques-setup', component: HarmonicsSetupView },
    {
      path: '/harmoniques/jeu',
      name: 'harmoniques-game',
      component: HarmonicsGameView,
      beforeEnter(to) {
        if (!parse_chord_types_query(to.query.types)) {
          return { name: 'harmoniques-setup' }
        }
      },
    },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/options', name: 'options', component: OptionsView },
  ],
})
