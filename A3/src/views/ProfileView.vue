<script setup>
import NavBar from '../components/NavBar.vue'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const memberSince = computed(() => {
  if (!authStore.user?.createdAt) return 'Unknown'
  return new Date(authStore.user.createdAt).toLocaleDateString('en-AU')
})
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <h1 class="text-center mb-4">My Profile</h1>
        <div class="card" v-if="authStore.user">
          <ul class="list-group list-group-flush">
            <li class="list-group-item">
              <strong>Name:</strong> {{ authStore.user.firstName }} {{ authStore.user.lastName }}
            </li>
            <li class="list-group-item"><strong>Email:</strong> {{ authStore.user.email }}</li>
            <li class="list-group-item text-capitalize">
              <strong>Role:</strong> {{ authStore.user.role }}
            </li>
            <li class="list-group-item"><strong>Member since:</strong> {{ memberSince }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
