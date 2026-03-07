FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları önce kopyala (cache optimizasyonu)
COPY package*.json ./
RUN npm ci --only=production

# TypeScript derle
COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript ts-node --save-dev
RUN npm run build

# Log klasörü
RUN mkdir -p logs

# Sadece dist kalsın
FROM node:20-alpine
WORKDIR /app
COPY --from=0 /app/dist ./dist
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/package.json ./

RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "dist/index.js"]
