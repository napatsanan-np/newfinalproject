Repositories/
└─ Project1/
   ├─ Backend/              # เซิร์ฟเวอร์ Go + REST API
   ├─ Fontend/              # ระบบ Frontend ด้วย React
   ├─ Database/             # ไฟล์ SQL & Docker สำหรับ PostgreSQL
   └─ docker-compose/       # ไฟล์ Compose สำหรับการ deploy

Repositories/
├─ Project1/
│  ├─ Backend/
│  │  ├─ config/															# ไฟล์การตั้งค่าต่างๆ เช่น การเชื่อมต่อฐานข้อมูล, env variables
│  │  │  └─ config.go 											
│  │  ├─ controllers/  													# ตัวควบคุมการรับ request และส่ง response
│  │  │  ├─ contoller-RoomExam.go										#  ทำหน้าที่ รับ request และส่ง response ในส่วนการดึงข้อมูล RoomExam จากฐานข้อมูลและส่งผลลัพธ์ในรูปแบบ JSON
│  │  │  ├─ contoller-User.go											#  ทำหน้าที่ รับ request และส่ง response ในส่วนการดึงข้อมูล User จากฐานข้อมูลและส่งผลลัพธ์ในรูปแบบ JSON
│  │  │  ├─ controller-edit.go											#  ทำหน้าที่ รับ request และส่ง response ในส่วนการแก้ไข RoomExam และแก้ไข Role กรรมการห้องอำนวยการสอบจากฐานข้อมูลส่งผลลัพธ์ในรูปแบบ JSON               
│  │  │  ├─ controller-insert.go 										# ตัวควบคุมการรับ request และส่ง response สถานะการเพิ่มข้อมูล	
│  │  │  ├─ controller-login.go										# ตัวควบคุมการรับ request และส่ง response การ Log in
│  │  │  ├─ controller-proctor-edit.go								# ตัวควบคุมการรับ request และส่ง response การ แก้ไขภาระงานกรรมการคุมสอบ
│  │  │  ├─ controller-report.go										# ตัวควบคุมการรับ request และส่ง response การดึข้อมูลเพื่อทำ Report
│  │  │  ├─ controller-Student-sig.go									# ตัวควบคุมการรับ request และส่ง response การทำใบเซ็นชื่อนักศึกษา
│  │  │  ├─ controller.go
│  │  │  ├─ controllers_construct.go
│  │  │  ├─ controllers_del_deltable.go								# ตัวควบคุมการรับ request และส่ง response สถานะการลบข้อมูล
│  │  │  ├─ controllers_insert_filecsv.go								# ตัวควบคุมการรับ request และส่ง response เพื่อนำเข้าไฟล์ excel
│  │  │  ├─ controllers_showdata.go									# ตัวควบคุมการรับ request และส่ง response การทำใบเซ็นชื่อของนักศึกษา
│  │  │  ├─ controllers_update.go										# ตัวควบคุมการรับ request และส่ง response ข้อมูลในฐานข้อมูล
│  │  │  ├─ controllers-proctor.go										# ตัวควบคุมการรับ request และส่ง response การ แก้ไขภาระงานกรรมการคุมสอบ และบันทึภาระงาน
│  │  │  ├─ genkey.go													# ตัวควบคุมการรับ request และส่ง response TOKEN
│  │  │  └─ proctor.go													# ตัวควบคุมการรับ request และส่ง response เพื่อนำเข้าเงื่อนไขกรรมการคุมสอบ ไฟล์ excel
│  │  ├─ Exam-file/														# ไฟล์ตัวอย่างหรือไฟล์สำหรับการทดสอบ
│  │  │  ├─ Midterms.pdf
│  │  ├─ middleware/														# middleware สำหรับการจัดการ request ก่อนถึง controller
│  │  │  └─ Middleware.go
│  │  ├─ models/															# โครงสร้างข้อมูลและฟังก์ชันที่เกี่ยวข้องกับข้อมูล
│  │  │  └─ model.go
│  │  ├─ routes/															# การกำหนด routes และ endpoints ของ API
│  │  │  └─ routes.go
│  │  ├─ services/														# บริการและ business logic
│  │  │  ├─ deleteservice/
│  │  │  │  ├─ del_service_Alltable.go
│  │  │  │  ├─ get-config.go
│  │  │  │  └─ struct_del.go	
│  │  │  ├─ insertservice/
│  │  │  │  ├─ get-config.go
│  │  │  │  ├─ Insert_service_importfilecsv.go						# business logic การนำเข้าไฟล์excel
│  │  │  │  ├─ insert_service_proctor_assignment.go					# business logic การจัดกรรมการคุมสอบตามเงื่อนไขกรรมการคุมสอบ
│  │  │  │  ├─ insert_service_proctor_room_exam.go					# business logic การนำกรรมการคุมสอบที่ถูกจัดภาระงาน จัดลงห้องสอบ
│  │  │  │  ├─ insert_service_protor_condition_proctor.go			# business logic การนำเข้าเงื่อนไขกรรมการคมสอบด้วยไฟล์ excel
│  │  │  │  ├─ Insert-AutoExamroom-Lab.go
│  │  │  │  ├─ Insert-AutoExamroom.go
│  │  │  │  ├─ insert-condi-proctor.go
│  │  │  │  ├─ Insert-new-exam.go
│  │  │  │  ├─ insert-service.go
│  │  │  │  └─ struct_del.go
│  │  │  ├─ selectservice/
│  │  │  │  ├─ get-config.go
│  │  │  │  ├─ Select_service_Innerjoin.go
│  │  │  │  ├─ Select_service_InnerjoinRoomexamExamdetail.go
│  │  │  │  ├─ Select_service_InnerjoinUser.go						# business logic การรวมาราง user ละ user_role เข้าด้วยกัน
│  │  │  │  ├─ Select_service_report.go								# business logic การดึงข้อมูลต่างๆเพื่อทำ report
│  │  │  │  ├─ Select_service_role_teacher.go
│  │  │  │  ├─ Select_service_showjson.go
│  │  │  │  ├─ Select_struct.go
│  │  │  │  └─ Slect_service_login.go									# business logic เกี่ยวกับการ Log In
│  │  │  └─ updateservice/
│  │  │     ├─ Edit_DetailExam.go
│  │  │     ├─ edit_proctor_assignments.go							# business logic การแก้ไขภาระงานกรรมการคุมสอบ
│  │  │     ├─ get-config.go
│  │  │     ├─ StringToJson.go
│  │  │     └─ struct.go
│  │  ├─ Uploads/														# พื้นที่เก็บไฟล์ที่ถูกอัพโหลดจากผู้ใช้
│  │  │  ├─ condition_proctor (2).xlsx
│  │  │  ├─ condition_proctor.xlsx
│  │  │  ├─ f8d95a7d875da869 (1).pdf
│  │  │  ├─ กรรมการคุมสอบ กลางภาค ปลาย67.xlsx
│  │  │  └─ ทดลองจัดกรรมการปลายภาคปลาย67(1).xlsx
│  │  ├─ .env																# ตัวแปรสภาพแวดล้อม
│  │  ├─ Dockerfile
│  │  ├─ go.mod
│  │  ├─ go.sum
│  │  └─ main.go
│  ├─ Database/															
│  │  ├─ insert/
│  │  ├─ migrations/
│  │  ├─ backup.sql
│  │  ├─ Dockerfile
│  │  └─ init.sql
│  ├─ docker-compose/													# คำสั่งสำหรับสร้าง Docker image
│  │  ├─ docker-compose.api.yml
│  │  └─ docker-compose.fontend.yml
│  ├─ Fontend/
│  │  ├─ config/
│  │  │  └─ ImageConfig.js
│  │  ├─ public/
│  │  │  └─ vite.svg
│  │  ├─ scss/
│  │  │  ├─ custom.css
│  │  │  ├─ custom.css.map
│  │  │  └─ custom.scss
│  │  ├─ src/								
│  │  │  ├─ assets/
│  │  │  │  ├─ Fonts/									# Font ตัวอักษรต่างที่ใช้ภายในเว็ป
│  │  │  │  │  ├─ Kanit-Black.ttf
│  │  │  │  │  ├─ Kanit-BlackItalic.ttf
│  │  │  │  │  ├─ Kanit-Bold.ttf
│  │  │  │  │  ├─ Kanit-BoldItalic.ttf
│  │  │  │  │  ├─ Kanit-ExtraBold.ttf
│  │  │  │  │  ├─ Kanit-ExtraBoldItalic.ttf
│  │  │  │  │  ├─ Kanit-ExtraLight.ttf
│  │  │  │  │  ├─ Kanit-ExtraLightItalic.ttf
│  │  │  │  │  ├─ Kanit-Italic.ttf
│  │  │  │  │  ├─ Kanit-Light.ttf
│  │  │  │  │  ├─ Kanit-LightItalic.ttf
│  │  │  │  │  ├─ Kanit-Medium.ttf
│  │  │  │  │  ├─ Kanit-MediumItalic.ttf
│  │  │  │  │  ├─ Kanit-Regular.ttf
│  │  │  │  │  ├─ Kanit-SemiBold.ttf
│  │  │  │  │  ├─ Kanit-SemiBoldItalic.ttf
│  │  │  │  │  ├─ Kanit-Thin.ttf
│  │  │  │  │  └─ Kanit-ThinItalic.ttf
│  │  │  │  └─ Icon/									#รูปภาพใช้ภายในเว็ป
│  │  │  │     ├─ file-blank-regular-24.png
│  │  │  │     ├─ file-blank-solid-24.png
│  │  │  │     ├─ Img-home.jpg
│  │  │  │     ├─ su-logo_big.png
│  │  │  │     ├─ su-logo-new-nobg.png
│  │  │  │     ├─ su-logo-new.jpg
│  │  │  │     └─ upload-regular-24.png
│  │  │  ├─ Exam/
│  │  │  │  ├─ backup/
│  │  │  │  │  └─ backup.jsx
│  │  │  │  ├─ Labels/									#โฟลเดอร์ที่เก็บไฟล์ส่วนของการจัดการ Label
│  │  │  │  │  ├─ ExamCardExample.css
│  │  │  │  │  ├─ ExcelImportModal.jsx
│  │  │  │  │  ├─ Label-default.jsx
│  │  │  │  │  ├─ Label-special.jsx
│  │  │  │  │  ├─ Label-STUDENT.jsx
│  │  │  │  │  ├─ Label.jsx
│  │  │  │  │  ├─ LabelLayout-styles.css
│  │  │  │  │  ├─ Lable-time.jsx
│  │  │  │  │  ├─ logo.png
│  │  │  │  │  ├─ PrintableStudentList.js
│  │  │  │  │  └─ signature-sheet.jsx					#โฟลเดอร์ที่เก็บไฟล์ส่วนของการค้นหารายวิชา
│  │  │  │  ├─ Search-page/						
│  │  │  │  │  ├─ ExamdateRoleprottor.jsx
│  │  │  │  │  ├─ NewSearch.jsx
│  │  │  │  │  └─ Search-styles.css
│  │  │  │  └─ SentForm/								#โฟลเดอร์ที่เก็บไฟล์ส่วนของการจัดการเกี่ยวกับช่วงการสอบ
│  │  │  │     ├─ Printpdf/							#โฟลเดอร์ที่เก็บไฟล์ส่วนของการ Print รายละเอียดการสอบ
│  │  │  │     │  ├─ Altexamcalform-styles.css
│  │  │  │     │  ├─ Altexamcalform.jsx
│  │  │  │     │  ├─ ExamInfoComponent-styles.css
│  │  │  │     │  ├─ ExamInfoComponent.jsx
│  │  │  │     │  └─ total.js
│  │  │  │     ├─ AddExam.jsx							#ไฟล์ component ส่วนการเพิ่มรายวิชา
│  │  │  │     ├─ DownloadButton.jsx					#ไฟล์ component  ส่วนการ download ข้อสอบที่ถูกส่งมา
│  │  │  │     ├─ ExamSubmitButton.jsx					#ไฟล์ component ส่วนการ Upload ไฟล์ข้อสอบ
│  │  │  │     ├─ HomeTeacher.jsx						#ไฟล์ component ส่วนหน้า Home สำหรับ อาจารย์ และ กรรมการคุมสอบ
│  │  │  │     ├─ NewForm-fonts.css					#ไฟล์ font ที่ถูกใช้ใน New Form 
│  │  │  │     ├─ NewForm-styles.css					#ไฟล์ css ที่ถูกใช้ใน New Form 
│  │  │  │     ├─ NewForm.jsx							#ไฟล์ component หน้า Form สำหรับส่งข้อสอบโดยเจ้าหน้าที่ห้องข้อสอบ
│  │  │  │     └─ SentForm_roleteacher.jsx				#ไฟล์ component หน้า Form สำหรับส่งข้อสอบโดยอาจารย์เจ้าของวิชา
│  │  │  ├─ Navbar/
│  │  │  │  ├─ ModernNavbar-styles.css					#ไฟล์ css ที่ถูกใช้ใน ModernNavbar
│  │  │  │  └─ ModernNavbar.jsx						#ไฟล์ component ส่วนของ Navbar 
│  │  │  ├─ Pre-Exam/
│  │  │  │  ├─ AutoRoomExam/
│  │  │  │  │  ├─ AutoRoom.jsx
│  │  │  │  │  ├─ AvailableRooms.css							#ไฟล์ css ส่วนที่ทำหน้าที่เป็นหน้าจัดห้องสอบ และแก้ไขกรรมการห้องสอบ
│  │  │  │  │  ├─ Examroom.jsx								# ไฟล์ component ที่ทำหน้าที่เป็นหน้าจัดห้องสอบ และแก้ไขห้องสอบ
│  │  │  │  │  └─ ExamRoomManagement.css
│  │  │  │  ├─ ImportFile/
│  │  │  │  │  ├─ DropFileInput-styles.css					#ไฟล์ css นำเข้าไฟล์ excel แบบลากวางใส่กรอบ
│  │  │  │  │  ├─ DropFileInput.jsx							# ไฟล์ component ที่ทำหน้าที่ นำเข้าไฟล์ excel แบบลากวางใส่กรอบ
│  │  │  │  │  ├─ ExamTable-styles.css
│  │  │  │  │  ├─ ExamTable.jsx
│  │  │  │  │  ├─ Import_file_Csv-styles.css					#ไฟล์ css นำเข้าไฟล์ excel แบบกดปุ่มนำเข้า
│  │  │  │  │  ├─ Import_File_Csv.jsx							# ไฟล์ component ที่ทำหน้าที่ นำเข้าไฟล์ excel แบบกดปุ่มนำเข้า
│  │  │  │  │  ├─ RoomExam-styles.css
│  │  │  │  │  └─ RoomExam.jsx
│  │  │  │  └─ Proctor/
│  │  │  │     ├─ ProctorAsigner-styles.css					#ไฟล์ css ส่วนที่ทำหน้าที่เป็นหน้าจัดกรรมการคุมสอบ และแก้ไขกรรมการคุมสอบ
│  │  │  │     └─ ProctorAsigner.jsx							# ไฟล์ component ที่ทำหน้าที่เป็นหน้าจัดกรรมการคุมสอบ และแก้ไขกรรมการคุมสอบ
│  │  │  ├─ Report/
│  │  │  │  ├─ Examstat-styles.css								#ไฟล์ css ทำห้าที่รายานการส่งข้อสอบแต่ละภาค แบ่งตามรหัส 3 ตัวหน้า สามารถดูเป็นรายวิชาได้
│  │  │  │  ├─ Examstat.jsx										# ไฟล์ component ทำห้าที่รายานการส่งข้อสอบแต่ละภาค แบ่งตามรหัส 3 ตัวหน้า สามารถดูเป็นรายวิชาได้
│  │  │  │  ├─ Proctor-report-styles.css						#ไฟล์ css	ที่ทำหน้าที่รายงานการคุมสอบของกรรมการคุมสอบแต่ละคน
│  │  │  │  ├─ ProctorReport.jsx.jsx							# ไฟล์ component ที่ทำหน้าที่รายงานการคุมสอบของกรรมการคุมสอบแต่ละคน
│  │  │  │  ├─ Report-styles.css								#ไฟล์ css ที่ทำหน้าที่รายงานการใช้กระดาษแต่ละภาค สามารถดูเป็นรายวิชาได้
│  │  │  │  └─ Report.jsx										# ไฟล์ component ที่ทำหน้าที่รายงานการใช้กระดาษแต่ละภาค สามารถดูเป็นรายวิชาได้
│  │  │  ├─ System-Management/
│  │  │  │  └─ SystemManagementModule/
│  │  │  │     ├─ Configexam.jsx									# ไฟล์ component ที่ทำหน้าที่เซ็ทระบบการเปิดห้องสอบ
│  │  │  │     └─ TimeSettingsModal.jsx							# ไฟล์ component ที่ทำหน้าที่ดูวันเวลาที่เปิดห้องสอบ
│  │  │  ├─ User-Management/
│  │  │  │  ├─ Login/
│  │  │  │  │  ├─ Loginform-styles.css
│  │  │  │  │  ├─ Loginform.jsx
│  │  │  │  │  └─ SU_logo.png
│  │  │  │  └─ ProctorExam/
│  │  │  │     ├─ ProctorExamination.jsx  					# ไฟล์ component จัดการกรรมการห้องอำนวยการสอบ
│  │  │  │     └─ sweetAlertConfig.js
│  │  │  ├─ utils/
│  │  │  │  └─ ProtectedRoutes.jsx 					# ไฟล์ component กัน ROUTE ไม่ให้ใส่ตรง URL ได้ ถ้ายังไม่ได้ login
│  │  │  ├─ App.css
│  │  │  ├─ App.jsx
│  │  │  ├─ index.css
│  │  │  ├─ main.jsx                   # ไฟล์ component การจัดการ ROUTE และตั้งค่า link api หลังบ้าน
│  │  │  └─ su-logo_big.png
│  │  ├─ .gitignore
│  │  ├─ Dockerfile
│  │  ├─ eslint.config.js
│  │  ├─ index.html
│  │  ├─ nginx.conf
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ postcss.config.js
│  │  ├─ README.md
│  │  └─ vite.config.js
│  ├─ nginx/
│  │  ├─ certs/
│  │  │  ├─ _.sc.su.ac.th.key
│  │  │  └─ fullchain.crt
│  │  ├─ default.conf
│  │  ├─ docker-compose.yml
│  │  ├─ Dockerfile
│  │  └─ nginx.conf
│  └─ .gitignore
├─ package-lock.json
└─ package.json
