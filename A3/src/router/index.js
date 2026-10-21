import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CreateAccountView from '@/views/CreateAccountView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminView from '@/views/AdminView.vue'
import EventsView from '@/views/EventsView.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/create_account',
    name: 'Create Account',
    component: CreateAccountView,
    meta: { guestOnly: true }
  },
  {
    path: '/events',
    name: 'Events',
    component: EventsView
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Runs before every page change and redirects users who are not allowed on the page
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'Login' }
  }
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'Home' }
  }
  if (to.meta.guestOnly && authStore.isLoggedIn) {
    return { name: 'Home' }
  }
})

export default router
