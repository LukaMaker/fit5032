

import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

const app = createApp(App)
app.use(router)

app.mount('#app')
