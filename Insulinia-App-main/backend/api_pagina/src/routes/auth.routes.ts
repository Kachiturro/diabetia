import { Router } from "express";
import { 
  registerPrincipal, 
  registerSecundario, 
  login, 
  getProfile,
  getPacientes 
} from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Rutas públicas
router.post("/register/principal", registerPrincipal);
router.post("/login", login);

// Rutas protegidas
router.get("/profile", authenticateToken, getProfile);
router.post("/register/secundario", authenticateToken, registerSecundario);
router.get("/pacientes", authenticateToken, getPacientes);

export default router;
