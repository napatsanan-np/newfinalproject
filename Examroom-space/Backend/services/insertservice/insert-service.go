package insertservice

import (
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/models"
)

// Edit_System updates the exam configuration in the database
func (s *UseInsertService) Insert_System(data models.ExamConfig) error {
	query1 := `UPDATE public.exam_config SET status = $1;`
	_, err := s.DB.Exec(query1, false)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}
	// Create the SQL update query
	query := `
		INSERT INTO public.exam_config (
			academic_year,
			semester,
			prep_period_start,
			prep_period_end,
			exam_period_start,
			exam_period_end,
			status , 
			backup_exam
		) VALUES ($1, $2, $3, $4, $5, $6 , $7 , $8)
	`

	// Execute the insert query
	_, err = s.DB.Exec(query, data.AcademicYear, data.Semester, data.PrepPeriodStart, data.PrepPeriodEnd, data.ExamPeriodStart, data.ExamPeriodEnd, true, 3)
	if err != nil {
		log.Println("Error executing query:", err)
		return err
	}

	// Return nil if the operation was successful
	return nil
}

func (s *UseInsertService) InsertRoom(room models.Room) error {
	// First, get the highest existing room ID to generate the next one
	var maxID string
	err := s.DB.QueryRow("SELECT room_id FROM rooms WHERE room_id LIKE 'R%' ORDER BY room_id DESC LIMIT 1").Scan(&maxID)

	// Initialize the new room ID
	newID := "R001" // Default starting value

	// If we found a max ID, generate the next one
	if err == nil && maxID != "" {
		// Extract the numeric part
		numPart := maxID[1:] // Remove the 'R' prefix
		num, err := strconv.Atoi(numPart)
		if err == nil {
			// Increment and format with leading zeros
			num++
			newID = fmt.Sprintf("R%03d", num) // Format as R001, R002, etc.
		}
	}

	// Set the generated ID in the room object
	room.RoomID = newID

	// Insert the room with the generated ID
	query := "INSERT INTO rooms (room_id, room_name, room_type, capacity) VALUES ($1, $2, $3, $4)"
	_, err = s.DB.Exec(query, room.RoomID, room.RoomName, room.RoomType, room.Capacity)
	return err
}

// ฟังก์ชันเพื่อสร้าง ID ใหม่
func (c *UseInsertService) generateUserID() (string, error) {
	// ดึงข้อมูล ID ล่าสุดจากฐานข้อมูล
	var lastID string
	err := c.DB.QueryRow("SELECT user_id FROM users ORDER BY user_id DESC LIMIT 1").Scan(&lastID)
	if err != nil && err.Error() != "no rows in result set" {
		return "", err
	}

	// ถ้าไม่มี ID ก่อนหน้า ให้ใช้ 'U001'
	if lastID == "" {
		return "U001", nil
	}

	// แยกตัวเลขออกจาก ID เดิมแล้วเพิ่มค่า
	var num int
	_, err = fmt.Sscanf(lastID, "U%d", &num)
	if err != nil {
		return "", err
	}

	// เพิ่มตัวเลขขึ้นหนึ่ง
	num++

	// สร้าง ID ใหม่ในรูปแบบ Uxxx
	newID := fmt.Sprintf("U%03d", num)
	return newID, nil
}

func (db *UseInsertService) InsertUser(user models.User) error {
	// สร้าง user_id ใหม่

	userID, err := db.generateUserID()
	if err != nil {
		return err
	}

	// แทรกข้อมูลผู้ใช้ใหม่ลงในฐานข้อมูล
	query := `INSERT INTO users (user_id, username, full_name, department , password) VALUES ($1, $2, $3, $4 ,$5)`
	_, err = db.DB.Exec(query, userID, user.Username, user.FullName, user.Department, "88d83cb43ece1f036ee9569261ec247f")
	return err
}

func (s *UseInsertService) AddDepartment(department models.Departments) error {
	// ตรวจสอบว่ามีชื่อภาควิชานี้อยู่แล้วหรือยัง (ตามชื่อหรือ id ก็ได้)
	var count int
	checkQuery := "SELECT COUNT(*) FROM departments WHERE name_th = $1"
	err := s.DB.QueryRow(checkQuery, department.Name_th).Scan(&count)
	if err != nil {
		return fmt.Errorf("ไม่สามารถตรวจสอบภาควิชาได้: %v", err)
	}
	if count > 0 {
		return errors.New("มีภาควิชานี้อยู่แล้วในระบบ")
	}

	// หา id_dept ล่าสุด แล้ว +1
	var latestID int
	err = s.DB.QueryRow("SELECT COALESCE(MAX(id_dept), 0) FROM departments").Scan(&latestID)
	if err != nil {
		return fmt.Errorf("ไม่สามารถดึง id_dept ล่าสุดได้: %v", err)
	}
	newID := latestID + 1

	// เริ่ม transaction
	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("ไม่สามารถเริ่ม transaction ได้: %v", err)
	}

	// เพิ่มภาควิชาใหม่
	insertDeptQuery := "INSERT INTO departments (id_dept, name_th) VALUES ($1, $2)"
	_, err = tx.Exec(insertDeptQuery, newID, department.Name_th)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("ไม่สามารถเพิ่มภาควิชาได้: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("ไม่สามารถ commit ได้: %v", err)
	}

	log.Printf("เพิ่มภาควิชาใหม่เรียบร้อยแล้ว (id_dept = %d)\n", newID)
	return nil
}
