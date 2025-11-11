# =================================================================
# STAGE 1: The "Builder"
#
# This stage installs all dependencies (dev and prod),
# builds the TypeScript, and prunes dev dependencies.
# =================================================================
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files and install ALL dependencies
# We use 'npm ci' for faster, more reliable builds in CI/Docker
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Run the TypeScript build command (defined in your package.json)
# This will create the /app/dist folder
RUN npm run build

# Prune devDependencies to leave only runtime dependencies
RUN npm prune --production

# =================================================================
# STAGE 2: The "Final" Production Image
#
# This stage is a fresh, lightweight Node image.
# We ONLY copy the necessary built artifacts from Stage 1.
# =================================================================
FROM node:20-slim AS final

# Set working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy the pruned node_modules from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the compiled JavaScript from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Copy package.json (useful for 'npm start' or identifying the app)
COPY package.json .

# Expose the port your app runs on
EXPOSE 3000

# The command to run your compiled app
CMD ["node", "dist/src/server.js"]