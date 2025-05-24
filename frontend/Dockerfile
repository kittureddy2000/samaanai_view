# frontend/Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy public directory first to ensure it exists
COPY public ./public

# Copy the rest of the project files
COPY . .

# Build for production if needed
ARG ENVIRONMENT=production
ENV ENVIRONMENT=${ENVIRONMENT}
RUN if [ "$ENVIRONMENT" = "production" ]; then npm run build; fi

# --- Production stage ---
FROM nginx:alpine AS prod
COPY --from=base /app/build /usr/share/nginx/html

# Copy custom nginx config and startup script
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# Cloud Run expects the container to listen on $PORT
EXPOSE $PORT

CMD ["/start-nginx.sh"]

# --- Development stage ---
FROM node:18-alpine AS dev
WORKDIR /app
COPY --from=base /app /app
CMD ["npm", "start"]