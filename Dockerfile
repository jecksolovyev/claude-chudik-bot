FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install deps first so this layer is cached when only source changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Drop root — the image's built-in unprivileged user
USER node

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "src/index.js"]
