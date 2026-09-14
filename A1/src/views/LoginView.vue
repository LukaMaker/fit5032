<script setup>
import NavBar from '../components/NavBar.vue';
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const loginData = ref({
  email: '',
  password: ''
})


const submittedCards = ref([])

const submitForm = () => {
  validateEmail(true)
  validatePassword(true)
  if (!errors.value.password && !errors.value.email) {
    submittedCards.value.push({ ...loginData.value })
    localStorage.setItem('submittedCards', JSON.stringify(submittedCards.value))
    clearForm()
    router.push('/')
  }
}

const clearForm = () => {
  loginData.value = {
    email: '',
    password: ''
  }
}

const errors = ref({
  email: null,
  password: null
})

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
  const password = loginData.value.password
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
  <NavBar></NavBar>
  <!-- 🗄️ W3. Library Registration Form -->
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center">Log In</h1>
        <form @submit.prevent="submitForm">
          <div class="row mb-3">
            <div class="col">
            <label for="name" class="form-label">Email</label>
            <input
            type="text"
            class="form-control"
            id="email"
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
                @blur="() => validatePassword(true)"
                @input="() => validatePassword(false)"
                v-model="loginData.password"
              />
              <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
            </div>
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">Submit</button>
          </div>
          
        <div class="row mb-3">
          <a>Don't have an account? <router-link to="/create_account" active-class="active">Create Account</router-link></a>
        </div>
        </form>
      </div>
    </div>
  </div>
</template>