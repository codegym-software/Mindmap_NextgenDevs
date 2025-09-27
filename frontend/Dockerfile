# Sử dụng image Node.js
FROM node:20.19 AS builder

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy toàn bộ mã nguồn
COPY . .

# Cài đặt dependencies
RUN npm install

# Build ứng dụng
RUN npm run build

# Sử dụng Nginx để phục vụ static files
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80

# Khởi chạy Nginx
CMD ["nginx", "-g", "daemon off;"]