export interface PrediccionRequest {
  embarazos: number;
  glucosa: number;
  presionSangina: number;
  insulina: number;
  bmi: number;
  diabetesPedigree: number;
  edad: number;
}

export interface PrediccionResponse {
  probabilidadPadecer: number;
  nivel_riesgo: "bajo" | "moderado" | "alto" | "muy alto";
  recomendaciones: string[];
}

export interface DatosClinicosInput {
  pacienteID: number;
  embarazos: number;
  glucosa: number;
  presionSangina: number;
  insulina: number;
  bmi: number;
  diabetesPedigree: number;
  edad: number;
}
