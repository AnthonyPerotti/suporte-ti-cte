FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install --omit=dev

FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && node prisma/seed.js && node src/server.js"]
