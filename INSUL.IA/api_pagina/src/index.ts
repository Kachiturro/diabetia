import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./db/connection";
import authRoutes from "./routes/auth.routes";
import prediccionRoutes from "./routes/prediccion.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
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
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "API Insul.IA funcionando",
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Bienvenido a la API de Insul.IA" });
});

// Manejo de rutas no encontradas (CORREGIDO)
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Ruta ${req.method} ${req.url} no encontrada` 
  });
});

// Manejo de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ 
    success: false, 
    message: "Error interno del servidor" 
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
      console.log(`✅ Base de datos: ${dbConnected ? "Conectada" : "Desconectada"}`);
    });
  } catch (error) {
    console.error("Error al iniciar servidor:", error);
    process.exit(1);
  }
};

startServer();
