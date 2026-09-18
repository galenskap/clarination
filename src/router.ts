import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TunerView from '@/views/TunerView.vue'
import ReadingGameView from '@/views/ReadingGameView.vue'
import OptionsView from '@/views/OptionsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/accordeur', name: 'tuner', component: TunerView },
    { path: '/lecture', name: 'reading', component: ReadingGameView },
    { path: '/options', name: 'options', component: OptionsView },
  ],
})
