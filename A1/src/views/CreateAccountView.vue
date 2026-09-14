<script setup>
import NavBar from '../components/NavBar.vue';
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const loginData = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
})


const submittedCards = ref([])

const submitForm = () => {
  validateFirstName(true)
  validateLastName(true)
  validateEmail(true)
  validatePassword(true)
  validateConfirmPassword(true)
  if (!errors.value.firstName && !errors.value.lastName && !errors.value.confirmPassword && !errors.value.password && !errors.value.email) {
    submittedCards.value.push({ ...loginData.value })
    localStorage.setItem('submittedCards', JSON.stringify(submittedCards.value))
    clearForm()
    router.push('/')
  }
}

const clearForm = () => {
  loginData.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  }
}

const errors = ref({
  firstName: null,
  lastName: null,
  email: null,
  password: null,
  confirmPassword: null
})


const validateFirstName = (blur) => {
  if (loginData.value.firstName.length < 1) {
    if (blur) errors.value.firstName = 'Name must be at least 1 character'
  } else {
    errors.value.firstName = null
  }
}

const validateLastName = (blur) => {
  if (loginData.value.lastName.length < 1) {
    if (blur) errors.value.lastName = 'Name must be at least 1 character'
  } else {
    errors.value.lastName = null
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
/**
 * Confirm password validation function that checks if the password and confirm password fields match.
 * @param blur: boolean - If true, the function will display an error message if the passwords do not match.
 */
const validateConfirmPassword = (blur) => {
  if (loginData.value.password !== loginData.value.confirmPassword) {
    if (blur) errors.value.confirmPassword = 'Passwords do not match.'
  } else {
    errors.value.confirmPassword = null
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
        <h1 class="text-center">Create Account</h1>
        <form @submit.prevent="submitForm">
          <div class="row mb-3">
            <div class="col-md-6 col-sm-6">
              <label for="name" class="form-label">First Name</label>
              <input
                type="text"
                class="form-control"
                id="firstname"
                @blur="() => validateFirstName(true)"
                @input="() => validateFirstName(false)"
                v-model="loginData.firstName"
              />
              <div v-if="errors.firstName" class="text-danger">{{ errors.firstName }}</div>
            </div>
            <div class="col-md-6 col-sm-6">
              <label for="name" class="form-label">Last Name</label>
              <input
                type="text"
                class="form-control"
                id="lastname"
                @blur="() => validateLastName(true)"
                @input="() => validateLastName(false)"
                v-model="loginData.lastName"
              />
              <div v-if="errors.lastName" class="text-danger">{{ errors.lastName }}</div>
            </div>
          </div>
          
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
          <div class="col-md-6 col-sm-6">
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
            <div class="col-md-6 col-sm-6">
                <label for="confirm-password" class="form-label">Confirm password</label>
                <input
                    type="password"
                    class="form-control"
                    id="confirm-password"
                    v-model="loginData.confirmPassword"
                    @blur="() => validateConfirmPassword(true)"
                />
                <div v-if="errors.confirmPassword" class="text-danger">
                    {{ errors.confirmPassword }}
                </div>
            </div>
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">Submit</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>