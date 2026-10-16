// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAvXLxWTDfMKZmBBCrxyWyju_g0RSF3F-c',
  authDomain: 'fit5032-364b3.firebaseapp.com',
  projectId: 'fit5032-364b3',
  storageBucket: 'fit5032-364b3.firebasestorage.app',
  messagingSenderId: '554527264053',
  appId: '1:554527264053:web:e7798ce7d8df4ed69dd07c'
}

// Initialize Firebase
initializeApp(firebaseConfig)
const db = getFirestore()
export default db
