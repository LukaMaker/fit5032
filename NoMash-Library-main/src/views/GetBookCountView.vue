<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2 text-center">
        <h1>Book Count</h1>
        <button @click="getBookCount">Get Book Count</button>
        <p v-if="count !== null">Total number of books: {{ count }}</p>
        <p v-if="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ref } from 'vue';

const count = ref(null);
const error = ref(null);

const getBookCount = async () => {
  try {
    const response = await axios.get('https://countbooks-axoyxbj45a-uc.a.run.app/countBooks');
    count.value = response.data.count;
    error.value = null;
  } catch (err) {
    error.value = 'Error fetching book count';
    count.value = null;
  }
};
</script>