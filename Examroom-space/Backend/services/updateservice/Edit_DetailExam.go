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

func (s *Userupdateservice) GetCourse(ref int, idConfig int) string {

	query := `
	SELECT course
	FROM public.examtable
	WHERE ref = $1 AND id_config = $2
	LIMIT 1;
	`

	var course string

	err := s.DB.QueryRow(query, ref, idConfig).Scan(&course)

	if err != nil {

		log.Println("Error fetching course:", err)

		return ""
	}

	return course
}

func (s *Userupdateservice) Edit_DetailExam(data models.ExamDetail) error {

	tx, err := s.DB.Begin()

	if err != nil {

		return err
	}

	exam := data

	updateQuery := `
	UPDATE public.detail_exam
	SET submit=$1,
	sub_date=$2,
	copy=$3,
	page=$4,
	recive=$5,
	rec_date=$6,
	qty=$7,
	staple_conner=$8,
	staple_apart=$9,
	calculator=$10,
	answesheet=$11,
	answerbook_use=$12,
	remark=$13,
	color=$14,
	lecturer=$15,
	files=$16,
	exam_type=$17
	WHERE ref=$18 AND id_config=$19;
	`

	result, err := tx.Exec(

		updateQuery,

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
		pq.Array(exam.FileExam),
		exam.ExamType,
		exam.Ref,
		exam.IdConfig,
	)

	if err != nil {

		tx.Rollback()

		log.Println("Error executing update query:", err)

		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {

		tx.Rollback()

		return err
	}

	if rowsAffected == 0 {

		tx.Rollback()

		return fmt.Errorf("detail_exam not found for ref=%d id_config=%d", exam.Ref, exam.IdConfig)
	}

	sqlConfig := `
	SELECT academic_year, semester
	FROM public.exam_config
	WHERE id_config = $1
	LIMIT 1;
	`

	var academicYear string
	var semester string

	err = tx.QueryRow(sqlConfig, exam.IdConfig).Scan(
		&academicYear,
		&semester,
	)

	if err != nil {

		tx.Rollback()

		if err == sql.ErrNoRows {

			return fmt.Errorf("exam_config not found")
		}

		return err
	}

	course := s.GetCourse(exam.Ref, exam.IdConfig)

	insertQuery := `
	INSERT INTO public.exam_submission_history (
	semester,
	academic_year,
	course,
	page,
	submit,
	user_id,
	sub_date,
	id_config
	)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
	`

	_, err = tx.Exec(

		insertQuery,

		semester,
		academicYear,
		course,
		exam.Page,
		exam.Submit,
		exam.Lecturer,
		exam.SubDate,
		exam.IdConfig,
	)

	if err != nil {

		tx.Rollback()

		log.Println("Error executing insert query:", err)

		return err
	}

	err = tx.Commit()

	if err != nil {

		tx.Rollback()

		return err
	}

	log.Println("Data updated successfully")

	return nil
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

func (s *Userupdateservice) Update_RoleExamProctor(data models.User) error {
	query := `
		INSERT INTO public.user_role (user_id, role_id)
		VALUES ($1, 'PROCTOREXAMROOOM');
	`

	_, err := s.DB.Exec(query, data.UserID)
	if err != nil {
		log.Println("Error executing insert query:", err)
		return err
	}

	return nil
}

func (s *Userupdateservice) Update_Roleroctor(data models.User) error {
	query := `
		DELETE FROM public.user_role
		WHERE user_id = $1
		  AND role_id = 'PROCTOREXAMROOOM';
	`

	_, err := s.DB.Exec(query, data.UserID)
	if err != nil {
		log.Println("Error executing delete query:", err)
		return err
	}

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

func (s *Userupdateservice) GetPendingOnlineExam() ([]map[string]interface{}, error) {
	query := `
		SELECT
			de.ref,
			de.id_config,
			et.course,
			COALESCE(de.lecturer, '') AS lecturer,
			COALESCE(et.edate, '') AS edate,
			COALESCE(et.etime, '') AS etime,
			COALESCE(et.hr, '') AS hr,
			COALESCE(et.no_st, '') AS no_st,
			COALESCE(de.page, '') AS page,
			COALESCE(de.copy, '') AS copy,
			COALESCE(de.submit, '') AS submit,
			COALESCE(de.exam_type, '') AS exam_type,
			COALESCE(de.sub_date, '') AS sub_date,
			COALESCE(
				STRING_AGG(DISTINCT r.room_name, ', ')
				FILTER (WHERE r.room_name IS NOT NULL AND r.room_name <> '-'),
				'-'
			) AS room_name
		FROM public.detail_exam de
		INNER JOIN public.examtable et
			ON de.ref = et.ref
			AND de.id_config = et.id_config
		LEFT JOIN public.roomexam re
			ON de.ref = re.ref
			AND de.id_config = re.id_config
		LEFT JOIN public.rooms r
			ON re.room_id = r.room_id
		WHERE de.submit = 'รอการยืนยัน'
		GROUP BY
			de.ref, de.id_config, et.course, de.lecturer,
			et.edate, et.etime, et.hr, et.no_st,
			de.page, de.copy, de.submit, de.exam_type, de.sub_date
		ORDER BY de.ref ASC;
	`

	rows, err := s.DB.Query(query)
	if err != nil {
		log.Println("Error querying pending online exams:", err)
		return nil, err
	}
	defer rows.Close()

	results := []map[string]interface{}{}

	for rows.Next() {
		var ref int
		var idConfig int
		var course string
		var lecturer string
		var eDate string
		var eTime string
		var hr string
		var noSt string
		var page string
		var copy string
		var submit string
		var examType string
		var subDate string
		var roomName string

		err := rows.Scan(
			&ref,
			&idConfig,
			&course,
			&lecturer,
			&eDate,
			&eTime,
			&hr,
			&noSt,
			&page,
			&copy,
			&submit,
			&examType,
			&subDate,
			&roomName,
		)
		if err != nil {
			log.Println("Error scanning pending online exam row:", err)
			return nil, err
		}

		results = append(results, map[string]interface{}{
			"ref":       ref,
			"id_config": idConfig,
			"course":    course,
			"lecturer":  lecturer,
			"eDate":     eDate,
			"eTime":     eTime,
			"hr":        hr,
			"NoSt":      noSt,
			"page":      page,
			"copy":      copy,
			"submit":    submit,
			"exam_type": examType,
			"sub_date":  subDate,
			"room_name": roomName,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *Userupdateservice) ReceiveOnlineExam(ref int, idConfig int, receiver string, subDate string) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}

	var page string
	updateQuery := `
		UPDATE public.detail_exam
		SET submit = $1
		WHERE ref = $2
		  AND id_config = $3
		  AND submit = 'รอการยืนยัน'
		RETURNING page;
	`

	err = tx.QueryRow(updateQuery, "ส่งแล้ว", ref, idConfig).Scan(&page)
	if err != nil {
		tx.Rollback()
		if err == sql.ErrNoRows {
			return fmt.Errorf("ไม่พบรายการที่มีสถานะรอการยืนยันสำหรับ ref=%d id_config=%d", ref, idConfig)
		}
		log.Println("Error updating receive online exam:", err)
		return err
	}

	sqlConfig := `
		SELECT academic_year, semester
		FROM public.exam_config
		WHERE id_config = $1
		LIMIT 1;
	`

	var academicYear string
	var semester string

	err = tx.QueryRow(sqlConfig, idConfig).Scan(&academicYear, &semester)
	if err != nil {
		tx.Rollback()
		if err == sql.ErrNoRows {
			return fmt.Errorf("exam_config not found")
		}
		return err
	}

	course := s.GetCourse(ref, idConfig)

	insertHistoryQuery := `
		INSERT INTO public.exam_submission_history (
			semester,
			academic_year,
			course,
			page,
			submit,
			user_id,
			sub_date,
			id_config
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
	`

	_, err = tx.Exec(
		insertHistoryQuery,
		semester,
		academicYear,
		course,
		page,
		"ส่งแล้ว",
		receiver,
		subDate,
		idConfig,
	)
	if err != nil {
		tx.Rollback()
		log.Println("Error inserting online receive history:", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		tx.Rollback()
		return err
	}

	log.Println("ReceiveOnlineExam updated successfully")
	return nil
}