import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './app/router'
import './styles/main.css'

registerSW({ immediate: true })

createApp(App).use(createPinia()).use(router).mount('#app')
