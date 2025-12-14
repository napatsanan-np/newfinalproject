package updateservice

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// -------------------- (ถ้าจะเก็บ IntLike ไว้ใช้ที่อื่นได้ ไม่เป็นไร) --------------------
type IntLike int

func (i *IntLike) UnmarshalJSON(b []byte) error {
	var asInt int
	if err := json.Unmarshal(b, &asInt); err == nil {
		*i = IntLike(asInt)
		return nil
	}
	var asStr string
	if err := json.Unmarshal(b, &asStr); err == nil {
		asStr = strings.TrimSpace(asStr)
		n, err := strconv.Atoi(asStr)
		if err != nil {
			return fmt.Errorf("invalid int string %q: %w", asStr, err)
		}
		*i = IntLike(n)
		return nil
	}
	return fmt.Errorf("cannot parse int-like: %s", string(b))
}
func (i IntLike) Int() int { return int(i) }

// ✅ ตารางสอบ: ใช้ No_st
type UpdateExamTableReq struct {
	Ref      int    `json:"Ref" binding:"required"`
	Course   string `json:"Course"`
	Edate    string `json:"Edate"`
	Etime    string `json:"Etime"`
	Hr       int    `json:"Hr"`
	Lecturer string `json:"Lecturer"`
	NoSt     int    `json:"No_st"` // ← เดิมเป็น NumSt / "NumSt"
}

// ✅ ห้องสอบ: ใช้ Num_st
type UpdateRoomExamReq struct {
	No       int    `json:"No" binding:"required"`
	Ref      int    `json:"Ref"`
	Edate    string `json:"Edate"`
	Etime    string `json:"Etime"`
	Hr       int    `json:"Hr"`
	Course   string `json:"Course"`
	Lecturer string `json:"Lecturer"`
	NumSt    int    `json:"Num_st"` // ← เดิมเป็น "NumSt"

	RoomID    *int   `json:"Room_id,omitempty"`
	Seatrow   string `json:"Seatrow,omitempty"`
	TypeExam  string `json:"Type_exam,omitempty"`
	GroupExam string `json:"Group_exam,omitempty"`
}

type UpdateDetailExamReq struct {
	Id       int    `json:"Id" binding:"required"`
	Ref      int    `json:"Ref"`
	Lecturer string `json:"Lecturer"`
	Submit   string `json:"Submit"`
	Copy     int    `json:"Copy"`
	Page     int    `json:"Page"`
	Color    string `json:"Color"`
	Remark   string `json:"Remark"`

	SubDate       string `json:"Sub_date,omitempty"`
	StapleConner  string `json:"Staple_conner,omitempty"`
	StapleApart   string `json:"Staple_apart,omitempty"`
	Calculator    string `json:"Calculator,omitempty"`
	Answesheet    string `json:"Answesheet,omitempty"`
	AnswerbookUse string `json:"Answerbook_use,omitempty"`
	Fileexam      string `json:"Fileexam,omitempty"`
	NoSt          *int   `json:"No_st,omitempty"`
	ExamType      string `json:"Exam_type,omitempty"`
}

// -------------------- ดึง id_config ปัจจุบัน (boolean status=true) --------------------
func (s *Userupdateservice) currentConfigID(ctx context.Context) (int, error) {
	var idConfig int
	err := s.DB.QueryRowContext(ctx,
		"SELECT id_config FROM exam_config WHERE status = true LIMIT 1",
	).Scan(&idConfig)
	if err != nil {
		return 0, err
	}
	return idConfig, nil
}

// -------------------- Update ExamTable --------------------
func (s *Userupdateservice) UpdateExamTable(req UpdateExamTableReq) error {
	ctx := context.Background()
	idConfig, err := s.currentConfigID(ctx)
	if err != nil {
		return err
	}

	const query = `
        UPDATE examtable
           SET course=$1, edate=$2, etime=$3, hr=$4, lecturer=$5, no_st=$6
         WHERE id_config=$7 AND ref=$8;
    `
	_, err = s.DB.ExecContext(ctx, query,
		req.Course, req.Edate, req.Etime, req.Hr, req.Lecturer, req.NoSt, // ← ใช้ NoSt
		idConfig, req.Ref,
	)
	return err
}

// -------------------- Update RoomExam --------------------
func (s *Userupdateservice) UpdateRoomExamFields(req UpdateRoomExamReq) error {
	ctx := context.Background()
	idConfig, err := s.currentConfigID(ctx)
	if err != nil {
		return err
	}

	const query = `
        UPDATE roomexam
           SET ref=$1, edate=$2, etime=$3, hr=$4, course=$5, lecturer=$6, num_st=$7
         WHERE id_config=$8 AND no=$9;
    `
	_, err = s.DB.ExecContext(ctx, query,
		req.Ref, req.Edate, req.Etime, req.Hr, req.Course, req.Lecturer, req.NumSt, // ← ใช้ NumSt ที่ map จาก Num_st
		idConfig, req.No,
	)
	if err != nil {
		return err
	}

	// ฟิลด์เสริมเหมือนเดิม
	if req.RoomID != nil {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE roomexam SET room_id=$1 WHERE id_config=$2 AND no=$3`,
			*req.RoomID, idConfig, req.No)
	}
	if req.Seatrow != "" {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE roomexam SET seatrow=$1 WHERE id_config=$2 AND no=$3`,
			req.Seatrow, idConfig, req.No)
	}
	if req.TypeExam != "" {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE roomexam SET type_exam=$1 WHERE id_config=$2 AND no=$3`,
			req.TypeExam, idConfig, req.No)
	}
	if req.GroupExam != "" {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE roomexam SET group_exam=$1 WHERE id_config=$2 AND no=$3`,
			req.GroupExam, idConfig, req.No)
	}
	return nil
}



func (s *Userupdateservice) UpdateDetailExam(req UpdateDetailExamReq) error {
	ctx := context.Background()
	idConfig, err := s.currentConfigID(ctx)
	if err != nil {
		return err
	}

	const query = `
        UPDATE detail_exam
           SET lecturer=$1, submit=$2, copy=$3, page=$4, color=$5, remark=$6
         WHERE id_config=$7 AND id=$8;
    `
	_, err = s.DB.ExecContext(ctx, query,
		req.Lecturer, req.Submit, req.Copy, req.Page, req.Color, req.Remark,
		idConfig, req.Id,
	)
	if err != nil {
		return err
	}

	if req.SubDate != "" {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE detail_exam SET sub_date=$1 WHERE id_config=$2 AND id=$3`,
			req.SubDate, idConfig, req.Id)
	}
	if req.NoSt != nil {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE detail_exam SET no_st=$1 WHERE id_config=$2 AND id=$3`,
			*req.NoSt, idConfig, req.Id)
	}
	if req.ExamType != "" {
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE detail_exam SET exam_type=$1 WHERE id_config=$2 AND id=$3`,
			req.ExamType, idConfig, req.Id)
	}
	return nil
}

// UpdateConditionProctor แบบไม่ใช้ id_config (อัปเดตตาม user_id อย่างเดียว)
func (s *Userupdateservice) UpdateConditionProctor(userID, base, dates, period, courses, limit string) error {
	const q = `
        UPDATE condition_proctor
        SET base_condition=$1,
            special_dates=$2,
            time_period=$3,
            special_courses=$4,
            time_restriction=$5
        WHERE user_id=$6;
    `
	res, err := s.DB.Exec(q, base, dates, period, courses, limit, userID)
	if err != nil {
		return fmt.Errorf("update condition_proctor: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// ถ้าไม่มีแถวให้แก้ (เช่น ยังไม่มี record ของ user นี้) จะคืน error เดิมไว้ก่อน
		// ถ้าอยากให้ "ไม่มีแถวก็แทรกใหม่" ให้ใช้บล็อคเสริมด้านล่างแทน
		return fmt.Errorf("no rows updated (user_id not found)")
	}
	return nil
}
