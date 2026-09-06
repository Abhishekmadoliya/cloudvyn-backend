# ── Stage 1: Build dependencies ──────────────────────────────────────────────
FROM node:22-slim AS deps

WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-slim AS production

# Install OS-level deps needed by sharp (native image processing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY package.json ./
COPY index.js ./
COPY src/ ./src/

# Copy Google Cloud service account key files (needed for Vertex AI / TTS)
# These are referenced via VERTEX_KEY_PATH env var
COPY marine-guard-438713-q1-4a078155e02a.json ./
COPY .env ./

# Create uploads directory (used by multer for temp file storage)
RUN mkdir -p /app/uploads

# Cloud Run sets PORT env var automatically (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port (informational; Cloud Run uses $PORT)
EXPOSE 8080

# Run as non-root for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Start the Express server
CMD ["node", "index.js"]
