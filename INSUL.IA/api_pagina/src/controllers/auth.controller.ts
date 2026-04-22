import { Request, Response } from "express";
import pool from "../db/connection";
import { hashPassword, comparePassword } from "../utils/bcrypt.utils";
import { generateToken } from "../utils/jwt.utils";
import { AuthRequest } from "../middlewares/auth.middleware";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const registerPrincipal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña } = req.body;
    
    // Validación básica
    if (!nombre || !sexo || !fechaNacimiento || !correo || !contraseña) {
      res.status(400).json({ success: false, message: "Faltan campos requeridos" });
      return;
    }

    // Verificar si el correo ya existe
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      "SELECT usuarioID FROM UsuarioPrincipal WHERE correo = ?",
      [correo]
    );

    if (existingUsers.length > 0) {
      res.status(400).json({ success: false, message: "El correo ya está registrado" });
      return;
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(contraseña);

    // Insertar usuario
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO UsuarioPrincipal (nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nombre, sexo, fechaNacimiento, domicilio || null, celular || null, correo, hashedPassword]
    );

    res.status(201).json({ 
      success: true, 
      message: "Usuario registrado exitosamente",
      data: { usuarioID: result.insertId }
    });
  } catch (error: any) {
    console.error("Error en registerPrincipal:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
      res.status(400).json({ success: false, message: "Correo y contraseña requeridos" });
      return;
    }

    const [users] = await pool.execute<RowDataPacket[]>(
      "SELECT usuarioID, nombre, correo, contraseña FROM UsuarioPrincipal WHERE correo = ?",
      [correo]
    );

    if (users.length === 0) {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
    }

    const user = users[0] as any;
    const valid = await comparePassword(contraseña, user.contraseña);

    if (!valid) {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
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
  } catch (error: any) {
    console.error("Error en login:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerSecundario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
    }

    const { nombre, sexo, fechaNacimiento, domicilio, celular, parentesco } = req.body;

    if (!nombre || !sexo || !fechaNacimiento) {
      res.status(400).json({ success: false, message: "Faltan campos requeridos" });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO UsuarioSecundario (usuarioPrincipalID, nombre, sexo, fechaNacimiento, domicilio, celular, parentesco) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.user.usuarioID, nombre, sexo, fechaNacimiento, domicilio || null, celular || null, parentesco || null]
    );

    res.status(201).json({ 
      success: true, 
      message: "Paciente registrado exitosamente",
      data: { pacienteID: result.insertId }
    });
  } catch (error: any) {
    console.error("Error en registerSecundario:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
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
      res.status(404).json({ success: false, message: "Usuario no encontrado" });
      return;
    }

    const { contraseña: _, ...userData } = users[0] as any;

    res.json({ success: true, data: userData });
  } catch (error: any) {
    console.error("Error en getProfile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPacientes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
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
  } catch (error: any) {
    console.error("Error en getPacientes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
