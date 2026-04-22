<template>
  <main>
    <section class="profile-section">
      <div class="profile-container">
        <div class="user-card">
          <div
            class="user-avatar"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #1e63f3, #0d47a1);
              color: white;
              font-size: 45px;
              font-weight: bold;
            "
          >
            {{ usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '👤' }}
          </div>
          <h3>{{ usuario.nombre || 'Cargando...' }}</h3>
          <p class="user-email">{{ usuario.correo || '' }}</p>

          <div class="user-stats">
            <div class="stat">
              <strong>{{ resumen.total_mediciones || 0 }}</strong>
              <span>Registros</span>
            </div>
            <div class="stat">
              <strong
                >{{
                  resumen.riesgo_promedio ? (resumen.riesgo_promedio * 100).toFixed(0) : 0
                }}%</strong
              >
              <span>Riesgo Prom.</span>
            </div>
          </div>
          <hr />
          <button class="btn-outline">Editar Perfil</button>
          <a href="#" @click.prevent="cerrarSesion" class="logout-link">Cerrar Sesión</a>
        </div>

        <div class="dashboard-content">
          <div class="dashboard-header">
            <h2>Mis Registros Clínicos</h2>
            <div style="display: flex; gap: 10px">
              <button
                @click="cargarDatosDashboard"
                class="btn-icon"
                style="background: #f0f0f0; border: none; cursor: pointer"
              >
                <i class="fas fa-sync-alt"></i>
              </button>
              <router-link
                to="/evaluacion"
                class="btn-new-record"
                style="display: inline-block; text-decoration: none"
              >
                <i class="fas fa-plus"></i> Nuevo Diagnóstico
              </router-link>
            </div>
          </div>

          <div class="records-table-wrapper">
            <div v-if="cargando" style="text-align: center; padding: 40px">
              <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: #1e63f3"></i>
              <p>Actualizando registros...</p>
            </div>

            <div
              v-else-if="historialMedico.length === 0"
              style="text-align: center; padding: 40px; color: #777"
            >
              <i
                class="fas fa-folder-open"
                style="font-size: 40px; margin-bottom: 15px; color: #ccc"
              ></i>
              <h3>Aún no tienes diagnósticos</h3>
              <p>Haz clic en "Nuevo Diagnóstico" para comenzar a evaluar pacientes.</p>
            </div>

            <table class="records-table" v-else>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente (Rol)</th>
                  <th>Glucosa</th>
                  <th>IMC</th>
                  <th>Resultado IA</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="registro in historialMedico" :key="registro.id">
                  <td>{{ registro.fecha }}</td>
                  <td>
                    <strong>{{ registro.paciente }}</strong> <br />
                    <span style="font-size: 12px; color: #777">{{ registro.rol }}</span>
                  </td>
                  <td>{{ registro.glucosa }} mg/dL</td>
                  <td>{{ registro.imc }}</td>
                  <td>
                    <span v-if="registro.riesgoAlto" class="badge badge-danger">Alto Riesgo</span>
                    <span v-else class="badge badge-success">Bajo Riesgo</span>
                  </td>
                  <td>
                    <router-link
                      :to="'/detalle/' + registro.id"
                      class="btn-icon"
                      style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        text-decoration: none;
                      "
                    >
                      <i class="fas fa-eye"></i>
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiUrl } from '../lib/api'

const router = useRouter()
const usuario = ref({})
const cargando = ref(false)
const resumen = ref({ total_pacientes: 0, total_mediciones: 0, riesgo_promedio: 0 })
const historialMedico = ref([])

// Función para pedirle los datos al Backend
const cargarDatosDashboard = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  cargando.value = true
  try {
    const respuesta = await fetch(apiUrl('/api/prediccion/dashboard'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const resultado = await respuesta.json()

    if (resultado.success) {
      resumen.value = resultado.data.resumen
      // Mapeamos los datos que vienen de la BD al formato de nuestra tabla
      historialMedico.value = resultado.data.ultimosResultados.map((reg) => ({
        id: reg.datosID,
        fecha: new Date(reg.fecha_registro).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
        }),
        paciente: reg.nombre_paciente,
        rol: reg.parentesco || '(Yo)',
        glucosa: reg.glucosa,
        imc: reg.bmi,
        riesgoAlto: reg.probabilidadPadecer > 0.5, // Si es mayor al 50% es riesgo alto
      }))
    }
  } catch (error) {
    console.error('Error al cargar el dashboard:', error)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  const token = localStorage.getItem('token')
  const userData = localStorage.getItem('user')

  if (!token || !userData) {
    router.push('/login')
    return
  }

  usuario.value = JSON.parse(userData)
  cargarDatosDashboard() // Llamamos a la API en cuanto carga la página
})

const cerrarSesion = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>
