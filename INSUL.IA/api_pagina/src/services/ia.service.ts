import axios from "axios";
import { PrediccionRequest, PrediccionResponse } from "../types/ia.types";

type IARiskLevel = "bajo" | "moderado" | "alto" | "muy alto";

class IAService {
  private readonly apiBaseUrl = (process.env.IA_API_URL || "http://localhost:8000").replace(/\/+$/, "");
  private readonly predictPath = process.env.IA_PREDICT_PATH || "/predict/ensemble";
  private readonly timeoutMs = Number(process.env.IA_TIMEOUT_MS || 10000);
  private readonly fallbackEnabled = String(process.env.IA_FALLBACK_ENABLED || "true").toLowerCase() !== "false";

  private mapRiskLevel(raw: unknown): IARiskLevel {
    const value = String(raw || "").toLowerCase().trim();
    if (value === "bajo") return "bajo";
    if (value === "moderado") return "moderado";
    if (value === "alto") return "alto";
    if (value === "muy alto") return "muy alto";
    return "moderado";
  }

  private buildRecommendations(probabilidad: number): string[] {
    if (probabilidad >= 0.7) {
      return [
        "Consulta médica prioritaria para evaluación integral.",
        "Solicitar HbA1c y glucosa en ayuno.",
        "Iniciar plan nutricional y actividad física supervisada.",
      ];
    }
    if (probabilidad >= 0.5) {
      return [
        "Programar revisión médica en corto plazo.",
        "Reducir azúcares simples y alimentos ultraprocesados.",
        "Monitorear glucosa y presión arterial regularmente.",
      ];
    }
    return [
      "Mantener alimentación balanceada y actividad física regular.",
      "Continuar controles clínicos preventivos.",
      "Repetir evaluación ante cambios de síntomas o estilo de vida.",
    ];
  }

  private fallbackPredict(datos: PrediccionRequest): PrediccionResponse {
    let probabilidad = 0;
    if (datos.glucosa > 140) probabilidad += 0.3;
    else if (datos.glucosa > 100) probabilidad += 0.15;

    if (datos.presionSangina > 140) probabilidad += 0.2;
    else if (datos.presionSangina > 130) probabilidad += 0.1;

    if (datos.bmi > 30) probabilidad += 0.25;
    else if (datos.bmi > 25) probabilidad += 0.1;

    if (datos.diabetesPedigree > 0.5) probabilidad += 0.15;
    if (datos.edad > 45) probabilidad += 0.15;
    else if (datos.edad > 35) probabilidad += 0.05;

    probabilidad = Math.max(0, Math.min(0.95, probabilidad));

    let nivel_riesgo: IARiskLevel = "bajo";
    if (probabilidad >= 0.7) nivel_riesgo = "muy alto";
    else if (probabilidad >= 0.5) nivel_riesgo = "alto";
    else if (probabilidad >= 0.3) nivel_riesgo = "moderado";

    return {
      probabilidadPadecer: probabilidad,
      nivel_riesgo,
      recomendaciones: this.buildRecommendations(probabilidad),
    };
  }

  async predecirRiesgo(datos: PrediccionRequest): Promise<PrediccionResponse> {
    const url = `${this.apiBaseUrl}${this.predictPath.startsWith("/") ? this.predictPath : `/${this.predictPath}`}`;
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
        { timeout: this.timeoutMs },
      );

      const probabilidad = Number(response.data?.probability);
      if (!Number.isFinite(probabilidad)) {
        throw new Error("La respuesta de IA no contiene probabilidad válida");
      }

      return {
        probabilidadPadecer: Math.max(0, Math.min(1, probabilidad)),
        nivel_riesgo: this.mapRiskLevel(response.data?.risk_level),
        recomendaciones: this.buildRecommendations(probabilidad),
      };
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Error desconocido";
      if (this.fallbackEnabled) {
        console.warn(`IA externa no disponible, usando fallback local: ${detail}`);
        return this.fallbackPredict(datos);
      }
      throw new Error(`No se pudo consultar IA (${url}): ${detail}`);
    }
  }

  async verificarSalud(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`, { timeout: this.timeoutMs });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }
}

export default new IAService();
