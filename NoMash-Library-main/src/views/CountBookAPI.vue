<template>
  <pre>{{ jsondata }}</pre>
</template>

<script setup>
import axios from 'axios'
import { ref, onMounted } from 'vue'

const jsondata = ref(null)

// Calls the countBooks Cloud Function and shows the raw JSON it returns
const getBookCountAPI = async () => {
  try {
    const response = await axios.get('https://countbooks-axoyxbj45a-uc.a.run.app/countBooks')
    jsondata.value = response.data
  } catch (error) {
    console.error('Error fetching book count:', error)
    jsondata.value = { error: 'Error fetching book count' }
  }
}

onMounted(() => {
  getBookCountAPI()
})
</script>
