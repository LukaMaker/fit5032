<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { FilterMatchMode } from '@primevue/core/api'
import { exportToCsv, exportToPdf, datedFilename, describeFilters } from '@/utils/exportData.js'

const resources = ref([])
const isLoading = ref(true)
const error = ref('')

const categories = ['Biodiversity', 'Climate action', 'Tree planting', 'Urban greening', 'Water & soil']
const types = ['Fact sheet', 'Guide', 'Video']

// One filter per column plus a global one that searches every column
const defaultFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  title: { value: null, matchMode: FilterMatchMode.CONTAINS },
  category: { value: null, matchMode: FilterMatchMode.EQUALS },
  type: { value: null, matchMode: FilterMatchMode.EQUALS },
  audience: { value: null, matchMode: FilterMatchMode.CONTAINS },
  publishedLabel: { value: null, matchMode: FilterMatchMode.CONTAINS }
})
const filters = ref(defaultFilters())

const clearFilters = () => {
  filters.value = defaultFilters()
}

const dataTable = ref(null)
// Number of rows matching the current filters, updated by the table's value-change event
const matchingCount = ref(0)

const exportColumns = [
  { header: 'Title', value: (row) => row.title },
  { header: 'Category', value: (row) => row.category },
  { header: 'Type', value: (row) => row.type },
  { header: 'Audience', value: (row) => row.audience },
  { header: 'Published', value: (row) => row.publishedLabel }
]
const filterLabels = {
  title: 'Title',
  category: 'Category',
  type: 'Type',
  audience: 'Audience',
  publishedLabel: 'Published'
}

// The table's filtered and sorted rows across every page, not just the 10 on screen
const getExportRows = () => dataTable.value.processedData

const exportCsv = () => {
  exportToCsv(datedFilename('resources', 'csv'), exportColumns, getExportRows())
}

const exportPdf = async () => {
  try {
    await exportToPdf(
      datedFilename('resources', 'pdf'),
      'Tree World - Resource Library',
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

const fetchResources = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'resources'))
    const resourcesArray = []
    querySnapshot.forEach((resourceDoc) => {
      const resource = resourceDoc.data()
      // publishedLabel is the readable date that is shown and searched, published is used for sorting
      resourcesArray.push({ id: resourceDoc.id, ...resource, publishedLabel: formatDate(resource.published) })
    })
    resources.value = resourcesArray
  } catch (err) {
    console.error('Error fetching resources:', err)
    error.value = 'Error loading resources.'
  }
  isLoading.value = false
}

onMounted(fetchResources)
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center mb-2">Resource Library</h1>
    <p class="text-center text-muted mb-4">
      Guides, videos and fact sheets on tree planting, gardening and climate action.
    </p>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <DataTable
      ref="dataTable"
      v-model:filters="filters"
      @value-change="(rows) => (matchingCount = rows.length)"
      :value="resources"
      dataKey="id"
      :loading="isLoading"
      paginator
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} resources"
      filterDisplay="row"
      :globalFilterFields="['title', 'category', 'type', 'audience', 'publishedLabel']"
      sortField="published"
      :sortOrder="-1"
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
      <template #empty>No resources match your search.</template>
      <template #loading>Loading resources...</template>

      <Column field="title" header="Title" sortable :showFilterMenu="false" style="min-width: 16rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            v-model="filterModel.value"
            type="text"
            class="form-control form-control-sm"
            placeholder="Search title"
            aria-label="Search by title"
            @input="filterCallback()"
          />
        </template>
      </Column>

      <Column field="category" header="Category" sortable :showFilterMenu="false" style="min-width: 11rem">
        <template #filter="{ filterModel, filterCallback }">
          <select
            v-model="filterModel.value"
            class="form-select form-select-sm"
            aria-label="Filter by category"
            @change="filterCallback()"
          >
            <option :value="null">All</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </template>
      </Column>

      <Column field="type" header="Type" sortable :showFilterMenu="false" style="min-width: 9rem">
        <template #filter="{ filterModel, filterCallback }">
          <select
            v-model="filterModel.value"
            class="form-select form-select-sm"
            aria-label="Filter by type"
            @change="filterCallback()"
          >
            <option :value="null">All</option>
            <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
          </select>
        </template>
      </Column>

      <Column field="audience" header="Audience" sortable :showFilterMenu="false" style="min-width: 9rem">
        <template #filter="{ filterModel, filterCallback }">
          <input
            v-model="filterModel.value"
            type="text"
            class="form-control form-control-sm"
            placeholder="Search audience"
            aria-label="Search by audience"
            @input="filterCallback()"
          />
        </template>
      </Column>

      <Column
        field="publishedLabel"
        sortField="published"
        header="Published"
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
            aria-label="Search by published date"
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
