import { Request, Response } from "express";
import pool from "../db/connection";
import { hashPassword, comparePassword } from "../utils/bcrypt.utils";
import { generateToken } from "../utils/jwt.utils";
import { AppError, AuthRequest } from "../middlewares/auth.middleware";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const registerPrincipal = async (req: Request, res: Response): Promise<void> => {
  const { nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña } = req.body;

  const [existingUsers] = await pool.execute<RowDataPacket[]>(
    "SELECT usuarioID FROM UsuarioPrincipal WHERE correo = ?",
    [correo]
  );

  if (existingUsers.length > 0) {
    throw new AppError("El correo ya está registrado", 409, "EMAIL_ALREADY_EXISTS");
  }

  const hashedPassword = await hashPassword(contraseña);

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO UsuarioPrincipal (nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [nombre, sexo, fechaNacimiento, domicilio || null, celular || null, correo, hashedPassword]
  );

  res.status(201).json({ 
    success: true, 
    message: "Usuario registrado exitosamente",
    data: { usuarioID: result.insertId }
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { correo, contraseña } = req.body;

  const [users] = await pool.execute<RowDataPacket[]>(
    "SELECT usuarioID, nombre, correo, contraseña FROM UsuarioPrincipal WHERE correo = ?",
    [correo]
  );

  if (users.length === 0) {
    throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
  }

  const user = users[0] as any;
  const valid = await comparePassword(contraseña, user.contraseña);

  if (!valid) {
    throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
  }

  const token = generateToken({ usuarioID: user.usuarioID, correo: user.correo });
  const { contraseña: _, ...userWithoutPassword } = user;

  res.json({ 
    success: true, 
    message: "Login exitoso",
    data: { 
      token, 
      user: userWithoutPassword 
    }
  });
};

export const registerSecundario = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }
  const { nombre, sexo, fechaNacimiento, domicilio, celular, parentesco } = req.body;

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO UsuarioSecundario (usuarioPrincipalID, nombre, sexo, fechaNacimiento, domicilio, celular, parentesco) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.usuarioID, nombre, sexo, fechaNacimiento, domicilio || null, celular || null, parentesco || null]
  );

  res.status(201).json({ 
    success: true, 
    message: "Paciente registrado exitosamente",
    data: { pacienteID: result.insertId }
  });
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }

  const [users] = await pool.execute<RowDataPacket[]>(
    `SELECT u.*, 
        COUNT(DISTINCT s.pacienteID) as total_pacientes
       FROM UsuarioPrincipal u
       LEFT JOIN UsuarioSecundario s ON u.usuarioID = s.usuarioPrincipalID
       WHERE u.usuarioID = ?
       GROUP BY u.usuarioID`,
    [req.user.usuarioID]
  );

  if (users.length === 0) {
    throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }

  const { contraseña: _, ...userData } = users[0] as any;

  res.json({ success: true, data: userData });
};

export const getPacientes = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }

  const [pacientes] = await pool.execute<RowDataPacket[]>(
    `SELECT s.*, 
        COUNT(dc.datosID) as total_mediciones,
        MAX(dc.fecha_registro) as ultima_medicion
       FROM UsuarioSecundario s
       LEFT JOIN DATOS_CLINICOS dc ON s.pacienteID = dc.pacienteID
       WHERE s.usuarioPrincipalID = ?
       GROUP BY s.pacienteID
       ORDER BY s.nombre`,
    [req.user.usuarioID]
  );

  res.json({ success: true, data: pacientes });
};
