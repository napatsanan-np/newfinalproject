package insertservice

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/models"
)

// getRowCount returns the number of rows in a given table
func (s *UseInsertService) getRowCount(tableName string) (int, error) {
	var count int

	// ตรวจสอบ config
	config, err := s.GetConfig()
	if err != nil || len(config) == 0 {
		return 0, fmt.Errorf("failed to get config: %v", err)
	}

	// ใช้ parameterized query แทนการใช้ fmt.Sprintf
	query := fmt.Sprintf("SELECT ref FROM %s WHERE id_config = $1 order by ref desc", tableName)
	err = s.DB.QueryRow(query, config[0].Id_config).Scan(&count)
	if err != nil {
		fmt.Printf("Failed to get row count for table %s: %v\n", tableName, err)
		return 0, err
	}

	return count, nil
}

func ChangeFormatDate(dateformat string) string {
	// Original date in string format
	dateStr := dateformat

	// Parse the date string to a time.Time object
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		fmt.Printf("Error parsing date: %v\n", err)
	}

	// Format the date to the desired format: DD/MM/YYYY
	formattedDate := date.Format("02/01/2006")
	fmt.Println("Formatted date:", formattedDate)

	return formattedDate
}

func (s *UseInsertService) InsertNewExam(data models.RoomExam) {
	// Parse the input data to RoomExam struct

	exam := data

	// Begin a new database transaction
	tx, err := s.DB.Begin()
	if err != nil {
		fmt.Printf("Failed to begin transaction: %v\n", err)
		return
	}
	fmt.Print(exam)
	config, _ := s.GetConfig()

	// Prepare the SQL queries
	query := `INSERT INTO roomexam (id_config , ref, no, edate, etime, hr, course, num_st, room_id , lecturer , seatrow ,type_exam , group_exam ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 , $11 , $12 , $13)`
	sqlDetail := `INSERT INTO detail_exam (id_config ,ref, submit, sub_date, copy, page, recive, rec_date, qty, staple_conner, staple_apart, calculator, answesheet, answerbook_use, remark, color, lecturer , no_st, exam_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16 , $17 , $18, $19)`
	sqlTable := `INSERT INTO examtable (id_config , ref, edate, etime, hr, course ,lecturer, no_st) VALUES ($1, $2, $3, $4, $5, $6, $7 , $8)`
	countRoomExam, _ := s.getRowCount("roomexam")
	countDetailExam, _ := s.getRowCount("detail_exam")
	countExamTable, _ := s.getRowCount("examtable")

	// Print the number of rows for each table
	fmt.Printf("Row count for roomexam: %d\n", countRoomExam)
	fmt.Printf("Row count for detail_exam: %d\n", countDetailExam)
	fmt.Printf("Row count for examtable: %d\n", countExamTable)

	// Execute the `examtable` insert
	_, err = tx.Exec(sqlTable, config[0].Id_config, countExamTable+1, ChangeFormatDate(exam.Edate), exam.Etime, exam.Hr, exam.Course, exam.Lecturer, exam.Num_st)
	if err != nil {
		tx.Rollback()
		fmt.Printf("Failed to insert into examtable: %v\n", err)
		return
	}

	// Execute the `detail_exam` insert
	_, err = tx.Exec(sqlDetail, config[0].Id_config, countExamTable+1, false, time.Now(), 1, 1, false, time.Now(), 1, "เย็บมุมรวม", "1 ตอน(หน้า 1 -  )", "ไม่อนุญาต", "ไม่ใช้", 0, "-", "สีขาว", "-", exam.Num_st, "สอบในตาราง")
	if err != nil {
		tx.Rollback()
		fmt.Printf("Failed to insert into detail_exam: %v\n", err)
		return
	}
	// Execute the `roomexam` insert
	_, err = tx.Exec(query, config[0].Id_config, countExamTable+1, exam.No, ChangeFormatDate(exam.Edate), exam.Etime, exam.Hr, exam.Course, exam.Num_st, exam.Room_id, exam.Lecturer, "-", "-", "-")
	if err != nil {
		tx.Rollback()
		fmt.Printf("Failed to insert into roomexam: %v\n", err)
		return
	}
	// Commit the transaction if all inserts succeed
	err = tx.Commit()
	if err != nil {
		fmt.Printf("Failed to commit transaction: %v\n", err)
		return
	}
	s.insertprocessProtor(countExamTable+1, exam.No, exam.Proctor)
	fmt.Println("New exam inserted successfully into all tables.")
}

func (s *UseInsertService) insertprocessProtor(ref int, no int, proctor string) {

	parts := strings.Split(proctor, " , ")
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
		config, err := s.GetConfig()
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
					VALUES ($1, $2, $3, $4);
				`
			_, err = s.DB.Exec(sqlInsertProctor, config[0].Id_config, userID, ref, no)
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
			fmt.Printf("No matching user_id found for part '%s' in REF '%s'\n", part, ref)
		}

		// Check for any errors during row iteration
		if err := rows.Err(); err != nil {
			log.Printf("Error during row iteration for part '%s': %v\n", part, err)
		}
	}
}

type RoomExam struct {
	Ref       int    `json:"Ref"`
	No        int    `json:"No"`
	Edate     string `json:"Edate"`
	Etime     string `json:"Etime"`
	Hr        string `json:"Hr"`
	Course    string `json:"Course"`
	Seatrow   string `json:"Seatrow"`
	Num_st    string `json:"Num_st"`
	Room_id   string `json:"Room_id"` // เปลี่ยนจาก Room เป็น Room_id ตามฐานข้อมูล
	Lecturer  string `json:"Lecturer"`
	Type_exam string `json:"type_exam"`
	Proctor   string `json:"Proctor"`
}
