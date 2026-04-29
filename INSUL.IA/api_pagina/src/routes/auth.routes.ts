import { Router } from "express";
import { 
  registerPrincipal, 
  registerSecundario, 
  login, 
  getProfile,
  getPacientes 
} from "../controllers/auth.controller";
import { asyncHandler, authenticateToken, validateRequest } from "../middlewares/auth.middleware";
import { loginSchema, registerPrincipalSchema, registerSecundarioSchema } from "../schemas/auth.schema";

const router = Router();

// Rutas públicas
router.post("/register/principal", validateRequest(registerPrincipalSchema), asyncHandler(registerPrincipal));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));

// Rutas protegidas
router.get("/profile", authenticateToken, asyncHandler(getProfile));
router.post("/register/secundario", authenticateToken, validateRequest(registerSecundarioSchema), asyncHandler(registerSecundario));
router.get("/pacientes", authenticateToken, asyncHandler(getPacientes));

export default router;
