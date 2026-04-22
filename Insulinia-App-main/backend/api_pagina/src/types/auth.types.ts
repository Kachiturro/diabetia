export interface UsuarioPrincipal {
  usuarioID: number;
  nombre: string;
  sexo: "M" | "F" | "Otro";
  fechaNacimiento: Date;
  domicilio?: string;
  celular?: string;
  correo: string;
  contraseña: string;
  fecha_registro: Date;
}

export interface UsuarioPrincipalWithoutPassword extends Omit<UsuarioPrincipal, "contraseña"> {}

export interface UsuarioSecundario {
  pacienteID: number;
  usuarioPrincipalID: number;
  nombre: string;
  sexo: "M" | "F" | "Otro";
  fechaNacimiento: Date;
  domicilio?: string;
  celular?: string;
  parentesco?: string;
  fecha_registro: Date;
}

export interface TokenPayload {
  usuarioID: number;
  correo: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UsuarioPrincipalWithoutPassword;
}
