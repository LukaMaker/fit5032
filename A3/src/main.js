import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/init.js'

import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })

const authStore = useAuthStore()
let appMounted = false

// Runs on page load and on login/logout, loading the user's Firestore profile into the store
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    await authStore.loadUser(firebaseUser)
  } else {
    authStore.clearUser()
  }
  authStore.isLoading = false

  // Start the router only once the login state is known, so route guards check the real user
  if (!appMounted) {
    app.use(router)
    app.mount('#app')
    appMounted = true
  }
})
