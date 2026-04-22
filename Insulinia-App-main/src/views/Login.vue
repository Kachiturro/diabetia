<template>
  <div class="login-bg">
    <div class="login-topbar">
      <router-link to="/" class="back-home">← Volver al inicio</router-link>
    </div>

    <div class="login-card">
      <div class="login-logo">
        <img src="/imagenes/logo.png" alt="Insulin.IA Logo" />
      </div>

      <div class="logo-watermark"></div>

      <h2>Inicia sesión</h2>
      <p>Accede a tu cuenta en <strong>Insulin.IA</strong></p>

      <div v-if="errorMsg" style="color: red; margin-bottom: 15px; font-size: 14px">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="iniciarSesion">
        <div class="input-group">
          <input type="email" v-model="form.correo" placeholder="Correo electrónico" required />
        </div>

        <div class="input-group">
          <input type="password" v-model="form.contrasena" placeholder="Contraseña" required />
        </div>

        <div class="options">
          <label><input type="checkbox" /> Recuérdame</label>
          <a href="#">¿Olvidaste tu contraseña?</a>
        </div>

        <button type="submit" class="btn-submit" :disabled="cargando">
          {{ cargando ? 'Iniciando...' : 'Iniciar Sesión' }}
        </button>

        <p class="register">
          ¿No tienes cuenta? <router-link to="/registro">Regístrate</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../lib/api'

const router = useRouter()

// Variables reactivas
const form = ref({
  correo: '',
  contrasena: '',
})

const errorMsg = ref('')
const cargando = ref(false)

const iniciarSesion = async () => {
  errorMsg.value = ''
  cargando.value = true

  try {
    const respuesta = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correo: form.value.correo,
        // Al igual que en el registro, mapeamos "contrasena" a "contraseña" para tu API
        contraseña: form.value.contrasena,
      }),
    })

    const datos = await respuesta.json()

    if (!respuesta.ok) {
      throw new Error(datos.message || 'Error al iniciar sesión')
    }

    // ¡Éxito! Guardamos el token y la info del usuario en el navegador
    localStorage.setItem('token', datos.data.token)
    localStorage.setItem('user', JSON.stringify(datos.data.user))

    // Ahora sí, lo mandamos al perfil real
    router.push('/perfil')
  } catch (error) {
    console.error('Error en login:', error)
    errorMsg.value = error.message
  } finally {
    cargando.value = false
  }
}
</script>
