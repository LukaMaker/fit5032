<script setup>
import NavBar from '../components/NavBar.vue';
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"

const router = useRouter()
const auth = getAuth()

const loginData = ref({
  email: '',
  password: ''
})

const signIn = () => {
  signInWithEmailAndPassword(auth, loginData.value.email, loginData.value.password)
  .then((data) => {
    //set current user to logged in user
    
    router.push('/')
  }).catch((error) => {
    console.log(error.code);
  })
}

const clearForm = () => {
  loginData.value = {
    email: '',
    password: ''
  }
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
            <label for="name" class="form-label">Email</label>
            <input
            type="text"
            class="form-control"
            id="email"
            @blur="() => validateEmail(true)"
            @input="() => validateEmail(false)"
            v-model="loginData.email"
            />
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