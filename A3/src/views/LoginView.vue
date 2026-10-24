<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import { getSafeRedirect } from '@/router/redirect.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loginData = ref({
  email: '',
  password: ''
})

const errors = ref({
  email: null,
  password: null
})

const firebaseError = ref('')
const showPassword = ref(false)

// Turns Firebase error codes into messages a user can understand
const getFirebaseErrorMessage = (code) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

const validateEmail = (blur) => {
  const email = loginData.value.email

  if (email.length < 1) {
    if (blur) errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (blur) errors.value.email = 'Please enter a valid email address'
  } else {
    errors.value.email = null
  }
}

const validatePassword = (blur) => {
  if (loginData.value.password.length < 1) {
    if (blur) errors.value.password = 'Password is required'
  } else {
    errors.value.password = null
  }
}

const signIn = async () => {
  firebaseError.value = ''
  validateEmail(true)
  validatePassword(true)
  if (errors.value.email || errors.value.password) return

  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      loginData.value.email,
      loginData.value.password
    )
    // Load the profile before redirecting, so route guards see the logged-in user and their role
    await authStore.loadUser(user)
    router.push(getSafeRedirect(route.query))
  } catch (error) {
    console.log(error.code)
    firebaseError.value = getFirebaseErrorMessage(error.code)
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center">Log In</h1>
        <form @submit.prevent="signIn" novalidate>
          <div class="row mb-3">
            <div class="col">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                class="form-control"
                id="email"
                :aria-invalid="!!errors.email"
                :aria-describedby="errors.email ? 'email-error' : undefined"
                maxlength="254"
                autocomplete="email"
                @blur="() => validateEmail(true)"
                @input="() => validateEmail(false)"
                v-model="loginData.email"
              />
              <div v-if="errors.email" id="email-error" class="text-danger" role="alert">{{ errors.email }}</div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control"
                  id="password"
                  :aria-invalid="!!errors.password"
                  :aria-describedby="errors.password ? 'password-error' : undefined"
                  maxlength="128"
                  autocomplete="current-password"
                  @blur="() => validatePassword(true)"
                  @input="() => validatePassword(false)"
                  v-model="loginData.password"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <div v-if="errors.password" id="password-error" class="text-danger" role="alert">{{ errors.password }}</div>
              <div class="mt-1 text-end">
                <router-link to="/forgot_password" class="small">Forgot password?</router-link>
              </div>
            </div>
          </div>

          <div v-if="firebaseError" class="alert alert-danger" role="alert">{{ firebaseError }}</div>

          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">Submit</button>
          </div>

          <div class="row mb-3 mt-3">
            <p>
              Don't have an account?
              <router-link :to="{ name: 'Create Account', query: route.query }">
                Create Account
              </router-link>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
