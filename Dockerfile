FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate && \
    npm run build && \
    npm prune --production

FROM node:24-alpine AS runner

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

RUN mkdir -p /app/public && chown nestjs:nodejs /app/public

COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated

USER nestjs

EXPOSE 8000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
