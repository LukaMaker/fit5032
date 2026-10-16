<template>
  <div class="container mt-5">
    <div class="row">
      <div class="col-md-8 offset-md-2">
        <h1 class="text-center">Add Book</h1>
        <form @submit.prevent="addBook">
          <div class="mb-3">
            <label for="isbn" class="form-label">ISBN</label>
            <input type="number" class="form-control" id="isbn" v-model="isbn" required />
          </div>
          <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input type="text" class="form-control" id="name" v-model="name" required />
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary">Add Book</button>
          </div>
        </form>
        <p v-if="message" class="text-center mt-3">{{ message }}</p>

        <!-- Shows the Cloud Function's result: what was typed vs what Firestore now holds -->
        <div v-if="submitted" class="card mt-4">
          <div class="card-header">Cloud Function result</div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item">
              <strong>You entered:</strong> {{ submitted.name }} (ISBN: {{ submitted.isbn }})
            </li>
            <li class="list-group-item">
              <strong>Stored in Firestore:</strong>
              <span v-if="stored">{{ stored.name }} (ISBN: {{ stored.isbn }})</span>
              <span v-if="!capitalised" class="text-muted"> waiting for capitalizeBook...</span>
              <span v-else class="text-success"> capitalised by capitalizeBook</span>
            </li>
          </ul>
        </div>

        <BookList :key="refreshKey" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import db from '../firebase/init.js'
import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import BookList from '../components/BookList.vue'

const isbn = ref('')
const name = ref('')
const message = ref('')
const refreshKey = ref(0)

const submitted = ref(null) // what the user typed
const stored = ref(null) // the live Firestore document
const capitalised = ref(false)
let stopListening = null

const addBook = async () => {
  try {
    const isbnNumber = Number(isbn.value)
    if (isNaN(isbnNumber)) {
      message.value = 'ISBN must be a valid number'
      return
    }
    const newBook = { isbn: isbnNumber, name: name.value }
    const docRef = await addDoc(collection(db, 'books'), newBook)
    message.value = 'Book added successfully!'
    submitted.value = newBook
    stored.value = null
    capitalised.value = false
    isbn.value = ''
    name.value = ''
    refreshKey.value++

    // Watch the new document so the page updates when the Cloud Function changes it
    if (stopListening) stopListening()
    stopListening = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return
      stored.value = snap.data()
      if (stored.value.name === stored.value.name.toUpperCase()) {
        capitalised.value = true
        refreshKey.value++ // reload the list with the capitalised name
        stopListening()
        stopListening = null
      }
    })
  } catch (error) {
    console.error('Error adding book: ', error)
    message.value = 'Error adding book'
  }
}

onUnmounted(() => {
  if (stopListening) stopListening()
})
</script>
