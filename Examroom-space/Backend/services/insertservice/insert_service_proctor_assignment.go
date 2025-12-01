package insertservice

import (
	"database/sql"
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/models"
)

type AssignmentService struct {
	DB *sql.DB
}

func (s *UseInsertService) NewAssignmentService(db *sql.DB) *UseInsertService {
	return &UseInsertService{DB: db}
}

func (s *UseInsertService) ClearAssignments() error {
	config, _ := s.GetConfig()
	query := `delete FROM public.proctor_assignments where id_config = $1;`
	_, err := s.DB.Exec(query, config[0].Id_config)
	return err
}

func (s *UseInsertService) getDepartment(userID string) (string, error) {
	query := `SELECT department FROM users WHERE user_id = $1`
	var dept string
	err := s.DB.QueryRow(query, userID).Scan(&dept)
	if err != nil {
		if err == sql.ErrNoRows {
			// ถ้าไม่พบข้อมูล ให้ return ค่าว่างแทนที่จะ return error
			return "", nil
		}
		return "", err
	}
	return dept, nil
}

// getCourseDepartment ดึงชื่อภาควิชาจากรหัสวิชา
func (s *UseInsertService) getCourseDepartment(courseCode string) (string, error) {
	// ตัดรหัสภาควิชาออกมา (ส่วนแรกของรหัสวิชา)
	// รูปแบบรหัสวิชาคือ "XXXYYY" เช่น "519312" โดย "519" คือรหัสภาค
	if len(courseCode) < 3 {
		return "", nil
	}

	deptPrefix := courseCode[:3]

	// แปลงรหัสภาควิชาเป็นชื่อภาควิชา
	query := `
		SELECT department_name 
		FROM department_codes 
		WHERE department_code = $1`

	var deptName string
	err := s.DB.QueryRow(query, deptPrefix).Scan(&deptName)

	if err != nil {
		if err == sql.ErrNoRows {
			// ถ้าไม่พบข้อมูล ให้ return ค่าว่างแทนที่จะ return error
			return "", nil
		}
		return "", err
	}

	return deptName, nil
}

// groupRelatedExams จัดกลุ่มวิชาที่สอบในห้อง วัน และเวลาเดียวกัน
func (s *UseInsertService) groupRelatedExams(rooms []models.RoomExam) [][]models.RoomExam {
	// ใช้ map เพื่อจัดกลุ่มวิชาตามห้อง วัน และเวลาสอบ
	groupMap := make(map[string][]models.RoomExam)

	for _, room := range rooms {
		// สร้าง key ที่ใช้ในการจัดกลุ่ม: ห้อง+วัน+เวลา
		key := fmt.Sprintf("%s_%s_%s", room.Room_id, room.Edate, room.Etime)
		groupMap[key] = append(groupMap[key], room)
	}

	// แปลง map กลับเป็น slice ของกลุ่มวิชา
	groups := make([][]models.RoomExam, 0, len(groupMap))
	for _, group := range groupMap {
		groups = append(groups, group)
	}

	return groups
}

func (s *UseInsertService) isStatLabCourse(room models.RoomExam) bool {
	// Check if it's a lab room (handle both "lab" and "L:Lab" formats)
	if room.Type_exam != "lab" && room.Type_exam != "L:Lab" {
		return false
	}

	// Check if it's a stat department course (starting with 510)
	if len(room.Course) >= 3 && room.Course[:3] == "510" {
		return true
	}

	return false
}

func (s *UseInsertService) assignLabProctor(room models.RoomExam) ([]models.ProctorAssignment, error) {
	if room.Type_exam != "lab" && room.Type_exam != "L:Lab" {
		return nil, nil
	}

	// ตรวจสอบกรณีพิเศษสำหรับวิชา lab ของภาควิชาสถิติ
	if s.isStatLabCourse(room) {
		// สำหรับวิชา lab ภาควิชาสถิติ ใช้ U140 เท่านั้น
		var userID = "U140"
		return []models.ProctorAssignment{
			{
				UserID: userID,
				Ref:    room.Ref,
				Date:   room.Edate,
				No:     room.No,
			},
		}, nil
	}

	// สำหรับห้อง lab อื่นๆ ใช้ตามเงื่อนไขเดิม
	labStaffQuery := `
    SELECT user_id 
    FROM users 
    WHERE user_id IN (
        CASE 
            WHEN $1 IN ('R025', 'R026', 'R027', 'R028') THEN 
                'U162'
            WHEN $1 IN ('R029', 'R030') THEN 
                'U140'
            ELSE 
                'U161'
        END
    )`

	rows, err := s.DB.Query(labStaffQuery, room.Room_id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.ProctorAssignment
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		assignments = append(assignments, models.ProctorAssignment{
			UserID: userID,
			Ref:    room.Ref,
			Date:   room.Edate,
			No:     room.No,
		})
	}

	return assignments, nil
}
func (s *UseInsertService) assignCourseLecturer(room models.RoomExam) (models.ProctorAssignment, error) {
	if room.Lecturer == "" {
		return models.ProctorAssignment{}, nil
	}

	query := `
        SELECT user_id 
        FROM condition_proctor 
        WHERE user_id = $1 AND base_condition != 'ไม่จัดคุมสอบ'`

	var userID string
	err := s.DB.QueryRow(query, room.Lecturer).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return models.ProctorAssignment{}, nil
		}
		return models.ProctorAssignment{}, err
	}

	return models.ProctorAssignment{
		UserID: userID,
		Ref:    room.Ref,
		Date:   room.Edate,
		No:     room.No,
	}, nil
}

func (s *UseInsertService) assignPairProctors(room models.RoomExam, conditions []models.ProctorCondition) ([]models.ProctorAssignment, error) {
	// ถ้าไม่ใช่ห้อง lab ให้ return ค่าว่าง
	if room.Type_exam != "lab" {
		return nil, nil
	}

	var assignments []models.ProctorAssignment

	query := `
        SELECT c1.user_id, c2.user_id
        FROM condition_proctor c1
        JOIN condition_proctor c2 ON c1.pair_proctor = c2.pair_proctor
        WHERE c1.pair_proctor != 'ไม่มี'
        AND c1.user_id < c2.user_id`

	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var userID1, userID2 string
		if err := rows.Scan(&userID1, &userID2); err != nil {
			return nil, err
		}

		assignments = append(assignments,
			models.ProctorAssignment{
				UserID: userID1,
				Ref:    room.Ref,
				Date:   room.Edate,
				No:     room.No,
			},
			models.ProctorAssignment{
				UserID: userID2,
				Ref:    room.Ref,
				Date:   room.Edate,
				No:     room.No,
			},
		)
	}

	return assignments, nil
}

func (s *UseInsertService) getProctorsByDepartment(deptName string, conditions []models.ProctorCondition) ([]models.ProctorCondition, error) {
	var deptProctors []models.ProctorCondition

	for _, proctor := range conditions {
		if proctor.User_id == "" {
			continue
		}

		// ดึงภาควิชาของกรรมการ
		proctorDept, err := s.getDepartment(proctor.User_id)
		if err != nil {
			log.Printf("Error getting proctor department: %v", err)
			continue
		}

		// ถ้าภาควิชาตรงกัน ให้เพิ่มลงในรายชื่อ
		if proctorDept == deptName {
			deptProctors = append(deptProctors, proctor)
		}
	}

	return deptProctors, nil
}

// ฟังก์ชัน canAssignProctor ที่ปรับปรุงเพื่อให้คนที่ขอคุมวันเสาร์-อาทิตย์เท่านั้น จะไม่ถูกจัดให้คุมในวันธรรมดา
func (s *UseInsertService) canAssignProctor(proctor models.ProctorCondition, room models.RoomExam) bool {
	// 1. ตรวจสอบเงื่อนไขพื้นฐาน: ไม่จัดคุมสอบ
	if proctor.BaseCondition == "ไม่จัดคุมสอบ" {
		return false
	}

	// แปลงวันที่สอบเป็นวันในสัปดาห์
	weekday, err := s.convertDateToWeekday(room.Edate)
	if err != nil {
		log.Printf("Error converting date to weekday: %v", err)
		// หากแปลงไม่ได้ ให้ใช้การตรวจสอบอื่นต่อไป
	} else {
		isWeekend := weekday == "เสาร์" || weekday == "อาทิตย์"

		// 2.1 ตรวจสอบกรณีพิเศษสำหรับคนที่ขอคุมเฉพาะวันเสาร์-อาทิตย์
		if proctor.BaseCondition == "ขอคุม" &&
			(strings.Contains(proctor.SpecialDates, "เสาร์") || strings.Contains(proctor.SpecialDates, "อาทิตย์")) {

			// ถ้าเป็นวันปกติ (จันทร์-ศุกร์) และกรรมการขอคุมเฉพาะวันเสาร์-อาทิตย์
			// จะไม่จัดให้คุมในวันปกติเด็ดขาด
			if !isWeekend {
				return false // ไม่จัดให้คุมในวันปกติ
			}

			// ถ้าเป็นวันหยุด (เสาร์-อาทิตย์) ให้ตรวจสอบว่าตรงกับวันที่ขอคุมหรือไม่
			if (weekday == "เสาร์" && !strings.Contains(proctor.SpecialDates, "เสาร์")) ||
				(weekday == "อาทิตย์" && !strings.Contains(proctor.SpecialDates, "อาทิตย์")) {
				return false // ไม่ตรงกับวันที่ขอคุม
			}

			// ถ้าผ่านเงื่อนไขข้างต้น หมายความว่ากรรมการขอคุมวันเสาร์-อาทิตย์ และวันสอบตรงกับที่ขอ
			// ให้ตรวจสอบเงื่อนไขอื่นต่อไป
		}

		// 2.2 ตรวจสอบเงื่อนไข "ไม่คุม" วันเสาร์-อาทิตย์
		if proctor.BaseCondition == "ไม่คุม" &&
			(strings.Contains(proctor.SpecialDates, "เสาร์") || strings.Contains(proctor.SpecialDates, "อาทิตย์")) {

			// ถ้าเป็นวันหยุด และกรรมการขอไม่คุมวันนั้น
			if (weekday == "เสาร์" && strings.Contains(proctor.SpecialDates, "เสาร์")) ||
				(weekday == "อาทิตย์" && strings.Contains(proctor.SpecialDates, "อาทิตย์")) {
				return false // ไม่จัดให้คุมตามที่ขอ
			}
		}
	}

	// 3. ตรวจสอบวันที่เจาะจง
	if proctor.SpecialDates != "ไม่มี" {
		// ตรวจสอบว่าเป็นวันที่ (เช่น "18 March 2568") ไม่ใช่วันในสัปดาห์
		if !strings.Contains(proctor.SpecialDates, "เสาร์") &&
			!strings.Contains(proctor.SpecialDates, "อาทิตย์") &&
			!strings.Contains(proctor.SpecialDates, "จันทร์") &&
			!strings.Contains(proctor.SpecialDates, "อังคาร") &&
			!strings.Contains(proctor.SpecialDates, "พุธ") &&
			!strings.Contains(proctor.SpecialDates, "พฤหัสบดี") &&
			!strings.Contains(proctor.SpecialDates, "ศุกร์") {

			// ถ้าเป็นวันที่เจาะจง ให้ตรวจสอบตามเงื่อนไขพื้นฐาน
			if proctor.BaseCondition == "วันที่เจาะจง" {
				// ถ้าเป็นวันที่ต้องการคุม ต้องเป็นวันนั้นเท่านั้น
				return room.Edate == proctor.SpecialDates
			} else if proctor.BaseCondition == "ไม่คุม" {
				// ถ้าเป็นวันที่ไม่ต้องการคุม ห้ามเป็นวันนั้น
				if room.Edate == proctor.SpecialDates {
					return false
				}
			}
		}
	}
	// 4. ตรวจสอบช่วงเวลา (เช้า/บ่าย)
	if proctor.TimePeriod != "ไม่มี" {
		switch proctor.TimePeriod {
		case "เช้า":
			if !strings.Contains(room.Etime, "09:00") && !strings.Contains(room.Etime, "8:30") {
				return false
			}
		case "บ่าย":
			if !strings.Contains(room.Etime, "13:00") && !strings.Contains(room.Etime, "13:30") {
				return false
			}
		case "เต็มวัน":
			// อนุญาตให้คุมได้ทั้งวัน
		}
	}

	// 5. ตรวจสอบวิชาเจาะจง
	if proctor.SpecialCourses != "ไม่มี" {
		// ถ้าเป็นวิชาที่ระบุ ให้ตรวจสอบตามเงื่อนไขพื้นฐาน
		if proctor.BaseCondition == "วิชาเจาะจง" {
			// ถ้าเป็นวิชาที่ต้องการคุม ต้องเป็นวิชานั้นเท่านั้น
			return room.Course == proctor.SpecialCourses
		}
	}

	// 6. ตรวจสอบข้อจำกัดเวลา
	if proctor.TimeRestriction != "ไม่มี" {
		if proctor.TimeRestriction == "น้อยกว่า 3 ชั่วโมง" {
			// ตรวจสอบว่าการสอบใช้เวลาน้อยกว่า 3 ชั่วโมงหรือไม่
			examHours, err := strconv.Atoi(room.Hr)
			if err != nil {
				log.Printf("Error parsing exam hours: %v", err)
			} else {
				if examHours >= 3 {
					return false
				}
			}
		}
	}

	// 7. ตรวจสอบเงื่อนไข "ไม่คุมห้องใหญ่"
	if proctor.BaseCondition == "ไม่คุมห้องใหญ่" {
		// ตรวจสอบจำนวนนักศึกษาในห้อง
		numStudents, err := strconv.Atoi(room.Num_st)
		if err != nil {
			log.Printf("Error parsing number of students: %v", err)
		} else {
			// กำหนดให้ห้องใหญ่คือห้องที่มีนักศึกษามากกว่า 50 คน
			if numStudents > 50 {
				return false
			}
		}
	}

	return true
}

// ฟังก์ชันแปลงวันที่เป็นวันในสัปดาห์ (วันเสาร์, วันอาทิตย์, ฯลฯ)
func (s *UseInsertService) convertDateToWeekday(dateStr string) (string, error) {
	// รองรับหลายรูปแบบวันที่
	formats := []string{
		"2 January 2006",  // 17 March 2568
		"_2 January 2006", // รูปแบบที่อาจมีช่องว่างนำหน้าวันที่
		"02/01/2006",      // 17/03/2568
		"2/1/2006",        // 17/3/2568
		"January 2, 2006", // March 17, 2568
	}

	var date time.Time
	var err error

	// ลองแปลงวันที่ด้วยทุกรูปแบบ
	for _, format := range formats {
		date, err = time.Parse(format, dateStr)
		if err == nil {
			break
		}
	}

	if err != nil {
		return "", fmt.Errorf("ไม่สามารถแปลงวันที่: %s", dateStr)
	}

	// แปลงปี พ.ศ. เป็น ค.ศ. ถ้าจำเป็น
	year := date.Year()
	if year > 2500 {
		year = year - 543
		date = time.Date(year, date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	}

	// แปลงวันในสัปดาห์เป็นภาษาไทย
	weekday := date.Weekday()
	thaiWeekdays := map[time.Weekday]string{
		time.Sunday:    "อาทิตย์",
		time.Monday:    "จันทร์",
		time.Tuesday:   "อังคาร",
		time.Wednesday: "พุธ",
		time.Thursday:  "พฤหัสบดี",
		time.Friday:    "ศุกร์",
		time.Saturday:  "เสาร์",
	}

	return thaiWeekdays[weekday], nil
}

// ฟังก์ชัน helper เพื่อตรวจสอบว่าเป็นวันเสาร์-อาทิตย์หรือไม่
func (s *UseInsertService) isWeekend(dateStr string) bool {
	weekday, err := s.convertDateToWeekday(dateStr)
	if err != nil {
		log.Printf("Error converting date to weekday: %v", err)
		return false
	}

	return weekday == "เสาร์" || weekday == "อาทิตย์"
}

// ฟังก์ชันเพื่อจัดกรรมการตามเงื่อนไขวันเสาร์-อาทิตย์
func (s *UseInsertService) assignWeekendProctors(rooms []models.RoomExam, conditions []models.ProctorCondition) []models.ProctorAssignment {
	var assignments []models.ProctorAssignment
	assignedTimeSlots := make(map[string]bool)

	// 1. ดึงเฉพาะกรรมการที่ขอคุมวันเสาร์-อาทิตย์
	var weekendProctors []models.ProctorCondition
	for _, condition := range conditions {
		if condition.BaseCondition == "ขอคุม" &&
			(strings.Contains(condition.SpecialDates, "เสาร์") || strings.Contains(condition.SpecialDates, "อาทิตย์")) {
			weekendProctors = append(weekendProctors, condition)
		}
	}

	// 2. ดึงเฉพาะห้องสอบที่เป็นวันเสาร์-อาทิตย์
	var weekendRooms []models.RoomExam
	for _, room := range rooms {
		weekday, err := s.convertDateToWeekday(room.Edate)
		if err != nil {
			log.Printf("Error converting date to weekday: %v", err)
			continue
		}

		if weekday == "เสาร์" || weekday == "อาทิตย์" {
			weekendRooms = append(weekendRooms, room)
		}
	}

	// 3. จัดกลุ่มห้องสอบตามวัน เวลา และห้อง
	roomGroups := s.groupRelatedExams(weekendRooms)

	// เรียงลำดับห้องตามวันและเวลา
	sort.Slice(roomGroups, func(i, j int) bool {
		if len(roomGroups[i]) == 0 || len(roomGroups[j]) == 0 {
			return false
		}

		if roomGroups[i][0].Edate != roomGroups[j][0].Edate {
			return roomGroups[i][0].Edate < roomGroups[j][0].Edate
		}
		return roomGroups[i][0].Etime < roomGroups[j][0].Etime
	})

	// 4. จัดกรรมการให้แต่ละกลุ่มห้อง
	for _, roomGroup := range roomGroups {
		if len(roomGroup) == 0 {
			continue
		}

		representativeRoom := roomGroup[0]
		weekday, _ := s.convertDateToWeekday(representativeRoom.Edate)

		// นับจำนวนนักศึกษาในห้องและคำนวณจำนวนกรรมการที่ต้องการ
		totalStudents := 0
		for _, room := range roomGroup {
			students, _ := strconv.Atoi(room.Num_st)
			totalStudents += students
		}

		numProctorsNeeded := CalculateProctorsNeeded(totalStudents)

		// จัดกรรมการที่ขอคุมวันเสาร์-อาทิตย์ให้กับห้องนี้
		// เรียงลำดับตามภาระงาน (น้อยไปมาก)
		sort.SliceStable(weekendProctors, func(i, j int) bool {
			return s.getProctorWorkload(weekendProctors[i].User_id) < s.getProctorWorkload(weekendProctors[j].User_id)
		})

		assignedCount := 0
		for _, proctor := range weekendProctors {
			if assignedCount >= numProctorsNeeded {
				break
			}

			// ตรวจสอบว่ากรรมการต้องการคุมวันนี้หรือไม่
			if (weekday == "เสาร์" && !strings.Contains(proctor.SpecialDates, "เสาร์")) ||
				(weekday == "อาทิตย์" && !strings.Contains(proctor.SpecialDates, "อาทิตย์")) {
				continue
			}

			// ตรวจสอบว่ากรรมการยังไม่ถูกจัดในช่วงเวลานี้
			timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
			if !assignedTimeSlots[timeSlotKey] {
				assignments = append(assignments, models.ProctorAssignment{
					UserID: proctor.User_id,
					Ref:    representativeRoom.Ref,
					Date:   representativeRoom.Edate,
					No:     representativeRoom.No,
				})

				assignedTimeSlots[timeSlotKey] = true
				assignedCount++
			}
		}
	}

	return assignments
}

// ฟังก์ชันใหม่เพื่อดึงภาระงานของกรรมการ
func (s *UseInsertService) getProctorWorkload(userID string) int {
	query := `
		SELECT COUNT(*) 
		FROM proctor_assignments 
		WHERE user_id = $1`

	var count int
	err := s.DB.QueryRow(query, userID).Scan(&count)
	if err != nil {
		log.Printf("Error getting proctor workload: %v", err)
		return 0
	}

	return count
}

// ฟังก์ชันเพื่อจัดกรรมการตามเงื่อนไขวิชาเจาะจง
func (s *UseInsertService) assignSpecialCourseProctors(room models.RoomExam, conditions []models.ProctorCondition) []models.ProctorAssignment {
	var assignments []models.ProctorAssignment

	for _, condition := range conditions {
		if condition.BaseCondition == "วิชาเจาะจง" && condition.SpecialCourses == room.Course {
			assignments = append(assignments, models.ProctorAssignment{
				UserID: condition.User_id,
				Ref:    room.Ref,
				Date:   room.Edate,
				No:     room.No,
			})
		}
	}

	return assignments
}

func (s *UseInsertService) AssignProctors(rooms []models.RoomExam, conditions []models.ProctorCondition) ([]models.ProctorAssignment, error) {
	var allAssignments []models.ProctorAssignment
	workload := make(map[string]int)
	timeSlots := make(map[string]bool)

	// 1. จัดกรรมการสำหรับวันเสาร์-อาทิตย์ก่อน
	weekendAssignments := s.assignWeekendProctors(rooms, conditions)

	// บันทึกช่วงเวลาที่ถูกจัดไปแล้ว
	for _, assignment := range weekendAssignments {
		timeSlotKey := fmt.Sprintf("%s:%s:%s", assignment.Date, "weekend", assignment.UserID)
		timeSlots[timeSlotKey] = true
		allAssignments = append(allAssignments, assignment)
		workload[assignment.UserID]++
	}

	// จัดกลุ่มวิชาที่สอบในห้อง วัน และเวลาเดียวกัน
	groupedRooms := s.groupRelatedExams(rooms)

	// เรียงลำดับกลุ่มวิชาตามวันและเวลา
	sort.Slice(groupedRooms, func(i, j int) bool {
		if len(groupedRooms[i]) == 0 || len(groupedRooms[j]) == 0 {
			return false
		}

		if groupedRooms[i][0].Edate != groupedRooms[j][0].Edate {
			return groupedRooms[i][0].Edate < groupedRooms[j][0].Edate
		}
		return groupedRooms[i][0].Etime < groupedRooms[j][0].Etime
	})

	// 2. จัดกรรมการสำหรับวิชาเจาะจง
	for _, roomGroup := range groupedRooms {
		if len(roomGroup) == 0 {
			continue
		}

		representativeRoom := roomGroup[0]

		// ข้ามห้องที่จัดกรรมการวันเสาร์-อาทิตย์ไปแล้ว
		if s.isWeekend(representativeRoom.Edate) {
			continue
		}

		for _, room := range roomGroup {
			// จัดกรรมการตามเงื่อนไขวิชาเจาะจง
			specialAssignments := s.assignSpecialCourseProctors(room, conditions)
			for _, assignment := range specialAssignments {
				timeSlotKey := fmt.Sprintf("%s:%s:%s", room.Edate, room.Etime, assignment.UserID)
				if !timeSlots[timeSlotKey] {
					allAssignments = append(allAssignments, assignment)
					timeSlots[timeSlotKey] = true
					workload[assignment.UserID]++
				}
			}
		}
	}

	// 3. จัดกรรมการสำหรับห้องปกติ (ไม่ใช่ห้อง lab)
	for _, roomGroup := range groupedRooms {
		if len(roomGroup) == 0 {
			continue
		}

		representativeRoom := roomGroup[0]

		// ข้ามห้องวันเสาร์-อาทิตย์ที่จัดไปแล้ว
		if s.isWeekend(representativeRoom.Edate) {
			continue
		}

		// ข้ามห้องที่เป็น lab ไปก่อน
		if representativeRoom.Type_exam == "lab" || representativeRoom.Type_exam == "L:Lab" {
			continue
		}

		// นับจำนวนนักศึกษาทั้งหมดในห้อง
		totalStudents := 0
		for _, room := range roomGroup {
			students, _ := strconv.Atoi(room.Num_st)
			totalStudents += students
		}

		// จัดอาจารย์ผู้สอนของทุกวิชาในกลุ่มเป็นกรรมการคุมสอบ
		assignedLecturers := make(map[string]bool)
		for _, room := range roomGroup {
			if room.Lecturer != "" && !assignedLecturers[room.Lecturer] {
				lecturerAssignment, err := s.assignCourseLecturer(room)
				if err != nil {
					log.Printf("Error assigning course lecturer: %v", err)
				} else if lecturerAssignment.UserID != "" {
					timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, lecturerAssignment.UserID)
					if !timeSlots[timeSlotKey] {
						// จัดอาจารย์ผู้สอนให้กับห้องนี้
						allAssignments = append(allAssignments, models.ProctorAssignment{
							UserID: lecturerAssignment.UserID,
							Ref:    representativeRoom.Ref,
							Date:   representativeRoom.Edate,
							No:     representativeRoom.No,
						})
						timeSlots[timeSlotKey] = true
						workload[lecturerAssignment.UserID]++
						assignedLecturers[room.Lecturer] = true
					}
				}
			}
		}

		// คำนวณจำนวนกรรมการที่ต้องการเพิ่ม
		numProctorsNeeded := CalculateProctorsNeeded(totalStudents) - len(assignedLecturers)

		if numProctorsNeeded > 0 {
			// ดึงภาควิชาของวิชาในกลุ่มนี้
			var primaryDept string
			for _, room := range roomGroup {
				if room.Course != "" {
					deptName, err := s.getCourseDepartment(room.Course)
					if err == nil && deptName != "" {
						primaryDept = deptName
						break
					}
				}
			}

			// จัดกรรมการจากภาควิชาเดียวกันกับวิชาที่สอบ (ถ้ามี)
			if primaryDept != "" {
				deptProctors, err := s.getProctorsByDepartment(primaryDept, conditions)
				if err == nil && len(deptProctors) > 0 {
					// เรียงลำดับตามภาระงาน
					sort.SliceStable(deptProctors, func(i, j int) bool {
						return workload[deptProctors[i].User_id] < workload[deptProctors[j].User_id]
					})

					// จัดกรรมการจากภาควิชาเดียวกัน
					for _, proctor := range deptProctors {
						if numProctorsNeeded <= 0 {
							break
						}

						timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
						if !timeSlots[timeSlotKey] && s.canAssignProctor(proctor, representativeRoom) {
							allAssignments = append(allAssignments, models.ProctorAssignment{
								UserID: proctor.User_id,
								Ref:    representativeRoom.Ref,
								Date:   representativeRoom.Edate,
								No:     representativeRoom.No,
							})
							timeSlots[timeSlotKey] = true
							workload[proctor.User_id]++
							numProctorsNeeded--
						}
					}
				}
			}

			// ถ้ายังต้องการกรรมการเพิ่ม ให้ใช้กรรมการทั่วไป
			if numProctorsNeeded > 0 {
				// เตรียมรายชื่อกรรมการที่สามารถจัดได้
				var availableProctors []models.ProctorCondition
				for _, proctor := range conditions {
					timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
					if !timeSlots[timeSlotKey] && s.canAssignProctor(proctor, representativeRoom) {
						availableProctors = append(availableProctors, proctor)
					}
				}

				// เรียงลำดับตามภาระงาน
				sort.SliceStable(availableProctors, func(i, j int) bool {
					return workload[availableProctors[i].User_id] < workload[availableProctors[j].User_id]
				})

				// จัดกรรมการตามลำดับที่เรียงไว้
				for _, proctor := range availableProctors {
					if numProctorsNeeded <= 0 {
						break
					}

					timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
					if !timeSlots[timeSlotKey] {
						allAssignments = append(allAssignments, models.ProctorAssignment{
							UserID: proctor.User_id,
							Ref:    representativeRoom.Ref,
							Date:   representativeRoom.Edate,
							No:     representativeRoom.No,
						})
						timeSlots[timeSlotKey] = true
						workload[proctor.User_id]++
						numProctorsNeeded--
					}
				}
			}
		}
	}

	// 4. จัดกรรมการสำหรับห้อง lab
	for _, roomGroup := range groupedRooms {
		if len(roomGroup) == 0 {
			continue
		}

		representativeRoom := roomGroup[0]

		// ข้ามห้องวันเสาร์-อาทิตย์ที่จัดไปแล้ว
		if s.isWeekend(representativeRoom.Edate) {
			continue
		}

		// เฉพาะห้อง lab เท่านั้น
		if representativeRoom.Type_exam != "lab" && representativeRoom.Type_exam != "L:Lab" {
			continue
		}

		// นับจำนวนนักศึกษาทั้งหมดในห้อง
		totalStudents := 0
		for _, room := range roomGroup {
			students, _ := strconv.Atoi(room.Num_st)
			totalStudents += students
		}

		// 1. จัดเจ้าหน้าที่ประจำห้อง Lab
		labAssignments, err := s.assignLabProctor(representativeRoom)
		if err != nil {
			log.Printf("Error assigning lab proctor: %v", err)
		} else {
			for _, assignment := range labAssignments {
				timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, assignment.UserID)
				if !timeSlots[timeSlotKey] {
					allAssignments = append(allAssignments, models.ProctorAssignment{
						UserID: assignment.UserID,
						Ref:    representativeRoom.Ref,
						Date:   representativeRoom.Edate,
						No:     representativeRoom.No,
					})
					timeSlots[timeSlotKey] = true
					workload[assignment.UserID]++
				}
			}
		}

		// 2. จัดอาจารย์ผู้สอนเป็นกรรมการ
		assignedLecturers := make(map[string]bool)
		for _, room := range roomGroup {
			if room.Lecturer != "" && !assignedLecturers[room.Lecturer] {
				lecturerAssignment, err := s.assignCourseLecturer(room)
				if err != nil {
					log.Printf("Error assigning course lecturer: %v", err)
				} else if lecturerAssignment.UserID != "" {
					timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, lecturerAssignment.UserID)
					if !timeSlots[timeSlotKey] {
						allAssignments = append(allAssignments, models.ProctorAssignment{
							UserID: lecturerAssignment.UserID,
							Ref:    representativeRoom.Ref,
							Date:   representativeRoom.Edate,
							No:     representativeRoom.No,
						})
						timeSlots[timeSlotKey] = true
						workload[lecturerAssignment.UserID]++
						assignedLecturers[room.Lecturer] = true
					}
				}
			}
		}

		// 3. คำนวณจำนวนกรรมการที่ต้องการเพิ่ม
		assignedCount := len(labAssignments) + len(assignedLecturers)
		numProctorsNeeded := CalculateProctorsNeeded(totalStudents) - assignedCount

		if numProctorsNeeded > 0 {
			// จัดกรรมการทั่วไปเพิ่มเติม
			var availableProctors []models.ProctorCondition
			for _, proctor := range conditions {
				timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
				if !timeSlots[timeSlotKey] && s.canAssignProctor(proctor, representativeRoom) {
					availableProctors = append(availableProctors, proctor)
				}
			}

			// เรียงลำดับตามภาระงาน
			sort.SliceStable(availableProctors, func(i, j int) bool {
				return workload[availableProctors[i].User_id] < workload[availableProctors[j].User_id]
			})

			// จัดกรรมการตามลำดับที่เรียงไว้
			for _, proctor := range availableProctors {
				if numProctorsNeeded <= 0 {
					break
				}

				timeSlotKey := fmt.Sprintf("%s:%s:%s", representativeRoom.Edate, representativeRoom.Etime, proctor.User_id)
				if !timeSlots[timeSlotKey] {
					allAssignments = append(allAssignments, models.ProctorAssignment{
						UserID: proctor.User_id,
						Ref:    representativeRoom.Ref,
						Date:   representativeRoom.Edate,
						No:     representativeRoom.No,
					})
					timeSlots[timeSlotKey] = true
					workload[proctor.User_id]++
					numProctorsNeeded--
				}
			}
		}
	}

	return allAssignments, nil
}

// isLabStaff ตรวจสอบว่า userID เป็นเจ้าหน้าที่ lab หรือไม่
func isLabStaff(userID string) bool {
	labStaffIDs := map[string]bool{
		"U140": true, // นายชัยวัฒน์ ศรีสร้อยแก้ว
		"U162": true, // นายสานนท์ ยะหอม
		"U161": true, // นายอุทัย คันธะมาลา
	}
	return labStaffIDs[userID]
}

func (s *UseInsertService) SaveAssignments(assignments []models.ProctorAssignment) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	config, _ := s.GetConfig()

	stmt, err := tx.Prepare(`
			INSERT INTO proctor_assignments (id_config , user_id, ref, no)
			VALUES ($1, $2 , $3  , $4)
		`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, assignment := range assignments {
		_, err = stmt.Exec(
			config[0].Id_config,
			assignment.UserID,
			assignment.Ref,
			assignment.No,
		)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func CalculateProctorsNeeded(numStudents int) int {
	switch {
	case numStudents <= 75:
		return 2
	case numStudents <= 90:
		return 3
	case numStudents <= 140:
		return 4
	case numStudents <= 250:
		return 5
	default:
		return 6
	}
}
