import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvXLxWTDfMKZmBBCrxyWyju_g0RSF3F-c",
  authDomain: "fit5032-364b3.firebaseapp.com",
  projectId: "fit5032-364b3",
  storageBucket: "fit5032-364b3.firebasestorage.app",
  messagingSenderId: "554527264053",
  appId: "1:554527264053:web:e7798ce7d8df4ed69dd07c"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })
app.use(router)
app.mount('#app')
