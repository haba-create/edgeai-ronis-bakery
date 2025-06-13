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

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy additional necessary files
COPY --chown=nextjs:nodejs src/data ./src/data
COPY --chown=nextjs:nodejs health-check.js ./

# Create data directory for SQLite with proper permissions
# This works for both local Docker Desktop and Railway
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose port (Railway will override PORT env var)
EXPOSE 3000

# Set default port but allow override
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]