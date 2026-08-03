FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache openssl
RUN rm -f package-lock.json && npm install

COPY . .
RUN ./node_modules/.bin/prisma generate

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser
EXPOSE 3001

CMD ["node", "src/server.js"]
