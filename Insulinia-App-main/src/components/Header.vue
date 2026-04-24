<template>
  <header class="header">
    <div class="logo">Insulin.IA</div>
    <nav>
      <router-link to="/">Inicio</router-link>
      <router-link to="/comofunciona">Cómo Funciona</router-link>
      <router-link to="/beneficios">Beneficios</router-link>
      <router-link to="/contacto">Contacto</router-link>

      <template v-if="isLoggedIn">
        <span class="session-status">
          <span class="session-dot"></span>
          Sesión iniciada{{ userName ? `: ${userName}` : '' }}
        </span>
        <router-link to="/perfil" class="btn-account">
          <i class="fas fa-user-circle"></i> Mi Perfil
        </router-link>
      </template>
      <router-link v-else to="/login" class="btn-account">
        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
      </router-link>
    </nav>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const token = ref('')
const userName = ref('')

const readSession = () => {
  token.value = localStorage.getItem('token') || ''

  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      userName.value = ''
      return
    }

    const parsedUser = JSON.parse(storedUser)
    userName.value = parsedUser?.nombre || ''
  } catch {
    userName.value = ''
  }
}

const isLoggedIn = computed(() => Boolean(token.value))

onMounted(() => {
  readSession()
  window.addEventListener('storage', readSession)
})

onUnmounted(() => {
  window.removeEventListener('storage', readSession)
})

watch(
  () => route.fullPath,
  () => {
    readSession()
  },
)
</script>
