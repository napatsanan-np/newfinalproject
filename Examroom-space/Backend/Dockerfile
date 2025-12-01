# สเตจที่ 1: สร้าง binary
FROM golang:1.23-alpine AS builder

# ตั้งค่า working directory
WORKDIR /app

# คัดลอกไฟล์ go.mod และ go.sum ไปยัง working directory
COPY go.mod go.sum ./

# ดาวน์โหลด dependencies
RUN go mod download

# คัดลอกซอร์สโค้ดทั้งหมดไปยัง working directory
COPY . .

# สร้าง binary
RUN go build -o main .



# สเตจที่ 2: สร้าง runtime image
FROM alpine:latest

# ตั้งค่า working directory
WORKDIR /root/

# สร้างโฟลเดอร์ uploads
RUN mkdir /root/uploads


RUN mkdir /root/Exam-file


# คัดลอก binary จาก builder stage ไปยัง runtime stage
COPY --from=builder /app/main .


# เปิดพอร์ตที่แอปพลิเคชันใช้
EXPOSE 8080

# กำหนดคำสั่งที่ใช้ในการรันแอปพลิเคชัน
CMD ["./main"]

