<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const treeGoal = 20000
const events = ref([])

const WelcomeLabel = computed(() => {
  if (!authStore.isLoading && authStore.user) {
    return `Welcome ${authStore.user.firstName} ${authStore.user.lastName}`
  }
  return 'Welcome to Tree World'
})

// Adds up the trees planted across every event in Firestore
const totalTrees = computed(() => {
  return events.value.reduce((total, event) => total + event.treesPlanted, 0)
})

const goalPercent = computed(() => {
  return Math.min(100, Math.round((totalTrees.value / treeGoal) * 100))
})

const fetchEvents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'))
    const eventsArray = []
    querySnapshot.forEach((eventDoc) => {
      eventsArray.push(eventDoc.data())
    })
    events.value = eventsArray
  } catch (err) {
    console.error('Error fetching events:', err)
  }
}

onMounted(fetchEvents)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">{{ WelcomeLabel }}</h1>

    <div class="row">
      <div class="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <div class="card text-center">
          <div class="card-body">
            <p class="display-4 fw-bold text-success mb-0">
              {{ totalTrees.toLocaleString('en-AU') }}
            </p>
            <p class="text-muted">
              trees planted toward our {{ treeGoal.toLocaleString('en-AU') }} goal
            </p>
            <div
              class="progress"
              role="progressbar"
              :aria-valuenow="goalPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progress-bar bg-success" :style="{ width: goalPercent + '%' }">
                {{ goalPercent }}%
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-4">
          <router-link to="/events" class="btn btn-outline-success">Find an event</router-link>
        </div>
      </div>
    </div>
  </div>
</template>
