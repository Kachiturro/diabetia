# Insulinia App (Frontend + API + MySQL)

Guia rapida para conectar el frontend con la API y la base de datos.

## 1) Requisitos externos (fuera del codigo)

1. Instala Node.js 20 o superior.
2. Instala Docker Desktop (recomendado para levantar MySQL rapido).
3. Asegura que estos puertos esten libres:
   1. `5173` (frontend)
   2. `3000` (API)
   3. `3306` (MySQL)

## 2) Configuracion de variables de entorno

### Frontend

En la raiz del proyecto (`Insulinia-App-main`), crea `.env` basado en `.env.example`:

```env
VITE_API_URL=http://localhost:3000
```

### Backend

En `backend/api_pagina`, crea `.env` basado en `.env.example`:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=insulinia_db
JWT_SECRET=pon_aqui_un_secreto_largo
IA_API_URL=http://localhost:8000
IA_PREDICT_PATH=/predict/ensemble
IA_TIMEOUT_MS=10000
```

Nota: el modelo IA usa 7 variables (`Pregnancies`, `Glucose`, `BloodPressure`, `Insulin`, `BMI`, `DiabetesPedigreeFunction`, `Age`).  
`SkinThickness/grosorPiel` ya no se usa para predecir.

## 3) Levantar la base de datos

Tienes 2 caminos.

### Opcion A: Docker Compose (recomendado)

Desde `Insulinia-App-main`:

```bash
docker compose up -d db
```

Esto crea MySQL y ejecuta automaticamente `backend/database.sql`.

### Opcion B: MySQL local manual

1. Abre tu cliente MySQL.
2. Ejecuta el script `backend/database.sql` completo.
3. Verifica que exista la base `insulinia_db`.

## 4) Levantar servicio IA (diabetes_ai_web)

En otra terminal:

```bash
cd ../diabetes_ai_web
docker build -t diabetes-ai-web .
docker run --rm -p 8000:8000 diabetes-ai-web
```

Health check esperado: `http://localhost:8000/health`

## 5) Instalar dependencias

### Frontend

```bash
npm install
```

### Backend

```bash
cd backend/api_pagina
npm install
```

## 6) Arrancar API y frontend

### API (terminal 1)

Desde `backend/api_pagina`:

```bash
npm run dev
```

Debes ver:
- `Servidor en http://localhost:3000`
- `Base de datos: Conectada`

### Frontend (terminal 2)

Desde `Insulinia-App-main`:

```bash
npm run dev
```

Abre `http://localhost:5173`.

## 7) Verificaciones de integracion

1. API viva:
   - `GET http://localhost:3000/api/health`
2. IA viva:
   - `GET http://localhost:8000/health`
3. Flujo completo:
   1. Registrate
   2. Inicia sesion
   3. Registra un paciente
   4. Crea una evaluacion
   5. Verifica que aparezca en perfil y detalle

## 8) Docker full-stack (opcional)

Si prefieres todo con Docker:

```bash
docker compose up --build
```

Levanta:
- MySQL en `3306`
- API en `3000`
- Frontend en `5173`
- La API consultará IA en `http://host.docker.internal:8000` (debes tener `diabetes_ai_web` corriendo en host).

## 9) Problemas comunes

1. `ECONNREFUSED` en MySQL:
   - Revisa `DB_HOST`, `DB_PORT`, usuario y password en `backend/api_pagina/.env`.
2. El frontend no conecta con API:
   - Revisa `VITE_API_URL` en `.env` de la raiz.
3. La API no puede consultar IA:
   - Revisa `IA_API_URL` y que `diabetes_ai_web` esté levantado en puerto `8000`.
4. `401 No autorizado`:
   - Inicia sesion otra vez para refrescar el token en `localStorage`.
