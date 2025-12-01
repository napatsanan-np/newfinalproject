package deleteservice

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/models"
)

func (s *UserDeleteService) Deltables(ref string) {
	fmt.Println("REF FROM SERVICE DEL ::", ref)
	config, _ := s.GetConfig()
	// แปลงค่า ref ให้เป็นจำนวนเต็มถ้า ref ไม่ว่าง
	var err error
	var num int
	if ref != "" {
		num, err = strconv.Atoi(ref)
		if err != nil {
			fmt.Println("Error parsing ref:", err)
			return
		}
	}
	log.Println("num, config[0].Id_config::", num, config[0].Id_config)
	// รันคำสั่งลบข้อมูลทีละคำสั่งแยกกัน
	if ref != "" {

		_, err = s.DB.Exec(`DELETE FROM proctor_assignments WHERE ref = $1 and id_config  = $2`, num, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from proctor_assignments:", err)
		}

		_, err = s.DB.Exec(`DELETE FROM roomexam WHERE ref = $1 and id_config  = $2`, num, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from roomexam:", err)
		}

		_, err = s.DB.Exec(`DELETE FROM public.detail_exam WHERE ref = $1 and id_config  = $2`, num, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from detail_exam:", err)
		}

		_, err = s.DB.Exec(`DELETE FROM examtable WHERE ref = $1 and id_config  = $2`, num, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from examtable:", err)
		}

	} else {
		_, err = s.DB.Exec(`DELETE FROM proctor_assignments where id_config  = $1`, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from proctor_assignments:", err)
		}
		_, err = s.DB.Exec(`DELETE FROM roomexam where id_config  = $1`, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from roomexam:", err)
		}

		_, err = s.DB.Exec(`DELETE FROM public.detail_exam where id_config  = $1`, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from detail_exam:", err)
		}

		_, err = s.DB.Exec(`DELETE FROM examtable where id_config  = $1`, config[0].Id_config)
		if err != nil {
			fmt.Println("Error deleting from examtable:", err)
		}

	}
	fmt.Println("Tables deleted successfully")
}

func (s *UserDeleteService) Delete_ExamConfigByYearSemester(data models.ExamConfig) error {
	// คำสั่ง DELETE เพื่อลบข้อมูลตาม academic_year และ semester
	query := `
		DELETE FROM public.exam_config
		WHERE academic_year = $1 AND semester = $2
	`
	_, err := s.DB.Exec(query, data.AcademicYear, data.Semester)
	if err != nil {
		log.Println("Error executing DELETE query:", err)
		return err
	}

	// อัปเดต status ของเรคอร์ดล่าสุดที่เหลืออยู่
	updateQuery := `
		UPDATE public.exam_config 
		SET status = TRUE 
		WHERE id_config = (SELECT id_config FROM public.exam_config ORDER BY id_config DESC LIMIT 1)
	`
	_, err = s.DB.Exec(updateQuery)
	if err != nil {
		log.Println("Error executing UPDATE query:", err)
		return err
	}

	return nil
}

func (s *UserDeleteService) Delete_Condition_Proctor() {
	// Create the SQL delete query
	query := `
		DELETE FROM public.condition_proctor;
	`

	// Execute the delete query
	_, err := s.DB.Exec(query)
	if err != nil {
		log.Println("Error executing query:", err)

	}

	// Return nil if the operation was successful

}

func (s *UserDeleteService) DeleteRoom(roomID string) error {
	tx, err := s.DB.Begin() // เริ่ม Transaction
	if err != nil {
		return err
	}

	// ลบจากตารางที่มี Foreign Key อ้างถึง rooms
	_, err = tx.Exec("Update roomexam set room_id = '-' WHERE room_id = $1", roomID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// ลบ room ออกจากตารางหลัก
	_, err = tx.Exec("DELETE FROM rooms WHERE room_id = $1", roomID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit() // ยืนยันการลบ
}

func (db *UserDeleteService) DeleteUser(userID string) error {
	// เริ่ม transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction error: %w", err)
	}

	// ลบความสัมพันธ์ใน user_role
	_, err = tx.Exec(`DELETE FROM user_role WHERE user_id = $1`, userID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("delete from user_role failed: %w", err)
	}

	// ลบผู้ใช้จากตาราง users
	res, err := tx.Exec(`DELETE FROM users WHERE user_id = $1`, userID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("delete from users failed: %w", err)
	}

	// ตรวจสอบว่ามีผู้ใช้ถูกลบจริงหรือไม่
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("check rows affected error: %w", err)
	}
	if rowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("user_id %d not found", userID)
	}

	// ยืนยันการลบ
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit error: %w", err)
	}

	return nil
}
func (s *UserDeleteService) DeleteDepartment(id string) error {
	// เริ่มต้นด้วยการตรวจสอบว่ามีภาควิชาที่จะลบหรือไม่
	var deptName string
	query := "SELECT id_dept FROM departments WHERE id_dept = $1"
	err := s.DB.QueryRow(query, id).Scan(&deptName)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("ไม่พบภาควิชาที่ต้องการลบ")
		}
		return fmt.Errorf("ไม่สามารถดึงข้อมูลภาควิชาจากฐานข้อมูลได้: %v", err)
	}

	// ลบรหัสกลุ่มที่เชื่อมโยงกับภาควิชานี้
	deleteGroupQuery := "DELETE FROM departments_group WHERE id_dept = $1"
	_, err = s.DB.Exec(deleteGroupQuery, id)
	if err != nil {
		return fmt.Errorf("ไม่สามารถลบรหัสกลุ่มของภาควิชานี้ได้: %v", err)
	}

	// ลบภาควิชาออกจากตาราง departments
	deleteDeptQuery := "DELETE FROM departments WHERE id_dept = $1"
	_, err = s.DB.Exec(deleteDeptQuery, id)
	if err != nil {
		return fmt.Errorf("ไม่สามารถลบภาควิชานี้ได้: %v", err)
	}

	// การลบภาควิชาสำเร็จ
	log.Printf("ลบภาควิชา '%s' (ID: %s) สำเร็จ", deptName, id)
	return nil
}
