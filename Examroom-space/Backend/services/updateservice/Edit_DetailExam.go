package updateservice

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/lib/pq"
	"github.com/models"
)

func (s *Userupdateservice) Edit_DetailExam(data models.ExamDetail) {
	// Start a transaction
	tx, err := s.DB.Begin() // Begin a transaction
	if err != nil {
		log.Println("Error starting transaction:", err)
		return
	}

	// Ensure the transaction is either committed or rolled back
	defer func() {
		if r := recover(); r != nil {
			_ = tx.Rollback() // Rollback in case of a panic
			log.Println("Transaction rolled back due to panic:", r)
		}
	}()

	// Parse input JSON data
	exam := (data)
	configs, _ := s.GetConfig()
	// Prepare the update query
	log.Println("Filess::", exam.FileExam)
	updateQuery := `
		UPDATE public.detail_exam
	SET submit=$1, sub_date=$2, copy=$3, page=$4, recive=$5, rec_date=$6, qty=$7, staple_conner=$8, staple_apart=$9,
	    calculator=$10, answesheet=$11, answerbook_use=$12, remark=$13, color=$14, lecturer=$15 , files=$16, exam_type=$17
	WHERE ref=$18 and id_config = $19;
	`

	// Execute the update query within the transaction
	_, err = tx.Exec(updateQuery,
		exam.Submit,
		exam.SubDate,
		exam.Copy,
		exam.Page,
		exam.Recive,
		exam.RecDate,
		exam.Qty,
		exam.StapleConner,
		exam.StapleApart,
		exam.Calculator,
		exam.AnswerSheet,
		exam.AnswerBookUse,
		exam.Remark,
		exam.Color,
		exam.Lecturer,
		pq.Array(exam.FileExam), // Convert array to PostgreSQL array format
		exam.ExamType,
		exam.Ref,
		configs[0].Id_config,
	)
	if err != nil {
		log.Println("Error executing update query:", err)
		_ = tx.Rollback() // Rollback the transaction if there's an error
		return
	}

	// Fetch the latest exam configuration
	sqlConfig := `
		SELECT academic_year, semester, prep_period_start, prep_period_end, exam_period_start, exam_period_end
		FROM public.exam_config
		ORDER BY academic_year DESC, semester DESC
		LIMIT 1;
	`
	row := tx.QueryRow(sqlConfig) // Use the transaction context for the query
	var config models.ExamConfig
	err = row.Scan(
		&config.AcademicYear,
		&config.Semester,
		&config.PrepPeriodStart,
		&config.PrepPeriodEnd,
		&config.ExamPeriodStart,
		&config.ExamPeriodEnd,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Println("No exam configuration found.")
		} else {
			log.Println("Error scanning exam configuration:", err)
		}
		_ = tx.Rollback()
		return
	}

	log.Printf("Fetched exam configuration: %+v\n", config)

	// Insert into exam_submission_history
	insertQuery := `
		INSERT INTO public.exam_submission_history (
			id, semester, academic_year, course, page, submit, user_id, sub_date
		) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7);
	`

	_, err = tx.Exec(insertQuery,
		config.Semester,
		config.AcademicYear,
		s.GetCourse(exam.Ref),
		exam.Page,
		exam.Submit,
		(exam.Lecturer),
		exam.SubDate,
	)
	if err != nil {
		log.Println("Error executing insert query:", err)
		_ = tx.Rollback() // Rollback the transaction if there's an error
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Println("Error committing transaction:", err)
		_ = tx.Rollback() // Rollback if commit fails
		return
	}

	log.Println("Transaction committed successfully.")
}

func (s *Userupdateservice) Update_ExamConfigByYearSemester(data models.ExamConfig, academic_year string, semester string) error {
	// Create the SQL update query
	query := `
		UPDATE public.exam_config
		SET
			academic_year = $1,
			semester = $2,
			prep_period_start = $3,
			prep_period_end = $4,
			exam_period_start = $5,
			exam_period_end = $6
		WHERE academic_year = $7 AND semester = $8
	`
	log.Println("DATA CONFIG in service ", data)
	// Execute the update query
	_, err := s.DB.Exec(query, academic_year, semester, data.PrepPeriodStart, data.PrepPeriodEnd, data.ExamPeriodStart, data.ExamPeriodEnd,
		data.AcademicYear, data.Semester)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}
	log.Println("Edit succes DATA CONFIG in service ")
	// Return nil if the operation was successful
	return nil
}
func (s *Userupdateservice) Update_ExamConfigByStatus(data models.ExamConfig) error {
	// ตั้งค่าทุกแถวให้ status = false ก่อน
	query := `UPDATE public.exam_config SET status = $1;`
	_, err := s.DB.Exec(query, false)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	// 2) set true เฉพาะ ปี + ภาค + phase ที่เลือก
	query1 := `
		UPDATE public.exam_config
		SET status = $1
		WHERE academic_year = $2
		  AND semester = $3
		  AND phase = $4;
	`
	_, err = s.DB.Exec(
		query1,
		true,
		data.AcademicYear,
		data.Semester,
		data.Phase,
	)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	return nil
}


func (s *Userupdateservice) CheckUser(proctor string) string {
	// Split the input string into parts
	parts := strings.Split(proctor, " , ")

	for _, part := range parts {
		// SQL query with LIKE condition and ORDER BY user_id
		query := `
			SELECT user_id 
			FROM public.users 
			WHERE full_name LIKE '%' || $1 || '%' 
			ORDER BY user_id ASC;
		`

		// Execute the query
		rows, err := s.DB.Query(query, strings.TrimSpace(part))
		if err != nil {
			log.Printf("Error executing query for part '%s': %v\n", part, err)
			return ""
		}
		defer rows.Close()

		// Iterate through the result set
		for rows.Next() {
			var userID string
			if err := rows.Scan(&userID); err != nil {
				log.Printf("Error scanning row for part '%s': %v\n", part, err)
				return ""
			}

			// Return the first matching user_id
			return userID
		}

		// Check for any errors during row iteration
		if err := rows.Err(); err != nil {
			log.Printf("Error during row iteration for part '%s': %v\n", part, err)
			return ""
		}
	}
	return ""

}

func (s *Userupdateservice) GetCourse(ref int) string {
	// SQL query to fetch the course based on ref
	config, _ := s.GetConfig()
	sql := `
		SELECT course 
		FROM public.examtable 
		WHERE ref = $1 
		and id_config = $2 ORDER BY ref ASC  `

	// Variable to store the course
	var course string

	// Execute the query and scan the result into the course variable
	err := s.DB.QueryRow(sql, ref, config[0].Id_config).Scan(&course)
	if err != nil {

		// Handle other errors
		return ""
	}

	return course
}

func (s *Userupdateservice) Update_RoleExamProctor(data models.User) error {
	// Create the SQL update query
	query := `
		UPDATE public.user_role
	SET  role_id= 'PROCTOREXAMROOOM'
	WHERE user_id = $1 and role_id = 'PROCTOR';
	`

	// Execute the update query
	_, err := s.DB.Exec(query, data.UserID)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	// Return nil if the operation was successful
	return nil
}

func (s *Userupdateservice) Update_Roleroctor(data models.User) error {
	// Create the SQL update query
	query := `
		UPDATE public.user_role
	SET  role_id= 'PROCTOR'
	WHERE user_id = $1 and role_id = 'PROCTOREXAMROOOM';
	`
	//PROCTOR PROCTOREXAMROOOM
	// Execute the update query
	_, err := s.DB.Exec(query, data.UserID)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	// Return nil if the operation was successful
	return nil
}

func (s *Userupdateservice) Update_RoomExam(data models.RoomExam) error {
	// Create the SQL update query
	query := `UPDATE roomexam SET room_id = $1 , seatrow = $2 WHERE no = $3 and id_config = $4 `
	config, _ := s.GetConfig()
	//PROCTOR PROCTOREXAMROOOM
	// Execute the update query
	_, err := s.DB.Exec(query, data.Room_id, data.Seatrow, data.No, config[0].Id_config)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	// Return nil if the operation was successful
	return nil
}

func (s *Userupdateservice) Delete_RoomExam(data models.RoomExam) error {
	// Create the SQL update query
	query := `UPDATE roomexam SET room_id = '-' WHERE no = $1 and id_config = $2 `
	config, _ := s.GetConfig()
	//PROCTOR PROCTOREXAMROOOM
	// Execute the update query
	_, err := s.DB.Exec(query, data.No, config[0].Id_config)
	if err != nil {
		log.Println("Error executing update query:", err)
		return err
	}

	// Return nil if the operation was successful
	return nil
}

// UpdateRoom updates a room in the database
func (s *Userupdateservice) UpdateRoom(room models.Room) error {
	query := "UPDATE rooms SET room_name = $1, room_type = $2, capacity = $3 WHERE room_id = $4"
	_, err := s.DB.Exec(query, room.RoomName, room.RoomType, room.Capacity, room.RoomID)
	return err
}

// UpdateRoom updates a room in the database
func (s *Userupdateservice) UpdateBackup(data models.ExamConfig) error {
	query := "UPDATE exam_config SET backup_exam = $1 where semester = $2 and  academic_year = $3"
	_, err := s.DB.Exec(query, data.BackUp_exam, data.Semester, data.AcademicYear)
	return err
}
func (db *Userupdateservice) UpdateUser(user models.User) error {
	query := `UPDATE users SET username=$1, full_name=$2, department=$3 WHERE user_id=$4`
	_, err := db.DB.Exec(query, user.Username, user.FullName, user.Department, user.UserID)
	return err
}

func (s *Userupdateservice) UpdateDepartment(id string, name string, deptCodes []string) error {
	// สร้าง SQL statement สำหรับการค้นหาภาควิชา
	log.Println("id", id, "depcode", deptCodes)
	var dept models.Departments
	query := "SELECT id_dept FROM departments WHERE id_dept = $1" // ใช้ $1 สำหรับ PostgreSQL
	err := s.DB.QueryRow(query, id).Scan(&dept.Id_dept)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("ไม่พบภาควิชา")
		}
		return fmt.Errorf("เกิดข้อผิดพลาดในการค้นหาข้อมูล: %v", err)
	}

	// อัปเดตชื่อภาควิชา
	updateQuery := "UPDATE departments SET name_th = $1 WHERE id_dept = $2" // ใช้ $1, $2 สำหรับ PostgreSQL
	_, err = s.DB.Exec(updateQuery, name, dept.Id_dept)
	if err != nil {
		return fmt.Errorf("ไม่สามารถอัปเดตชื่อภาควิชาได้: %v", err)
	}

	// ลบรหัสกลุ่มเดิม
	deleteQuery := "DELETE FROM departments_group WHERE id_dept = $1" // ใช้ $1 สำหรับ PostgreSQL
	_, err = s.DB.Exec(deleteQuery, dept.Id_dept)
	if err != nil {
		return fmt.Errorf("ไม่สามารถลบรหัสกลุ่มเดิมได้: %v", err)
	}

	// เพิ่มรหัสกลุ่มใหม่
	insertQuery := "INSERT INTO departments_group (id_dept, id_dept_code) VALUES ($1, $2)" // ใช้ $1, $2 สำหรับ PostgreSQL
	for _, code := range deptCodes {
		_, err = s.DB.Exec(insertQuery, dept.Id_dept, code)
		if err != nil {
			return fmt.Errorf("ไม่สามารถเพิ่มรหัสกลุ่มใหม่ได้: %v", err)
		}
	}

	return nil
}
