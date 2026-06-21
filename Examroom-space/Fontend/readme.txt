Frontend ของโครงงานปริญญานิพนธ์เรื่อง การพัฒนาระบบอํานวยการสอบ คณะวิทยาศาสตร์ ระยะที่ 2

พัฒนาด้วย React เพื่อแสดงผลข้อมูลจาก Backend API และรองรับผู้ใช้งานหลายบทบาท (Admin(เจ้าหน้าที่ห้องอำนวยการสอบ) / Teacher(อาจารย์) / Proctor(กรรมการคุมสอบ))

# ภาพรวมระบบ

Frontend ทำหน้าที่เป็นส่วนติดต่อผู้ใช้ (User Interface) สำหรับ:
- ผู้ดูแลระบบ/เจ้าหน้าที่ห้องอำนวยการสอบ (Admin)
- อาจารย์ (Teacher)
- กรรมการคุมสอบ (Proctor)

โดยเชื่อมต่อกับ Backend ผ่าน REST API


# โครงสร้างของ Frontend
1. ใช้เก็บ package หรือ library ที่ติดตั้งจาก npm install
2. โฟลเดอร์ public ใช้เก็บไฟล์ static ที่ React จะนำไปใช้งาน
3.โฟลเดอร์ src (โค้ดหลักของระบบ)
   3.1) assets
	- ใช้เก็บ Font ภาษา และ Icon ต่างๆที่ใช้งาน
      3.2) Pre-Exam
	- ใช้เตรียมข้อมูลการสอบ เช่น อัปโหลดข้อมูล, จัดห้องสอบ,จัดกรรมการคุมสอบ
   3.3) Exam
	- เป็นการเปิดระบบห้องอำนวยการสอบโดยจะสามารถส่งข้อสอบภายในระบบได้
   3.4) Navbar
	- ใช้สร้างเมนูตามสิทธิ์ของผู้ใช้งาน
   3.5) Report
	- ใช้แสดงข้อมูลการสอบของแต่ละภาคปีการศึกษา
   3.6) System-Management
	- ใช้ในการตั้งค่าวัน-เวลาในการเปิดใช้งานระบบ
   3.7) App.jsx
	- ใช้ตรวจสอบสิทธิ์ (Role) ของผู้ใช้ เช่น อาจารย์ หรือ กรรมการคุมสอบ
   3.8) main.jsx
	- ใช้กำหนด Routing หลักของระบบ และเชื่อมแต่ละหน้าด้วย
   3.9) auth
	- ใช้จัดการระบบ authentication และ authorization

4. ไฟล์ .gitignore ใช้กำหนดไฟล์/โฟลเดอร์ที่ไม่ต้องการให้ Git track เช่น node_modules, .env
5. ไฟล์ package.json ใช้เก็บรายละเอียดของโปรเจกต์ เช่น dependencies (React, Axios) ,scripts (start, build)
6. ไฟล์ package-lock.json ใช้ล็อกเวอร์ชันของ package เพื่อให้ทุกคนในทีมใช้เวอร์ชันเดียวกัน

------------------------------------------------------------------------------------------------

# วิธีการรันและ deploy ใน Docker
1. สร้างไฟล์ .env โดย POSTGRES_HOST ต้องเป็น db
2. เปิด PowerShell เพื่อหา JWT_SECRET โดยรันคำสั่งนี้
	$bytes = New-Object byte[] 32
	System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
	Convert]::ToBase64String($bytes)
3. เปิด visual studio code 
4. เปิดโฟลเดอร์ EXAMROOM-SPACE (โฟรเดอร์ใหญ่)
5. เปิด Terminal
6. ใช้คำสั่ง cd fontend
7. ติดตั้ง dependencies ของโปรเจกต์ โดยใช้คำสั่ง npm install
8. สร้าง images โดยใช้คำสั่ง docker build -t local/frontend:fixed .เพื่อสร้าง images
9. ใช้คำสั่ง cd .. กลับไปที่ EXAMROOM-SPACE
10. ใช้คำสั่ง docker-compose up -d (ใช้สำหรับสร้างและรัน container ทั้งหมดที่กำหนดใน docker-compose.yml)
11.เข้าใช้งานผ่านเว็บเบราว์เซอร์ที่ http://localhost:3000

------------------------------------------------------------------------------------------------

# หมายเหตุ
- ต้องติดตั้ง Node.js ก่อนใช้งาน
-  ต้องหา JWT_SECRET ก่อน
- ควรเปิดโปรเจคที่เป็น EXAMROOM-SPACE ที่มีทั้ง frontend, backend, database
- ต้องสร้าง images ของ frontend และ backend ก่อนถึงจะรัน docker-compose  up -d
- หากพอร์ต 3000 ถูกใช้งานอยู่ ระบบจะมีการแจ้งเตือนเพื่อเปลี่ยนพอร์ต
- เช็ค path ใน main.jsx ให้ดีก่อนรันระบบ
