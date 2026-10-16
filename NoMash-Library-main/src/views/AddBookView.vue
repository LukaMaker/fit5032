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

        <BookList :key="refreshKey" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import db from '../firebase/init.js'
import { collection, addDoc } from 'firebase/firestore'
import BookList from '../components/BookList.vue'

const isbn = ref('')
const name = ref('')
const message = ref('')
const refreshKey = ref(0)

const addBook = async () => {
  try {
    const isbnNumber = Number(isbn.value)
    if (isNaN(isbnNumber)) {
      message.value = 'ISBN must be a valid number'
      return
    }
    await addDoc(collection(db, 'books'), {
      isbn: isbnNumber,
      name: name.value
    })
    message.value = 'Book added successfully!'
    isbn.value = ''
    name.value = ''
    refreshKey.value++ // reload the book list below
  } catch (error) {
    console.error('Error adding book: ', error)
    message.value = 'Error adding book'
  }
}
</script>
