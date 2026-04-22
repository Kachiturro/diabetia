import { z } from "zod";

export const datosClinicosSchema = z.object({
  pacienteID: z.number().positive("ID de paciente inválido"),
  embarazos: z.number().min(0, "Los embarazos no pueden ser negativos").max(20, "Valor de embarazos muy alto"),
  glucosa: z.number().min(50, "Glucosa muy baja").max(300, "Glucosa muy alta"),
  presionSangina: z.number().min(40, "Presión muy baja").max(200, "Presión muy alta"),
  insulina: z.number().min(0, "Insulina no puede ser negativa").max(500, "Insulina muy alta"),
  bmi: z.number().min(10, "BMI muy bajo").max(60, "BMI muy alto"),
  diabetesPedigree: z.number().min(0, "Valor inválido").max(2.5, "Valor muy alto").optional(),
  familiaresConDiabetes: z
    .array(
      z.object({
        parentesco: z.string().min(1, "Parentesco requerido"),
      }),
    )
    .optional(),
  edad: z.number().min(21, "Edad fuera del rango soportado").max(81, "Edad fuera del rango soportado"),
});

export type DatosClinicosInput = z.infer<typeof datosClinicosSchema>;
