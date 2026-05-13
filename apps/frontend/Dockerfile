# ---------- BUILD ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package*.json apps/frontend/

RUN npm ci

COPY . .

WORKDIR /app/apps/frontend

RUN npm run build


# ---------- PRODUCTION ----------
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]