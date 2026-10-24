<script setup>
import { useRoute } from 'vue-router'

// The page title comes from the route's meta, so one view covers every placeholder page
const route = useRoute()
</script>

<template>
  <div class="container mt-5 text-center">
    <h1 class="mb-3">{{ route.meta.title }}</h1>
    <p class="text-muted">This page is coming soon.</p>
    <router-link to="/" class="btn btn-outline-success">Back to home</router-link>
  </div>
</template>
