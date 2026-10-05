import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { modules } from './modules'
import { useAuthStore } from '@/core/stores/auth'
import HomeView from './views/HomeView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/connexion',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { public: true },
  },
  { path: '/', name: 'home', component: HomeView },
  ...modules.flatMap((module) => module.routes ?? []),
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()
  if (!to.meta.public && !auth.session) return { name: 'login' }
  if (to.name === 'login' && auth.session) return { name: 'home' }
})
