<script setup>
import { ref } from 'vue';
const isOpen = ref(false);
</script>

<template>
  <div class="container">
    <header class="navbar-header">
      <div class="d-flex justify-content-between align-items-center py-3 top-row">
        <div class="col-6">
          Tree World
        </div>

        <button
          class="navbar-toggler d-lg-none"
          type="button"
          @click="isOpen = !isOpen"
          aria-label="Toggle navigation"
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>

        <ul class="nav nav-pills flex-nowrap nav-links d-none d-lg-flex">
          <li class="nav-item">
            <router-link to="/" class="nav-link text-nowrap" active-class="active">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/discover" class="nav-link text-nowrap" active-class="active">Discover & learn</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/get_involved" class="nav-link text-nowrap" active-class="active">Get involved</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/impact" class="nav-link text-nowrap" active-class="active">Impact</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/login" class="nav-link text-nowrap" active-class="active">Login</router-link>
          </li>
        </ul>
      </div>

      <ul
        v-if="isOpen"
        class="nav nav-pills flex-column dropdown-nav d-lg-none"
      >
        <li class="nav-item">
          <router-link to="/" class="nav-link text-nowrap" active-class="active">Home</router-link>
        </li>
        <li class="nav-item">
          <router-link to="/discover" class="nav-link text-nowrap" active-class="active">Discover & learn</router-link>
        </li>
        <li class="nav-item">
          <router-link to="/get_involved" class="nav-link text-nowrap" active-class="active">Get involved</router-link>
        </li>
        <li class="nav-item">
          <router-link to="/impact" class="nav-link text-nowrap" active-class="active">Impact</router-link>
        </li>
        <li class="nav-item">
          <router-link to="/login" class="nav-link text-nowrap" active-class="active">Login</router-link>
        </li>
      </ul>
    </header>
  </div>
</template>


<style scoped>
.navbar-header {
  display: flex;
  flex-direction: column;
}

.top-row {
  flex: 0 0 auto;
}

.nav-links .nav-link {
  padding-left: clamp(0.4rem, 1.5vw, 1rem);
  padding-right: clamp(0.4rem, 1.5vw, 1rem);
}

.dropdown-nav {
  width: 100%;
}

.navbar-toggler {
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  height: 20px;
  padding: 0;
  cursor: pointer;
}

.hamburger-line {
  display: block;
  width: 100%;
  height: 3px;
  background-color: #333;
  border-radius: 2px;
}
</style>