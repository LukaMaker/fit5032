import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
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
import ImpactView from '@/views/ImpactView.vue'
import BookView from '@/views/BookView.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'Home' }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: 'Log in', guestOnly: true }
  },
  {
    path: '/create_account',
    name: 'Create Account',
    component: CreateAccountView,
    meta: { title: 'Create account', guestOnly: true }
  },
  {
    path: '/forgot_password',
    name: 'Forgot Password',
    component: ForgotPasswordView,
    meta: { title: 'Reset password', guestOnly: true }
  },
  {
    path: '/events',
    name: 'Events',
    component: EventsView,
    meta: { title: 'Events' }
  },
  {
    path: '/map',
    name: 'Map',
    // Loaded only when the page is opened, because the map library is large
    component: () => import('@/views/MapView.vue'),
    meta: { title: 'Explore Map' }
  },
  {
    path: '/resources',
    name: 'Resources',
    component: ResourcesView,
    meta: { title: 'Resource Library' }
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: LeaderboardView,
    meta: { title: 'Donor Leaderboard' }
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
    component: ImpactView,
    meta: { title: 'Our Impact' }
  },
  {
    path: '/donate',
    name: 'Donate',
    component: DonateView,
    meta: { title: 'Donate', requiresAuth: true }
  },
  {
    path: '/book',
    name: 'Book',
    component: BookView,
    meta: { title: 'Book a site visit', requiresAuth: true }
  },
  {
    path: '/donations',
    name: 'Donations',
    component: DonationsView,
    meta: { title: 'My Donations', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { title: 'My Profile', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { title: 'Admin Dashboard', requiresAuth: true, requiresAdmin: true }
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

// Gives every page its own browser tab title, and after each page change moves keyboard focus to
// the start of the new page's content so screen readers announce it (not on the first page load)
router.afterEach((to, from) => {
  document.title = to.meta.title ? `${to.meta.title} | Tree World` : 'Tree World'
  if (from.matched.length > 0) {
    nextTick(() => document.getElementById('main-content')?.focus())
  }
})

export default router
