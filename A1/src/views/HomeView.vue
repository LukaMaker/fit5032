<script setup>
import NavBar from '../components/NavBar.vue';
import { ref, computed } from 'vue'

const submittedCards = ref(JSON.parse(localStorage.getItem('submittedCards')) || [])
const WelcomeLabel = computed(() => {
  if (submittedCards.value.length > 0) {
    const currentUser = submittedCards.value[submittedCards.value.length - 1]
    return `Welcome ${currentUser.firstName} ${currentUser.lastName}`
  }
  return 'Home Screen'
})
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <div class="row">
      {{ WelcomeLabel }}
    </div>
  </div>
</template>