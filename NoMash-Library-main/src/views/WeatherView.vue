<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2 text-center">
        <h1>WEATHER APP</h1>
        <div class="input-group mb-3 search-bar">
          <input
            type="text"
            class="form-control"
            v-model="city"
            placeholder="Enter city name, e.g. Clayton, AU"
            @keyup.enter="searchByCity"
          />
          <button class="btn btn-secondary" @click="searchByCity">Search</button>
        </div>

        <p v-if="error" class="text-danger">{{ error }}</p>

        <!--The <main> tag in HTML is used to specify the main content of a document-->
        <main>
          <!--If there are no data returned, then skip rendering the information-->
          <div v-if="weatherData">
            <!--Display the weather data attribute returned from API
            Example of API data: https://openweathermap.org/current-->
            <h2>{{ weatherData.name }}, {{ weatherData.sys.country }}</h2>
            <div>
              <!--The weather icon comes from the iconUrl computed property-->
              <img :src="iconUrl" alt="Weather Icon" />
              <p class="temperature">{{ temperature }} °C</p>
            </div>
            <!--weather[0] is the current weather condition-->
            <span class="text-capitalize">{{ weatherData.weather[0].description }}</span>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// Follow 10.1.2 to obtain your API key, then put it in the .env file
const apikey = import.meta.env.VITE_OPENWEATHER_API_KEY

// Reactive state
const city = ref('')
const weatherData = ref(null)
const error = ref('')

// Computed properties
// units=metric is requested, so the API already returns Celsius
const temperature = computed(() => {
  return weatherData.value ? Math.round(weatherData.value.main.temp) : null
})

const iconUrl = computed(() => {
  return weatherData.value
    ? `https://openweathermap.org/img/wn/${weatherData.value.weather[0].icon}@2x.png`
    : null
})

// Methods
const fetchWeatherData = async (url) => {
  try {
    const response = await axios.get(url)
    weatherData.value = response.data
    error.value = ''
  } catch (err) {
    console.error('Error fetching weather data:', err)
    if (err.response && err.response.status === 404) {
      error.value = 'City not found. Try the format "Clayton, AU".'
    } else if (err.response && err.response.status === 401) {
      error.value = 'Invalid API key. Check VITE_OPENWEATHER_API_KEY in .env.'
    } else {
      error.value = 'Error fetching weather data.'
    }
  }
}

const fetchCurrentLocationWeather = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apikey}`
        await fetchWeatherData(url)
      },
      () => {
        error.value = 'Location access was blocked. Allow location, or search by city.'
      }
    )
  } else {
    error.value = 'Geolocation is not supported by this browser.'
  }
}

const searchByCity = async () => {
  const query = city.value.trim()
  if (!query) return
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&appid=${apikey}`
  await fetchWeatherData(url)
}

// Lifecycle hook
onMounted(() => {
  fetchCurrentLocationWeather()
})
</script>

<style scoped>
.search-bar {
  max-width: 400px;
  margin: 0 auto;
}
.temperature {
  font-size: 1.5rem;
}
</style>
