<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const events = ref([])
const search = ref('')
const isLoading = ref(true)
const error = ref('')
const ratings = ref([])
const ratingError = ref('')

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

const fetchRatings = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'ratings'))
    const ratingsArray = []
    querySnapshot.forEach((ratingDoc) => {
      ratingsArray.push({ id: ratingDoc.id, ...ratingDoc.data() })
    })
    ratings.value = ratingsArray
  } catch (err) {
    console.error('Error fetching ratings:', err)
    ratingError.value = 'Error loading ratings.'
  }
}

// Groups ratings by event and works out each event's average and number of ratings
const eventRatings = computed(() => {
  const summary = {}
  ratings.value.forEach((rating) => {
    if (!summary[rating.eventId]) {
      summary[rating.eventId] = { total: 0, count: 0 }
    }
    summary[rating.eventId].total += rating.stars
    summary[rating.eventId].count++
  })
  for (const eventId in summary) {
    summary[eventId].average = (summary[eventId].total / summary[eventId].count).toFixed(1)
  }
  return summary
})

// The logged-in user's rating for an event, or 0 if they haven't rated it
const myRating = (eventId) => {
  const rating = ratings.value.find(
    (r) => r.eventId === eventId && r.userId === authStore.user?.uid
  )
  return rating ? rating.stars : 0
}

// Saves the rating with id eventId_userId, so each user has one rating per event
const rateEvent = async (eventId, stars) => {
  ratingError.value = ''
  const ratingId = `${eventId}_${authStore.user.uid}`
  const rating = {
    eventId: eventId,
    userId: authStore.user.uid,
    stars: stars,
    createdAt: new Date().toISOString()
  }
  try {
    await setDoc(doc(db, 'ratings', ratingId), rating)
    // Replace this user's old rating in the list so the average updates straight away
    ratings.value = ratings.value.filter((r) => r.id !== ratingId)
    ratings.value.push({ id: ratingId, ...rating })
  } catch (err) {
    console.error('Error saving rating:', err)
    ratingError.value = 'Error saving your rating.'
  }
}

onMounted(() => {
  fetchEvents()
  fetchRatings()
})
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
    <p v-if="ratingError" class="alert alert-danger">{{ ratingError }}</p>

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

          <div v-if="!isUpcoming(event.date)" class="card-footer bg-white">
            <p v-if="eventRatings[event.id]" class="mb-1">
              <span class="text-warning">★</span>
              <strong>{{ eventRatings[event.id].average }}</strong>
              <span class="text-muted">
                ({{ eventRatings[event.id].count }}
                {{ eventRatings[event.id].count === 1 ? 'rating' : 'ratings' }})
              </span>
            </p>
            <p v-else class="text-muted mb-1">No ratings yet</p>

            <div v-if="authStore.isLoggedIn">
              <span class="small text-muted me-1">Your rating:</span>
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="star-btn"
                :class="{ selected: star <= myRating(event.id) }"
                :aria-label="`Rate ${star} out of 5`"
                @click="rateEvent(event.id, star)"
              >
                ★
              </button>
            </div>
            <p v-else class="small mb-0">
              <router-link :to="{ name: 'Login', query: { redirect: '/events' } }">Log in</router-link>
              to rate this event
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.star-btn {
  background: none;
  border: none;
  padding: 0 2px;
  font-size: 1.4rem;
  line-height: 1;
  color: #ccc;
  cursor: pointer;
}

.star-btn.selected {
  color: #f5b301;
}

.star-btn:hover {
  color: #ffd54f;
}
</style>
