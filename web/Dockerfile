# ============================
# 1️⃣ BUILD STAGE
# ============================
FROM node:20 AS build
WORKDIR /app

# Copy file cấu hình
COPY package*.json ./

# Cài tất cả dependencies (bao gồm dev)
RUN npm install --force

# Ép cài lại TypeScript và Vite global để tránh lỗi bin
RUN npm install -g typescript vite

# Copy source code
COPY . .

# Debug check các binary có tồn tại không
RUN echo "=== Kiểm tra binary ===" && which tsc && which vite && ls -la /usr/local/bin/

# Build project
RUN tsc --noEmit && vite build

# ============================
# 2️⃣ NGINX STAGE
# ============================
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
