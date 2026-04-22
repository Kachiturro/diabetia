<template>
  <main v-if="registro">
    <section class="diagnosis-section">
      <div class="diagnosis-container">
        <div class="diagnosis-header">
          <router-link to="/perfil" class="btn-back">
            <i class="fas fa-arrow-left"></i> Volver a mis registros
          </router-link>
          <h2>Expediente de Diagnóstico</h2>
        </div>

        <div class="diagnosis-layout">
          <div class="diagnosis-sidebar">
            <div class="diag-card patient-info-card">
              <div class="patient-header">
                <div class="patient-avatar">{{ obtenerIniciales(registro.nombre_paciente) }}</div>
                <div>
                  <h3>{{ registro.nombre_paciente }}</h3>
                  <span class="patient-role">Rol: {{ registro.parentesco || 'Principal' }}</span>
                </div>
              </div>
              <hr class="soft-hr" />
              <div class="patient-details">
                <p>
                  <strong>Fecha del test:</strong> {{ formatearFecha(registro.fecha_registro) }}
                </p>
                <p><strong>Edad al test:</strong> {{ registro.edad }} años</p>
                <p><strong>ID Registro:</strong> #DIA-{{ registro.datosID }}</p>
              </div>
            </div>

            <div class="diag-card clinical-data-card">
              <h3>Datos Clínicos Evaluados</h3>
              <p class="card-hint">Valores analizados por el modelo de IA.</p>

              <div class="clinical-grid">
                <div :class="['data-box', registro.glucosa > 125 ? 'alert-box' : '']">
                  <span>Glucosa</span>
                  <strong>{{ registro.glucosa }} <small>mg/dL</small></strong>
                </div>
                <div class="data-box">
                  <span>Presión Art.</span>
                  <strong>{{ registro.presionSangina }} <small>mmHg</small></strong>
                </div>
                <div :class="['data-box', registro.bmi >= 30 ? 'alert-box' : '']">
                  <span>IMC</span>
                  <strong>{{ registro.bmi }}</strong>
                </div>
                <div class="data-box">
                  <span>Insulina</span>
                  <strong>{{ registro.insulina }} <small>mu U/ml</small></strong>
                </div>
                <div class="data-box">
                  <span>Pedigrí</span>
                  <strong>{{ registro.diabetesPedigree }}</strong>
                </div>
                <div v-if="mostrarEmbarazos" class="data-box">
                  <span>Embarazos</span>
                  <strong>{{ registro.embarazos }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="diagnosis-main">
            <div
              :class="[
                'diag-card result-card',
                registro.probabilidadPadecer > 0.5 ? 'danger-result' : 'success-result',
              ]"
            >
              <div class="result-header">
                <h3>Resultado Predictivo</h3>
                <span
                  :class="[
                    'badge',
                    registro.probabilidadPadecer > 0.5 ? 'badge-danger' : 'badge-success',
                  ]"
                >
                  {{ registro.probabilidadPadecer > 0.5 ? 'ALTO RIESGO' : 'BAJO RIESGO' }}
                </span>
              </div>

              <div class="risk-meter-container">
                <div class="risk-score">
                  <h1
                    :style="{ color: registro.probabilidadPadecer > 0.5 ? '#d63031' : '#27ae60' }"
                  >
                    {{ (registro.probabilidadPadecer * 100).toFixed(0) }}%
                  </h1>
                  <p>Probabilidad estimada de desarrollar diabetes o padecerla actualmente.</p>
                </div>

                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: registro.probabilidadPadecer * 100 + '%' }"
                  ></div>
                </div>

                <div class="progress-labels">
                  <span>Bajo</span>
                  <span>Medio</span>
                  <span>Alto</span>
                </div>
              </div>
            </div>

            <div class="diag-card recommendations-card">
              <h3><i class="fas fa-robot text-orange"></i> Recomendaciones de Insulin.IA</h3>
              <ul class="recom-list">
                <li v-if="registro.probabilidadPadecer > 0.5">
                  <strong>Alerta Médica:</strong> Tu perfil indica un riesgo elevado. Te
                  recomendamos acudir a un médico para una prueba de Hemoglobina Glicosilada
                  (HbA1c).
                </li>
                <li v-if="registro.glucosa > 125">
                  <strong>Glucosa Elevada:</strong> Tu nivel de glucosa ({{
                    registro.glucosa
                  }}
                  mg/dL) supera el rango normal. Reduce el consumo de azúcares.
                </li>
                <li v-if="registro.bmi >= 30">
                  <strong>Control de Peso:</strong> Tu IMC indica obesidad. Reducir un 5% de peso
                  mejorará tu salud metabólica.
                </li>
                <li v-else-if="registro.probabilidadPadecer <= 0.5">
                  Tus niveles actuales son saludables. Continúa con una dieta balanceada y actividad
                  física regular.
                </li>
              </ul>
            </div>

            <div class="action-buttons-row">
              <button class="btn-outline-dark">
                <i class="fas fa-file-pdf"></i> Descargar PDF
              </button>
              <router-link
                to="/evaluacion"
                class="btn-primary"
                style="display: inline-block; text-decoration: none"
              >
                <i class="fas fa-redo"></i> Nuevo diagnóstico para
                {{ registro.nombre_paciente.split(' ')[0] }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div v-else class="loading-full">
    <i class="fas fa-circle-notch fa-spin"></i>
    <p>Cargando expediente...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiUrl } from '../lib/api'

const route = useRoute()
const router = useRouter()
const registro = ref(null)
const mostrarEmbarazos = computed(() => {
  if (!registro.value) return false
  if (registro.value.sexo === 'F') return true
  return Number(registro.value.embarazos || 0) > 0
})

// Funciones auxiliares para el formato
const obtenerIniciales = (nombre) => {
  if (!nombre) return 'US'
  return nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  const datosID = route.params.datosID
  const token = localStorage.getItem('token')

  if (!token || !datosID) {
    router.push('/login')
    return
  }

  try {
    const respuesta = await fetch(apiUrl(`/api/prediccion/detalle/${datosID}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const resultado = await respuesta.json()

    if (resultado.success) {
      registro.value = resultado.data
    } else {
      router.push('/perfil')
    }
  } catch (error) {
    console.error('Error al obtener detalle:', error)
    router.push('/perfil')
  }
})
</script>
