# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
# Vite inlines env at build time, so VITE_API_URL must be set during `npm run build`.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Serve stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
