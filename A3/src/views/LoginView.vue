<script setup>
import NavBar from '../components/NavBar.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/init.js'

const router = useRouter()

const loginData = ref({
  email: '',
  password: ''
})

const errors = ref({
  email: null,
  password: null
})

const firebaseError = ref('')

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

const signIn = () => {
  firebaseError.value = ''
  validateEmail(true)
  validatePassword(true)
  if (errors.value.email || errors.value.password) return

  signInWithEmailAndPassword(auth, loginData.value.email, loginData.value.password)
    .then(() => {
      router.push('/')
    })
    .catch((error) => {
      console.log(error.code)
      firebaseError.value = getFirebaseErrorMessage(error.code)
    })
}
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center">Log In</h1>
        <form @submit.prevent="signIn">
          <div class="row mb-3">
            <div class="col">
              <label for="email" class="form-label">Email</label>
              <input
                type="text"
                class="form-control"
                id="email"
                maxlength="254"
                @blur="() => validateEmail(true)"
                @input="() => validateEmail(false)"
                v-model="loginData.email"
              />
              <div v-if="errors.email" class="text-danger">{{ errors.email }}</div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <label for="password" class="form-label">Password</label>
              <input
                type="password"
                class="form-control"
                id="password"
                maxlength="128"
                @blur="() => validatePassword(true)"
                @input="() => validatePassword(false)"
                v-model="loginData.password"
              />
              <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
            </div>
          </div>

          <div v-if="firebaseError" class="alert alert-danger">{{ firebaseError }}</div>

          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">Submit</button>
          </div>

          <div class="row mb-3 mt-3">
            <p>
              Don't have an account?
              <router-link to="/create_account" active-class="active">Create Account</router-link>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
