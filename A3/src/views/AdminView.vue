<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, onMounted } from 'vue'
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import sampleEvents from '@/assets/json/events.json'
import sampleResources from '@/assets/json/resources.json'
import sampleDonors from '@/assets/json/donors.json'

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

onMounted(fetchUsers)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <h1 class="text-center mb-4">Admin Dashboard</h1>

    <p v-if="message" class="alert alert-success">{{ message }}</p>
    <p v-if="error" class="alert alert-danger">{{ error }}</p>

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
    </div>

    <h2 class="h4">Users</h2>

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
