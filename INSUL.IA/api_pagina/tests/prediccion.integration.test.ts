import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = "test-secret";

const executeMock = vi.fn();
const predecirRiesgoMock = vi.fn();

vi.mock("../src/db/connection", () => ({
  default: {
    execute: executeMock,
  },
}));

vi.mock("../src/services/ia.service", () => ({
  default: {
    predecirRiesgo: predecirRiesgoMock,
    verificarSalud: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../src/utils/bcrypt.utils", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-pass"),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

describe("prediccion routes", () => {
  const token = jwt.sign({ usuarioID: 9, correo: "owner@test.com" }, process.env.JWT_SECRET as string);

  beforeEach(() => {
    executeMock.mockReset();
    predecirRiesgoMock.mockReset();
  });

  it("registra evaluación clínica y guarda resultado IA", async () => {
    executeMock
      .mockResolvedValueOnce([[{ pacienteID: 20, sexo: "F", edadCalculada: 40 }]])
      .mockResolvedValueOnce([{ insertId: 450 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ probabilidadPadecer: 0.73 }]]);

    predecirRiesgoMock.mockResolvedValue({
      probabilidadPadecer: 0.73,
      nivel_riesgo: "alto",
      recomendaciones: ["Control clínico"],
    });

    const { app } = await import("../src/index");
    const response = await request(app)
      .post("/api/prediccion/datos-clinicos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        pacienteID: 20,
        embarazos: 1,
        glucosa: 160,
        presionSangina: 80,
        insulina: 90,
        bmi: 31.2,
        diabetesPedigree: 0.7,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.datosID).toBe(450);
    expect(response.body.data.probabilidad).toBe(0.73);
  });

  it("rechaza payload inválido por schema", async () => {
    const { app } = await import("../src/index");
    const response = await request(app)
      .post("/api/prediccion/datos-clinicos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        pacienteID: 20,
        glucosa: 10,
        presionSangina: 80,
        bmi: 31.2,
      });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});
