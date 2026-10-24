import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyDp3C5-i0GnW0ODonpv-Vx81h8Bt2I2PLg',
  authDomain: 'fit5032-a1-a112e.firebaseapp.com',
  projectId: 'fit5032-a1-a112e',
  storageBucket: 'fit5032-a1-a112e.firebasestorage.app',
  messagingSenderId: '34797231034',
  appId: '1:34797231034:web:6433689cce624feb231b83'
}

const firebaseApp = initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
// Callable Cloud Functions run in the same region as the Firestore database
export const functions = getFunctions(firebaseApp, 'australia-southeast2')
