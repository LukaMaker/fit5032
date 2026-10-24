<script setup>
import { ref } from 'vue'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/init.js'

const email = ref('')
const emailError = ref(null)
const message = ref('')
const firebaseError = ref('')

const validateEmail = (blur) => {
  if (email.value.length < 1) {
    if (blur) emailError.value = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    if (blur) emailError.value = 'Please enter a valid email address'
  } else {
    emailError.value = null
  }
}

const sendResetEmail = async () => {
  message.value = ''
  firebaseError.value = ''
  validateEmail(true)
  if (emailError.value) return

  // Same message whether or not the account exists, so the page doesn't reveal which emails are registered
  const successMessage = 'If an account exists for that email, a password reset link has been sent.'

  try {
    await sendPasswordResetEmail(auth, email.value)
    message.value = successMessage
  } catch (error) {
    console.log(error.code)
    if (error.code === 'auth/network-request-failed') {
      firebaseError.value = 'Network error. Check your connection and try again.'
    } else if (error.code === 'auth/too-many-requests') {
      firebaseError.value = 'Too many attempts. Please wait a moment and try again.'
    } else {
      message.value = successMessage
    }
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <h1 class="text-center">Reset Password</h1>
        <p class="text-center text-muted">
          Enter your account's email and we'll send you a link to choose a new password.
        </p>
        <form @submit.prevent="sendResetEmail" novalidate>
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input
              type="email"
              class="form-control"
              id="email"
              :aria-invalid="!!emailError"
              :aria-describedby="emailError ? 'email-error' : undefined"
              maxlength="254"
              autocomplete="email"
              @blur="() => validateEmail(true)"
              @input="() => validateEmail(false)"
              v-model="email"
            />
            <div v-if="emailError" id="email-error" class="text-danger" role="alert">{{ emailError }}</div>
          </div>

          <div v-if="message" class="alert alert-success" role="status">{{ message }}</div>
          <div v-if="firebaseError" class="alert alert-danger" role="alert">{{ firebaseError }}</div>

          <div class="text-center">
            <button type="submit" class="btn btn-primary">Send reset link</button>
          </div>

          <p class="mt-3 text-center">
            <router-link to="/login">Back to log in</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
