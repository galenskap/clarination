import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TunerView from '@/views/TunerView.vue'
import ReadingLevelView from '@/views/ReadingLevelView.vue'
import ReadingGameView from '@/views/ReadingGameView.vue'
import OptionsView from '@/views/OptionsView.vue'
import StatsView from '@/views/StatsView.vue'
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
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/options', name: 'options', component: OptionsView },
  ],
})
