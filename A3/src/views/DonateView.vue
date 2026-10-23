<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, onUnmounted } from 'vue'
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const presetAmounts = [10, 25, 50, 100]
const selectedPreset = ref(25)
const customAmount = ref('')
const showOnLeaderboard = ref(false)
const suburb = ref('')

const errors = ref({
  amount: null,
  suburb: null
})

// '' before donating, then 'pending' -> 'processing' -> 'sent' or 'failed' (set by the Cloud Function)
const status = ref('')
const receiptNumber = ref('')
const submitError = ref('')
const isSlow = ref(false)
let stopListening = null
let slowTimer = null

// The custom amount box wins over the preset buttons when it has a value
const chosenAmount = computed(() => {
  return customAmount.value !== '' ? Number(customAmount.value) : selectedPreset.value
})

// How the donor's name will appear on the public leaderboard, e.g. "Luka B."
const leaderboardName = computed(() => {
  const user = authStore.user
  if (!user?.firstName) return ''
  return user.lastName ? `${user.firstName} ${user.lastName[0]}.` : user.firstName
})

const isWorking = computed(() => status.value === 'pending' || status.value === 'processing')

const selectPreset = (preset) => {
  selectedPreset.value = preset
  customAmount.value = ''
  errors.value.amount = null
}

const validateAmount = (blur) => {
  const amount = chosenAmount.value
  if (amount === null || Number.isNaN(amount)) {
    if (blur) errors.value.amount = 'Please choose or enter an amount'
  } else if (!Number.isInteger(amount)) {
    if (blur) errors.value.amount = 'Please enter a whole dollar amount'
  } else if (amount < 2 || amount > 10000) {
    if (blur) errors.value.amount = 'Amount must be between $2 and $10,000'
  } else {
    errors.value.amount = null
  }
}

const validateSuburb = (blur) => {
  if (suburb.value.trim().length > 50) {
    if (blur) errors.value.suburb = 'Suburb must be 50 characters or less'
  } else {
    errors.value.suburb = null
  }
}

const stopWatching = () => {
  if (stopListening) stopListening()
  stopListening = null
  clearTimeout(slowTimer)
}

const donate = async () => {
  submitError.value = ''
  validateAmount(true)
  validateSuburb(true)
  if (errors.value.amount || errors.value.suburb) return

  status.value = 'pending'
  isSlow.value = false
  try {
    const donationRef = await addDoc(collection(db, 'donations'), {
      userId: authStore.user.uid,
      email: authStore.user.email,
      amount: chosenAmount.value,
      showOnLeaderboard: showOnLeaderboard.value,
      suburb: showOnLeaderboard.value ? suburb.value.trim() : '',
      status: 'pending',
      createdAt: serverTimestamp()
    })

    // Watch the new donation so the page updates when the Cloud Function sends the receipt
    stopListening = onSnapshot(donationRef, (snap) => {
      if (!snap.exists()) return
      const donation = snap.data()
      status.value = donation.status
      if (donation.status === 'sent') {
        receiptNumber.value = donation.receiptNumber
        stopWatching()
      } else if (donation.status === 'failed') {
        submitError.value = donation.errorMessage
        stopWatching()
      }
    })

    // If the receipt hasn't arrived after 30 seconds, let the user know it is still on its way
    slowTimer = setTimeout(() => {
      if (isWorking.value) isSlow.value = true
    }, 30000)
  } catch (err) {
    console.error('Error saving donation:', err)
    status.value = ''
    submitError.value = 'Your donation could not be saved. Please try again.'
  }
}

const resetForm = () => {
  stopWatching()
  status.value = ''
  receiptNumber.value = ''
  submitError.value = ''
  isSlow.value = false
  selectedPreset.value = 25
  customAmount.value = ''
  showOnLeaderboard.value = false
  suburb.value = ''
}

onUnmounted(stopWatching)
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <h1 class="text-center">Donate</h1>
        <p class="text-center text-muted">
          Every dollar helps us plant trees in the suburbs that need shade the most.
        </p>
        <p class="alert alert-info small">
          Demo only: no payment is taken. You'll still receive a PDF receipt by email.
        </p>

        <!-- Success -->
        <div v-if="status === 'sent'" class="alert alert-success" role="status">
          <h2 class="h5">Thank you for your donation!</h2>
          <p class="mb-2">
            Receipt <strong>{{ receiptNumber }}</strong> has been emailed to
            <strong>{{ authStore.user.email }}</strong>.
          </p>
          <router-link to="/donations" class="btn btn-success btn-sm me-2">View my donations</router-link>
          <button type="button" class="btn btn-outline-success btn-sm" @click="resetForm">
            Make another donation
          </button>
        </div>

        <form v-else @submit.prevent="donate" novalidate>
          <fieldset class="mb-3" :disabled="isWorking">
            <legend class="form-label fs-6">Amount</legend>
            <div class="d-flex flex-wrap gap-2 mb-2">
              <template v-for="preset in presetAmounts" :key="preset">
                <input
                  type="radio"
                  class="btn-check"
                  name="amount"
                  :id="`amount-${preset}`"
                  :checked="customAmount === '' && selectedPreset === preset"
                  @change="selectPreset(preset)"
                />
                <label class="btn btn-outline-success" :for="`amount-${preset}`">${{ preset }}</label>
              </template>
            </div>
            <label for="custom-amount" class="form-label small">Or enter another amount</label>
            <div class="input-group">
              <span class="input-group-text">$</span>
              <input
                type="number"
                class="form-control"
                id="custom-amount"
                min="2"
                max="10000"
                step="1"
                inputmode="numeric"
                placeholder="e.g. 40"
                v-model="customAmount"
                @input="() => validateAmount(false)"
                @blur="() => validateAmount(true)"
              />
            </div>
            <div v-if="errors.amount" class="text-danger">{{ errors.amount }}</div>
          </fieldset>

          <fieldset class="mb-3" :disabled="isWorking">
            <div class="form-check">
              <input
                type="checkbox"
                class="form-check-input"
                id="show-on-leaderboard"
                v-model="showOnLeaderboard"
              />
              <label class="form-check-label" for="show-on-leaderboard">
                Show me on the Donor Leaderboard
              </label>
            </div>
            <div v-if="showOnLeaderboard" class="mt-2 ps-4">
              <p class="small text-muted mb-2">
                You'll appear as <strong>{{ leaderboardName }}</strong> on the leaderboard
              </p>
              <label for="suburb" class="form-label small">Suburb (optional)</label>
              <input
                type="text"
                class="form-control"
                id="suburb"
                maxlength="50"
                autocomplete="address-level2"
                v-model="suburb"
                @input="() => validateSuburb(false)"
                @blur="() => validateSuburb(true)"
              />
              <div v-if="errors.suburb" class="text-danger">{{ errors.suburb }}</div>
            </div>
          </fieldset>

          <p class="small text-muted">
            Your receipt will be emailed to <strong>{{ authStore.user?.email }}</strong>.
          </p>

          <div v-if="submitError" class="alert alert-danger">{{ submitError }}</div>

          <div v-if="isWorking" class="alert alert-secondary" role="status">
            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            Processing your donation and sending your receipt...
            <p v-if="isSlow" class="small mb-0 mt-2">
              This is taking longer than usual. Your receipt will still arrive, and you can check its
              status on <router-link to="/donations">My Donations</router-link>.
            </p>
          </div>

          <div class="text-center">
            <button type="submit" class="btn btn-success" :disabled="isWorking">
              Donate ${{ Number.isFinite(chosenAmount) ? chosenAmount : '' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
