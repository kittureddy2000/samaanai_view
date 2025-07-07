# frontend/Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# --- Debug: Check node_modules after install ---
RUN echo "--- After npm install, /app/node_modules content (first 15): ---" && ls -A /app/node_modules | head -n 15 && echo "--- End of /app/node_modules listing ---"
RUN echo "--- Checking for notistack after install: ---" && ls -d /app/node_modules/notistack* && echo "--- End of notistack check ---"
# --- End Debug ---

# Copy public directory first to ensure it exists
COPY frontend/public ./public

# Copy the rest of the project files
COPY frontend/. .
COPY nginx.conf /app/nginx.conf
COPY start-nginx.sh /app/start-nginx.sh

# Ensure nginx config and start script are present for later stage

# --- Debug: Check node_modules after COPY . . ---
RUN echo "--- After COPY . ., /app/node_modules content (first 15): ---" && ls -A /app/node_modules | head -n 15 && echo "--- End of /app/node_modules listing ---"
RUN echo "--- Checking for notistack after COPY . .: ---" && ls -d /app/node_modules/notistack* && echo "--- End of notistack check ---"
# --- End Debug ---

# Build for production if needed
ARG ENVIRONMENT=production
ARG REACT_APP_API_URL
ENV ENVIRONMENT=${ENVIRONMENT}
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN if [ "$ENVIRONMENT" = "production" ]; then npm run build; fi

# --- Production stage ---
FROM node:18-alpine AS prod
WORKDIR /app
COPY --from=base /app/build .
RUN npm install -g serve
EXPOSE 8080
# Cloud Run will set the PORT env variable, which 'serve' automatically uses.
CMD ["serve", "-s", "."]

# --- Development stage ---
FROM node:18-alpine AS dev
WORKDIR /app
COPY --from=base /app /app
CMD ["npm", "start"]