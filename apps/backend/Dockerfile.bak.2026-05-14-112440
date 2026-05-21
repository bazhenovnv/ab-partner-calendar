# ---------- BUILD ----------
FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY apps/backend/package*.json apps/backend/

RUN npm ci

COPY . .

WORKDIR /app/apps/backend

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build


# ---------- PRODUCTION ----------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"
