# INSUL.IA (Source of Truth)

Este directorio es la base oficial para backend y despliegue operativo.

## Estado de consolidación

- `INSUL.IA/api_pagina`: backend API oficial.
- `diabetes_ai_web`: servicio de IA oficial.
- `Insulinia-App-main`: snapshot legacy de referencia (solo lectura para evitar drift).

## Variables de entorno backend

Usa `api_pagina/.env.example` como plantilla.

Variables clave:

- `JWT_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `IA_API_URL`, `IA_PREDICT_PATH`, `IA_TIMEOUT_MS`
- `CORS_ORIGINS`

## Testing mínimo

### API (Vitest + Supertest)

```bash
cd api_pagina
npm run test
```

### Smoke E2E (Playwright)

```bash
cd api_pagina
E2E_BASE_URL=https://tu-api-url.vercel.app npm run test:e2e
```

### IA contratos (Pytest)

```bash
cd ../diabetes_ai_web
python3 -m pytest -q
```

## Deploy en Vercel

### API

Proyecto recomendado: `INSUL.IA/api_pagina` (contiene `vercel.json` y `api/index.ts`).

Configura en Vercel:

- `JWT_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `IA_API_URL`, `IA_PREDICT_PATH`, `IA_TIMEOUT_MS`
- `CORS_ORIGINS`

### IA

El servicio `diabetes_ai_web` puede requerir runtime y dependencias de ML que no siempre encajan en Functions estándar de Vercel. Si aplica limitación de tamaño/runtime:

- despliega IA en un proveedor dedicado (Railway/Render/Fly)
- apunta `IA_API_URL` del backend Vercel a ese endpoint.

## Rollback rápido

1. Re-deploy del deployment previo estable en Vercel.
2. Restaurar variables de entorno previas.
3. Ejecutar smoke:
   - `GET /api/health`
   - `E2E_BASE_URL=<api_url> npm run test:e2e`
