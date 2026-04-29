import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./db/connection";
import authRoutes from "./routes/auth.routes";
import prediccionRoutes from "./routes/prediccion.routes";
import iaService from "./services/ia.service";
import { AppError, errorHandler } from "./middlewares/auth.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS"));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/prediccion", prediccionRoutes);

// Ruta de salud
app.get("/api/health", async (req, res) => {
  const iaDisponible = await iaService.verificarSalud();
  res.json({ 
    success: true, 
    message: "API Insul.IA funcionando",
    iaDisponible,
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Bienvenido a la API de Insul.IA" });
});

// Manejo de rutas no encontradas (CORREGIDO)
app.use((req, _res, next) => {
  next(new AppError(`Ruta ${req.method} ${req.url} no encontrada`, 404, "ROUTE_NOT_FOUND"));
});

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("No se pudo establecer conexión con MySQL");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
      console.log("✅ Base de datos: Conectada");
    });
  } catch (error) {
    console.error("Error al iniciar servidor:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, startServer };
