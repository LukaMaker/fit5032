<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import { useAuthStore } from '@/stores/auth'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import enAuLocale from '@fullcalendar/core/locales/en-au'

const authStore = useAuthStore()

const openingHour = 9
const closingHour = 17
const daysAhead = 60
const maxGroupSize = 20

const sites = ref([])
const selectedSiteId = ref('')
const siteBookings = ref([])
const myBookings = ref([])
const error = ref('')
const message = ref('')

// The slot the user picked (from the calendar or the date/time form), waiting to be confirmed
const pendingSlot = ref(null)
const groupSize = ref(1)
const groupSizeError = ref(null)
const isSaving = ref(false)

// Date/time form, a keyboard-friendly alternative to clicking the calendar
const formDate = ref('')
const formHour = ref(openingHour)
const formError = ref('')

// Start times for the form's dropdown
const hourOptions = Array.from({ length: closingHour - openingHour }, (_, index) => {
  const hour = openingHour + index
  const label = new Date(2026, 0, 1, hour).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return { value: hour, label }
})

const selectedSite = computed(() => sites.value.find((site) => site.id === selectedSiteId.value))

// Local date as YYYY-MM-DD (toISOString would use UTC and can give the wrong day)
const toDateString = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const today = new Date()
today.setHours(0, 0, 0, 0)
const lastBookableDay = new Date(today)
lastBookableDay.setDate(lastBookableDay.getDate() + daysAhead)

// The calendar opens on the next weekday, so on a weekend it doesn't start on a week with no bookable days
const firstBookableDay = new Date(today)
while (firstBookableDay.getDay() === 0 || firstBookableDay.getDay() === 6) {
  firstBookableDay.setDate(firstBookableDay.getDate() + 1)
}

// Shows a slot as the weekday, dd/mm/yyyy date and time
const formatSlot = (start) => {
  const date = start.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const weekday = start.toLocaleDateString('en-AU', { weekday: 'long' })
  const time = start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return `${weekday} ${date}, ${time}`
}

const fetchSites = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'))
    const sitesArray = []
    querySnapshot.forEach((eventDoc) => {
      sitesArray.push({ id: eventDoc.id, title: eventDoc.data().title, suburb: eventDoc.data().suburb })
    })
    sites.value = sitesArray.sort((a, b) => a.title.localeCompare(b.title))
    if (sites.value.length) {
      selectedSiteId.value = sites.value[0].id
      await fetchSiteBookings()
    }
  } catch (err) {
    console.error('Error loading sites:', err)
    error.value = 'Error loading sites.'
  }
}

// All bookings for the chosen site, so taken slots show as "Booked"
const fetchSiteBookings = async () => {
  pendingSlot.value = null
  if (!selectedSiteId.value) return
  try {
    const q = query(collection(db, 'bookings'), where('siteId', '==', selectedSiteId.value))
    const querySnapshot = await getDocs(q)
    const bookingsArray = []
    querySnapshot.forEach((bookingDoc) => bookingsArray.push({ id: bookingDoc.id, ...bookingDoc.data() }))
    siteBookings.value = bookingsArray
  } catch (err) {
    console.error('Error loading bookings:', err)
    error.value = 'Error loading bookings for this site.'
  }
}

const fetchMyBookings = async () => {
  try {
    const q = query(collection(db, 'bookings'), where('userId', '==', authStore.user.uid))
    const querySnapshot = await getDocs(q)
    const bookingsArray = []
    querySnapshot.forEach((bookingDoc) => bookingsArray.push({ id: bookingDoc.id, ...bookingDoc.data() }))
    myBookings.value = bookingsArray
      .filter((booking) => booking.start.toDate() > new Date())
      .sort((a, b) => a.start.toMillis() - b.start.toMillis())
  } catch (err) {
    console.error('Error loading your bookings:', err)
    error.value = 'Error loading your bookings.'
  }
}

// Shows other people's bookings as grey "Booked" blocks and the user's own as green "Your visit"
const calendarEvents = computed(() => {
  const events = siteBookings.value.map((booking) => {
    const start = booking.start.toDate()
    const isMine = booking.userId === authStore.user?.uid
    return {
      id: booking.id,
      title: isMine ? 'Your visit' : 'Booked',
      start,
      end: new Date(start.getTime() + 60 * 60 * 1000),
      color: isMine ? '#2e7d32' : '#9e9e9e'
    }
  })
  if (pendingSlot.value) {
    events.push({
      id: 'pending',
      title: 'Selected',
      start: pendingSlot.value.start,
      end: new Date(pendingSlot.value.start.getTime() + 60 * 60 * 1000),
      color: '#f9a825'
    })
  }
  return events
})

const isSlotBooked = (start) => {
  return siteBookings.value.some((booking) => booking.start.toMillis() === start.getTime())
}

// Checks every booking rule for a slot. Returns a problem description, or null if it can be booked.
const checkSlot = (start) => {
  const day = start.getDay()
  const hour = start.getHours()
  if (start <= new Date()) return 'That time has already passed.'
  if (start >= lastBookableDay) return `Visits can be booked up to ${daysAhead} days ahead.`
  if (day === 0 || day === 6) return 'Site visits are only available Monday to Friday.'
  if (hour < openingHour || hour >= closingHour || start.getMinutes() !== 0) {
    return 'Visits start on the hour between 9am and 4pm.'
  }
  if (isSlotBooked(start)) return 'That time is already booked. Please choose another.'
  return null
}

const chooseSlot = (start) => {
  message.value = ''
  formError.value = ''
  const problem = checkSlot(start)
  if (problem) {
    formError.value = problem
    return
  }
  pendingSlot.value = { start }
  groupSize.value = 1
  groupSizeError.value = null
}

const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  // Australian locale, so the title shows dd/mm/yyyy and column headers show dd/mm
  locale: enAuLocale,
  titleFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
  dayHeaderFormat: { weekday: 'short', day: '2-digit', month: '2-digit' },
  initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek',
  initialDate: firstBookableDay,
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
  firstDay: 1,
  allDaySlot: false,
  slotMinTime: '08:00:00',
  slotMaxTime: '18:00:00',
  slotDuration: '01:00:00',
  height: 'auto',
  nowIndicator: true,
  validRange: { start: today, end: lastBookableDay },
  // Opening hours: weekdays 9am-5pm, shown in white with the rest greyed out
  businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
  selectable: true,
  selectConstraint: 'businessHours',
  selectOverlap: false,
  // Only single one-hour slots in the future can be selected
  selectAllow: (info) => info.end - info.start === 60 * 60 * 1000 && info.start > new Date(),
  select: (info) => chooseSlot(info.start),
  // FullCalendar's arrow icons are images with no text, so they are hidden from screen readers.
  // Their buttons already have names like "Previous week".
  datesSet: () => {
    document.querySelectorAll('.fc-icon').forEach((icon) => icon.setAttribute('aria-hidden', 'true'))
  },
  events: calendarEvents.value
}))

const chooseFromForm = () => {
  formError.value = ''
  if (!formDate.value) {
    formError.value = 'Please choose a date.'
    return
  }
  const [year, month, day] = formDate.value.split('-').map(Number)
  chooseSlot(new Date(year, month - 1, day, Number(formHour.value)))
}

const validateGroupSize = () => {
  const size = groupSize.value
  if (!Number.isInteger(size) || size < 1 || size > maxGroupSize) {
    groupSizeError.value = `Group size must be a whole number from 1 to ${maxGroupSize}`
  } else {
    groupSizeError.value = null
  }
}

const confirmBooking = async () => {
  validateGroupSize()
  if (groupSizeError.value) return
  const start = pendingSlot.value.start
  const problem = checkSlot(start)
  if (problem) {
    formError.value = problem
    pendingSlot.value = null
    return
  }

  const date = toDateString(start)
  const hour = start.getHours()
  // One document per site per hour, so Firestore itself refuses a second booking of the same slot
  const bookingId = `${selectedSiteId.value}_${date}_${hour}`

  isSaving.value = true
  try {
    await setDoc(doc(db, 'bookings', bookingId), {
      siteId: selectedSiteId.value,
      siteTitle: selectedSite.value.title,
      userId: authStore.user.uid,
      date,
      hour,
      start: Timestamp.fromDate(start),
      groupSize: groupSize.value,
      createdAt: serverTimestamp()
    })
    message.value = `Booked: ${selectedSite.value.title}, ${formatSlot(start)} for ${groupSize.value} ${groupSize.value === 1 ? 'person' : 'people'}.`
    pendingSlot.value = null
  } catch (err) {
    console.error('Error saving booking:', err)
    formError.value =
      err.code === 'permission-denied'
        ? 'Sorry, someone has just booked that time. Please choose another.'
        : 'Your booking could not be saved. Please try again.'
    pendingSlot.value = null
  }
  isSaving.value = false
  await Promise.all([fetchSiteBookings(), fetchMyBookings()])
}

const cancelBooking = async (booking) => {
  message.value = ''
  error.value = ''
  try {
    await deleteDoc(doc(db, 'bookings', booking.id))
    message.value = `Cancelled your visit to ${booking.siteTitle} on ${formatSlot(booking.start.toDate())}.`
    await Promise.all([fetchSiteBookings(), fetchMyBookings()])
  } catch (err) {
    console.error('Error cancelling booking:', err)
    error.value = 'Your booking could not be cancelled. Please try again.'
  }
}

onMounted(() => {
  fetchSites()
  fetchMyBookings()
})
</script>

<template>
  <div class="container mt-5 mb-5">
    <h1 class="text-center mb-2">Book a site visit</h1>
    <p class="text-center text-muted mb-4">
      Visit a planting site with our team. Visits are one hour, Monday to Friday, 9am to 5pm.
    </p>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <p v-if="message" class="alert alert-success" role="status">{{ message }}</p>

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="mb-3">
          <label for="site" class="form-label">Site</label>
          <select id="site" class="form-select" v-model="selectedSiteId" @change="fetchSiteBookings">
            <option v-for="site in sites" :key="site.id" :value="site.id">
              {{ site.title }} ({{ site.suburb }})
            </option>
          </select>
        </div>

        <p class="small text-muted mb-2">
          Click a free hour on the calendar, or use the date and time form.
          <span class="legend-box" style="background: #9e9e9e"></span> Booked
          <span class="legend-box ms-2" style="background: #2e7d32"></span> Your visit
        </p>
        <FullCalendar :options="calendarOptions" />
      </div>

      <div class="col-lg-4">
        <section class="card mb-3" aria-labelledby="choose-heading">
          <div class="card-body">
            <h2 id="choose-heading" class="h6">Choose a date and time</h2>
            <form @submit.prevent="chooseFromForm" novalidate>
              <div class="mb-2">
                <label for="visit-date" class="form-label small">Date</label>
                <input
                  type="date"
                  id="visit-date"
                  class="form-control"
                  :min="toDateString(today)"
                  :max="toDateString(lastBookableDay)"
                  v-model="formDate"
                />
              </div>
              <div class="mb-2">
                <label for="visit-hour" class="form-label small">Start time</label>
                <select id="visit-hour" class="form-select" v-model.number="formHour">
                  <option v-for="option in hourOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <button type="submit" class="btn btn-outline-success btn-sm">Choose this time</button>
            </form>
            <p v-if="formError" class="text-danger small mt-2 mb-0" role="alert">{{ formError }}</p>
          </div>
        </section>

        <section v-if="pendingSlot" class="card mb-3 border-warning" aria-labelledby="confirm-heading">
          <div class="card-body">
            <h2 id="confirm-heading" class="h6">Confirm your visit</h2>
            <p class="small mb-2">
              <strong>{{ selectedSite?.title }}</strong><br />
              {{ formatSlot(pendingSlot.start) }}
            </p>
            <label for="group-size" class="form-label small">Group size</label>
            <input
              type="number"
              id="group-size"
              :aria-invalid="!!groupSizeError"
              :aria-describedby="groupSizeError ? 'group-size-error' : undefined"
              class="form-control mb-1"
              min="1"
              :max="maxGroupSize"
              step="1"
              v-model.number="groupSize"
              @input="validateGroupSize"
              @blur="validateGroupSize"
            />
            <div v-if="groupSizeError" id="group-size-error" class="text-danger small" role="alert">{{ groupSizeError }}</div>
            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn btn-success btn-sm" :disabled="isSaving" @click="confirmBooking">
                {{ isSaving ? 'Booking...' : 'Confirm booking' }}
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="pendingSlot = null">
                Cancel
              </button>
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="my-bookings-heading">
          <div class="card-body">
            <h2 id="my-bookings-heading" class="h6">My upcoming visits</h2>
            <p v-if="myBookings.length === 0" class="small text-muted mb-0">You have no upcoming visits.</p>
            <ul class="list-unstyled mb-0">
              <li v-for="booking in myBookings" :key="booking.id" class="booking-item py-2">
                <strong class="small d-block">{{ booking.siteTitle }}</strong>
                <span class="small d-block">{{ formatSlot(booking.start.toDate()) }}</span>
                <span class="small text-muted d-block">Group of {{ booking.groupSize }}</span>
                <button type="button" class="btn btn-outline-danger btn-sm mt-1" @click="cancelBooking(booking)">
                  Cancel visit
                </button>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legend-box {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  vertical-align: middle;
}

.booking-item + .booking-item {
  border-top: 1px solid #eee;
}

/* FullCalendar's own elements need :deep() because they are outside this component's template */
:deep(.fc-col-header-cell-cushion) {
  color: inherit;
  text-decoration: none;
}

:deep(.fc .fc-toolbar-title) {
  font-size: 1.25rem;
}

@media (max-width: 767px) {
  :deep(.fc .fc-toolbar) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  :deep(.fc .fc-toolbar-title) {
    font-size: 1rem;
  }
}
</style>
