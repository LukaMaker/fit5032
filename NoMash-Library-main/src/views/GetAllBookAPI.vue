<template>
  <pre>{{ jsondata }}</pre>
</template>

<script setup>
import axios from 'axios'
import { ref, onMounted } from 'vue'

const jsondata = ref(null)

// Calls the getAllBooks Cloud Function and shows every book as JSON
const getAllBooksAPI = async () => {
  try {
    const response = await axios.get('https://getallbooks-axoyxbj45a-uc.a.run.app/getAllBooks')
    jsondata.value = response.data
  } catch (error) {
    console.error('Error fetching books:', error)
    jsondata.value = { error: 'Error fetching books' }
  }
}

onMounted(() => {
  getAllBooksAPI()
})
</script>
