import axios from 'axios'
import { PrediccionRequest, PrediccionResponse } from '../types/ia.types'

type IARiskLevel = 'bajo' | 'moderado' | 'alto' | 'muy alto'

class IAService {
  private readonly apiBaseUrl = (process.env.IA_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  private readonly predictPath = process.env.IA_PREDICT_PATH || '/predict/ensemble'
  private readonly timeoutMs = Number(process.env.IA_TIMEOUT_MS || 10000)

  private mapRiskLevel(raw: unknown): IARiskLevel {
    const value = String(raw || '').toLowerCase().trim()
    if (value === 'bajo') return 'bajo'
    if (value === 'moderado') return 'moderado'
    if (value === 'alto') return 'alto'
    if (value === 'muy alto') return 'muy alto'
    return 'moderado'
  }

  private buildRecommendations(probabilidad: number): string[] {
    if (probabilidad >= 0.7) {
      return [
        'Consulta médica prioritaria para evaluación integral.',
        'Solicitar HbA1c y glucosa en ayuno.',
        'Iniciar plan nutricional y actividad física supervisada.',
      ]
    }
    if (probabilidad >= 0.5) {
      return [
        'Programar revisión médica en corto plazo.',
        'Reducir azúcares simples y alimentos ultraprocesados.',
        'Monitorear glucosa y presión arterial regularmente.',
      ]
    }
    return [
      'Mantener alimentación balanceada y actividad física regular.',
      'Continuar controles clínicos preventivos.',
      'Repetir evaluación ante cambios de síntomas o estilo de vida.',
    ]
  }

  async predecirRiesgo(datos: PrediccionRequest): Promise<PrediccionResponse> {
    const url = `${this.apiBaseUrl}${this.predictPath.startsWith('/') ? this.predictPath : `/${this.predictPath}`}`

    try {
      const response = await axios.post(
        url,
        {
          data: {
            Pregnancies: datos.embarazos,
            Glucose: datos.glucosa,
            BloodPressure: datos.presionSangina,
            Insulin: datos.insulina,
            BMI: datos.bmi,
            DiabetesPedigreeFunction: datos.diabetesPedigree,
            Age: datos.edad,
          },
        },
        {
          timeout: this.timeoutMs,
        },
      )

      const probabilidad = Number(response.data?.probability)
      if (!Number.isFinite(probabilidad)) {
        throw new Error('La respuesta de la IA no contiene una probabilidad válida')
      }

      const nivel_riesgo = this.mapRiskLevel(response.data?.risk_level)

      return {
        probabilidadPadecer: Math.max(0, Math.min(1, probabilidad)),
        nivel_riesgo,
        recomendaciones: this.buildRecommendations(probabilidad),
      }
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Error desconocido al consultar IA'
      throw new Error(`No se pudo obtener predicción desde IA (${url}): ${detail}`)
    }
  }

  async verificarSalud(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`, { timeout: this.timeoutMs })
      return response.status >= 200 && response.status < 300
    } catch {
      return false
    }
  }
}

export default new IAService()
