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
              <span>Estatura (cm)</span>
              <input
                type="number"
                step="0.1"
                v-model.number="formulario.estaturaCm"
                placeholder="Ej. 165"
                required
              />
            </div>

            <div class="form-group">
              <span>Peso (kg)</span>
              <input
                type="number"
                step="0.1"
                v-model.number="formulario.pesoKg"
                placeholder="Ej. 68.5"
                required
              />
            </div>

            <div class="form-group">
              <span>IMC (calculado automáticamente)</span>
              <input type="text" :value="bmiCalculadoTexto" class="readonly-input" readonly />
              <p class="field-note">Fórmula: peso (kg) / estatura² (m)</p>
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
              <span>Edad (calculada por fecha de nacimiento)</span>
              <input type="text" :value="edadPacienteTexto" class="readonly-input" readonly />
              <p v-if="pacienteSeleccionado" class="field-note">
                Fecha de nacimiento: {{ fechaNacimientoPacienteTexto }}
              </p>
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
              Añade familiares con diabetes para considerar los antecedentes en la evaluación.
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
const AGE_MIN_SUPPORTED = 21
const AGE_MAX_SUPPORTED = 81

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
  estaturaCm: null,
  pesoKg: null,
  insulina: null,
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

const bmiCalculado = computed(() => {
  const pesoKg = Number(formulario.value.pesoKg)
  const estaturaCm = Number(formulario.value.estaturaCm)

  if (!Number.isFinite(pesoKg) || !Number.isFinite(estaturaCm) || pesoKg <= 0 || estaturaCm <= 0) {
    return null
  }

  const estaturaM = estaturaCm / 100
  const bmi = pesoKg / (estaturaM * estaturaM)
  return Number(bmi.toFixed(1))
})

const bmiCalculadoTexto = computed(() => {
  if (bmiCalculado.value === null) {
    return 'Captura peso y estatura'
  }
  return `${bmiCalculado.value}`
})

const calcularEdadDesdeFechaNacimiento = (fechaNacimiento = '') => {
  const [anio, mes, dia] = String(fechaNacimiento).split('T')[0].split('-').map(Number)

  if (![anio, mes, dia].every(Number.isFinite)) {
    return null
  }

  const hoy = new Date()
  let edad = hoy.getFullYear() - anio
  const mesActual = hoy.getMonth() + 1
  const diaActual = hoy.getDate()

  if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
    edad -= 1
  }

  return edad >= 0 ? edad : null
}

const edadPacienteCalculada = computed(() =>
  calcularEdadDesdeFechaNacimiento(pacienteSeleccionado.value?.fechaNacimiento),
)

const edadPacienteTexto = computed(() => {
  if (edadPacienteCalculada.value === null) {
    return 'Selecciona un paciente'
  }
  return `${edadPacienteCalculada.value} años`
})

const fechaNacimientoPacienteTexto = computed(() => {
  const [anio, mes, dia] = String(pacienteSeleccionado.value?.fechaNacimiento || '')
    .split('T')[0]
    .split('-')

  if (!anio || !mes || !dia) {
    return 'No disponible'
  }

  return `${dia}/${mes}/${anio}`
})

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
    const bmi = bmiCalculado.value
    if (!Number.isFinite(bmi)) {
      throw new Error('No se pudo calcular IMC. Verifica peso y estatura.')
    }
    if (bmi < 10 || bmi > 60) {
      throw new Error('El IMC calculado está fuera del rango permitido (10-60).')
    }

    const edadCalculada = edadPacienteCalculada.value
    if (!Number.isFinite(edadCalculada)) {
      throw new Error('No se pudo calcular la edad a partir de la fecha de nacimiento del paciente.')
    }
    if (edadCalculada < AGE_MIN_SUPPORTED || edadCalculada > AGE_MAX_SUPPORTED) {
      throw new Error(
        `La edad calculada (${edadCalculada} años) está fuera del rango soportado por el modelo (${AGE_MIN_SUPPORTED}-${AGE_MAX_SUPPORTED}).`,
      )
    }

    const token = localStorage.getItem('token')
    const payload = {
      ...formulario.value,
      pacienteID: Number(formulario.value.pacienteID),
      bmi,
      embarazos: esPacienteFemenino.value ? Number(formulario.value.embarazos || 0) : 0,
      diabetesPedigree: diabetesPedigreeCalculado.value,
      edad: edadCalculada,
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

.readonly-input {
  background: #f3f5f8;
  color: #526174;
  cursor: not-allowed;
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
