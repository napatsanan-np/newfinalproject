package insertservice

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/xuri/excelize/v2"
)

// ฟังก์ชันสำหรับประมวลผลข้อมูลในแผ่นงาน "roomexam" และบันทึกลงในฐานข้อมูล
func (s *UseInsertService) ProcessProtor(filename string) error {
	// ดึงข้อมูลแถวทั้งหมดจากแผ่นงาน "roomexam"
	f, _ := excelize.OpenFile("./uploads/" + filename)
	rows, err := f.GetRows("condition_proctor")
	if err != nil {
		return fmt.Errorf("ไม่สามารถดึงข้อมูลจากแผ่นงานได้: %w", err) // ถ้าดึงข้อมูลไม่สำเร็จ ให้คืนค่าข้อผิดพลาด
	}

	// คำสั่ง SQL สำหรับเพิ่มข้อมูลลงในตาราง roomexam
	sql := `INSERT INTO condition_proctor (
    user_id ,  base_condition, special_dates, time_period,
            special_courses, time_restriction, pair_proctor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`

	// วนลูปเพื่อประมวลผลข้อมูลแต่ละแถวจากแผ่นงาน "roomexam"
	for _, row := range rows {
		// ใช้ safeString ตรวจสอบค่าก่อนใส่ลงในคำสั่ง SQL
		_, err = s.DB.Exec(sql, safeString(s.Getiduser(safeString(row[0]))), safeString(row[1]), safeString((row[2])), safeString(row[3]), safeString(row[4]), safeString(row[5]), safeString(row[6]))
		if err != nil {
			log.Printf("ไม่สามารถเพิ่มแถวใน condition_proctor ได้ %v: %v", row, err)
		}

	}
	return nil
}

func (s *UseInsertService) Getiduser(name string) string {
	// SQL query with TRIM applied in SQL itself
	query := `SELECT user_id FROM public.users WHERE full_name LIKE 
(SELECT CONCAT('%', (SELECT TRIM(' ' FROM $1) AS full_name), '%') AS full_name) ORDER BY user_id ASC;`

	// Execute the query
	rows, err := s.DB.Query(query, name) // Pass the parameter directly
	if err != nil {
		log.Printf("Error executing query: %v", err)
		return "-"
	}
	defer rows.Close()

	var NameId string
	// Iterate over rows
	for rows.Next() {
		if err := rows.Scan(&NameId); err != nil {
			log.Printf("Error scanning row: %v", err)
			return "-"
		}
	}
	// Check if RoomId is empty
	if NameId == "" {
		return "-"
	}

	return NameId
}

// ConvertExcelSerialDate converts Excel serial date or a date string in the format "MM-DD-YY" to "DD/MM/YYYY"
func (s *UseInsertService) ConvertExcelSerialDate(serialDateStr string) string {
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
