<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import { getSafeRedirect } from '@/router/redirect.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const createData = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = ref({
  firstName: null,
  lastName: null,
  email: null,
  password: null,
  confirmPassword: null
})

const firebaseError = ref('')
const showPassword = ref(false)

// Turns Firebase error codes into messages a user can understand
const getFirebaseErrorMessage = (code) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password is too weak.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

const register = async () => {
  firebaseError.value = ''
  validateFirstName(true)
  validateLastName(true)
  validateEmail(true)
  validatePassword(true)
  validateConfirmPassword(true)
  if (
    !errors.value.firstName &&
    !errors.value.lastName &&
    !errors.value.confirmPassword &&
    !errors.value.password &&
    !errors.value.email
  ) {
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        createData.value.email,
        createData.value.password
      )

      await updateProfile(user, {
        displayName: `${createData.value.firstName}`
      })

      const profile = {
        firstName: createData.value.firstName.trim(),
        lastName: createData.value.lastName.trim(),
        email: createData.value.email,
        role: 'user', // default role
        createdAt: new Date().toISOString()
      }

      await setDoc(doc(db, 'users', user.uid), profile)

      authStore.setUser({ uid: user.uid, ...profile })

      router.push(getSafeRedirect(route.query))
    } catch (error) {
      console.log(error.code)
      firebaseError.value = getFirebaseErrorMessage(error.code)
    }
  }
}

const validateFirstName = (blur) => {
  if (createData.value.firstName.trim().length < 1) {
    if (blur) errors.value.firstName = 'First name is required'
  } else if (createData.value.firstName.trim().length > 50) {
    if (blur) errors.value.firstName = 'First name must be 50 characters or less'
  } else {
    errors.value.firstName = null
  }
}

const validateLastName = (blur) => {
  if (createData.value.lastName.trim().length < 1) {
    if (blur) errors.value.lastName = 'Last name is required'
  } else if (createData.value.lastName.trim().length > 50) {
    if (blur) errors.value.lastName = 'Last name must be 50 characters or less'
  } else {
    errors.value.lastName = null
  }
}

const validateEmail = (blur) => {
  const email = createData.value.email

  if (email.length < 1) {
    if (blur) errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (blur) errors.value.email = 'Please enter a valid email address'
  } else {
    errors.value.email = null
  }
}

const validateConfirmPassword = (blur) => {
  if (createData.value.password !== createData.value.confirmPassword) {
    if (blur) errors.value.confirmPassword = 'Passwords do not match.'
  } else {
    errors.value.confirmPassword = null
  }
}

const validatePassword = (blur) => {
  const password = createData.value.password
  const minLength = 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (password.length < minLength) {
    if (blur) errors.value.password = `Password must be at least ${minLength} characters long.`
  } else if (!hasUppercase) {
    if (blur) errors.value.password = 'Password must contain at least one uppercase letter.'
  } else if (!hasLowercase) {
    if (blur) errors.value.password = 'Password must contain at least one lowercase letter.'
  } else if (!hasNumber) {
    if (blur) errors.value.password = 'Password must contain at least one number.'
  } else if (!hasSpecialChar) {
    if (blur) errors.value.password = 'Password must contain at least one special character.'
  } else {
    errors.value.password = null
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center">Create Account</h1>
        <form @submit.prevent="register" novalidate>
          <div class="row mb-3">
            <div class="col-md-6 col-sm-6 mb-3 mb-sm-0">
              <label for="firstname" class="form-label">First Name</label>
              <input
                type="text"
                class="form-control"
                id="firstname"
                :aria-invalid="!!errors.firstName"
                :aria-describedby="errors.firstName ? 'firstname-error' : undefined"
                autocomplete="given-name"
                maxlength="50"
                @blur="() => validateFirstName(true)"
                @input="() => validateFirstName(false)"
                v-model="createData.firstName"
              />
              <div v-if="errors.firstName" id="firstname-error" class="text-danger" role="alert">{{ errors.firstName }}</div>
            </div>
            <div class="col-md-6 col-sm-6">
              <label for="lastname" class="form-label">Last Name</label>
              <input
                type="text"
                class="form-control"
                id="lastname"
                :aria-invalid="!!errors.lastName"
                :aria-describedby="errors.lastName ? 'lastname-error' : undefined"
                autocomplete="family-name"
                maxlength="50"
                @blur="() => validateLastName(true)"
                @input="() => validateLastName(false)"
                v-model="createData.lastName"
              />
              <div v-if="errors.lastName" id="lastname-error" class="text-danger" role="alert">{{ errors.lastName }}</div>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                class="form-control"
                id="email"
                :aria-invalid="!!errors.email"
                :aria-describedby="errors.email ? 'email-error' : undefined"
                autocomplete="email"
                maxlength="254"
                @blur="() => validateEmail(true)"
                @input="() => validateEmail(false)"
                v-model="createData.email"
              />
              <div v-if="errors.email" id="email-error" class="text-danger" role="alert">{{ errors.email }}</div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6 col-sm-6 mb-3 mb-sm-0">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control"
                  id="password"
                  :aria-invalid="!!errors.password"
                  :aria-describedby="errors.password ? 'password-help password-error' : 'password-help'"
                  maxlength="128"
                  autocomplete="new-password"
                  @blur="() => validatePassword(true)"
                  @input="() => validatePassword(false)"
                  v-model="createData.password"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :aria-label="showPassword ? 'Hide passwords' : 'Show passwords'"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <div id="password-help" class="form-text">
                At least 8 characters, with upper and lower case letters, a number and a special
                character.
              </div>
              <div v-if="errors.password" id="password-error" class="text-danger" role="alert">{{ errors.password }}</div>
            </div>
            <div class="col-md-6 col-sm-6">
              <label for="confirm-password" class="form-label">Confirm password</label>
              <input
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                id="confirm-password"
                :aria-invalid="!!errors.confirmPassword"
                :aria-describedby="errors.confirmPassword ? 'confirm-password-error' : undefined"
                autocomplete="new-password"
                maxlength="128"
                v-model="createData.confirmPassword"
                @blur="() => validateConfirmPassword(true)"
              />
              <div v-if="errors.confirmPassword" id="confirm-password-error" class="text-danger" role="alert">
                {{ errors.confirmPassword }}
              </div>
            </div>
          </div>

          <div v-if="firebaseError" class="alert alert-danger" role="alert">{{ firebaseError }}</div>

          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">Submit</button>
          </div>

          <p class="mt-3">
            Already have an account?
            <router-link :to="{ name: 'Login', query: route.query }">Log in</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
