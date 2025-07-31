# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without running prepare scripts
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gpx -u 1001

# Create cache directory and set permissions
RUN mkdir -p /home/gpx/.cache && \
    chown -R gpx:nodejs /app /home/gpx/.cache

USER gpx

# Expose port (if needed for testing)
EXPOSE 3000

# Set the entrypoint to gpx CLI
ENTRYPOINT ["node", "dist/cli.js"]