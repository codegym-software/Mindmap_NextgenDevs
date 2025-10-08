# Build stage
FROM node:20 AS build
WORKDIR /app

# 1️⃣ Copy và cài đặt đầy đủ dependencies (bao gồm dev)
COPY package.json package-lock.json* ./
RUN npm install --include=dev
RUN npm install tailwindcss postcss autoprefixer

# hoặc nếu muốn chắc chắn:
# RUN npm install && npm install tailwindcss postcss autoprefixer -D

# 2️⃣ Copy source code
COPY . .

# 3️⃣ Build project
RUN npm run build

# -------------------------------

# Serve stage (nginx)
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
