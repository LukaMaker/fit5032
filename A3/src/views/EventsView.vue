<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'

const events = ref([])
const search = ref('')
const isLoading = ref(true)
const error = ref('')

const fetchEvents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'))
    const eventsArray = []
    querySnapshot.forEach((eventDoc) => {
      eventsArray.push({ id: eventDoc.id, ...eventDoc.data() })
    })
    events.value = eventsArray
  } catch (err) {
    console.error('Error fetching events:', err)
    error.value = 'Error loading events.'
  }
  isLoading.value = false
}

// Events sorted by date, filtered by the search box (title or suburb)
const filteredEvents = computed(() => {
  const term = search.value.trim().toLowerCase()
  return [...events.value]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(
      (event) =>
        event.title.toLowerCase().includes(term) || event.suburb.toLowerCase().includes(term)
    )
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const isUpcoming = (date) => new Date(date) >= new Date()

onMounted(fetchEvents)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">Events</h1>

    <div class="row mb-4">
      <div class="col-md-6 offset-md-3">
        <label for="search" class="form-label">Search by event or suburb</label>
        <input
          type="text"
          class="form-control"
          id="search"
          maxlength="100"
          placeholder="e.g. Frankston"
          v-model="search"
        />
      </div>
    </div>

    <p v-if="isLoading" class="text-center">Loading events...</p>
    <p v-else-if="error" class="alert alert-danger">{{ error }}</p>
    <p v-else-if="filteredEvents.length === 0" class="text-center">No events found.</p>

    <div class="row">
      <div v-for="event in filteredEvents" :key="event.id" class="col-12 col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h5 card-title">{{ event.title }}</h2>
            <p class="text-muted mb-2">{{ event.suburb }} · {{ formatDate(event.date) }}</p>
            <p class="card-text">{{ event.description }}</p>
            <span v-if="event.familyFriendly" class="badge bg-success me-1">Family friendly</span>
            <span v-if="isUpcoming(event.date)" class="badge bg-primary">Upcoming</span>
            <span v-else class="badge bg-secondary">
              {{ event.treesPlanted.toLocaleString('en-AU') }} trees planted
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
