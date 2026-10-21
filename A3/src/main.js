import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css'

import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase/init.js'

import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore()
let appMounted = false

// Runs on page load and on login/logout, loading the user's Firestore profile into the store
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid))

      if (snap.exists()) {
        authStore.setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...snap.data() // firstName, lastName, role, etc. from Firestore
        })
      } else if (authStore.user?.uid !== firebaseUser.uid) {
        // Profile doc not created yet, so only store uid and email
        authStore.setUser({ uid: firebaseUser.uid, email: firebaseUser.email })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      authStore.setUser({ uid: firebaseUser.uid, email: firebaseUser.email })
    }
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
