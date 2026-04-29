import { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";
import { verifyToken } from "../utils/jwt.utils";

export interface AuthRequest extends Request {
  user?: {
    usuarioID: number;
    correo: string;
  };
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("No autorizado", 401, "AUTH_REQUIRED"));
  }

  const payload = verifyToken(token);
  
  if (!payload) {
    return next(new AppError("No autorizado", 403, "AUTH_INVALID"));
  }

  req.user = payload;
  next();
};

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export const validateRequest =
  <T extends z.ZodTypeAny>(schema: T, source: "body" | "params" | "query" = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError("Solicitud inválida", 422, "VALIDATION_ERROR", result.error.flatten()));
    }
    (req as any)[source] = result.data;
    next();
  };

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof AppError ? err : new AppError("Error interno del servidor");
  const statusCode = error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  const isServerError = statusCode >= 500;

  console.error("request_error", {
    method: req.method,
    url: req.url,
    statusCode,
    code: error.code,
    message: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    details: error.details,
  });

  res.status(statusCode).json({
    success: false,
    code: error.code,
    message: isServerError ? "Ocurrió un error interno." : error.message,
  });
};
