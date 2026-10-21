import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CreateAccountView from '@/views/CreateAccountView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/create_account',
    name: 'Create Account',
    component: CreateAccountView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router