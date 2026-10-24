<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import Chart from 'primevue/chart'
import { groupByPeriod, runningTotal } from '@/utils/chartData.js'

const treeGoal = 20000
const granularities = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' }
]

const events = ref([])
const donors = ref([])
const granularity = ref('month')
const isLoading = ref(true)
const error = ref('')

const fetchData = async () => {
  try {
    const [eventsSnapshot, donorsSnapshot] = await Promise.all([
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'donors'))
    ])
    const eventsArray = []
    eventsSnapshot.forEach((eventDoc) => eventsArray.push({ id: eventDoc.id, ...eventDoc.data() }))
    const donorsArray = []
    donorsSnapshot.forEach((donorDoc) => donorsArray.push(donorDoc.data()))
    events.value = eventsArray
    donors.value = donorsArray
  } catch (err) {
    console.error('Error loading impact data:', err)
    error.value = 'Error loading impact data.'
  }
  isLoading.value = false
}

const completedEvents = computed(() => {
  const now = new Date()
  return events.value.filter((event) => new Date(event.date) < now && event.treesPlanted > 0)
})

const upcomingCount = computed(() => {
  const now = new Date()
  return events.value.filter((event) => new Date(event.date) >= now).length
})

const totalTrees = computed(() => {
  return completedEvents.value.reduce((total, event) => total + event.treesPlanted, 0)
})

const goalPercent = computed(() => Math.min(100, Math.round((totalTrees.value / treeGoal) * 100)))

const totalDonated = computed(() => {
  return donors.value.reduce((total, donor) => total + donor.totalDonated, 0)
})

// Trees planted per month / quarter / year, recalculated when the toggle changes
const treesByPeriod = computed(() => {
  return groupByPeriod(
    completedEvents.value,
    (event) => new Date(event.date),
    (event) => event.treesPlanted,
    granularity.value
  )
})

const cumulativeTrees = computed(() => runningTotal(treesByPeriod.value.values))

// Bars for each period, a line for the running total, and a dashed line for the goal
const chartData = computed(() => {
  const { labels, values } = treesByPeriod.value
  return {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Total trees so far',
        data: cumulativeTrees.value,
        borderColor: '#1b5e20',
        backgroundColor: '#1b5e20',
        tension: 0.2,
        yAxisID: 'total'
      },
      {
        type: 'line',
        label: `${treeGoal.toLocaleString('en-AU')} tree goal`,
        data: labels.map(() => treeGoal),
        borderColor: '#f9a825',
        borderDash: [6, 6],
        pointRadius: 0,
        yAxisID: 'total'
      },
      {
        type: 'bar',
        label: 'Trees planted in period',
        data: values,
        backgroundColor: '#81c784',
        borderRadius: 4,
        yAxisID: 'period'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString('en-AU')}`
      }
    }
  },
  scales: {
    period: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      title: { display: true, text: 'Trees planted in period' }
    },
    total: {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      suggestedMax: treeGoal,
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Total trees' }
    }
  }
}

// Short description read out by screen readers instead of the chart image
const chartDescription = computed(() => {
  return `Chart of trees planted per ${granularity.value}. ${totalTrees.value.toLocaleString('en-AU')} trees planted in total, ${goalPercent.value}% of the ${treeGoal.toLocaleString('en-AU')} tree goal. The data is also available in the table below the chart.`
})

const formatCurrency = (amount) => {
  return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

onMounted(fetchData)
</script>

<template>
  <div class="container mt-5 mb-5">
    <h1 class="text-center mb-2">Our Impact</h1>
    <p class="text-center text-muted mb-4">
      Every tree our volunteers plant, tracked toward our {{ treeGoal.toLocaleString('en-AU') }} tree goal.
    </p>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <p v-else-if="isLoading" class="text-center">Loading impact data...</p>

    <template v-else>
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <p class="h3 text-success mb-0">{{ totalTrees.toLocaleString('en-AU') }}</p>
              <p class="small text-muted mb-0">trees planted ({{ goalPercent }}% of goal)</p>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <p class="h3 text-success mb-0">{{ completedEvents.length }}</p>
              <p class="small text-muted mb-0">planting events completed</p>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <p class="h3 text-success mb-0">{{ upcomingCount }}</p>
              <p class="small text-muted mb-0">upcoming events</p>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <p class="h3 text-success mb-0">{{ formatCurrency(totalDonated) }}</p>
              <p class="small text-muted mb-0">donated by our supporters</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0">Trees planted over time</h2>
            <fieldset>
              <legend class="visually-hidden">Group trees planted by</legend>
              <div class="btn-group btn-group-sm" role="group">
                <template v-for="option in granularities" :key="option.value">
                  <input
                    type="radio"
                    class="btn-check"
                    name="granularity"
                    :id="`granularity-${option.value}`"
                    :value="option.value"
                    v-model="granularity"
                  />
                  <label class="btn btn-outline-success" :for="`granularity-${option.value}`">
                    {{ option.label }}
                  </label>
                </template>
              </div>
            </fieldset>
          </div>

          <p v-if="completedEvents.length === 0" class="text-muted">No trees have been planted yet.</p>
          <Chart
            v-else
            type="bar"
            :data="chartData"
            :options="chartOptions"
            :canvasProps="{ role: 'img', 'aria-label': chartDescription }"
            class="impact-chart"
          />
          <p class="small text-muted mt-2 mb-0">
            Hover over the chart for exact numbers, or click a legend item to show or hide it.
          </p>

          <details class="mt-3">
            <summary>View the chart data as a table</summary>
            <div class="table-responsive mt-2">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Trees planted</th>
                    <th scope="col">Total so far</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(label, index) in treesByPeriod.labels" :key="label">
                    <th scope="row">{{ label }}</th>
                    <td>{{ treesByPeriod.values[index].toLocaleString('en-AU') }}</td>
                    <td>{{ cumulativeTrees[index].toLocaleString('en-AU') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.impact-chart {
  height: 380px;
}
</style>
