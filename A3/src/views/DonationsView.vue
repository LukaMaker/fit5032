<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, onMounted } from 'vue'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const donations = ref([])
const isLoading = ref(true)
const error = ref('')

const statusLabels = {
  pending: { text: 'Processing', badge: 'bg-secondary' },
  processing: { text: 'Processing', badge: 'bg-secondary' },
  sent: { text: 'Receipt sent', badge: 'bg-success' },
  failed: { text: 'Receipt failed', badge: 'bg-danger' }
}

const formatCurrency = (amount) => {
  return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

const formatDate = (timestamp) => {
  return timestamp ? timestamp.toDate().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

// Loads only this user's donations, newest first
const fetchDonations = async () => {
  try {
    const q = query(collection(db, 'donations'), where('userId', '==', authStore.user.uid))
    const querySnapshot = await getDocs(q)
    const donationsArray = []
    querySnapshot.forEach((donationDoc) => {
      donationsArray.push({ id: donationDoc.id, ...donationDoc.data() })
    })
    donationsArray.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    donations.value = donationsArray
  } catch (err) {
    console.error('Error fetching donations:', err)
    error.value = 'Error loading your donations.'
  }
  isLoading.value = false
}

onMounted(fetchDonations)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">My Donations</h1>

    <p v-if="isLoading" class="text-center">Loading your donations...</p>
    <p v-else-if="error" class="alert alert-danger">{{ error }}</p>
    <div v-else-if="donations.length === 0" class="text-center">
      <p>You haven't made a donation yet.</p>
      <router-link to="/donate" class="btn btn-success">Make a donation</router-link>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-striped align-middle">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Receipt</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="donation in donations" :key="donation.id">
            <td>{{ formatDate(donation.createdAt) }}</td>
            <td>{{ formatCurrency(donation.amount) }}</td>
            <td>{{ donation.receiptNumber || '-' }}</td>
            <td>
              <span class="badge" :class="statusLabels[donation.status]?.badge">
                {{ statusLabels[donation.status]?.text }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <router-link to="/donate" class="btn btn-outline-success">Make another donation</router-link>
    </div>
  </div>
</template>
