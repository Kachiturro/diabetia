import { z } from "zod";

export const datosClinicosSchema = z.object({
  pacienteID: z.coerce.number().int().positive("ID de paciente inválido"),
  embarazos: z.coerce.number().min(0, "Los embarazos no pueden ser negativos").max(20, "Valor de embarazos muy alto").optional().default(0),
  glucosa: z.coerce.number().min(50, "Glucosa muy baja").max(300, "Glucosa muy alta"),
  presionSangina: z.coerce.number().min(40, "Presión muy baja").max(200, "Presión muy alta"),
  insulina: z.coerce.number().min(0, "Insulina no puede ser negativa").max(500, "Insulina muy alta").optional().default(0),
  bmi: z.coerce.number().min(10, "BMI muy bajo").max(60, "BMI muy alto"),
  diabetesPedigree: z.coerce.number().min(0.078, "Valor inválido").max(2.5, "Valor muy alto").optional().default(0.078),
  familiaresConDiabetes: z.array(z.object({ parentesco: z.string().trim().min(1) })).optional().default([]),
});

export const pacienteIdParamSchema = z.object({
  pacienteID: z.coerce.number().int().positive("ID de paciente inválido"),
});

export const datosIdParamSchema = z.object({
  datosID: z.coerce.number().int().positive("ID de diagnóstico inválido"),
});

export type DatosClinicosInput = z.infer<typeof datosClinicosSchema>;
