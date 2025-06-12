# Production Dockerfile optimized for Railway.app
FROM node:18-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install runtime dependencies only
RUN apk add --no-cache libc6-compat

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy additional necessary files
COPY --chown=nextjs:nodejs src/data ./src/data
COPY --chown=nextjs:nodejs health-check.js ./
COPY --chown=nextjs:nodejs railway.json ./

# Create data directory for SQLite (if using)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Railway will set PORT environment variable (usually 8080)
# Don't hardcode PORT - let Railway set it
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node health-check.js || exit 1

# Start the application
CMD ["node", "server.js"]