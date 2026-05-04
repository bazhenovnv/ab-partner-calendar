FROM node:18-alpine

WORKDIR /app

# копируем package.json
COPY package*.json ./

RUN npm install

# копируем весь проект
COPY . .

# билд backend
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/apps/backend/main.js"]
