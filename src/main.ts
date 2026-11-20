import { createPinia, PiniaVuePlugin } from 'pinia'
import Vue from 'vue'
import App from './App.vue'
import './style.css'
import { track } from './tracking'
import { editorTracking } from './tracking/pinia'

Vue.use(PiniaVuePlugin)

new Vue({
  pinia: createPinia().use(editorTracking),
  render: (h) => h(App),
}).$mount('#app')

track('session_start', {})
