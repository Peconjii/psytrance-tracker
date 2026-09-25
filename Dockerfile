# --- Build stage: produce the static site in dist/ ------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so they're cached and only reinstalled when the lockfile changes
COPY package.json package-lock.json ./
# npm ci trips over an npm lockfile bug with Tailwind's optional wasm packages on Linux;
# npm install still uses the versions pinned in package-lock.json
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- Run stage: nginx serves the built files -----------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
