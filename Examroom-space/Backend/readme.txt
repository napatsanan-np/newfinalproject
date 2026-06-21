Backend ของโครงงานปริญญานิพนธ์เรื่อง การพัฒนาระบบอํานวยการสอบ คณะวิทยาศาสตร์ ระยะที่ 2
 โดยในโฟดเดอร์ Backend จะประกอบไปด้วย
1.config ใช้สำหรับจัดการค่าตั้งค่าของระบบ การอ่านค่าจาก .envการตั้งค่า database ค่าพื้นฐานของ application
2.controllers ทำหน้าที่รับคำร้องขอ จาก client และส่งต่อไปยัง service ที่เกี่ยวข้องรวมถึงจัดการ response ที่จะส่งกลับไปยัง client
3.middleware ใช้สำหรับจัดการ request ก่อนถึง controller การ Login/JWT/permission
4.models ใช้สำหรับกำหนดโครงสร้างข้อมูล (Data Structure) ของระบบในรูปแบบ struct
5.route ใช้กำหนดเส้นทางของ API (Endpoint) และเชื่อมต่อกับ controller ที่เกี่ยวข้อง
6.service เป็นส่วนที่จัดการ Business Logic ของระบบ เช่น การประมวลผลข้อมูล การตรวจสอบเงื่อนไข และการทำงานหลักของแต่ละฟีเจอร์
7.main.go เป็นจุดเริ่มต้นของโปรแกรม (Entry Point) ทำหน้าที่ เริ่มต้น Web Server โหลด configuration เชื่อมต่อฐานข้อมูล กำหนด routing ของระบบ
8.Dockerfile ใช้สำหรับสร้างและรัน backend ในรูปแบบ container
9.go.mod ไฟล์ที่บอกว่าโปรเจกต์ใช้ package/library อะไรบ้าง และใช้เวอร์ชันไหน
10.go.sum ไฟล์ที่เก็บ checksum ของ package เพื่อให้มั่นใจว่าโหลดมาแล้ว



วิธีการใช้งาน
1. เปิด visual studio code 
2. เปิดโฟลเดอร์ EXAMROOM-SPACE (โฟรเดอร์ใหญ่)
3. เปิด Terminal
4. ใช้คำสั่ง cd backend
5. สร้าง images โดยใช้คำสั่ง docker build -t local/backend:fixed . เพื่อสร้าง images
6. ใช้คำสั่ง cd .. กลับไปที่ EXAMROOM-SPACE
7. ใช้คำสั่ง docker-compose up -d (ใช้สำหรับสร้างและรัน container ทั้งหมดที่กำหนดใน docker-compose.yml)


###หมายเหตุตรวจสอบไฟล์ .env ก่อนที่จะรันระบบใดๆ