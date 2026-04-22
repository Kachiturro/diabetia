<template>
  <main class="form-section">
    <div class="diagnosis-container">
      <div class="diagnosis-header" style="text-align: left; margin-bottom: 20px">
        <router-link to="/evaluacion" class="btn-back">
          <i class="fas fa-arrow-left"></i> Volver a Evaluación
        </router-link>
      </div>

      <div class="form-card">
        <div style="text-align: center; margin-bottom: 30px">
          <h2 style="color: #0d47a1; font-size: 32px">Registrar Nuevo Paciente</h2>
          <p class="subtitle">
            Agrega a un familiar o a ti mismo como paciente para iniciar evaluaciones.
          </p>
        </div>

        <form @submit.prevent="registrarPaciente">
          <div class="form-group">
            <span>Nombre del Paciente</span>
            <div class="grid" style="grid-template-columns: 1fr">
              <input
                type="text"
                v-model="paciente.nombre"
                placeholder="Nombre completo del paciente"
                required
              />
            </div>
          </div>

          <div class="grid">
            <div class="form-group">
              <span>Sexo</span>
              <select v-model="paciente.sexo" class="full-input" required>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div class="form-group">
              <span>Parentesco</span>
              <select v-model="paciente.parentesco" class="full-input" required>
                <option value="Yo">Yo mismo</option>
                <option value="Padre/Madre">Padre / Madre</option>
                <option value="Hijo/a">Hijo / a</option>
                <option value="Hermano/a">Hermano / a</option>
                <option value="Otro">Otro familiar</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <span>Fecha de Nacimiento</span>
            <div class="grid" style="grid-template-columns: 1fr">
              <input type="date" v-model="paciente.fechaNacimiento" required />
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px">
            <button type="submit" class="btn-primary full" :disabled="cargando">
              <i class="fas fa-user-plus"></i>
              {{ cargando ? 'Guardando...' : 'Registrar Paciente' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../lib/api'

const router = useRouter()
const cargando = ref(false)
const paciente = ref({
  nombre: '',
  sexo: 'M',
  parentesco: 'Yo',
  fechaNacimiento: '',
})

const registrarPaciente = async () => {
  cargando.value = true
  try {
    const token = localStorage.getItem('token')
    const respuesta = await fetch(apiUrl('/api/auth/register/secundario'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paciente.value),
    })

    const datosRespuesta = await respuesta.json() // Obtenemos la respuesta del server

    if (respuesta.ok) {
      alert('Paciente registrado con éxito')

      // PASO CLAVE: Mandamos el ID del nuevo paciente en la URL
      router.push({
        path: '/evaluacion',
        query: { nuevoPacienteId: datosRespuesta.data.pacienteID },
      })
    } else {
      alert('Error: ' + datosRespuesta.message)
    }
  } catch (error) {
    alert('Error de conexión: ' + error.message)
  } finally {
    cargando.value = false
  }
}
</script>

<style scoped>
/* Estilos específicos para selectores que no estaban en style.css pero que mantienen el estilo */
.full-input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  border: none;
  background: #f2f5f9;
  font-size: 14px;
  color: #333;
  outline: none;
}

.full-input:focus {
  outline: 2px solid #1e63f3;
}

/* Reutilizamos el estilo de los inputs para los selects */
input[type='date'] {
  width: 100%;
}
</style>
