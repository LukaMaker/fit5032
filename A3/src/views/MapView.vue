<script setup>
import NavBar from '../components/NavBar.vue'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/init.js'
import axios from 'axios'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { distanceKm, formatDistance, formatDuration } from '@/utils/mapHelpers.js'

// The public Mapbox token is read from A3/.env
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
const maxStops = 5
const travelModes = [
  { value: 'driving', label: 'Driving' },
  { value: 'walking', label: 'Walking' },
  { value: 'cycling', label: 'Cycling' }
]

const mapContainer = ref(null)
let map = null
let mapLoaded = false
let searchMarker = null
let pendingRouteGeometry = null
const markers = {}

const sites = ref([])
const isLoading = ref(true)
const error = ref('')

// search for a place and list the nearest sites
const searchQuery = ref('')
const searchResults = ref([])
const searchedPlace = ref(null)
const searchMessage = ref('')
const isSearching = ref(false)

// multi-stop route builder
const routeStops = ref([])
const travelMode = ref('driving')
const route = ref(null)
const routeError = ref('')
const isRouting = ref(false)
let latestRouteRequest = 0

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Sites sorted by distance from the searched place, or alphabetically before a search
const sortedSites = computed(() => {
  const place = searchedPlace.value
  if (!place) {
    return [...sites.value].sort((a, b) => a.title.localeCompare(b.title))
  }
  return sites.value
    .map((site) => ({ ...site, distanceKm: distanceKm(place.lat, place.lng, site.lat, site.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
})

const isInRoute = (site) => routeStops.value.some((stop) => stop.id === site.id)

const fetchSites = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'events'))
    const sitesArray = []
    querySnapshot.forEach((eventDoc) => {
      const event = eventDoc.data()
      // Only events that have coordinates can go on the map
      if (typeof event.lat === 'number' && typeof event.lng === 'number') {
        sitesArray.push({ id: eventDoc.id, ...event })
      }
    })
    sites.value = sitesArray
  } catch (err) {
    console.error('Error fetching event sites:', err)
    error.value = 'Error loading event sites.'
  }
  isLoading.value = false
}

// Popup contents are built with textContent rather than HTML strings, so event text can't inject HTML
const buildPopup = (site) => {
  const content = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = site.title
  const details = document.createElement('div')
  details.className = 'small text-muted mb-2'
  details.textContent = `${site.suburb} · ${formatDate(site.date)}`
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn btn-success btn-sm'
  button.textContent = 'Add to route'
  button.addEventListener('click', () => addStop(site))
  content.append(title, details, button)
  return new mapboxgl.Popup({ offset: 25 }).setDOMContent(content)
}

const addSiteMarkers = () => {
  sites.value.forEach((site) => {
    const marker = new mapboxgl.Marker({ color: '#2e7d32' })
      .setLngLat([site.lng, site.lat])
      .setPopup(buildPopup(site))
      .addTo(map)
    marker.getElement().setAttribute('aria-label', `${site.title}, ${site.suburb}`)
    markers[site.id] = marker
  })
}

const initMap = () => {
  mapboxgl.accessToken = mapboxToken
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [144.96, -37.81],
    zoom: 9
  })
  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  // The route line is a GeoJSON source + line layer that is updated whenever the route changes
  map.on('load', () => {
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#2e7d32', 'line-width': 5, 'line-opacity': 0.8 }
    })
    mapLoaded = true
    if (pendingRouteGeometry) drawRoute(pendingRouteGeometry)
  })
}

const showSiteOnMap = (site) => {
  map.flyTo({ center: [site.lng, site.lat], zoom: 13 })
  const marker = markers[site.id]
  if (marker && !marker.getPopup().isOpen()) marker.togglePopup()
}

// search

const searchPlaces = async () => {
  const query = searchQuery.value.trim()
  searchResults.value = []
  searchMessage.value = ''
  if (query.length < 2) {
    searchMessage.value = 'Type at least 2 characters to search.'
    return
  }

  isSearching.value = true
  try {
    // Mapbox Geocoding, limited to Australia and roughly the area of Victoria
    const response = await axios.get('https://api.mapbox.com/search/geocode/v6/forward', {
      params: {
        q: query,
        country: 'au',
        bbox: '140.9,-39.2,150.0,-33.9',
        limit: 5,
        access_token: mapboxToken
      }
    })
    const results = response.data.features.map((feature) => ({
      id: feature.id,
      name: feature.properties.full_address || feature.properties.name,
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1]
    }))
    if (results.length === 0) {
      searchMessage.value = `No places found in Victoria for "${query}".`
    } else if (results.length === 1) {
      selectPlace(results[0])
    } else {
      searchResults.value = results
    }
  } catch (err) {
    console.error('Error searching places:', err)
    searchMessage.value = 'Search is unavailable right now. Please try again.'
  }
  isSearching.value = false
}

const selectPlace = (place) => {
  searchedPlace.value = place
  searchResults.value = []
  if (searchMarker) searchMarker.remove()
  searchMarker = new mapboxgl.Marker({ color: '#1565c0' }).setLngLat([place.lng, place.lat]).addTo(map)
  searchMarker.getElement().setAttribute('aria-label', `Searched place: ${place.name}`)
  map.flyTo({ center: [place.lng, place.lat], zoom: 11 })
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  searchMessage.value = ''
  searchedPlace.value = null
  if (searchMarker) searchMarker.remove()
  searchMarker = null
}

// route builder

const addStop = (site) => {
  routeError.value = ''
  if (isInRoute(site)) {
    routeError.value = `${site.title} is already in your route.`
  } else if (routeStops.value.length >= maxStops) {
    routeError.value = `A route can have up to ${maxStops} stops.`
  } else {
    routeStops.value.push(site)
  }
}

const removeStop = (index) => {
  routeStops.value.splice(index, 1)
}

// Swaps a stop with the one above (-1) or below (+1) it
const moveStop = (index, direction) => {
  const stops = routeStops.value
  const target = index + direction
  ;[stops[index], stops[target]] = [stops[target], stops[index]]
}

const clearRoute = () => {
  routeStops.value = []
  routeError.value = ''
}

const drawRoute = (geometry) => {
  if (!map || !mapLoaded) {
    pendingRouteGeometry = geometry
    return
  }
  const data = geometry
    ? { type: 'Feature', properties: {}, geometry }
    : { type: 'FeatureCollection', features: [] }
  map.getSource('route').setData(data)

  if (geometry) {
    const bounds = new mapboxgl.LngLatBounds()
    geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate))
    map.fitBounds(bounds, { padding: 60 })
  }
}

// Asks Mapbox Directions for a route through every stop, in order
const fetchRoute = async () => {
  routeError.value = ''
  const stops = [...routeStops.value]
  if (stops.length < 2) {
    route.value = null
    drawRoute(null)
    return
  }

  // Only the newest request is used, in case the stops change again before a reply arrives
  const requestId = ++latestRouteRequest
  isRouting.value = true
  const coordinates = stops.map((stop) => `${stop.lng},${stop.lat}`).join(';')
  try {
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/${travelMode.value}/${coordinates}`,
      { params: { geometries: 'geojson', overview: 'full', access_token: mapboxToken } }
    )
    if (requestId !== latestRouteRequest) return
    const bestRoute = response.data.routes[0]
    route.value = {
      distance: bestRoute.distance,
      duration: bestRoute.duration,
      legs: bestRoute.legs.map((leg, index) => ({
        from: stops[index].title,
        to: stops[index + 1].title,
        distance: leg.distance,
        duration: leg.duration
      }))
    }
    drawRoute(bestRoute.geometry)
  } catch (err) {
    if (requestId !== latestRouteRequest) return
    console.error('Error getting directions:', err)
    route.value = null
    drawRoute(null)
    routeError.value =
      err.response?.data?.code === 'NoRoute'
        ? `No ${travelMode.value} route could be found between these stops.`
        : 'Directions are unavailable right now. Please try again.'
  }
  if (requestId === latestRouteRequest) isRouting.value = false
}

// Recalculate the route whenever a stop is added, removed or reordered, or the travel mode changes
watch([routeStops, travelMode], fetchRoute, { deep: true })

onMounted(async () => {
  await fetchSites()
  if (!mapboxToken) {
    error.value = 'The map is unavailable because no Mapbox token is set (VITE_MAPBOX_TOKEN).'
    return
  }
  initMap()
  addSiteMarkers()
})

onUnmounted(() => {
  if (map) map.remove()
})
</script>

<template>
  <NavBar></NavBar>
  <div class="container mt-4 mb-5">
    <h1 class="text-center mb-2">Explore Map</h1>
    <p class="text-center text-muted mb-4">
      Find planting sites near you and plan a trip between them.
    </p>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <div class="row g-3">
      <div class="col-lg-8 order-lg-2">
        <div ref="mapContainer" class="map" role="region" aria-label="Map of event sites"></div>
      </div>

      <div class="col-lg-4 order-lg-1 sidebar">
        <!-- Feature 1: search -->
        <section class="card mb-3" aria-labelledby="search-heading">
          <div class="card-body">
            <h2 id="search-heading" class="h6">Search for a place</h2>
            <form class="input-group" @submit.prevent="searchPlaces" role="search">
              <label for="place-search" class="visually-hidden">Suburb or address</label>
              <input
                type="search"
                class="form-control"
                id="place-search"
                maxlength="100"
                placeholder="Suburb or address, e.g. Clayton"
                v-model="searchQuery"
                :disabled="!mapboxToken"
              />
              <button type="submit" class="btn btn-success" :disabled="isSearching || !mapboxToken">
                {{ isSearching ? 'Searching...' : 'Search' }}
              </button>
            </form>
            <p v-if="searchMessage" class="small text-muted mt-2 mb-0" role="status">{{ searchMessage }}</p>

            <div v-if="searchResults.length" class="mt-2">
              <p class="small mb-1">Did you mean:</p>
              <div class="list-group">
                <button
                  v-for="place in searchResults"
                  :key="place.id"
                  type="button"
                  class="list-group-item list-group-item-action small"
                  @click="selectPlace(place)"
                >
                  {{ place.name }}
                </button>
              </div>
            </div>

            <div v-if="searchedPlace" class="d-flex justify-content-between align-items-center mt-2">
              <span class="small">Showing sites nearest <strong>{{ searchedPlace.name }}</strong></span>
              <button type="button" class="btn btn-link btn-sm" @click="clearSearch">Clear</button>
            </div>
          </div>
        </section>

        <!-- Feature 2: route builder -->
        <section class="card mb-3" aria-labelledby="route-heading">
          <div class="card-body">
            <h2 id="route-heading" class="h6">Your route ({{ routeStops.length }}/{{ maxStops }} stops)</h2>
            <p v-if="routeStops.length === 0" class="small text-muted mb-2">
              Add 2 to {{ maxStops }} sites from the list or the map to plan a trip.
            </p>

            <ol v-else class="list-group list-group-numbered mb-2">
              <li
                v-for="(stop, index) in routeStops"
                :key="stop.id"
                class="list-group-item d-flex justify-content-between align-items-center small"
              >
                <span class="ms-2 me-2 flex-grow-1">{{ stop.title }}</span>
                <span class="btn-group btn-group-sm">
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="index === 0"
                    :aria-label="`Move ${stop.title} up`"
                    @click="moveStop(index, -1)"
                  >↑</button>
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="index === routeStops.length - 1"
                    :aria-label="`Move ${stop.title} down`"
                    @click="moveStop(index, 1)"
                  >↓</button>
                  <button
                    type="button"
                    class="btn btn-outline-danger"
                    :aria-label="`Remove ${stop.title} from route`"
                    @click="removeStop(index)"
                  >✕</button>
                </span>
              </li>
            </ol>

            <fieldset class="mb-2">
              <legend class="small mb-1">Travel by</legend>
              <div class="btn-group btn-group-sm" role="group">
                <template v-for="mode in travelModes" :key="mode.value">
                  <input
                    type="radio"
                    class="btn-check"
                    name="travel-mode"
                    :id="`mode-${mode.value}`"
                    :value="mode.value"
                    v-model="travelMode"
                  />
                  <label class="btn btn-outline-success" :for="`mode-${mode.value}`">{{ mode.label }}</label>
                </template>
              </div>
            </fieldset>

            <p v-if="routeError" class="text-danger small mb-2" role="alert">{{ routeError }}</p>
            <p v-if="isRouting" class="small text-muted mb-2" role="status">Working out your route...</p>

            <div v-if="route && !isRouting" class="route-summary" role="status">
              <p class="mb-1">
                <strong>{{ formatDistance(route.distance) }}</strong> ·
                <strong>{{ formatDuration(route.duration) }}</strong> total
              </p>
              <ul class="small list-unstyled mb-2">
                <li v-for="(leg, index) in route.legs" :key="index">
                  {{ leg.from }} → {{ leg.to }}: {{ formatDistance(leg.distance) }},
                  {{ formatDuration(leg.duration) }}
                </li>
              </ul>
            </div>

            <button
              v-if="routeStops.length"
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="clearRoute"
            >
              Clear route
            </button>
          </div>
        </section>

        <!-- Site list: does everything the map does, so the page works without the map -->
        <section class="card" aria-labelledby="sites-heading">
          <div class="card-body">
            <h2 id="sites-heading" class="h6">
              {{ searchedPlace ? 'Nearest event sites' : 'Event sites' }}
            </h2>
            <p v-if="isLoading" class="small">Loading sites...</p>
            <p v-else-if="sites.length === 0" class="small text-muted">No event sites have a map location yet.</p>
            <ul class="list-unstyled mb-0">
              <li v-for="site in sortedSites" :key="site.id" class="site-item py-2">
                <div class="d-flex justify-content-between">
                  <strong class="small">{{ site.title }}</strong>
                  <span v-if="site.distanceKm !== undefined" class="small text-muted text-nowrap ms-2">
                    {{ site.distanceKm.toFixed(1) }} km
                  </span>
                </div>
                <div class="small text-muted">{{ site.suburb }} · {{ formatDate(site.date) }}</div>
                <div class="mt-1">
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm me-1"
                    :disabled="!mapboxToken"
                    @click="showSiteOnMap(site)"
                  >
                    Show on map
                  </button>
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    :disabled="isInRoute(site) || routeStops.length >= maxStops || !mapboxToken"
                    @click="addStop(site)"
                  >
                    {{ isInRoute(site) ? 'In route' : 'Add to route' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 50vh;
  min-height: 320px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

@media (min-width: 992px) {
  .map {
    height: 75vh;
  }

  .sidebar {
    max-height: 75vh;
    overflow-y: auto;
  }
}

.site-item + .site-item {
  border-top: 1px solid #eee;
}
</style>
