<template>
  <main>
    <section class="form-section">
      <div class="form-card">
        <div style="text-align: center; margin-bottom: 30px">
          <h2>Nueva Evaluación Médica</h2>
          <p class="subtitle">
            Ingresa los valores clínicos para generar una predicción con Insulin.IA
          </p>
        </div>

        <div v-if="errorMsg" style="color: red; text-align: center; margin-bottom: 15px">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="analizarDatos">
          <div class="form-group">
            <span>¿Para quién es este diagnóstico?</span>
            <select
              v-model="formulario.pacienteID"
              @change="verificarNuevoPaciente"
              class="full"
              style="
                padding: 14px 18px;
                border-radius: 12px;
                border: 1px solid #ddd;
                width: 100%;
                background: #f9f9f9;
              "
              required
            >
              <option value="" disabled>Selecciona un paciente registrado...</option>

              <option
                v-for="paciente in listaPacientes"
                :key="paciente.pacienteID"
                :value="paciente.pacienteID"
              >
                {{ paciente.nombre }} {{ paciente.parentesco ? `(${paciente.parentesco})` : '' }}
              </option>

              <option value="nuevo">+ Registrar nuevo paciente</option>
            </select>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0" />
          <h3 style="color: #1e63f3; margin-bottom: 20px; font-size: 18px">
            Parámetros Metabólicos (Dataset)
          </h3>

          <div class="grid">
            <div class="form-group">
              <span>Glucosa (mg/dL)</span>
              <input
                type="number"
                v-model.number="formulario.glucosa"
                placeholder="Ej. 110"
                required
              />
            </div>

            <div class="form-group">
              <span>Presión Arterial (mmHg)</span>
              <input
                type="number"
                v-model.number="formulario.presionSangina"
                placeholder="Ej. 72"
                required
              />
            </div>

            <div class="form-group">
              <span>IMC (Índice de Masa Corporal)</span>
              <input
                type="number"
                step="0.1"
                v-model.number="formulario.bmi"
                placeholder="Ej. 25.5"
                required
              />
            </div>

            <div class="form-group">
              <span>Insulina (mu U/ml)</span>
              <input
                type="number"
                v-model.number="formulario.insulina"
                placeholder="Ej. 79 (0 si no se sabe)"
                required
              />
            </div>

            <div class="form-group">
              <span>Edad (Años)</span>
              <input type="number" v-model.number="formulario.edad" placeholder="Ej. 45" required />
            </div>

            <div v-if="esPacienteFemenino" class="form-group">
              <span>Número de Embarazos</span>
              <input
                type="number"
                v-model.number="formulario.embarazos"
                placeholder="Ej. 2"
                required
              />
            </div>

            <div v-else-if="pacienteSeleccionado" class="form-group">
              <span>Número de Embarazos</span>
              <div class="field-note no-pregnancies-note">
                No aplica para pacientes masculinos. Se enviará valor 0 automáticamente.
              </div>
            </div>

            <div v-else class="form-group">
              <span>Número de Embarazos</span>
              <div class="field-note no-pregnancies-note">
                Selecciona un paciente para saber si este campo aplica.
              </div>
            </div>
          </div>

          <div class="family-history-box">
            <span>Antecedentes familiares de diabetes</span>
            <p class="field-note">
              Añade familiares con diabetes y calculamos automáticamente el pedigrí usando la escala
              del dataset de entrenamiento.
            </p>

            <div v-if="formulario.familiaresConDiabetes.length === 0" class="empty-family-list">
              No agregaste familiares todavía.
            </div>

            <div
              v-for="(familiar, index) in formulario.familiaresConDiabetes"
              :key="`familiar-${index}`"
              class="family-row"
            >
              <select v-model="familiar.parentesco" class="family-select">
                <option
                  v-for="opcion in parentescosFamiliarOptions"
                  :key="opcion.value"
                  :value="opcion.value"
                >
                  {{ opcion.label }}
                </option>
              </select>
              <button
                type="button"
                class="btn-remove-family"
                @click="quitarFamiliarConDiabetes(index)"
              >
                Quitar
              </button>
            </div>

            <button type="button" class="btn-add-family" @click="agregarFamiliarConDiabetes">
              + Añadir familiar con diabetes
            </button>

            <div class="pedigree-preview">
              <span>Función de pedigrí calculada</span>
              <strong>{{ diabetesPedigreeCalculado.toFixed(3) }}</strong>
            </div>
          </div>

          <button
            type="submit"
            class="btn-primary full"
            :disabled="procesando"
            style="
              margin-top: 30px;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 10px;
              cursor: pointer;
            "
          >
            <span v-if="!procesando"><i class="fas fa-brain"></i> Analizar con IA</span>
            <span v-else><i class="fas fa-spinner fa-spin"></i> Procesando algoritmo...</span>
          </button>

          <div style="text-align: center; margin-top: 20px">
            <router-link to="/perfil" style="color: #777; text-decoration: none; font-size: 14px"
              >Cancelar y volver al perfil</router-link
            >
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { apiUrl } from '../lib/api'

const router = useRouter()
const procesando = ref(false)
const errorMsg = ref('')
const route = useRoute()
const PEDIGREE_MIN = 0.078
const PEDIGREE_MAX = 2.42
const PEDIGREE_CURVE = 0.18

const parentescosFamiliarOptions = [
  { value: 'madre', label: 'Madre' },
  { value: 'padre', label: 'Padre' },
  { value: 'hermana', label: 'Hermana' },
  { value: 'hermano', label: 'Hermano' },
  { value: 'hija', label: 'Hija' },
  { value: 'hijo', label: 'Hijo' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'tia', label: 'Tía' },
  { value: 'tio', label: 'Tío' },
  { value: 'prima', label: 'Prima' },
  { value: 'primo', label: 'Primo' },
  { value: 'otro', label: 'Otro familiar' },
]

// 1. Lista para guardar los pacientes que vienen de la BD
const listaPacientes = ref([])

// Objeto reactivo para el formulario
const formulario = ref({
  pacienteID: '',
  glucosa: null,
  presionSangina: null,
  bmi: null,
  insulina: null,
  edad: null,
  embarazos: 0,
  familiaresConDiabetes: [],
})

const normalizarTexto = (valor = '') =>
  valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const obtenerPesoParentesco = (parentesco = '') => {
  const texto = normalizarTexto(parentesco)

  if (
    ['madre', 'padre', 'hermana', 'hermano', 'hija', 'hijo'].some((valor) =>
      texto.includes(valor),
    )
  ) {
    return 1
  }

  if (['abuela', 'abuelo', 'tia', 'tio'].some((valor) => texto.includes(valor))) {
    return 0.5
  }

  if (['prima', 'primo'].some((valor) => texto.includes(valor))) {
    return 0.25
  }

  return 0.35
}

const calcularPedigreeDesdeFamiliares = (familiares = []) => {
  const cargaFamiliar = familiares.reduce(
    (total, familiar) => total + obtenerPesoParentesco(familiar?.parentesco || ''),
    0,
  )

  const saturacion = 1 - Math.exp(-PEDIGREE_CURVE * Math.max(0, cargaFamiliar))
  const valor = PEDIGREE_MIN + (PEDIGREE_MAX - PEDIGREE_MIN) * saturacion

  return Number(valor.toFixed(4))
}

const pacienteSeleccionado = computed(() => {
  const pacienteID = Number(formulario.value.pacienteID)
  if (!Number.isFinite(pacienteID)) return null

  return (
    listaPacientes.value.find((paciente) => Number(paciente.pacienteID) === pacienteID) || null
  )
})

const esPacienteFemenino = computed(() => pacienteSeleccionado.value?.sexo === 'F')

const diabetesPedigreeCalculado = computed(() =>
  calcularPedigreeDesdeFamiliares(formulario.value.familiaresConDiabetes),
)

watch(
  esPacienteFemenino,
  (nuevoValor) => {
    if (!nuevoValor) {
      formulario.value.embarazos = 0
    }
  },
  { immediate: true },
)

const agregarFamiliarConDiabetes = () => {
  formulario.value.familiaresConDiabetes.push({ parentesco: 'madre' })
}

const quitarFamiliarConDiabetes = (index) => {
  formulario.value.familiaresConDiabetes.splice(index, 1)
}

// 2. Función para cargar pacientes al abrir la página
onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const respuesta = await fetch(apiUrl('/api/auth/pacientes'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const resultado = await respuesta.json()

    if (resultado.success) {
      listaPacientes.value = resultado.data

      // LÓGICA DE AUTO-SELECCIÓN:
      // Si venimos de registrar un paciente, seleccionarlo de inmediato
      if (route.query.nuevoPacienteId) {
        formulario.value.pacienteID = Number(route.query.nuevoPacienteId)
      }
    }
  } catch (error) {
    console.error('Error al cargar pacientes:', error)
    errorMsg.value = 'No se pudo cargar la lista de pacientes.'
  }
})

// 3. Función Real para enviar datos a MySQL
const analizarDatos = async () => {
  if (formulario.value.pacienteID === 'nuevo') {
    router.push('/nuevo-paciente') // <-- ¡Ahora sí lo mandamos a registrar!
    return
  }

  procesando.value = true
  errorMsg.value = ''

  try {
    const token = localStorage.getItem('token')
    const payload = {
      ...formulario.value,
      pacienteID: Number(formulario.value.pacienteID),
      embarazos: esPacienteFemenino.value ? Number(formulario.value.embarazos || 0) : 0,
      diabetesPedigree: diabetesPedigreeCalculado.value,
    }

    // Petición a la ruta que definimos en prediccion.routes.ts
    const respuesta = await fetch(apiUrl('/api/prediccion/datos-clinicos'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const datosRespuesta = await respuesta.json()

    if (!respuesta.ok) {
      throw new Error(datosRespuesta.message || 'Error al procesar el diagnóstico')
    }

    // ¡Éxito! Guardamos el ID del nuevo resultado para mostrarlo en detalle
    localStorage.setItem('ultimoDiagnosticoID', datosRespuesta.data.datosID)

    alert('Análisis de IA completado con éxito')
    router.push('/perfil') // Te regresa al perfil para ver el nuevo registro en la tabla
  } catch (error) {
    console.error(error)
    errorMsg.value = error.message || 'Hubo un error al conectar con el servidor.'
  } finally {
    procesando.value = false
  }
}

const verificarNuevoPaciente = () => {
  if (formulario.value.pacienteID === 'nuevo') {
    // Te manda directo sin esperar a llenar la glucosa o el IMC
    router.push('/nuevo-paciente')
  }
}
</script>

<style scoped>
.family-history-box {
  margin-top: 12px;
  border: 1px solid #dfe8ff;
  border-radius: 16px;
  padding: 18px;
  background: #f8fbff;
}

.family-history-box > span {
  display: block;
  font-weight: 600;
  color: #1e63f3;
  margin-bottom: 8px;
}

.field-note {
  font-size: 13px;
  color: #5f6b7a;
  line-height: 1.45;
}

.no-pregnancies-note {
  background: #f7f8fa;
  border: 1px dashed #d4d9e1;
  border-radius: 10px;
  padding: 12px;
}

.empty-family-list {
  margin-top: 10px;
  font-size: 13px;
  color: #6d7784;
}

.family-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.family-select {
  flex: 1;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d4ddf0;
  background: white;
}

.btn-add-family {
  margin-top: 14px;
  border: 1px solid #1e63f3;
  background: white;
  color: #1e63f3;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.btn-remove-family {
  border: 1px solid #efb2b2;
  background: #fff7f7;
  color: #af2b2b;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}

.pedigree-preview {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef4ff;
  border: 1px solid #d2e1ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pedigree-preview span {
  color: #30518b;
}

.pedigree-preview strong {
  font-size: 20px;
  color: #0d47a1;
}

@media (max-width: 640px) {
  .family-row {
    flex-direction: column;
  }

  .btn-remove-family {
    padding: 10px 12px;
  }
}
</style>
