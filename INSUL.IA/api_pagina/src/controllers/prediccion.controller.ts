import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import pool from "../db/connection";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const registrarDatosClinicos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
    }

    const { pacienteID, embarazos, glucosa, presionSangina, grosorPiel, insulina, bmi, diabetesPedigree } = req.body;

    // Validar campos requeridos
    if (!pacienteID || !glucosa || !presionSangina || !bmi) {
      res.status(400).json({ success: false, message: "Faltan campos requeridos" });
      return;
    }

    // Verificar que el paciente pertenezca al usuario principal
    const [pacientes] = await pool.execute<RowDataPacket[]>(
      "SELECT pacienteID FROM UsuarioSecundario WHERE pacienteID = ? AND usuarioPrincipalID = ?",
      [pacienteID, req.user.usuarioID]
    );

    if (pacientes.length === 0) {
      res.status(403).json({ success: false, message: "No tienes permiso para este paciente" });
      return;
    }

    // Obtener edad del paciente
    const [edadResult] = await pool.execute<RowDataPacket[]>(
      "SELECT TIMESTAMPDIFF(YEAR, fechaNacimiento, CURDATE()) as edad FROM UsuarioSecundario WHERE pacienteID = ?",
      [pacienteID]
    );

    const edad = edadResult[0]?.edad || 30;

    // Insertar datos clínicos
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO DATOS_CLINICOS 
       (pacienteID, embarazos, glucosa, presionSangina, grosorPiel, insulina, bmi, diabetesPedigree, edad) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteID, 
        embarazos || 0, 
        glucosa, 
        presionSangina, 
        grosorPiel || 0, 
        insulina || 0, 
        bmi, 
        diabetesPedigree || 0, 
        edad
      ]
    );

    // Simular resultado de IA (en un caso real, aquí llamarías a tu modelo)
    const probabilidad = Math.random() * 0.8; // Valor entre 0 y 0.8
    
    await pool.execute(
      "INSERT INTO RESULTADO_IA (probabilidadPadecer, datosID) VALUES (?, ?)",
      [probabilidad, result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Datos clínicos registrados",
      data: { 
        datosID: result.insertId,
        probabilidad: probabilidad,
        nivel_riesgo: probabilidad < 0.3 ? "bajo" : probabilidad < 0.5 ? "moderado" : probabilidad < 0.7 ? "alto" : "muy alto"
      }
    });
  } catch (error: any) {
    console.error("Error en registrarDatosClinicos:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerHistorialPaciente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
    }

    const pacienteID = parseInt(req.params.pacienteID as string);

    if (isNaN(pacienteID)) {
      res.status(400).json({ success: false, message: "ID de paciente inválido" });
      return;
    }

    // Verificar que el paciente pertenezca al usuario principal
    const [pacientes] = await pool.execute<RowDataPacket[]>(
      "SELECT pacienteID FROM UsuarioSecundario WHERE pacienteID = ? AND usuarioPrincipalID = ?",
      [pacienteID, req.user.usuarioID]
    );

    if (pacientes.length === 0) {
      res.status(403).json({ success: false, message: "No tienes permiso para ver este paciente" });
      return;
    }

    const [historial] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        dc.*,
        ri.probabilidadPadecer,
        ri.fecha_prediccion
       FROM DATOS_CLINICOS dc
       LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
       WHERE dc.pacienteID = ?
       ORDER BY dc.fecha_registro DESC`,
      [pacienteID]
    );

    res.json({ success: true, data: historial });
  } catch (error: any) {
    console.error("Error en obtenerHistorialPaciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autorizado" });
      return;
    }

    // Obtener resumen del dashboard
    const [dashboard] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT s.pacienteID) as total_pacientes,
        COUNT(DISTINCT dc.datosID) as total_mediciones,
        AVG(ri.probabilidadPadecer) as riesgo_promedio
       FROM UsuarioPrincipal up
       LEFT JOIN UsuarioSecundario s ON up.usuarioID = s.usuarioPrincipalID
       LEFT JOIN DATOS_CLINICOS dc ON s.pacienteID = dc.pacienteID
       LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
       WHERE up.usuarioID = ?`,
      [req.user.usuarioID]
    );

    // Obtener últimos resultados
    const [ultimosResultados] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        s.nombre as nombre_paciente,
        s.sexo,
        TIMESTAMPDIFF(YEAR, s.fechaNacimiento, CURDATE()) as edad,
        s.parentesco,
        dc.glucosa,
        dc.bmi,
        dc.presionSangina,
        ri.probabilidadPadecer,
        dc.fecha_registro as fecha_medicion
       FROM UsuarioSecundario s
       LEFT JOIN DATOS_CLINICOS dc ON s.pacienteID = dc.pacienteID
       LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
       WHERE s.usuarioPrincipalID = ?
       ORDER BY dc.fecha_registro DESC
       LIMIT 10`,
      [req.user.usuarioID]
    );

    res.json({
      success: true,
      data: {
        resumen: dashboard[0] || { total_pacientes: 0, total_mediciones: 0, riesgo_promedio: 0 },
        ultimosResultados
      }
    });
  } catch (error: any) {
    console.error("Error en getDashboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
