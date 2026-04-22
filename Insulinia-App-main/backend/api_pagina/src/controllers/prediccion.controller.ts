import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import pool from '../db/connection'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import iaService from '../services/ia.service'

const PEDIGREE_MIN = 0.078
const PEDIGREE_MAX = 2.42
const PEDIGREE_CURVE = 0.18

const normalizarTexto = (valor: string): string =>
  valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const obtenerPesoParentesco = (parentesco: string): number => {
  const texto = normalizarTexto(parentesco)

  if (
    ['madre', 'padre', 'hermana', 'hermano', 'hija', 'hijo'].some((valor) =>
      texto.includes(valor),
    )
  ) {
    return 1
  }

  if (['abuela', 'abuelo', 'tia', 'tio'].some((valor) => texto.includes(valor))) {
    return 0.5
  }

  if (['prima', 'primo'].some((valor) => texto.includes(valor))) {
    return 0.25
  }

  return 0.35
}

const calcularPedigreeDesdeFamiliares = (familiares: unknown): number => {
  if (!Array.isArray(familiares) || familiares.length === 0) {
    return PEDIGREE_MIN
  }

  const cargaFamiliar = familiares.reduce((total, item) => {
    const parentesco =
      typeof item === 'object' && item !== null && 'parentesco' in item
        ? String((item as { parentesco?: unknown }).parentesco || '')
        : ''
    return total + obtenerPesoParentesco(parentesco)
  }, 0)

  const saturacion = 1 - Math.exp(-PEDIGREE_CURVE * Math.max(0, cargaFamiliar))
  const valor = PEDIGREE_MIN + (PEDIGREE_MAX - PEDIGREE_MIN) * saturacion
  return Number(Math.max(PEDIGREE_MIN, Math.min(PEDIGREE_MAX, valor)).toFixed(4))
}

// 1. Registrar Datos Clínicos (Sincronizado con el Trigger de la BD)
export const registrarDatosClinicos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autorizado' })
      return
    }

    const {
      pacienteID,
      embarazos,
      glucosa,
      presionSangina,
      insulina,
      bmi,
      diabetesPedigree,
      edad,
      familiaresConDiabetes,
    } = req.body

    if (
      pacienteID === undefined ||
      glucosa === undefined ||
      presionSangina === undefined ||
      bmi === undefined ||
      edad === undefined
    ) {
      res.status(400).json({ success: false, message: 'Faltan campos requeridos' })
      return
    }

    const [pacienteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT pacienteID, sexo
       FROM UsuarioSecundario
       WHERE pacienteID = ? AND usuarioPrincipalID = ?
       LIMIT 1`,
      [pacienteID, req.user.usuarioID],
    )

    if (pacienteRows.length === 0) {
      res.status(404).json({ success: false, message: 'Paciente no encontrado para este usuario' })
      return
    }

    const sexoPaciente = String(pacienteRows[0].sexo || '').toUpperCase()
    const esPacienteFemenino = sexoPaciente === 'F'
    const pedigreeManual = Number(diabetesPedigree)
    const familiaresArray = Array.isArray(familiaresConDiabetes) ? familiaresConDiabetes : []
    const pedigreeCalculado = calcularPedigreeDesdeFamiliares(familiaresArray)

    const payloadIA = {
      embarazos: esPacienteFemenino ? Number(embarazos || 0) : 0,
      glucosa: Number(glucosa),
      presionSangina: Number(presionSangina),
      insulina: Number(insulina || 0),
      bmi: Number(bmi),
      diabetesPedigree:
        familiaresArray.length > 0
          ? pedigreeCalculado
          : Number.isFinite(pedigreeManual) && pedigreeManual > 0
            ? pedigreeManual
            : PEDIGREE_MIN,
      edad: Number(edad),
    }

    const invalidPayload = Object.values(payloadIA).some((value) => !Number.isFinite(value))
    if (invalidPayload) {
      res.status(400).json({ success: false, message: 'Los valores clínicos deben ser numéricos' })
      return
    }

    const resultadoIA = await iaService.predecirRiesgo(payloadIA)

    // SkinThickness/grosorPiel está removida en la IA.
    // Guardamos 0 por compatibilidad con el esquema actual de MySQL.
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO DATOS_CLINICOS 
       (pacienteID, embarazos, glucosa, presionSangina, grosorPiel, insulina, bmi, diabetesPedigree, edad) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteID,
        payloadIA.embarazos,
        payloadIA.glucosa,
        payloadIA.presionSangina,
        0,
        payloadIA.insulina,
        payloadIA.bmi,
        payloadIA.diabetesPedigree,
        payloadIA.edad,
      ],
    )

    // Si existe trigger en DB lo sobreescribimos; si no existe, insertamos.
    await pool.execute(
      `INSERT INTO RESULTADO_IA (probabilidadPadecer, datosID)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         probabilidadPadecer = VALUES(probabilidadPadecer),
         fecha_prediccion = CURRENT_TIMESTAMP`,
      [resultadoIA.probabilidadPadecer, result.insertId],
    )

    const [resultadoIABD] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM RESULTADO_IA WHERE datosID = ?',
      [result.insertId],
    )

    res.status(201).json({
      success: true,
      message: 'Análisis completado',
      data: {
        datosID: result.insertId,
        probabilidad: resultadoIABD[0]?.probabilidadPadecer ?? resultadoIA.probabilidadPadecer,
        nivel_riesgo: resultadoIA.nivel_riesgo,
        recomendaciones: resultadoIA.recomendaciones,
      },
    })
  } catch (error: any) {
    console.error('Error en registrarDatosClinicos:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 2. Obtener Historial (La que faltaba en el error)
export const obtenerHistorialPaciente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autorizado' })
      return
    }
    const pacienteID = req.params.pacienteID
    const [historial] = await pool.execute<RowDataPacket[]>(
      `SELECT dc.*, ri.probabilidadPadecer 
       FROM DATOS_CLINICOS dc 
       LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID 
       WHERE dc.pacienteID = ? ORDER BY dc.fecha_registro DESC`,
      [pacienteID],
    )
    res.json({ success: true, data: historial })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 3. Get Dashboard (La otra que faltaba en el error)
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autorizado' })
      return
    }
    const [resumen] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT s.pacienteID) as total_pacientes, 
       COUNT(dc.datosID) as total_mediciones, 
       AVG(ri.probabilidadPadecer) as riesgo_promedio 
       FROM UsuarioPrincipal up 
       LEFT JOIN UsuarioSecundario s ON up.usuarioID = s.usuarioPrincipalID 
       LEFT JOIN DATOS_CLINICOS dc ON s.pacienteID = dc.pacienteID 
       LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID 
       WHERE up.usuarioID = ?`,
      [req.user.usuarioID],
    )

    const [ultimosResultados] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        s.nombre as nombre_paciente, 
        s.parentesco, 
        dc.datosID,
        dc.glucosa, 
        dc.bmi, 
        dc.fecha_registro,
        ri.probabilidadPadecer 
      FROM UsuarioSecundario s 
      JOIN DATOS_CLINICOS dc ON s.pacienteID = dc.pacienteID 
      LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID 
      WHERE s.usuarioPrincipalID = ? 
      ORDER BY dc.fecha_registro DESC 
      LIMIT 10`,
      [req.user.usuarioID],
    )

    res.json({ success: true, data: { resumen: resumen[0], ultimosResultados } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getDetalleDiagnostico = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autorizado' })
      return
    }

    const { datosID } = req.params

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
      [datosID, req.user.usuarioID],
    )

    if (detalle.length === 0) {
      res.status(404).json({ success: false, message: 'Registro no encontrado' })
      return
    }

    res.json({ success: true, data: detalle[0] })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
