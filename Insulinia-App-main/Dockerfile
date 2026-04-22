# 1. Usar Node.js
FROM node:20-alpine

# 2. Directorio de trabajo
WORKDIR /app

# 3. Instalar dependencias de Vue
COPY package*.json ./
RUN npm install

# 4. Copiar todo el código de las interfaces
COPY . .

# 5. Exponer el puerto de Vite
EXPOSE 5173

# 6. Arrancar Vue permitiendo conexiones externas (--host)
CMD ["npm", "run", "dev", "--", "--host"]