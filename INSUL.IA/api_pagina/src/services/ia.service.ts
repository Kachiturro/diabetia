import { PrediccionRequest, PrediccionResponse } from "../types/ia.types";

class IAService {
  async predecirRiesgo(datos: PrediccionRequest): Promise<PrediccionResponse> {
    console.log("🔮 Calculando riesgo con modelo IA:", datos);
    
    // Cálculo simplificado de riesgo
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
    
    probabilidad = Math.min(probabilidad, 0.95);
    
    let nivel_riesgo: "bajo" | "moderado" | "alto" | "muy alto";
    if (probabilidad < 0.3) nivel_riesgo = "bajo";
    else if (probabilidad < 0.5) nivel_riesgo = "moderado";
    else if (probabilidad < 0.7) nivel_riesgo = "alto";
    else nivel_riesgo = "muy alto";
    
    return {
      probabilidadPadecer: probabilidad,
      nivel_riesgo,
      recomendaciones: [
        "Realizar ejercicio 30 minutos diarios",
        "Reducir consumo de azúcares",
        "Controlar la presión arterial"
      ]
    };
  }

  async verificarSalud(): Promise<boolean> {
    return true;
  }
}

export default new IAService();
