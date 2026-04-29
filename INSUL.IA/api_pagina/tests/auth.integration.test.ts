import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = "test-secret";

const executeMock = vi.fn();

vi.mock("../src/db/connection", () => ({
  default: {
    execute: executeMock,
  },
}));

vi.mock("../src/utils/bcrypt.utils", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-pass"),
  comparePassword: vi.fn().mockResolvedValue(false),
}));

describe("auth routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("registra usuario principal", async () => {
    executeMock.mockResolvedValueOnce([[]]);
    executeMock.mockResolvedValueOnce([{ insertId: 101 }]);

    const { app } = await import("../src/index");
    const response = await request(app).post("/api/auth/register/principal").send({
      nombre: "Ana",
      sexo: "F",
      fechaNacimiento: "1990-01-02",
      correo: "ana@test.com",
      contraseña: "Abcd1234",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.usuarioID).toBe(101);
  });

  it("rechaza login inválido", async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const { app } = await import("../src/index");
    const response = await request(app).post("/api/auth/login").send({
      correo: "nobody@test.com",
      contraseña: "Abcd1234",
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });
});
