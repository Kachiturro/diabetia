# 1. Usar una imagen oficial de Node.js ligera y segura
FROM node:20-alpine

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de dependencias
COPY package*.json ./

# 4. Instalar TODAS las dependencias (incluyendo las de desarrollo para compilar TypeScript)
RUN npm install --include=dev

# 5. Copiar el resto del código fuente del backend
COPY . .

# 6. Compilar el código TypeScript a JavaScript (esto ejecuta el comando "tsc" y crea la carpeta dist/)
RUN npm run build

# 7. Exponer el puerto que definiste en tu index.ts
EXPOSE 3000

# 8. Comando para arrancar el servidor en producción
CMD ["npm", "start"]
