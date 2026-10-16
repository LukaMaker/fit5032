<template>
  <div class="mt-5">
    <h2 class="text-center">Books with ISBN &gt; 1000</h2>
    <ul>
      <li v-for="book in books" :key="book.id">{{ book.name }} (ISBN: {{ book.isbn }})</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import db from '../firebase/init.js'
import { collection, query, where, getDocs } from 'firebase/firestore'

const books = ref([])

const fetchBooks = async () => {
  try {
    const q = query(collection(db, 'books'), where('isbn', '>', 1000))
    const querySnapshot = await getDocs(q)
    const booksArray = []
    querySnapshot.forEach((doc) => {
      booksArray.push({ id: doc.id, ...doc.data() })
    })
    books.value = booksArray
  } catch (error) {
    console.error('Error fetching books: ', error)
  }
}

onMounted(fetchBooks)
</script>
