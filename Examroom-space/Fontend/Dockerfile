# ใช้ Node.js image สำหรับการ build
FROM node:18-alpine AS build

# ตั้ง working directory
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json ไปยัง container
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install --legacy-peer-deps

# คัดลอก source code ไปยัง container
COPY . .

# สร้างโปรเจคสำหรับ production
RUN npm run build

# ใช้ Nginx image สำหรับการ serve build files
FROM nginx:alpine

# คัดลอกไฟล์ build ไปยัง Nginx directory
COPY --from=build /app/dist /usr/share/nginx/html

# คัดลอกไฟล์ config ของ Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# เปิด port 80
EXPOSE 80

# รัน Nginx
CMD ["nginx", "-g", "daemon off;"]
