package insertservice

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"

	"github.com/models"
)

// ExamAllocator handles the room allocation logic
type LabExamAllocator struct {
	db    *sql.DB
	Room  []models.Room
	Exams []models.RoomExam
}

// AllocationResult represents the result of room allocation
type LabAllocationResult struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	AllocatedNum int    `json:"allocated_num"`
}

// RoomAllocation tracks room usage by date and time range
type LabRoomAllocation struct {
	RoomID    string
	Date      string
	StartTime string
	EndTime   string
	NumSt     string
	Ref       int
}

// New creates a new ExamAllocator instance
func (s *UseInsertService) New(date string, time string, slectroom []string) (*LabExamAllocator, error) {
	config, _ := s.GetConfig()
	if s.DB == nil {
		return nil, fmt.Errorf("database connection is required")
	}

	ea := &LabExamAllocator{
		db: s.DB,
	}

	if err := ea.loadRooms(slectroom); err != nil {
		return nil, fmt.Errorf("failed to load rooms: %w", err)
	}

	if err := ea.loadExams(date, time, config[0].Id_config); err != nil {
		return nil, fmt.Errorf("failed to load exams: %w", err)
	}

	return ea, nil
}

func (ea *LabExamAllocator) loadRooms(slectroom []string) error {
	var query string
	var rows *sql.Rows
	var err error

	// กรณีไม่มีห้องที่ต้องการยกเว้น
	if len(slectroom) == 0 {
		query = `
SELECT room_id, room_name, room_type, capacity 
FROM rooms 
WHERE room_type = 'ห้องปฏิบัติการ'
ORDER BY capacity;
		`
		rows, err = ea.db.Query(query)
	} else {
		// สร้าง placeholders และ arguments
		placeholders := createPlaceholders(len(slectroom))
		args := make([]interface{}, len(slectroom))
		for i, roomID := range slectroom {
			args[i] = roomID
		}

		query = `
SELECT room_id, room_name, room_type, capacity 
FROM rooms 
WHERE room_id NOT IN (` + placeholders + `) AND room_type = 'ห้องปฏิบัติการ'
ORDER BY capacity;
		`
		rows, err = ea.db.Query(query, args...)
	}

	//log.Println("Lab Query:", query)

	if err != nil {
		return fmt.Errorf("failed to query rooms: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var room models.Room
		if err := rows.Scan(&room.RoomID, &room.RoomName, &room.RoomType, &room.Capacity); err != nil {
			return fmt.Errorf("failed to scan room: %w", err)
		}
		ea.Room = append(ea.Room, room)
	}

	return nil
}
func (ea *LabExamAllocator) loadExams(date string, time string, id_config int) error {
	query := `
		SELECT ref, edate, etime, hr, SUM(CAST(num_st AS INTEGER)) AS total_students, type_exam, room_id
		FROM public.roomexam 
		WHERE type_exam = 'L:Lab' 
		AND id_config = $1 AND room_id = '-'
	`

	var args []interface{}
	args = append(args, id_config)

	argIndex := 2 // เนื่องจาก $1 ถูกใช้ไปแล้วกับ id_config

	// กรองตามวันที่และเวลา ถ้ามีการส่งค่ามา
	if date != "" {
		query += fmt.Sprintf(" AND edate = $%d", argIndex)
		args = append(args, date)
		argIndex++
	}
	if time != "" {
		query += fmt.Sprintf(" AND etime = $%d", argIndex)
		args = append(args, time)
		argIndex++
	}

	query += " GROUP BY ref, edate, etime, hr, type_exam, room_id ORDER BY edate, etime, ref;"

	rows, err := ea.db.Query(query, args...)
	if err != nil {
		return fmt.Errorf("failed to query exams: %w", err)
	}
	defer rows.Close()

	ea.Exams = nil // เคลียร์ข้อมูลเดิมก่อนโหลดใหม่

	for rows.Next() {
		var exam models.RoomExam
		if err := rows.Scan(
			&exam.Ref,
			&exam.Edate,
			&exam.Etime,
			&exam.Hr,
			&exam.Num_st,
			&exam.Type_exam,
			&exam.Room_id,
		); err != nil {
			return fmt.Errorf("failed to scan exam: %w", err)
		}
		ea.Exams = append(ea.Exams, exam)
	}

	return nil
}

// findBestRoom finds the most suitable room based on capacity
func (ea *LabExamAllocator) findBestRoom(studentCount int, examDate string, startTime string, duration string, exam models.RoomExam, ref int, course string) (models.Room, bool) {
	var bestRoom models.Room
	minWastedSpace := math.MaxInt32
	foundRoom := false
	//fmt.Println("duration", duration)
	for _, room := range ea.Room {
		// Skip if room is not available
		//fmt.Println("room.RoomID", room.RoomID)
		if !ea.isRoomAvailable(room.RoomID, examDate, startTime, studentCount, ref, exam, room.Capacity, duration) {
			continue
		}

		// Skip if room is too small 414 <
		if int(room.Capacity) < studentCount {
			//	fmt.Println("REF ที่ใช้จำนวนเยอะ ::", ref, ":::", course, "::", room.RoomName)
			continue
		}

		// Calculate wasted space
		wastedSpace := int(room.Capacity) - studentCount

		// Find room with minimum wasted space but at least 5 extra seats
		if wastedSpace >= 1 && wastedSpace < minWastedSpace {
			minWastedSpace = wastedSpace
			bestRoom = room
			foundRoom = true
		}
	}
	fmt.Println("ref::", ref, "min::", minWastedSpace, "Bestroom", bestRoom.RoomID)
	return bestRoom, foundRoom
}

func (ea *LabExamAllocator) isRoomAvailable(roomID string, edate string, etime string, no_st int, ref int, exam models.RoomExam, Capacity int, Hr string) bool {
	//fmt.Println("etime::", etime)
	config, _ := ea.GetConfig()
	query := `
    SELECT ref, edate , etime , r.room_id , hr
    FROM public.roomexam re inner join rooms r on r.room_id = re.room_id 
    where re.room_id = $1 AND edate = $2 and etime like $3 and id_config = $4
    order by ref;`
	//	log.Println("Time", "%"+etime[:5]+"%")
	rows, err := ea.db.Query(query, roomID, edate, "%"+etime[:5]+"%", config[0].Id_config)
	if err != nil {
		fmt.Println("failed to query rooms:")
		return false
	}
	defer rows.Close()

	hasRows := rows.Next()

	//fmt.Println("REF:", ref, "--", hasRows, "roomID", roomID)
	return !hasRows
}

func (ea *LabExamAllocator) InsertRoomWithRef(bestRoom models.Room, exam models.RoomExam) {
	// Allocate room
	config, _ := ea.GetConfig()
	tx, err := ea.db.Begin()
	if err != nil {
		log.Printf("failed to start transaction: %v", err)
	}
	tx.Exec(
		"UPDATE roomexam SET room_id = $1 WHERE ref = $2 and id_config = $3",
		bestRoom.RoomID,
		exam.Ref,
		config[0].Id_config,
	)
	if err := tx.Commit(); err != nil {
		log.Printf("failed to commit transaction: %v", err)
	}
	//ea.loadExams()
	//fmt.Println(ea.Exams)

}
func (ea *LabExamAllocator) InsertRoomWithNo(tx *sql.Tx, examparm models.RoomExam, roomAllocation []RoomAllocation) error {
	tx, err := ea.db.Begin()
	if err != nil {
		log.Printf("failed to start transaction: %v", err)
	}
	// 3. ดึงข้อมูลการสอบ
	exams, err := ea.getExamsByRef(examparm.Ref)
	if err != nil {
		return fmt.Errorf("error getting exams: %w", err)
	}

	// 4. จัดสรรห้องสอบ
	if err := ea.allocateRooms(tx, exams, roomAllocation); err != nil {
		return fmt.Errorf("error allocating rooms: %w", err)
	}
	if err := tx.Commit(); err != nil {
		log.Printf("failed to commit transaction: %v", err)
	}
	return nil
}

// แยกฟังก์ชันย่อยสำหรับการดึงข้อมูลการสอบ
func (ea *LabExamAllocator) getExamsByRef(ref int) ([]models.RoomExam, error) {
	config, _ := ea.GetConfig()
	query := `
        SELECT ref, no, edate, etime, hr, course, room_id, num_st, type_exam
        FROM public.roomexam 
        WHERE ref = $1 and id_config = $2
        ORDER BY no ASC
    `

	rows, err := ea.db.Query(query, ref, config[0].Id_config)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var exams []models.RoomExam
	for rows.Next() {
		var exam models.RoomExam
		if err := rows.Scan(
			&exam.Ref,
			&exam.No,
			&exam.Edate,
			&exam.Etime,
			&exam.Hr,
			&exam.Course,
			&exam.Room_id,
			&exam.Num_st,
			&exam.Type_exam,
		); err != nil {
			return nil, fmt.Errorf("error scanning row: %w", err)
		}
		exams = append(exams, exam)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}
	fmt.Println("getExamsByRef", exams[0].Num_st)
	return exams, nil
}

// แยกฟังก์ชันย่อยสำหรับการจัดสรรห้องสอบ
func (ea *LabExamAllocator) allocateRooms(tx *sql.Tx, exams []models.RoomExam, roomAllocation []RoomAllocation) error {
	fmt.Println("ea.Room maxxxx", ea.Room)
	for _, exam := range exams {
		numStStr := strings.TrimSpace(exam.Num_st)
		fmt.Println("Raw exam.Num_st:", numStStr)
		numSt, err := strconv.Atoi(numStStr)
		if err != nil {
			fmt.Println("Error converting exam.Num_st:", err)
			return fmt.Errorf("invalid number of students: %s", exam.Num_st)
		}
		fmt.Println("Converted numSt:", numSt)

		fmt.Println("numSt", numSt, "Exam.No_st", exam.Num_st)
		allocated := false
		config, _ := ea.GetConfig()

		for _, room := range ea.Room {
			if numSt <= room.Capacity {
				fmt.Println(numSt, "<=", room.Capacity, numSt <= room.Capacity)

				// อัพเดทห้องสอบในฐานข้อมูล
				if _, err := tx.Exec(
					"UPDATE roomexam SET room_id = $1 WHERE no = $2 and id_config = $3",
					room.RoomID,
					exam.No,
					config[0].Id_config,
				); err != nil {
					return fmt.Errorf("error updating room allocation: %w", err)
				}
				allocated = true
				break
			}
		}

		if !allocated {
			return fmt.Errorf("no suitable room found for exam no %d with %d students", exam.No, numSt)
		}
	}

	return nil
}

// AllocateRooms performs room allocation with optimized capacity matching
func (ea *LabExamAllocator) AllocateRooms() (*AllocationResult, error) {
	tx, err := ea.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	allocated := 0
	var allocatedRooms []RoomAllocation
	var unallocatedExams []models.RoomExam

	// Process exams in order of size (largest first)
	//ea.db.Exec("UPDATE public.roomexam SET room_id = '-';")
	//ea.loadExams()
	for _, exam := range ea.Exams {

		studentCount, _ := strconv.Atoi(exam.Num_st)
		bestRoom, found := ea.findBestRoom(studentCount, exam.Edate, exam.Etime, exam.Hr, exam, exam.Ref, exam.Course)
		endTime, _ := calculateEndTime(exam.Etime, exam.Hr)

		if !found {
			//unallocatedExams = append(unallocatedExams, exam)
			//fmt.Println("ref", exam.Ref, "วิชาที่ไม่ได้ลงห้อง:::", exam.Course, "::", exam.NumSt)
			if studentCount >= 414 {
				//	fmt.Println("ref", exam.Ref, "วิชาที่ไม่ได้ลงห้อง เพราะคนเยอะเกิน:::", exam.Course, "::", exam.Num_st)
				ea.InsertRoomWithNo(tx, exam, allocatedRooms)
			} else {
				//fmt.Println("ref", exam.Ref, "วิชาที่ไม่ได้ลงห้อง เพราะไม่มีห้อง:::", exam.Course, "::", exam.NumSt)
			}

			allocatedRooms = append(allocatedRooms, RoomAllocation{
				Ref:       exam.Ref,
				RoomID:    bestRoom.RoomID,
				Date:      exam.Edate,
				StartTime: exam.Etime,
				EndTime:   endTime,
				NumSt:     exam.Num_st,
			})
			continue
		}

		// Calculate end time
		//	fmt.Println("Room_id ", exam.RoomID)
		ea.InsertRoomWithRef(bestRoom, exam)

		// Add to allocated rooms
		allocatedRooms = append(allocatedRooms, RoomAllocation{
			Ref:       exam.Ref,
			RoomID:    bestRoom.RoomID,
			Date:      exam.Edate,
			StartTime: exam.Etime,
			EndTime:   endTime,
			NumSt:     exam.Num_st,
		})

		allocated++
	}

	return &AllocationResult{
		Success:      true,
		Message:      fmt.Sprintf("Successfully allocated %d exams. %d exams could not be allocated.", allocated, len(unallocatedExams)),
		AllocatedNum: allocated,
	}, nil
}
func (ea *LabExamAllocator) GetConfig() ([]models.ExamConfig, error) {
	var jsonData []byte

	// Define the query
	query := `

SELECT json_agg(t) 
	FROM (SELECT * FROM public.exam_config where status = true order by id_config desc limit 1 ) t ;

	`

	// Execute the query
	err := ea.db.QueryRow(query).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	// Check if no data was returned
	if jsonData == nil {
		return nil, errors.New("no data found")
	}

	// Unmarshal the JSON data into a slice of UserWithRole
	var results []models.ExamConfig
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}
	//log.Println(results)
	return results, nil
}
