import { Response } from "express";
import { AppError, AuthRequest } from "../middlewares/auth.middleware";
import pool from "../db/connection";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import iaService from "../services/ia.service";

const PEDIGREE_MIN = 0.078;
const PEDIGREE_MAX = 2.42;
const PEDIGREE_CURVE = 0.18;
const AGE_MIN_SUPPORTED = 21;
const AGE_MAX_SUPPORTED = 81;

const normalizarTexto = (valor: string): string =>
  valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const obtenerPesoParentesco = (parentesco: string): number => {
  const texto = normalizarTexto(parentesco);
  if (["madre", "padre", "hermana", "hermano", "hija", "hijo"].some((v) => texto.includes(v))) return 1;
  if (["abuela", "abuelo", "tia", "tio"].some((v) => texto.includes(v))) return 0.5;
  if (["prima", "primo"].some((v) => texto.includes(v))) return 0.25;
  return 0.35;
};

const calcularPedigreeDesdeFamiliares = (familiares: unknown): number => {
  if (!Array.isArray(familiares) || familiares.length === 0) return PEDIGREE_MIN;
  const carga = familiares.reduce((total, item) => {
    const parentesco =
      typeof item === "object" && item !== null && "parentesco" in item
        ? String((item as { parentesco?: unknown }).parentesco || "")
        : "";
    return total + obtenerPesoParentesco(parentesco);
  }, 0);
  const saturacion = 1 - Math.exp(-PEDIGREE_CURVE * Math.max(0, carga));
  const valor = PEDIGREE_MIN + (PEDIGREE_MAX - PEDIGREE_MIN) * saturacion;
  return Number(Math.max(PEDIGREE_MIN, Math.min(PEDIGREE_MAX, valor)).toFixed(4));
};

export const registrarDatosClinicos = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }

  const { pacienteID, embarazos, glucosa, presionSangina, insulina, bmi, diabetesPedigree, familiaresConDiabetes } = req.body;

  const [pacienteRows] = await pool.execute<RowDataPacket[]>(
    `SELECT pacienteID, sexo, TIMESTAMPDIFF(YEAR, fechaNacimiento, CURDATE()) as edadCalculada
     FROM UsuarioSecundario WHERE pacienteID = ? AND usuarioPrincipalID = ? LIMIT 1`,
    [pacienteID, req.user.usuarioID]
  );
  if (pacienteRows.length === 0) {
    throw new AppError("Paciente no encontrado para este usuario", 404, "PATIENT_NOT_FOUND");
  }

  const sexoPaciente = String(pacienteRows[0].sexo || "").toUpperCase();
  const esPacienteFemenino = sexoPaciente === "F";
  const edadCalculada = Number(pacienteRows[0].edadCalculada);
  if (!Number.isFinite(edadCalculada)) {
    throw new AppError("No se pudo calcular la edad del paciente.", 400, "INVALID_PATIENT_AGE");
  }
  if (edadCalculada < AGE_MIN_SUPPORTED || edadCalculada > AGE_MAX_SUPPORTED) {
    throw new AppError(
      `La edad calculada (${edadCalculada}) está fuera del rango soportado por el modelo (${AGE_MIN_SUPPORTED}-${AGE_MAX_SUPPORTED}).`,
      400,
      "AGE_OUT_OF_MODEL_RANGE"
    );
  }

  const pedigreeManual = Number(diabetesPedigree);
  const familiaresArray = Array.isArray(familiaresConDiabetes) ? familiaresConDiabetes : [];
  const payloadIA = {
    embarazos: esPacienteFemenino ? Number(embarazos || 0) : 0,
    glucosa: Number(glucosa),
    presionSangina: Number(presionSangina),
    insulina: Number(insulina || 0),
    bmi: Number(bmi),
    diabetesPedigree: familiaresArray.length > 0 ? calcularPedigreeDesdeFamiliares(familiaresArray) : (Number.isFinite(pedigreeManual) && pedigreeManual > 0 ? pedigreeManual : PEDIGREE_MIN),
    edad: edadCalculada,
  };

  if (Object.values(payloadIA).some((value) => !Number.isFinite(value))) {
    throw new AppError("Los valores clínicos deben ser numéricos", 422, "INVALID_CLINICAL_VALUES");
  }

  const resultadoIA = await iaService.predecirRiesgo(payloadIA);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO DATOS_CLINICOS 
     (pacienteID, embarazos, glucosa, presionSangina, grosorPiel, insulina, bmi, diabetesPedigree, edad) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pacienteID, payloadIA.embarazos, payloadIA.glucosa, payloadIA.presionSangina, 0, payloadIA.insulina, payloadIA.bmi, payloadIA.diabetesPedigree, payloadIA.edad]
  );

  await pool.execute(
    `INSERT INTO RESULTADO_IA (probabilidadPadecer, datosID)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE probabilidadPadecer = VALUES(probabilidadPadecer), fecha_prediccion = CURRENT_TIMESTAMP`,
    [resultadoIA.probabilidadPadecer, result.insertId]
  );

  const [resultadoIABD] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM RESULTADO_IA WHERE datosID = ?",
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    message: "Análisis completado",
    data: {
      datosID: result.insertId,
      probabilidad: resultadoIABD[0]?.probabilidadPadecer ?? resultadoIA.probabilidadPadecer,
      nivel_riesgo: resultadoIA.nivel_riesgo,
      recomendaciones: resultadoIA.recomendaciones,
    },
  });
};

export const obtenerHistorialPaciente = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }
  const pacienteID = Number(req.params.pacienteID);

  const [pacientes] = await pool.execute<RowDataPacket[]>(
    "SELECT pacienteID FROM UsuarioSecundario WHERE pacienteID = ? AND usuarioPrincipalID = ?",
    [pacienteID, req.user.usuarioID]
  );
  if (pacientes.length === 0) {
    throw new AppError("No tienes permiso para ver este paciente", 403, "PATIENT_FORBIDDEN");
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
};

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }

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
};

export const getDetalleDiagnostico = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401, "AUTH_REQUIRED");
  }
  const { datosID } = req.params;

  const [detalle] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      dc.*, 
      ri.probabilidadPadecer, 
      ri.fecha_prediccion,
      s.nombre as nombre_paciente,
      s.parentesco,
      s.sexo
     FROM DATOS_CLINICOS dc
     JOIN UsuarioSecundario s ON dc.pacienteID = s.pacienteID
     LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
     WHERE dc.datosID = ? AND s.usuarioPrincipalID = ?`,
    [datosID, req.user.usuarioID]
  );
  if (detalle.length === 0) {
    throw new AppError("Registro no encontrado", 404, "DIAGNOSIS_NOT_FOUND");
  }
  res.json({ success: true, data: detalle[0] });
};
