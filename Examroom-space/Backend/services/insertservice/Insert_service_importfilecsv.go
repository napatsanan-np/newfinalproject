package insertservice

import (
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

// ฟังก์ชันสำหรับตรวจสอบและแทนที่ค่าที่เป็นค่าว่าง ("") ด้วยค่า "--"
func safeString(value string) string {
	if value == "" {
		return "--" // ถ้าค่าในเซลล์เป็นค่าว่าง จะคืนค่า "--" กลับไป
	}
	return value // ถ้าไม่ใช่ค่าว่าง คืนค่าตามเดิมกลับไป
}

func sheetExists(sheets []string, sheetName string) bool {
	for _, sheet := range sheets {
		if sheet == sheetName {
			return true
		}
	}
	return false
}
func toLowerCaseList(sheets []string) []string {
	var lowerSheets []string
	for _, sheet := range sheets {
		lowerSheets = append(lowerSheets, strings.ToLower(sheet))
	}
	return lowerSheets
}

// ConvertExcelSerialDate converts Excel serial date or a date string in the format "MM-DD-YY" to "DD/MM/YYYY"
func ConvertExcelSerialDate(serialDateStr string) string {
	// Try to convert the string to an integer to see if it's an Excel serial date
	serialDate, err := strconv.Atoi(serialDateStr)
	if err != nil {
		// If it's not a valid integer, assume it's a date string like "MM-DD-YY"
		parsedDate, parseErr := time.Parse("01-02-06", serialDateStr)
		if parseErr != nil {
			// If it's not a valid date string either, return an empty string or handle the error
			return ""
		}
		// Format the date in "DD/MM/YYYY"
		return parsedDate.Format("02/01/2006")
	}

	// Excel starts counting from 1900-01-01 but Go requires a base date of 1899-12-30.
	baseDate := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)

	// Add the serial date (days) to the base date
	gregorianDate := baseDate.AddDate(0, 0, serialDate)

	// Return the date in "DD/MM/YYYY" format
	return gregorianDate.Format("02/01/2006")
}

// ฟังก์ชันสำหรับบันทึกไฟล์ลงในโฟลเดอร์ "uploads"
func (s *UseInsertService) SaveFile(file io.Reader, filename string) error {
	// สร้างไฟล์ใหม่ในโฟลเดอร์ "uploads" โดยใช้ชื่อไฟล์ที่รับเข้ามา
	out, err := os.Create("./uploads/" + filename)
	fmt.Println("Filename :: ", filename) // แสดงชื่อไฟล์ใน Console
	if err != nil {
		return fmt.Errorf("ไม่สามารถสร้างไฟล์เพื่อเขียนข้อมูลได้: %w", err) // ถ้าสร้างไฟล์ไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}
	defer out.Close() // ปิดไฟล์เมื่อทำงานเสร็จ

	_, err = io.Copy(out, file) // คัดลอกข้อมูลจาก `file` ลงในไฟล์ใหม่
	if err != nil {
		return fmt.Errorf("ไม่สามารถบันทึกไฟล์ได้: %w", err) // ถ้าบันทึกไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}
	return nil // ถ้าบันทึกไฟล์สำเร็จ ให้คืนค่า nil เพื่อบอกว่าไม่มีข้อผิดพลาด
}

// ฟังก์ชันสำหรับประมวลผลไฟล์ Excel ที่รับเข้ามา
func (s *UseInsertService) ProcessXLSX(filename string) error {
	// เปิดไฟล์ Excel จากโฟลเดอร์ "uploads"
	f, err := excelize.OpenFile("./uploads/" + filename)
	sheets := toLowerCaseList(f.GetSheetList())
	examTableExists := sheetExists(sheets, "examtable")
	roomExamExists := sheetExists(sheets, "roomexam")

	// Check for missing sheets and return appropriate error messages
	if !examTableExists && !roomExamExists {
		return fmt.Errorf("ไม่พบSheet roomexam และ examtable")
	} else if !examTableExists {
		return fmt.Errorf("ไม่พบSheet examtable")
	} else if !roomExamExists {
		return fmt.Errorf("ไม่พบSheet roomexam")
	}

	if err != nil {
		return fmt.Errorf("ไม่สามารถเปิดไฟล์ได้: %w", err) // ถ้าเปิดไฟล์ไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}
	defer f.Close() // ปิดไฟล์เมื่อทำงานเสร็จ

	// ประมวลผลแผ่นงาน (Sheet) "examtable"
	if err := s.processExamTable(f); err != nil {
		return fmt.Errorf("ไม่สามารถประมวลผลแผ่นงาน examtable ได้: %w", err)
	}

	// ประมวลผลแผ่นงาน (Sheet) "roomexam"
	if err := s.processRoomExam(f); err != nil {
		return fmt.Errorf("ไม่สามารถประมวลผลแผ่นงาน roomexam ได้: %w", err)
	}
	s.processProtor(f)

	os.Remove("./uploads/" + filename)
	return nil
}

// ฟังก์ชันสำหรับประมวลผลข้อมูลในแผ่นงาน "examtable" และบันทึกลงในฐานข้อมูล
func (s *UseInsertService) processExamTable(f *excelize.File) error {

	// ดึงข้อมูลแถวทั้งหมดจากแผ่นงาน "examtable"
	rows, err := f.GetRows("examtable")
	if err != nil {
		return fmt.Errorf("ไม่สามารถดึงข้อมูลจากแผ่นงานได้: %w", err) // ถ้าดึงข้อมูลไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}
	config, _ := s.GetConfig()
	log.Println("config", config[0].Id_config)

	// คำสั่ง SQL สำหรับเพิ่มข้อมูลลงในตาราง detail_exam และ examtable
	sqlDetail := `INSERT INTO public.detail_exam(id_config , ref, submit, sub_date, copy, page, recive, rec_date, qty, staple_conner, staple_apart, calculator, answesheet, answerbook_use, remark, color, lecturer , no_st) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16 ,$17 , $18);`
	sqlTable := `INSERT INTO public.examtable(id_config ,ref, edate, etime, hr, course, lecturer, no_st) VALUES ($1, $2, $3, $4, $5, $6, $7 , $8);`

	// วนลูปเพื่อประมวลผลข้อมูลแต่ละแถวจากแผ่นงาน "examtable"
	for _, row := range rows {
		fmt.Print(row[1])
		_, err = s.DB.Exec(sqlTable, config[0].Id_config, safeString(row[0]), ConvertExcelSerialDate((row[1])), safeString(row[2]), safeString(row[3]), safeString(row[4]), safeString(row[5]), safeString(row[6]))
		if err != nil {
			//log.Printf("ไม่สามารถเพิ่มแถวใน examtable ได้ %v: %v", row, err)
			continue // ข้ามไปยังแถวถัดไปหากเกิดข้อผิดพลาด
		}
		// ใช้ safeString ตรวจสอบค่าก่อนใส่ลงในคำสั่ง SQL
		_, err := s.DB.Exec(sqlDetail, config[0].Id_config, (row[0]), "ยังไม่ส่ง", time.Now(), 1, 1, false, time.Now(), 1, "เย็บมุมรวม", "1 ตอน(หน้า 1 - )", "ไม่อนุญาต", "ไม่ใช้", 0, safeString(row[19]), safeString(row[20]), "-", row[6])
		if err != nil {
			//log.Printf("ไม่สามารถเพิ่มแถวใน detail_exam ได้ %v: %v", row, err)
		}

	}
	log.Println("config::::::", config[0].Id_config)
	return nil
}

// ฟังก์ชันสำหรับประมวลผลข้อมูลในแผ่นงาน "roomexam" และบันทึกลงในฐานข้อมูล
func (s *UseInsertService) processRoomExam(f *excelize.File) error {
	// ดึงข้อมูลแถวทั้งหมดจากแผ่นงาน "roomexam"
	rows, err := f.GetRows("roomexam")
	if err != nil {
		return fmt.Errorf("ไม่สามารถดึงข้อมูลจากแผ่นงานได้: %w", err) // ถ้าดึงข้อมูลไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}

	// คำสั่ง SQL สำหรับเพิ่มข้อมูลลงในตาราง roomexam
	sql := `INSERT INTO roomexam 
(id_config, ref, no, edate, etime, hr, course, num_st, room_id, lecturer, seatrow, type_exam, group_exam) 
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`

	config, _ := s.GetConfig()
	// วนลูปเพื่อประมวลผลข้อมูลแต่ละแถวจากแผ่นงาน "roomexam"
	for _, row := range rows {
		// ใช้ safeString ตรวจสอบค่าก่อนใส่ลงในคำสั่ง SQL
		_, err = s.DB.Exec(sql, config[0].Id_config, safeString(row[0]), safeString(row[1]), ConvertExcelSerialDate((row[2])), safeString(row[3]), safeString(row[4]), safeString(row[5]), safeString(row[6]), s.getidroomexam(row[7]), safeString(row[8]), safeString(row[9]), safeString(row[10]), safeString(row[11]))
		if err != nil {
			log.Printf("ไม่สามารถเพิ่มแถวใน roomexam ได้ %v: %v", row, err)
		}

	}

	return nil
}

func (s *UseInsertService) processProtor(f *excelize.File) {
	// Get rows from the "Proctor" sheet
	rows, err := f.GetRows("Proctor")
	if err != nil {
		log.Fatal("Error reading rows from Proctor sheet:", err)
	}
	config, _ := s.GetConfig()
	for _, row := range rows {
		// Check if row has enough columns to prevent index out of range error
		if len(row) < 3 {
			fmt.Println("Skipping invalid row:", row)
			continue
		}

		parts := strings.Split(row[2], " , ")
		//fmt.Println("REF", row[0], "len", len(parts))

		for _, part := range parts {
			// SQL query with LIKE condition and ORDER BY user_id
			query := `
				SELECT user_id 
				FROM public.users 
				WHERE full_name LIKE '%' || $1 || '%' 
				ORDER BY user_id ASC;
			`

			rows, err := s.DB.Query(query, strings.TrimSpace(part)) // Trim whitespace from the part
			if err != nil {
				log.Printf("Error executing query for part '%s': %v\n", part, err)
				continue
			}

			found := false
			for rows.Next() {
				var userID string
				if err := rows.Scan(&userID); err != nil {
					log.Printf("Error scanning row for part '%s': %v\n", part, err)
					continue
				}

				// Insert into the proctor_assignments table
				sqlInsertProctor := `
					INSERT INTO public.proctor_assignments(id_config , user_id, ref, no) 
					VALUES ($1, $2, $3, $4 );
				`
				_, err = s.DB.Exec(sqlInsertProctor, config[0].Id_config, userID, row[0], row[1])
				if err != nil {
					log.Printf("Failed to insert into proctor_assignments for user_id '%s': %v\n", userID, err)
					continue
				}

				found = true
			}

			// Close rows to avoid resource leaks
			rows.Close()

			// Log if no matching user_id was found
			if !found {
				fmt.Printf("No matching user_id found for part '%s' in REF '%s'\n", part, row[0])
			}

			// Check for any errors during row iteration
			if err := rows.Err(); err != nil {
				log.Printf("Error during row iteration for part '%s': %v\n", part, err)
			}
		}
	}
}

func (s *UseInsertService) getidroomexam(room string) string {
	query := `SELECT room_id FROM public.rooms WHERE room_name LIKE $1 ORDER BY room_id ASC;`

	roomPattern := strings.TrimSpace(room) + "%" // เตรียม pattern ให้ปลอดภัย
	rows, err := s.DB.Query(query, roomPattern)
	if err != nil {
		log.Printf("Error executing query: %v", err)
		return "-"
	}
	defer rows.Close()

	var RoomId string
	for rows.Next() {
		if err := rows.Scan(&RoomId); err != nil {
			log.Printf("Error scanning row: %v", err)
			return "-"
		}
	}
	if RoomId == "" {
		return "-"
	}
	return RoomId
}

func (s *UseInsertService) checkdataintables() bool {
	// SQL queries to count rows in both tables
	sqlRoomExam := `SELECT COUNT(*) FROM roomexam;`
	sqlExamTable := `SELECT COUNT(*) FROM examtable;`

	var roomExamCount, examTableCount int

	// Check data in roomexam table
	err := s.DB.QueryRow(sqlRoomExam).Scan(&roomExamCount)
	if err != nil {
		log.Printf("Error checking roomexam table: %v", err)
		return false
	}

	// Check data in examtable table
	err = s.DB.QueryRow(sqlExamTable).Scan(&examTableCount)
	if err != nil {
		log.Printf("Error checking examtable table: %v", err)
		return false
	}

	// Return true only if both tables have data
	return roomExamCount > 0 && examTableCount > 0
}

func (s *UseInsertService) checkdatainProctor() bool {
	// SQL queries to count rows in both tables
	sql_proctor_assignments := `SELECT COUNT(*) FROM proctor_assignments;`

	var proctor_assignments_Count int

	// Check data in examtable table
	err := s.DB.QueryRow(sql_proctor_assignments).Scan(&proctor_assignments_Count)
	if err != nil {
		log.Printf("Error checking examtable table: %v", err)
		return false
	}

	// Return true only if both tables have data
	return proctor_assignments_Count > 0
}
