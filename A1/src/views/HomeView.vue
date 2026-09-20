<script setup>
import NavBar from '../components/NavBar.vue';
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()

const WelcomeLabel = computed(() => {
  if (!authStore.isLoading && authStore.user) {
    return `Welcome ${authStore.user.firstName} ${authStore.user.lastName}`
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