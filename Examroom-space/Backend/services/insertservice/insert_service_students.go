// insert_service_students.go
package insertservice

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/models"
)

type StudentRow struct {
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	Dep         string `json:"dep"`
	SeatNo      string `json:"seat_no"`
	Course      string `json:"course"`
}

type Meta struct {
	IDConfig int
	RoomID   string
}

// เช็คว่า room_id นี้อยู่ใน config นี้จริง (กัน import ผิดช่วงสอบ)
func (s *UseInsertService) validateRoomInConfig(ctx context.Context, idConfig int, roomID string) error {
	var ok int
	err := s.DB.QueryRowContext(ctx, `
		SELECT 1
		FROM public.roomexam
		WHERE id_config = $1 AND room_id = $2
		LIMIT 1
	`, idConfig, roomID).Scan(&ok)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("room_id=%s ไม่อยู่ใน id_config=%d (อาจเลือกห้องคนละช่วงสอบ)", roomID, idConfig)
		}
		return err
	}
	return nil
}

// ReplaceExamStudents: ลบของเก่าแล้ว insert ใหม่ แยกตาม course
func (s *UseInsertService) ReplaceExamStudents(ctx context.Context, meta Meta, rows []StudentRow) error {

	// ✅ Step 3 (ใส่ตรงนี้เลย): validate room_id อยู่ใน id_config จริงก่อนทำลบ/insert
	if meta.IDConfig == 0 {
		return fmt.Errorf("id_config ว่าง/เป็น 0")
	}
	if strings.TrimSpace(meta.RoomID) == "" {
		return fmt.Errorf("room_id ว่าง")
	}
	if err := s.validateRoomInConfig(ctx, meta.IDConfig, meta.RoomID); err != nil {
		return err
	}

	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	byCourse := map[string][]StudentRow{}
	for _, r := range rows {
		c := strings.TrimSpace(r.Course)
		if c == "" {
			continue
		}
		byCourse[c] = append(byCourse[c], r)
	}

	for course, list := range byCourse {
		if _, err = tx.ExecContext(ctx, `
			DELETE FROM exam_students
			WHERE id_config=$1 AND room_id=$2 AND course=$3
		`, meta.IDConfig, meta.RoomID, course); err != nil {
			return err
		}

		//  ตัด imported_by ออกแล้ว
		stmt, err2 := tx.PrepareContext(ctx, `
			INSERT INTO exam_students
			  (id_config, room_id, course, student_id, student_name, dep, seat_no)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
		`)
		if err2 != nil {
			return err2
		}

		for _, r := range list {
			if _, err = stmt.ExecContext(ctx,
				meta.IDConfig, meta.RoomID, course,
				strings.TrimSpace(r.StudentID),
				strings.TrimSpace(r.StudentName),
				strings.TrimSpace(r.Dep),
				"", // seat_no คำนวณทีหลัง
			); err != nil {
				_ = stmt.Close()
				return err
			}
		}
		_ = stmt.Close()
	}
	return tx.Commit()
}

// ---- ดึงข้อมูล: exact / ILIKE / ทั้งหมด ----

func (s *UseInsertService) ListExamStudentsExact(ctx context.Context, idConfig int, roomID, course string) ([]StudentRow, error) {
	q := `
		SELECT student_id, student_name, dep, COALESCE(seat_no,''), course
		FROM exam_students
		WHERE id_config=$1 AND room_id=$2 AND course=$3
		ORDER BY student_name
	`
	return s.scanRows(ctx, q, idConfig, roomID, strings.TrimSpace(course))
}

func (s *UseInsertService) ListExamStudentsILike(ctx context.Context, idConfig int, roomID, pat string) ([]StudentRow, error) {
	q := `
		SELECT student_id, student_name, dep, COALESCE(seat_no,''), course
		FROM exam_students
		WHERE id_config=$1 AND room_id=$2 AND course ILIKE $3
		ORDER BY student_name
	`
	return s.scanRows(ctx, q, idConfig, roomID, pat)
}

func (s *UseInsertService) ListExamStudentsAll(ctx context.Context, idConfig int, roomID string) ([]StudentRow, error) {
	q := `
		SELECT student_id, student_name, dep, COALESCE(seat_no,''), course
		FROM exam_students
		WHERE id_config=$1 AND room_id=$2
		ORDER BY student_name
	`
	return s.scanRows(ctx, q, idConfig, roomID)
}

func (s *UseInsertService) scanRows(ctx context.Context, query string, args ...any) ([]StudentRow, error) {
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []StudentRow
	for rows.Next() {
		var r StudentRow
		if err := rows.Scan(&r.StudentID, &r.StudentName, &r.Dep, &r.SeatNo, &r.Course); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *UseInsertService) ListDetailExamForEdit(ctx context.Context) ([]models.ExamDetail, error) {
	const q = `
        SELECT 
            ref,
            COALESCE(submit, '')        AS submit,
            COALESCE(sub_date::text, '') AS sub_date,
            COALESCE(copy, '')          AS copy,
            COALESCE(page, '')          AS page,
            COALESCE(recive, '')        AS recive,
            COALESCE(rec_date::text, '') AS rec_date,
            COALESCE(qty, '')           AS qty,
            COALESCE(staple_conner, '') AS staple_conner,
            COALESCE(staple_apart, '')  AS staple_apart,
            COALESCE(calculator, '')    AS calculator,
            COALESCE(answesheet, '')    AS answesheet,       
            COALESCE(answerbook_use, '') AS answerbook_use,
            COALESCE(remark, '')        AS remark,
            COALESCE(color, '')         AS color,
            COALESCE(lecturer, '')      AS lecturer,
            COALESCE(no_st, '')         AS no_st,
            COALESCE(files::text, '')   AS files,            
            COALESCE(exam_type, '')     AS exam_type
        FROM detail_exam
        WHERE id_config = (
            SELECT id_config FROM exam_config WHERE status = true LIMIT 1
        )
        ORDER BY id_config ASC, ref ASC;
    `

	rows, err := s.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.ExamDetail

	for rows.Next() {
		var r models.ExamDetail
		var filesStr string // ตอนนี้ยังเก็บเป็น string เฉย ๆ ก่อน

		if err := rows.Scan(
			&r.Ref,
			&r.Submit,
			&r.SubDate,
			&r.Copy,
			&r.Page,
			&r.Recive,
			&r.RecDate,
			&r.Qty,
			&r.StapleConner,
			&r.StapleApart,
			&r.Calculator,
			&r.AnswerSheet,
			&r.AnswerBookUse,
			&r.Remark,
			&r.Color,
			&r.Lecturer,
			&r.No_st,
			&filesStr,
			&r.ExamType,
		); err != nil {
			return nil, err
		}

		// ถ้ายังไม่อยาก parse string -> []string ก็ปล่อยว่างไว้ก่อนให้เป็น nil
		// r.FileExam = parseFiles(filesStr) // ไว้อนาคตค่อยทำถ้าจำเป็น

		result = append(result, r)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ========= ใช้สำหรับหน้าแก้ไขข้อมูลตารางสอบ (examtable) =========
type ExamtableEditRow struct {
	Ref      int    `json:"Ref"`
	Edate    string `json:"Edate"`
	Etime    string `json:"Etime"`
	Hr       string `json:"Hr"`
	Course   string `json:"Course"`
	Lecturer string `json:"Lecturer"`
	NoSt     string `json:"No_st"`
}

func (s *UseInsertService) ListExamtableForEdit(ctx context.Context) ([]ExamtableEditRow, error) {
	const q = `
		SELECT 
			ref,
			COALESCE(edate, '')      AS edate,
			COALESCE(etime, '')      AS etime,
			COALESCE(hr, '')         AS hr,
			COALESCE(course, '')     AS course,
			COALESCE(lecturer, '')   AS lecturer,
			COALESCE(no_st::text,'') AS no_st
		FROM examtable
		WHERE id_config = (
			SELECT id_config FROM exam_config WHERE status = true LIMIT 1
		)
		ORDER BY ref ASC;
	`

	rows, err := s.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ExamtableEditRow
	for rows.Next() {
		var r ExamtableEditRow
		if err := rows.Scan(
			&r.Ref,
			&r.Edate,
			&r.Etime,
			&r.Hr,
			&r.Course,
			&r.Lecturer,
			&r.NoSt,
		); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// ========= ใช้สำหรับหน้าแก้ไขข้อมูลห้องสอบ (roomexam) =========
type RoomexamEditRow struct {
	No        int    `json:"No"`
	Ref       int    `json:"Ref"`
	Edate     string `json:"Edate"`
	Etime     string `json:"Etime"`
	Hr        string `json:"Hr"`
	Course    string `json:"Course"`
	Lecturer  string `json:"Lecturer"`
	RoomID    string `json:"Room_id"`
	Seatrow   string `json:"Seatrow"`
	TypeExam  string `json:"Type_exam"`
	GroupExam string `json:"Group_exam"`
	NumSt     string `json:"Num_st"`
}

func (s *UseInsertService) ListRoomexamForEdit(ctx context.Context) ([]RoomexamEditRow, error) {
	const q = `
		SELECT
			no,
			ref,
			COALESCE(edate, '')       AS edate,
			COALESCE(etime, '')       AS etime,
			COALESCE(hr, '')          AS hr,
			COALESCE(course, '')      AS course,
			COALESCE(lecturer, '')    AS lecturer,
			COALESCE(room_id, '')     AS room_id,
			COALESCE(seatrow, '')     AS seatrow,
			COALESCE(type_exam, '')   AS type_exam,
			COALESCE(group_exam, '')  AS group_exam,
			COALESCE(num_st::text,'') AS num_st
		FROM roomexam
		WHERE id_config = (
			SELECT id_config FROM exam_config WHERE status = true LIMIT 1
		)
		ORDER BY no ASC;
	`

	rows, err := s.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []RoomexamEditRow
	for rows.Next() {
		var r RoomexamEditRow
		if err := rows.Scan(
			&r.No,
			&r.Ref,
			&r.Edate,
			&r.Etime,
			&r.Hr,
			&r.Course,
			&r.Lecturer,
			&r.RoomID,
			&r.Seatrow,
			&r.TypeExam,
			&r.GroupExam,
			&r.NumSt,
		); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}
