<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { FilterMatchMode } from '@primevue/core/api'
import { exportToCsv, exportToPdf, datedFilename, describeFilters } from '@/utils/exportData.js'

const donors = ref([])
const isLoading = ref(true)
const error = ref('')

// One filter per column plus a global one that searches every column
const defaultFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  rank: { value: null, matchMode: FilterMatchMode.EQUALS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  suburb: { value: null, matchMode: FilterMatchMode.CONTAINS },
  totalDonated: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  donationCount: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  lastDonationLabel: { value: null, matchMode: FilterMatchMode.CONTAINS }
})
const filters = ref(defaultFilters())

const clearFilters = () => {
  filters.value = defaultFilters()
}

const dataTable = ref(null)
// Number of rows matching the current filters, updated by the table's value-change event
const matchingCount = ref(0)

const exportColumns = [
  { header: 'Rank', value: (row) => row.rank },
  { header: 'Donor', value: (row) => row.name },
  { header: 'Suburb', value: (row) => row.suburb },
  { header: 'Total donated (AUD)', value: (row) => row.totalDonated },
  { header: 'Donations', value: (row) => row.donationCount },
  { header: 'Last donation', value: (row) => row.lastDonationLabel }
]
const filterLabels = {
  rank: 'Rank',
  name: 'Donor',
  suburb: 'Suburb',
  totalDonated: 'Total donated',
  donationCount: 'Donations',
  lastDonationLabel: 'Last donation'
}

// The table's filtered and sorted rows across every page, not just the 10 on screen
const getExportRows = () => dataTable.value.processedData

const exportCsv = () => {
  exportToCsv(datedFilename('donor-leaderboard', 'csv'), exportColumns, getExportRows())
}

const exportPdf = async () => {
  try {
    await exportToPdf(
      datedFilename('donor-leaderboard', 'pdf'),
      'Tree World - Donor Leaderboard',
      exportColumns,
      getExportRows(),
      describeFilters(filters.value, filterLabels)
    )
  } catch (err) {
    console.error('Error exporting PDF:', err)
    error.value = 'Error creating the PDF. Please try again.'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatCurrency = (amount) => {
  return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

// Empty number inputs give '', so treat that as "no filter"
const toNumberOrNull = (value) => (value === '' || value === null ? null : Number(value))

const fetchDonors = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'donors'))
    const donorsArray = []
    querySnapshot.forEach((donorDoc) => {
      const donor = donorDoc.data()
      donorsArray.push({ id: donorDoc.id, ...donor, lastDonationLabel: formatDate(donor.lastDonation) })
    })
    // Rank donors by total donated (highest = 1), so the rank stays the same however the table is sorted
    donorsArray.sort((a, b) => b.totalDonated - a.totalDonated)
    donorsArray.forEach((donor, index) => {
      donor.rank = index + 1
    })
    donors.value = donorsArray
  } catch (err) {
    console.error('Error fetching donors:', err)
    error.value = 'Error loading the leaderboard.'
  }
  isLoading.value = false
}

onMounted(fetchDonors)
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center mb-2">Donor Leaderboard</h1>
    <p class="text-center text-muted mb-4">
      Thank you to the supporters who make our planting days possible.
    </p>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <DataTable
      ref="dataTable"
      v-model:filters="filters"
      @value-change="(rows) => (matchingCount = rows.length)"
      :value="donors"
      dataKey="id"
      :loading="isLoading"
      paginator
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} donors"
      filterDisplay="row"
      :globalFilterFields="['name', 'suburb', 'totalDonated', 'donationCount', 'lastDonationLabel']"
      sortField="rank"
      :sortOrder="1"
      removableSort
      stripedRows
      tableStyle="min-width: 50rem"
    >
      <template #header>
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <input
            v-model="filters.global.value"
            type="search"
            class="form-control table-search"
            placeholder="Search all columns"
            aria-label="Search all columns"
          />
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span v-if="!isLoading && matchingCount === 0" class="small text-muted">No rows to export</span>
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="clearFilters">
              Clear filters
            </button>
            <button
              type="button"
              class="btn btn-outline-success btn-sm"
              :disabled="matchingCount === 0"
              @click="exportCsv"
            >
              Export CSV
            </button>
            <button
              type="button"
              class="btn btn-outline-success btn-sm"
              :disabled="matchingCount === 0"
              @click="exportPdf"
            >
              Export PDF
            </button>
          </div>
        </div>
      </template>
      <template #empty>No donors match your search.</template>
      <template #loading>Loading leaderboard...</template>

      <Column field="rank" header="Rank" sortable :showFilterMenu="false" style="min-width: 6rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            :value="filterModel.value"
            type="number"
            min="1"
            class="form-control form-control-sm"
            placeholder="#"
            aria-label="Search by rank"
            @input="filterModel.value = toNumberOrNull($event.target.value); filterCallback()"
          />
        </template>
      </Column>

      <Column field="name" header="Donor" sortable :showFilterMenu="false" style="min-width: 10rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            v-model="filterModel.value"
            type="text"
            class="form-control form-control-sm"
            placeholder="Search donor"
            aria-label="Search by donor name"
            @input="filterCallback()"
          />
        </template>
      </Column>

      <Column field="suburb" header="Suburb" sortable :showFilterMenu="false" style="min-width: 10rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            v-model="filterModel.value"
            type="text"
            class="form-control form-control-sm"
            placeholder="Search suburb"
            aria-label="Search by suburb"
            @input="filterCallback()"
          />
        </template>
      </Column>

      <Column field="totalDonated" header="Total donated" sortable :showFilterMenu="false" style="min-width: 9rem">
        <template #body="{ data }">{{ formatCurrency(data.totalDonated) }}</template>
        <template #filter="{ filterModel, filterCallback }">
          <input
            :value="filterModel.value"
            type="number"
            min="0"
            class="form-control form-control-sm"
            placeholder="Min $"
            aria-label="Minimum total donated"
            @input="filterModel.value = toNumberOrNull($event.target.value); filterCallback()"
          />
        </template>
      </Column>

      <Column field="donationCount" header="Donations" sortable :showFilterMenu="false" style="min-width: 8rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            :value="filterModel.value"
            type="number"
            min="0"
            class="form-control form-control-sm"
            placeholder="Min"
            aria-label="Minimum number of donations"
            @input="filterModel.value = toNumberOrNull($event.target.value); filterCallback()"
          />
        </template>
      </Column>

      <Column
        field="lastDonationLabel"
        sortField="lastDonation"
        header="Last donation"
        sortable
        :showFilterMenu="false"
        style="min-width: 9rem"
      >
        <template #filter="{ filterModel, filterCallback }">
          <input
            v-model="filterModel.value"
            type="text"
            class="form-control form-control-sm"
            placeholder="e.g. Mar 2026"
            aria-label="Search by last donation date"
            @input="filterCallback()"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.table-search {
  max-width: 20rem;
}
</style>
