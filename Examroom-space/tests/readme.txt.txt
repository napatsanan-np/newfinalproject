อธิบายในส่วนของการ test ระบบ
 
โดยการ test ระบบจะใช้เครื่องมือที่เรียกว่า playwright ในการ test เป็นการ test แบบเสมือนเป็นผู้ใช้งานจริงแต่ละ flow การทำงานโดยจะแบ่งโฟดเดอร์ออกมามี
1.api การ test การเชื่อมต่อของเส้น api
2.ui การ test หน้าต่างการใช้งานของระบบต่อผูเใช้งาน
3.utils คือระบบมีการแยก configuration ออกจาก business logic โดยใช้ environment variables ทำให้สามารถเปลี่ยนค่า เช่น API URL ได้โดยไม่ต้องแก้ไขโค้ดหลัก รองรับการ deploy หลาย environment


วิธีการใช้งาน
1. เปิด visual studio code 
2. เปิด โฟดเดอร์ tests 
3. รันคำสั่ง npx playwright test
