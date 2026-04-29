import { expect, test } from "@playwright/test";

test("smoke: health endpoint", async ({ request }) => {
  test.skip(!process.env.E2E_BASE_URL, "Define E2E_BASE_URL para ejecutar smoke contra un entorno activo.");
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  expect(payload.success).toBe(true);
  expect(typeof payload.iaDisponible).toBe("boolean");
});
