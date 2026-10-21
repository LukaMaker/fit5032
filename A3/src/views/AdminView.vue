<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, onMounted } from 'vue'
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import sampleEvents from '@/assets/json/events.json'

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

// Adds the events from events.json to Firestore, only if there are no events yet
const loadSampleEvents = async () => {
  message.value = ''
  error.value = ''
  try {
    const existing = await getDocs(collection(db, 'events'))
    if (!existing.empty) {
      error.value = 'Events have already been loaded.'
      return
    }
    for (const event of sampleEvents) {
      await addDoc(collection(db, 'events'), event)
    }
    message.value = `${sampleEvents.length} sample events loaded.`
  } catch (err) {
    console.error('Error loading sample events:', err)
    error.value = 'Error loading sample events.'
  }
}

onMounted(fetchUsers)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">Admin Dashboard</h1>

    <p v-if="message" class="alert alert-success">{{ message }}</p>
    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <h2 class="h4">Events</h2>
    <button type="button" class="btn btn-outline-success mb-4" @click="loadSampleEvents">
      Load sample events
    </button>

    <h2 class="h4">Users</h2>

    <div class="table-responsive">
      <table class="table table-striped align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>{{ user.email }}</td>
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
