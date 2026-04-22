<template>
  <div class="login-bg">
    <div class="login-topbar">
      <router-link to="/" class="back-home">← Volver al inicio</router-link>
    </div>

    <div class="login-card" style="width: 450px; margin-top: 40px; margin-bottom: 40px">
      <div class="login-logo">
        <img src="/imagenes/logo.png" alt="Insulin.IA Logo" />
      </div>

      <div class="logo-watermark"></div>

      <h2>Crear cuenta</h2>
      <p>Regístrate en <strong>Insulin.IA</strong></p>

      <div v-if="errorMsg" style="color: red; margin-bottom: 15px; font-size: 14px">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="registrarUsuario">
        <div class="input-group">
          <input type="text" v-model="form.nombre" placeholder="Nombre completo" required />
        </div>

        <div class="input-group" style="display: flex; gap: 10px">
          <select
            v-model="form.sexo"
            required
            style="
              width: 50%;
              padding: 12px;
              border-radius: 10px;
              border: 1px solid #ddd;
              outline: none;
            "
          >
            <option value="" disabled>Sexo</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Otro">Otro</option>
          </select>

          <input
            type="date"
            v-model="form.fechaNacimiento"
            required
            style="
              width: 50%;
              padding: 12px;
              border-radius: 10px;
              border: 1px solid #ddd;
              outline: none;
            "
            title="Fecha de nacimiento"
          />
        </div>

        <div class="input-group">
          <input type="email" v-model="form.correo" placeholder="Correo electrónico" required />
        </div>

        <div class="input-group">
          <input type="password" v-model="form.contrasena" placeholder="Contraseña" required />
        </div>

        <div class="input-group">
          <input
            type="password"
            v-model="form.confirmarContrasena"
            placeholder="Confirmar contraseña"
            required
          />
        </div>

        <button type="submit" class="btn-submit" :disabled="cargando">
          {{ cargando ? 'Registrando...' : 'Crear cuenta' }}
        </button>

        <p class="register">
          ¿Ya tienes cuenta?
          <router-link to="/login">Inicia sesión</router-link>
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

// Variables reactivas para guardar lo que el usuario escribe
const form = ref({
  nombre: '',
  sexo: '',
  fechaNacimiento: '',
  correo: '',
  contrasena: '',
  confirmarContrasena: '',
})

const errorMsg = ref('')
const cargando = ref(false)

// Función real para comunicarse con el backend
const registrarUsuario = async () => {
  errorMsg.value = '' // Limpiar errores previos

  // 1. Validación básica en el frontend
  if (form.value.contrasena !== form.value.confirmarContrasena) {
    errorMsg.value = 'Las contraseñas no coinciden'
    return
  }

  cargando.value = true

  try {
    // 2. Hacer la petición POST al contenedor de Node.js
    const respuesta = await fetch(apiUrl('/api/auth/register/principal'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Convertimos los datos de Vue a texto para enviarlos
      body: JSON.stringify({
        nombre: form.value.nombre,
        sexo: form.value.sexo,
        fechaNacimiento: form.value.fechaNacimiento,
        correo: form.value.correo,
        contraseña: form.value.contrasena,
      }),
    })

    const datos = await respuesta.json()

    // 3. Revisar si el backend nos devolvió un error (ej. correo ya registrado)
    if (!respuesta.ok) {
      throw new Error(datos.message || 'Error al registrar usuario')
    }

    // 4. ¡Éxito! Redirigir al login
    alert('¡Cuenta creada con éxito! Ahora inicia sesión.')
    router.push('/login')
  } catch (error) {
    console.error('Error en el registro:', error)
    errorMsg.value = error.message
  } finally {
    cargando.value = false
  }
}
</script>
