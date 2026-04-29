import { Router } from "express";
import { asyncHandler, authenticateToken, validateRequest } from "../middlewares/auth.middleware";
import { 
  registrarDatosClinicos, 
  obtenerHistorialPaciente,
  getDashboard,
  getDetalleDiagnostico
} from "../controllers/prediccion.controller";
import { datosClinicosSchema, datosIdParamSchema, pacienteIdParamSchema } from "../schemas/prediccion.schema";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.post("/datos-clinicos", validateRequest(datosClinicosSchema), asyncHandler(registrarDatosClinicos));
router.get("/historial/:pacienteID", validateRequest(pacienteIdParamSchema, "params"), asyncHandler(obtenerHistorialPaciente));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/detalle/:datosID", validateRequest(datosIdParamSchema, "params"), asyncHandler(getDetalleDiagnostico));

export default router;
