FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .
RUN npx prisma generate

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
