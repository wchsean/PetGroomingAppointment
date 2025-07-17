# 1. Build stage
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# 2. Run stage
FROM node:20-alpine AS runner
WORKDIR /app

# 只複製必要檔案
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start"]
