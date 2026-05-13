# ---------- BUILD ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package*.json apps/frontend/

RUN npm ci

COPY . .

WORKDIR /app/apps/frontend

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ---------- PRODUCTION ----------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]