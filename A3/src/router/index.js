import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CreateAccountView from '@/views/CreateAccountView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminView from '@/views/AdminView.vue'
import EventsView from '@/views/EventsView.vue'
import ComingSoonView from '@/views/ComingSoonView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResourcesView from '@/views/ResourcesView.vue'
import LeaderboardView from '@/views/LeaderboardView.vue'
import DonateView from '@/views/DonateView.vue'
import DonationsView from '@/views/DonationsView.vue'
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
    path: '/forgot_password',
    name: 'Forgot Password',
    component: ForgotPasswordView,
    meta: { guestOnly: true }
  },
  {
    path: '/events',
    name: 'Events',
    component: EventsView
  },
  {
    path: '/map',
    name: 'Map',
    // Loaded only when the page is opened, because the map library is large
    component: () => import('@/views/MapView.vue')
  },
  {
    path: '/resources',
    name: 'Resources',
    component: ResourcesView
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: LeaderboardView
  },
  {
    path: '/get_involved',
    name: 'Get Involved',
    component: ComingSoonView,
    meta: { title: 'Get Involved' }
  },
  {
    path: '/impact',
    name: 'Impact',
    component: ComingSoonView,
    meta: { title: 'Impact' }
  },
  {
    path: '/donate',
    name: 'Donate',
    component: DonateView,
    meta: { requiresAuth: true }
  },
  {
    path: '/donations',
    name: 'Donations',
    component: DonationsView,
    meta: { requiresAuth: true }
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
    // Remember the page so Login can send the user back after signing in
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'Home' }
  }
  if (to.meta.guestOnly && authStore.isLoggedIn) {
    return { name: 'Home' }
  }
})

export default router
