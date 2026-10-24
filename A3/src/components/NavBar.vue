<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isOpen = ref(false)
const isDropdownOpen = ref(false)

// Links shown under each nav dropdown (desktop) or heading (mobile menu)
const menus = [
  {
    id: 'discover',
    label: 'Discover & learn',
    links: [
      { to: '/map', label: 'Explore Map' },
      { to: '/events', label: 'Events' },
      { to: '/resources', label: 'Resource Library' }
    ]
  },
  {
    id: 'involved',
    label: 'Get involved',
    links: [
      { to: '/book', label: 'Book a site visit' },
      { to: '/donate', label: 'Donate' },
      { to: '/leaderboard', label: 'Donor Leaderboard' }
    ]
  }
]

// id of the nav dropdown that is open, or null when none are
const openMenu = ref(null)

const toggleMenu = (id) => {
  openMenu.value = openMenu.value === id ? null : id
}

// Highlights a dropdown button when the current page is one of its links
const isMenuActive = (menu) => menu.links.some((link) => link.to === route.path)

const initials = computed(() => {
  const user = authStore.user
  if (!user) return ''
  const first = user.firstName?.[0] || ''
  const last = user.lastName?.[0] || ''
  return (first + last).toUpperCase()
})

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}

const logOut = async () => {
  try {
    await signOut(auth)
    authStore.clearUser()
    closeDropdown()
    router.push('/login')
  } catch (error) {
    console.log(error.code)
  }
}

// Close the dropdowns when clicking anywhere outside them
const dropdownRef = ref(null)
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false
  }
  if (!event.target.closest('.nav-dropdown')) {
    openMenu.value = null
  }
}

// Escape closes whichever menu is open and puts keyboard focus back on the button that opened it
const handleKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (openMenu.value) {
    document.getElementById(`menu-button-${openMenu.value}`)?.focus()
    openMenu.value = null
  }
  if (isDropdownOpen.value) {
    isDropdownOpen.value = false
    document.getElementById('account-button')?.focus()
  }
  if (isOpen.value) {
    isOpen.value = false
    document.getElementById('menu-toggle')?.focus()
  }
}

// Close every menu when the page changes
watch(
  () => route.fullPath,
  () => {
    openMenu.value = null
    isDropdownOpen.value = false
    isOpen.value = false
  }
)

const fullName = computed(() => {
  const user = authStore.user
  return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="container">
    <header class="navbar-header">
      <div class="d-flex justify-content-between align-items-center py-3 top-row">
        <router-link to="/" class="brand">Tree World</router-link>

        <button
          id="menu-toggle"
          class="navbar-toggler d-lg-none"
          type="button"
          @click="isOpen = !isOpen"
          aria-label="Menu"
          :aria-expanded="isOpen"
          aria-controls="mobile-menu"
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>

        <nav aria-label="Main" class="d-none d-lg-block">
        <ul class="nav nav-pills flex-nowrap nav-links align-items-center">
          <li class="nav-item">
            <router-link to="/" class="nav-link text-nowrap" active-class="active">Home</router-link>
          </li>

          <!-- Nav dropdowns (Discover & learn, Get involved) -->
          <li v-for="menu in menus" :key="menu.id" class="nav-item position-relative nav-dropdown">
            <button
              :id="`menu-button-${menu.id}`"
              type="button"
              class="nav-link text-nowrap"
              :class="{ active: isMenuActive(menu) }"
              :aria-expanded="openMenu === menu.id"
              :aria-controls="`menu-${menu.id}`"
              @click="toggleMenu(menu.id)"
            >
              {{ menu.label }} <span aria-hidden="true">▾</span>
            </button>
            <ul v-if="openMenu === menu.id" :id="`menu-${menu.id}`" class="dropdown-menu-custom dropdown-menu-left">
              <li v-for="link in menu.links" :key="link.to">
                <router-link :to="link.to" class="dropdown-item" @click="openMenu = null">
                  {{ link.label }}
                </router-link>
              </li>
            </ul>
          </li>

          <li class="nav-item">
            <router-link to="/impact" class="nav-link text-nowrap" active-class="active">Impact</router-link>
          </li>

          <!-- Logged out: show Login link -->
          <li class="nav-item" v-if="!authStore.isLoggedIn">
            <router-link to="/login" class="nav-link text-nowrap" active-class="active">Login</router-link>
          </li>

          <!-- Logged in: show initials avatar + dropdown -->
          <li class="nav-item position-relative" v-else ref="dropdownRef">
            <button
              id="account-button"
              type="button"
              class="avatar-btn"
              :aria-label="`${initials}, account menu for ${fullName}`"
              :aria-expanded="isDropdownOpen"
              aria-controls="account-menu"
              @click="toggleDropdown"
            >
              {{ initials }}
            </button>

            <ul v-if="isDropdownOpen" id="account-menu" class="dropdown-menu-custom">
              <li>
                <router-link to="/profile" class="dropdown-item" @click="closeDropdown">Profile</router-link>
              </li>
              <li>
                <router-link to="/donations" class="dropdown-item" @click="closeDropdown">Donations</router-link>
              </li>
              <li v-if="authStore.isAdmin">
                <router-link to="/admin" class="dropdown-item" @click="closeDropdown">Admin</router-link>
              </li>
              <li>
                <button class="dropdown-item dropdown-item-btn" @click="logOut">Sign Out</button>
              </li>
            </ul>
          </li>
        </ul>
        </nav>
      </div>

      <nav v-if="isOpen" aria-label="Main" class="d-lg-none">
      <ul
        id="mobile-menu"
        class="nav nav-pills flex-column dropdown-nav"
        @click="isOpen = false"
      >
        <li class="nav-item">
          <router-link to="/" class="nav-link text-nowrap" active-class="active">Home</router-link>
        </li>

        <!-- Mobile: each dropdown becomes a heading with its links indented below -->
        <li v-for="menu in menus" :key="menu.id" class="nav-item">
          <span class="nav-link text-nowrap mobile-menu-heading">{{ menu.label }}</span>
          <ul class="nav nav-pills flex-column ps-3">
            <li v-for="link in menu.links" :key="link.to" class="nav-item">
              <router-link :to="link.to" class="nav-link text-nowrap" active-class="active">
                {{ link.label }}
              </router-link>
            </li>
          </ul>
        </li>

        <li class="nav-item">
          <router-link to="/impact" class="nav-link text-nowrap" active-class="active">Impact</router-link>
        </li>

        <li class="nav-item" v-if="!authStore.isLoggedIn">
          <router-link to="/login" class="nav-link text-nowrap" active-class="active">Login</router-link>
        </li>

        <template v-else>
          <li class="nav-item">
            <router-link to="/profile" class="nav-link text-nowrap" active-class="active">Profile</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/donations" class="nav-link text-nowrap" active-class="active">Donations</router-link>
          </li>
          <li class="nav-item" v-if="authStore.isAdmin">
            <router-link to="/admin" class="nav-link text-nowrap" active-class="active">Admin</router-link>
          </li>
          <li class="nav-item">
            <button class="nav-link text-nowrap logout-mobile-btn" @click="logOut">Sign Out</button>
          </li>
        </template>
      </ul>
      </nav>
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

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background-color: #2e7d32;
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dropdown-menu-custom {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;
  min-width: 160px;
  z-index: 1000;
}

.dropdown-menu-left {
  left: 0;
  right: auto;
  min-width: 190px;
}

.mobile-menu-heading {
  color: #555;
  font-weight: 600;
  cursor: default;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  color: #333;
  text-decoration: none;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item-btn {
  color: #b3261e;
}

.brand {
  font-weight: 600;
  color: #1b5e20;
  text-decoration: none;
}

/* Clear focus outlines for keyboard users on the custom buttons and links */
.brand:focus-visible,
.navbar-toggler:focus-visible,
.avatar-btn:focus-visible,
.dropdown-item:focus-visible {
  outline: 3px solid #1b5e20;
  outline-offset: 2px;
}

.logout-mobile-btn {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  color: #b3261e;
}
</style>