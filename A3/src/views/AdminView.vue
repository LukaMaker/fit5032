<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import sampleEvents from '@/assets/json/events.json'
import sampleResources from '@/assets/json/resources.json'
import sampleDonors from '@/assets/json/donors.json'
import { exportToCsv, exportToPdf, datedFilename } from '@/utils/exportData.js'
import Chart from 'primevue/chart'
import { groupByPeriod } from '@/utils/chartData.js'

const authStore = useAuthStore()

const roles = ['user', 'admin']
const users = ref([])
const message = ref('')
const error = ref('')

const fetchUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'))
    const usersArray = []
    querySnapshot.forEach((userDoc) => {
      usersArray.push({ id: userDoc.id, ...userDoc.data() })
    })
    users.value = usersArray
  } catch (err) {
    console.error('Error fetching users:', err)
    error.value = 'Error loading users.'
  }
}

const events = ref([])
const ratings = ref([])
const donations = ref([])

// Loads everything the overview needs at the same time
const fetchDashboardData = async () => {
  try {
    const [eventsSnapshot, ratingsSnapshot, donationsSnapshot] = await Promise.all([
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'ratings')),
      getDocs(collection(db, 'donations'))
    ])
    const toArray = (snapshot) => {
      const array = []
      snapshot.forEach((docSnap) => array.push({ id: docSnap.id, ...docSnap.data() }))
      return array
    }
    events.value = toArray(eventsSnapshot)
    ratings.value = toArray(ratingsSnapshot)
    donations.value = toArray(donationsSnapshot)
  } catch (err) {
    console.error('Error loading dashboard data:', err)
    error.value = 'Error loading the dashboard overview.'
  }
}

const adminCount = computed(() => users.value.filter((user) => user.role === 'admin').length)
const userCount = computed(() => users.value.length - adminCount.value)

// e.g. "2 users, 1 admin"
const roleSummary = computed(() => {
  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
  return `${plural(userCount.value, 'user')}, ${plural(adminCount.value, 'admin')}`
})

const upcomingEventCount = computed(() => {
  const now = new Date()
  return events.value.filter((event) => new Date(event.date) >= now).length
})

const totalDonated = computed(() => {
  return donations.value.reduce((total, donation) => total + donation.amount, 0)
})

const averageRating = computed(() => {
  if (ratings.value.length === 0) return null
  const totalStars = ratings.value.reduce((total, rating) => total + rating.stars, 0)
  return (totalStars / ratings.value.length).toFixed(1)
})

const formatCurrency = (amount) => {
  return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

// Doughnut chart: how many accounts have each role (updates straight away when a role is changed)
const roleChartData = computed(() => ({
  labels: ['Users', 'Admins'],
  datasets: [{ data: [userCount.value, adminCount.value], backgroundColor: ['#81c784', '#1b5e20'] }]
}))

const roleChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } }
}

// Bar chart: dollars donated each month
const donationsByMonth = computed(() => {
  return groupByPeriod(
    donations.value.filter((donation) => donation.createdAt),
    (donation) => donation.createdAt.toDate(),
    (donation) => donation.amount,
    'month'
  )
})

const donationChartData = computed(() => ({
  labels: donationsByMonth.value.labels,
  datasets: [
    {
      label: 'Donated (AUD)',
      data: donationsByMonth.value.values,
      backgroundColor: '#66bb6a',
      borderRadius: 4
    }
  ]
}))

const donationChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (context) => formatCurrency(context.parsed.y) } }
  },
  scales: { y: { beginAtZero: true, ticks: { callback: (value) => `$${value}` } } }
}

// Saves the role picked in the dropdown to that user's Firestore doc
const changeRole = async (user) => {
  message.value = ''
  error.value = ''
  try {
    await updateDoc(doc(db, 'users', user.id), { role: user.role })
    message.value = `${user.firstName} ${user.lastName} is now ${user.role}.`
  } catch (err) {
    console.error('Error updating role:', err)
    error.value = 'Error updating role.'
    fetchUsers()
  }
}

// Adds sample items from a JSON file to a Firestore collection, only if the collection is empty
const loadSampleData = async (collectionName, items) => {
  message.value = ''
  error.value = ''
  try {
    const existing = await getDocs(collection(db, collectionName))
    if (!existing.empty) {
      error.value = `Sample ${collectionName} have already been loaded.`
      return
    }
    for (const item of items) {
      await addDoc(collection(db, collectionName), item)
    }
    message.value = `${items.length} sample ${collectionName} loaded.`
  } catch (err) {
    console.error(`Error loading sample ${collectionName}:`, err)
    error.value = `Error loading sample ${collectionName}.`
  }
}

// Copies lat/lng from events.json onto events already in Firestore (matched by title).
// Updating keeps each event's id, so existing ratings still point at the right event.
const addEventLocations = async () => {
  message.value = ''
  error.value = ''
  try {
    const querySnapshot = await getDocs(collection(db, 'events'))
    let updatedCount = 0
    for (const eventDoc of querySnapshot.docs) {
      const match = sampleEvents.find((event) => event.title === eventDoc.data().title)
      if (match) {
        await updateDoc(doc(db, 'events', eventDoc.id), { lat: match.lat, lng: match.lng })
        updatedCount++
      }
    }
    message.value = `Added map locations to ${updatedCount} events.`
  } catch (err) {
    console.error('Error adding event locations:', err)
    error.value = 'Error adding map locations to events.'
  }
}

const userExportColumns = [
  { header: 'First name', value: (user) => user.firstName },
  { header: 'Last name', value: (user) => user.lastName },
  { header: 'Email', value: (user) => user.email },
  { header: 'Role', value: (user) => user.role },
  {
    header: 'Joined',
    value: (user) => (user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-AU') : '')
  }
]

const exportUsersCsv = () => {
  exportToCsv(datedFilename('users', 'csv'), userExportColumns, users.value)
}

const exportUsersPdf = async () => {
  try {
    await exportToPdf(
      datedFilename('users', 'pdf'),
      'Tree World - Users',
      userExportColumns,
      users.value,
      'All registered users'
    )
  } catch (err) {
    console.error('Error exporting PDF:', err)
    error.value = 'Error creating the PDF. Please try again.'
  }
}

onMounted(() => {
  fetchUsers()
  fetchDashboardData()
})
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">Admin Dashboard</h1>

    <p v-if="message" class="alert alert-success">{{ message }}</p>
    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <h2 class="h4">Overview</h2>
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="card h-100 text-center">
          <div class="card-body">
            <p class="h3 text-success mb-0">{{ users.length }}</p>
            <p class="small text-muted mb-0">accounts ({{ roleSummary }})</p>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card h-100 text-center">
          <div class="card-body">
            <p class="h3 text-success mb-0">{{ formatCurrency(totalDonated) }}</p>
            <p class="small text-muted mb-0">from {{ donations.length }} donations</p>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card h-100 text-center">
          <div class="card-body">
            <p class="h3 text-success mb-0">{{ events.length }}</p>
            <p class="small text-muted mb-0">events ({{ upcomingEventCount }} upcoming)</p>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card h-100 text-center">
          <div class="card-body">
            <p class="h3 text-success mb-0">{{ averageRating ? `${averageRating} ★` : '-' }}</p>
            <p class="small text-muted mb-0">average event rating ({{ ratings.length }} ratings)</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-5">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6">Accounts by role</h3>
            <Chart
              type="doughnut"
              :data="roleChartData"
              :options="roleChartOptions"
              :canvasProps="{ role: 'img', 'aria-label': `Accounts by role: ${roleSummary}` }"
              class="dashboard-chart"
            />
          </div>
        </div>
      </div>
      <div class="col-md-7">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6">Donations per month</h3>
            <p v-if="donations.length === 0" class="text-muted small">No donations yet.</p>
            <Chart
              v-else
              type="bar"
              :data="donationChartData"
              :options="donationChartOptions"
              :canvasProps="{
                role: 'img',
                'aria-label': `Bar chart of donations per month, ${formatCurrency(totalDonated)} in total`
              }"
              class="dashboard-chart"
            />
          </div>
        </div>
      </div>
    </div>

    <h2 class="h4">Sample data</h2>
    <div class="d-flex flex-wrap gap-2 mb-4">
      <button type="button" class="btn btn-outline-success" @click="loadSampleData('events', sampleEvents)">
        Load sample events
      </button>
      <button
        type="button"
        class="btn btn-outline-success"
        @click="loadSampleData('resources', sampleResources)"
      >
        Load sample resources
      </button>
      <button type="button" class="btn btn-outline-success" @click="loadSampleData('donors', sampleDonors)">
        Load sample donors
      </button>
      <button type="button" class="btn btn-outline-success" @click="addEventLocations">
        Add map locations to events
      </button>
    </div>

    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
      <h2 class="h4 mb-0">Users</h2>
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-outline-success btn-sm"
          :disabled="users.length === 0"
          @click="exportUsersCsv"
        >
          Export CSV
        </button>
        <button
          type="button"
          class="btn btn-outline-success btn-sm"
          :disabled="users.length === 0"
          @click="exportUsersPdf"
        >
          Export PDF
        </button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-striped align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th class="d-none d-md-table-cell">Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td class="d-none d-md-table-cell">{{ user.email }}</td>
            <td>
              <!-- Admins can't change their own role, so they can't lock themselves out -->
              <select
                class="form-select form-select-sm"
                v-model="user.role"
                @change="changeRole(user)"
                :disabled="user.id === authStore.user?.uid"
              >
                <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dashboard-chart {
  height: 260px;
}
</style>
