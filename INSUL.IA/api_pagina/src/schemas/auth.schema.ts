import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().email("Email inválido").trim(),
  contraseña: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const registerPrincipalSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),
  sexo: z.enum(["M", "F", "Otro"]),
  fechaNacimiento: z.string().min(10, "Fecha inválida"),
  domicilio: z.string().trim().optional(),
  celular: z.string().trim().optional(),
  correo: z.string().email("Email inválido").trim(),
  contraseña: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const registerSecundarioSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),
  sexo: z.enum(["M", "F", "Otro"]),
  fechaNacimiento: z.string().min(10, "Fecha inválida"),
  domicilio: z.string().trim().optional(),
  celular: z.string().trim().optional(),
  parentesco: z.string().trim().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPrincipalInput = z.infer<typeof registerPrincipalSchema>;
export type RegisterSecundarioInput = z.infer<typeof registerSecundarioSchema>;
