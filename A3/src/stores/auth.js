import { defineStore } from 'pinia'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/init.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoading: true,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    setUser(user) {
      this.user = user
    },
    clearUser() {
      this.user = null
    },
    // Loads a signed-in user's profile (firstName, lastName, role) from Firestore into the store
    async loadUser(firebaseUser) {
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))

        if (snap.exists()) {
          this.user = { uid: firebaseUser.uid, email: firebaseUser.email, ...snap.data() }
        } else if (this.user?.uid !== firebaseUser.uid) {
          // Profile doc not created yet, so only store uid and email
          this.user = { uid: firebaseUser.uid, email: firebaseUser.email }
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        this.user = { uid: firebaseUser.uid, email: firebaseUser.email }
      }
    },
  },
})
