<script setup>
import NavBar from './components/NavBar.vue'
import AssistantChat from './components/AssistantChat.vue'

// Moves keyboard focus straight to the page content, skipping the navigation links
const skipToContent = () => {
  document.getElementById('main-content')?.focus()
}
</script>

<template>
  <a href="#main-content" class="skip-link" @click.prevent="skipToContent">Skip to main content</a>
  <NavBar></NavBar>
  <!-- tabindex="-1" lets the skip link and page changes move focus here -->
  <main id="main-content" tabindex="-1">
    <router-view></router-view>
  </main>
  <AssistantChat></AssistantChat>
</template>

<style scoped>
/* Hidden off-screen until it receives keyboard focus */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -3rem;
  z-index: 2000;
  padding: 0.5rem 1rem;
  background: #1b5e20;
  color: #fff;
  border-radius: 0 0 6px 6px;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

main:focus {
  outline: none;
}
</style>
