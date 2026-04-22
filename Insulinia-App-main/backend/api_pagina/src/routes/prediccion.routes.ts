import { Router } from 'express'
import { authenticateToken } from '../middlewares/auth.middleware'
import {
  registrarDatosClinicos,
  obtenerHistorialPaciente,
  getDashboard,
  getDetalleDiagnostico,
} from '../controllers/prediccion.controller'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

router.post('/datos-clinicos', registrarDatosClinicos)
router.get('/historial/:pacienteID', obtenerHistorialPaciente)
router.get('/dashboard', getDashboard)

// Nueva ruta para el expediente detallado
router.get('/detalle/:datosID', getDetalleDiagnostico)

export default router
