FROM node:18-alpine

WORKDIR /app

# зависимости
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/

RUN npm install

# копируем всё
COPY . .

# 🔥 ПЕРЕХОДИМ В backend
WORKDIR /app/apps/backend

# 🔥 ЯВНО УКАЗЫВАЕМ ПУТЬ К SCHEMA
RUN npx prisma generate --schema=./prisma/schema.prisma

# обратно
WORKDIR /app

# билд backend
RUN npm run build -w apps/backend

EXPOSE 3000

CMD ["node", "apps/backend/dist/src/main.js"]
