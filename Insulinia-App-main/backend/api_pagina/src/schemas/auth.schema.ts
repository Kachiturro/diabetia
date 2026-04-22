import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const registerPrincipalSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  sexo: z.enum(["M", "F", "Otro"]),
  fechaNacimiento: z.string().transform(str => new Date(str)),
  domicilio: z.string().optional(),
  celular: z.string().optional(),
  correo: z.string().email("Email inválido"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
});

export const registerSecundarioSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  sexo: z.enum(["M", "F", "Otro"]),
  fechaNacimiento: z.string().transform(str => new Date(str)),
  domicilio: z.string().optional(),
  celular: z.string().optional(),
  parentesco: z.string().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPrincipalInput = z.infer<typeof registerPrincipalSchema>;
export type RegisterSecundarioInput = z.infer<typeof registerSecundarioSchema>;
