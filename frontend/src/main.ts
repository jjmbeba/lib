import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from './app/App.vue'
import router from './app/router'
import { queryClient } from './app/query-client'
import './style.css'

createApp(App).use(router).use(VueQueryPlugin, { queryClient }).mount('#app')
