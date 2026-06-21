FROM node:20-alpine

# Install OS dependencies needed for native modules (bcrypt) and Prisma client
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    build-base \
    python3 \
    curl \
    postgresql-client

WORKDIR /app

# Copy dependency configs first to utilize Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for local hot-reloaded development)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Set a basic docker healthcheck running every 30s, using curl against local /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Default CMD (can be overridden by entrypoint shell script)
CMD ["npx", "nodemon", "src/server.js"]
