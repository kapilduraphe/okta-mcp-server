 # Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript

# Copy package files
COPY package*.json ./

# Install dependencies without running prepare script
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and skip prepare script
RUN npm install --omit=dev --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Expose the port if needed (adjust based on your server configuration)
# EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]