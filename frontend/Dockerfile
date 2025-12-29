# frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the project files
COPY . .

# Build for production
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# --- Production stage ---
FROM nginx:alpine

# Copy built files to nginx (Vite outputs to 'build' folder based on vite.config.js)
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx template config
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run uses port 8080
ENV PORT=8080
EXPOSE 8080

# nginx:alpine image auto-processes templates with envsubst
CMD ["nginx", "-g", "daemon off;"]
