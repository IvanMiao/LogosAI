# Multi-stage build - Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build production version
RUN npm run build

# Production stage - Serve static files with nginx
FROM nginx:alpine

# Copy build artifacts to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
