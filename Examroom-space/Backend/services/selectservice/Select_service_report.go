package selectservice

import (
	"database/sql"
	"fmt"
	"math"
)

// GetPaperUsageStats ดึงข้อมูลการใช้กระดาษ
func (s *UserSelectService) GetPaperUsageStats(academicYear, semester, phase string) (map[string]interface{}, error) {
	// หา id_config ตาม year/semester/(phase)
	configQuery := `
        SELECT id_config
        FROM exam_config
        WHERE academic_year = $1 AND semester = $2
    `
	args := []interface{}{academicYear, semester}
	if phase != "" {
		configQuery += " AND phase = $3"
		args = append(args, phase)
	}
	configQuery += " ORDER BY id_config DESC LIMIT 1"

	var idConfig int
	if err := s.DB.QueryRow(configQuery, args...).Scan(&idConfig); err != nil {
		return nil, fmt.Errorf("error getting exam config: %v", err)
	}

	query := `
        SELECT
            SUBSTRING(e.course, 1, 3) as dept_code,
            e.course,
            d.page,
            e.no_st,
            e.lecturer
        FROM detail_exam d
        JOIN examtable e ON d.ref = e.ref AND d.id_config = e.id_config
        WHERE d.id_config = $1
        ORDER BY dept_code, e.course
    `

	rows, err := s.DB.Query(query, idConfig)
	if err != nil {
		return nil, fmt.Errorf("error querying paper usage: %v", err)
	}
	defer rows.Close()

	backupRatio := 0.03 // เผื่อกระดาษจากนักเรียน 3%

	departments := make(map[string]map[string]interface{})
	totalPages := 0
	totalCourses := 0
	totalStudents := 0

	for rows.Next() {
		var deptCode, course, lecturer string
		var page, noSt sql.NullString

		if err := rows.Scan(&deptCode, &course, &page, &noSt, &lecturer); err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}

		pageNum := 0
		studentNum := 0
		if page.Valid {
			pageNum = parseInt(page.String)
		}
		if noSt.Valid {
			studentNum = parseInt(noSt.String)
		}

		adjustedStudents := int(math.Ceil(float64(studentNum) * (1 + backupRatio)))
		totalPapers := adjustedStudents * pageNum
		backup := totalPapers - (studentNum * pageNum)

		if _, exists := departments[deptCode]; !exists {
			departments[deptCode] = map[string]interface{}{
				"department_code": deptCode,
				"total_pages":     0,
				"total_students":  0,
				"courses":         make([]map[string]interface{}, 0),
			}
		}

		deptData := departments[deptCode]
		deptData["total_pages"] = deptData["total_pages"].(int) + totalPapers
		deptData["total_students"] = deptData["total_students"].(int) + adjustedStudents
		deptData["courses"] = append(deptData["courses"].([]map[string]interface{}), map[string]interface{}{
			"course_code":  course,
			"pages":        pageNum,
			"students":     adjustedStudents,
			"lecturer":     lecturer,
			"total_papers": totalPapers,
			"backup_pages": backup,
			"backup_ratio": backupRatio,
		})

		totalPages += totalPapers
		totalCourses++
		totalStudents += adjustedStudents
	}

	departmentsList := make([]map[string]interface{}, 0, len(departments))
	for _, dept := range departments {
		departmentsList = append(departmentsList, dept)
	}

	return map[string]interface{}{
		"paper_usage": departmentsList,
		"summary": map[string]interface{}{
			"total_pages":    totalPages,
			"total_courses":  totalCourses,
			"total_students": totalStudents,
			"academic_year":  academicYear,
			"semester":       semester,
			"phase":          phase,
			"backup_ratio":   backupRatio,
		},
	}, nil
}

// GetExamSubmissionStats ดึงข้อมูลการส่งข้อสอบ
func (s *UserSelectService) GetExamSubmissionStats(academicYear, semester, phase string) (map[string]interface{}, error) {
	// หา id_config ตาม year/semester/(phase)
	configQuery := `
        SELECT id_config
        FROM exam_config
        WHERE academic_year = $1 AND semester = $2
    `
	args := []interface{}{academicYear, semester}
	if phase != "" {
		configQuery += " AND phase = $3"
		args = append(args, phase)
	}
	configQuery += " ORDER BY id_config DESC LIMIT 1"

	var idConfig int
	if err := s.DB.QueryRow(configQuery, args...).Scan(&idConfig); err != nil {
		return nil, fmt.Errorf("error getting exam config: %v", err)
	}

	query := `
        SELECT
            SUBSTRING(e.course, 1, 3) as dept_code,
            e.course,
            d.submit as submit_status,
            d.sub_date,
            e.lecturer
        FROM detail_exam d
        JOIN examtable e ON d.ref = e.ref AND d.id_config = e.id_config
        WHERE d.id_config = $1
        ORDER BY dept_code, e.course
    `

	rows, err := s.DB.Query(query, idConfig)
	if err != nil {
		return nil, fmt.Errorf("error querying submissions: %v", err)
	}
	defer rows.Close()

	departments := make(map[string]map[string]interface{})

	for rows.Next() {
		var deptCode, course, submitStatus, subDate, lecturer string
		if err := rows.Scan(&deptCode, &course, &submitStatus, &subDate, &lecturer); err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}

		if _, exists := departments[deptCode]; !exists {
			departments[deptCode] = map[string]interface{}{
				"department_code": deptCode,
				"total_exams":     0,
				"submitted":       0,
				"pending":         0,
				"no_exam":         0,
				"courses":         make([]map[string]interface{}, 0),
			}
		}

		deptData := departments[deptCode]
		deptData["total_exams"] = deptData["total_exams"].(int) + 1

		statusType := classifySubmissionStatus(submitStatus)
		switch statusType {
		case "submitted":
			deptData["submitted"] = deptData["submitted"].(int) + 1
		case "no_exam":
			deptData["no_exam"] = deptData["no_exam"].(int) + 1
		default:
			deptData["pending"] = deptData["pending"].(int) + 1
		}

		deptData["courses"] = append(deptData["courses"].([]map[string]interface{}), map[string]interface{}{
			"course_code":     course,
			"lecturer":        lecturer,
			"submit_status":   submitStatus,
			"submission_date": subDate,
		})
	}

	departmentsList := make([]map[string]interface{}, 0, len(departments))
	for _, dept := range departments {
		departmentsList = append(departmentsList, dept)
	}

	return map[string]interface{}{
		"submissions": departmentsList,
		"summary": map[string]interface{}{
			"academic_year": academicYear,
			"semester":      semester,
			"phase":         phase,
		},
	}, nil
}

// GetProctorStats ดึงข้อมูลการคุมสอบ
func (s *UserSelectService) GetProctorStats(academicYear, semester, phase, userId string) (map[string]interface{}, error) {
	// หา id_config ตาม year/semester/(phase)
	configQuery := `
        SELECT id_config
        FROM exam_config
        WHERE academic_year = $1 AND semester = $2
    `
	argsCfg := []interface{}{academicYear, semester}
	if phase != "" {
		configQuery += " AND phase = $3"
		argsCfg = append(argsCfg, phase)
	}
	configQuery += " ORDER BY id_config DESC LIMIT 1"

	var idConfig int
	if err := s.DB.QueryRow(configQuery, argsCfg...).Scan(&idConfig); err != nil {
		return nil, fmt.Errorf("error getting exam config: %v", err)
	}

	query := `
        SELECT
            u.user_id,
            u.full_name,
            u.department,
            r.edate,
            r.etime,
            r.room_id,
            r.course,
            r.num_st
        FROM proctor_assignments p
        JOIN users u ON p.user_id = u.user_id
        JOIN roomexam r ON p.ref = r.ref AND p.no = r.no AND p.id_config = r.id_config
        WHERE p.id_config = $1
    `
	args := []interface{}{idConfig}

	if userId != "" {
		query += " AND p.user_id = $2"
		args = append(args, userId)
	}

	query += " ORDER BY u.full_name, r.edate, r.etime"

	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("error querying proctor stats: %v", err)
	}
	defer rows.Close()

	proctors := make(map[string]map[string]interface{})

	for rows.Next() {
		var uid, fullName, department, edate, etime, roomId, course, numSt string
		if err := rows.Scan(&uid, &fullName, &department, &edate, &etime, &roomId, &course, &numSt); err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}

		if _, exists := proctors[uid]; !exists {
			proctors[uid] = map[string]interface{}{
				"user_id":           uid,
				"full_name":         fullName,
				"department":        department,
				"total_assignments": 0,
				"assignments":       make([]map[string]interface{}, 0),
			}
		}

		proctorData := proctors[uid]
		proctorData["total_assignments"] = proctorData["total_assignments"].(int) + 1
		proctorData["assignments"] = append(proctorData["assignments"].([]map[string]interface{}), map[string]interface{}{
			"date":           edate,
			"time":           etime,
			"room":           roomId,
			"course_code":    course,
			"students_count": numSt,
		})
	}

	proctorsList := make([]map[string]interface{}, 0, len(proctors))
	for _, proctor := range proctors {
		proctorsList = append(proctorsList, proctor)
	}

	return map[string]interface{}{
		"proctors": proctorsList,
		"summary": map[string]interface{}{
			"academic_year": academicYear,
			"semester":      semester,
			"phase":         phase,
		},
	}, nil
}

// GetExamConfigs ดึงข้อมูล exam configs ทั้งหมด
func (s *UserSelectService) GetExamConfigs() ([]map[string]interface{}, error) {
	// ✅ เพิ่ม phase เข้าไปด้วย (สำคัญสำหรับ dropdown ในหน้าบ้าน)
	query := `
        SELECT id_config, academic_year, semester,
               COALESCE(phase,'') as phase,
               COALESCE(prep_period_start::text, '') as prep_period_start,
               COALESCE(prep_period_end::text, '') as prep_period_end,
               COALESCE(exam_period_start::text, '') as exam_period_start,
               COALESCE(exam_period_end::text, '') as exam_period_end,
               status
        FROM exam_config
        ORDER BY academic_year DESC, semester
    `

	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("error querying exam configs: %v", err)
	}
	defer rows.Close()

	configs := make([]map[string]interface{}, 0)
	for rows.Next() {
		var idConfig int
		var academicYear, semester, phase string
		var prepStart, prepEnd, examStart, examEnd string
		var status bool

		if err := rows.Scan(
			&idConfig, &academicYear, &semester, &phase,
			&prepStart, &prepEnd, &examStart, &examEnd, &status,
		); err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}

		config := map[string]interface{}{
			"id_config":         idConfig,
			"academic_year":     academicYear,
			"semester":          semester,
			"phase":             phase,
			"prep_period_start": prepStart,
			"prep_period_end":   prepEnd,
			"exam_period_start": examStart,
			"exam_period_end":   examEnd,
			"status":            status,
		}
		configs = append(configs, config)
	}

	return configs, nil
}

// GetActiveExamConfig ดึงข้อมูล exam config ที่กำลังใช้งาน
func (s *UserSelectService) GetActiveExamConfig() (map[string]interface{}, error) {
	// ✅ เพิ่ม phase เข้าไปด้วย
	query := `
        SELECT id_config, academic_year, semester,
               COALESCE(phase,'') as phase,
               COALESCE(prep_period_start::text, '') as prep_period_start,
               COALESCE(prep_period_end::text, '') as prep_period_end,
               COALESCE(exam_period_start::text, '') as exam_period_start,
               COALESCE(exam_period_end::text, '') as exam_period_end,
               status
        FROM exam_config
        WHERE status = true
        ORDER BY id_config DESC
        LIMIT 1
    `

	var idConfig int
	var academicYear, semester, phase string
	var prepStart, prepEnd, examStart, examEnd string
	var status bool

	if err := s.DB.QueryRow(query).Scan(
		&idConfig, &academicYear, &semester, &phase,
		&prepStart, &prepEnd, &examStart, &examEnd, &status,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no active exam config found")
		}
		return nil, fmt.Errorf("error querying active exam config: %v", err)
	}

	config := map[string]interface{}{
		"id_config":         idConfig,
		"academic_year":     academicYear,
		"semester":          semester,
		"phase":             phase,
		"prep_period_start": prepStart,
		"prep_period_end":   prepEnd,
		"exam_period_start": examStart,
		"exam_period_end":   examEnd,
		"status":            status,
	}

	return config, nil
}

// Helper function to convert string to int
func parseInt(s string) int {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	if err != nil {
		return 0
	}
	return result
}
