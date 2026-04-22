import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.utils";

export interface AuthRequest extends Request {
  user?: {
    usuarioID: number;
    correo: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token no proporcionado" });
  }

  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(403).json({ success: false, message: "Token inválido" });
  }

  req.user = payload;
  next();
};
