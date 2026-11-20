import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { track } from './tracking'
import { editorTracking } from './tracking/pinia'

createApp(App).use(createPinia().use(editorTracking)).mount('#app')
track('session_start', {})
