import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css'

import { initializeApp } from "firebase/app"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import { useAuthStore } from './stores/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDp3C5-i0GnW0ODonpv-Vx81h8Bt2I2PLg",
  authDomain: "fit5032-a1-a112e.firebaseapp.com",
  projectId: "fit5032-a1-a112e",
  storageBucket: "fit5032-a1-a112e.firebasestorage.app",
  messagingSenderId: "34797231034",
  appId: "1:34797231034:web:6433689cce624feb231b83"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp)
const db = getFirestore(firebaseApp)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)   
app.use(router)

const authStore = useAuthStore()

onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
    console.log('Firestore doc:', snap.exists(), snap.data())
    const extra = snap.exists() ? snap.data() : {}

    authStore.setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      ...extra, // firstName, lastName, role, etc. from Firestore
    })
    console.log('Firestore data:', snap.data())
  } else {
    authStore.clearUser()
  }
  authStore.isLoading = false
})

app.mount('#app')