<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/init.js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const askAssistant = httpsCallable(functions, 'askAssistant')

const maxLength = 500
const suggestions = [
  'Which upcoming events are family friendly?',
  'How do I book a site visit?',
  'What should I bring to a planting day?'
]

const isOpen = ref(false)
const messages = ref([])
const question = ref('')
const isThinking = ref(false)
const error = ref('')
const remaining = ref(null)

const toggleButton = ref(null)
const questionInput = ref(null)
const messageList = ref(null)

const openChat = async () => {
  isOpen.value = true
  await nextTick()
  questionInput.value?.focus()
}

// Closing returns keyboard focus to the chat button, so keyboard users don't lose their place
const closeChat = async () => {
  isOpen.value = false
  await nextTick()
  toggleButton.value?.focus()
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

const sendQuestion = async (text) => {
  const trimmed = text.trim()
  error.value = ''
  if (!trimmed || isThinking.value) return
  if (trimmed.length > maxLength) {
    error.value = `Questions must be ${maxLength} characters or less.`
    return
  }

  // The last 6 messages are sent with the question so follow-up questions make sense
  const history = messages.value.slice(-6).map(({ role, text }) => ({ role, text }))
  messages.value.push({ role: 'user', text: trimmed })
  question.value = ''
  isThinking.value = true
  scrollToBottom()

  try {
    const result = await askAssistant({ question: trimmed, history })
    messages.value.push({ role: 'assistant', text: result.data.answer })
    remaining.value = result.data.remaining
  } catch (err) {
    console.error('Assistant error:', err)
    // Callable functions pass the HttpsError message through, e.g. the daily limit message
    error.value = err.message || 'The assistant is unavailable right now.'
  }
  isThinking.value = false
  scrollToBottom()
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && isOpen.value) closeChat()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="assistant">
    <button
      v-if="!isOpen"
      ref="toggleButton"
      type="button"
      class="btn btn-success assistant-toggle shadow"
      aria-controls="assistant-panel"
      :aria-expanded="isOpen"
      @click="openChat"
    >
      Ask Tree World
    </button>

    <section
      v-else
      id="assistant-panel"
      class="assistant-panel card shadow"
      role="dialog"
      aria-labelledby="assistant-heading"
    >
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2 id="assistant-heading" class="h6 mb-0">Ask Tree World</h2>
        <button type="button" class="btn-close btn-close-white" aria-label="Close chat" @click="closeChat"></button>
      </div>

      <div v-if="!authStore.isLoggedIn" class="card-body">
        <p class="mb-2">Our assistant can answer questions about events, volunteering, donating and gardening.</p>
        <router-link
          :to="{ name: 'Login', query: { redirect: route.fullPath } }"
          class="btn btn-success btn-sm"
          @click="isOpen = false"
        >
          Log in to ask a question
        </router-link>
      </div>

      <template v-else>
        <!-- aria-live reads new answers out to screen reader users -->
        <div ref="messageList" class="card-body assistant-messages" aria-live="polite">
          <p class="small text-muted">
            Hi {{ authStore.user.firstName }}! Ask me about events, volunteering, donating or gardening.
            Answers are AI-generated, so please double-check anything important.
          </p>

          <div v-if="messages.length === 0" class="d-flex flex-column gap-2 mb-2">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              class="btn btn-outline-success btn-sm text-start"
              @click="sendQuestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <div
            v-for="(message, index) in messages"
            :key="index"
            class="assistant-message"
            :class="message.role === 'user' ? 'from-user' : 'from-assistant'"
          >
            <span class="visually-hidden">{{ message.role === 'user' ? 'You said:' : 'Assistant said:' }}</span>
            {{ message.text }}
          </div>

          <p v-if="isThinking" class="small text-muted mb-0">
            <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            Thinking...
          </p>
          <p v-if="error" class="small text-danger mb-0" role="alert">{{ error }}</p>
        </div>

        <form class="card-footer" @submit.prevent="sendQuestion(question)" novalidate>
          <label for="assistant-question" class="visually-hidden">Your question</label>
          <div class="input-group">
            <input
              ref="questionInput"
              id="assistant-question"
              type="text"
              class="form-control"
              placeholder="Type your question"
              autocomplete="off"
              :maxlength="maxLength"
              v-model="question"
              :disabled="isThinking"
            />
            <button type="submit" class="btn btn-success" :disabled="isThinking || !question.trim()">
              Send
            </button>
          </div>
          <div class="d-flex justify-content-between small text-muted mt-1">
            <span>{{ question.length }}/{{ maxLength }}</span>
            <span v-if="remaining !== null">{{ remaining }} questions left today</span>
          </div>
        </form>
      </template>
    </section>
  </div>
</template>

<style scoped>
.assistant-toggle {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1050;
  border-radius: 2rem;
  padding: 0.6rem 1.2rem;
}

.assistant-panel {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1050;
  width: min(380px, calc(100vw - 2rem));
  max-height: min(560px, calc(100vh - 2rem));
  display: flex;
  flex-direction: column;
}

.assistant-panel .card-header {
  background-color: #2e7d32;
  color: #fff;
}

.assistant-messages {
  overflow-y: auto;
  flex: 1 1 auto;
}

.assistant-message {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  margin-bottom: 0.5rem;
  max-width: 85%;
  white-space: pre-wrap;
  font-size: 0.9rem;
}

.from-user {
  background-color: #2e7d32;
  color: #fff;
  margin-left: auto;
}

.from-assistant {
  background-color: #f1f3f1;
  color: #212529;
}
</style>
