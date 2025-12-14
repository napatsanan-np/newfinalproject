package models

type RoomExam struct {
	Ref        int    `json:"Ref"`
	No         int    `json:"No"`
	Edate      string `json:"Edate"`
	Etime      string `json:"Etime"`
	Hr         string `json:"Hr"`
	Course     string `json:"Course"`
	Seatrow    string `json:"Seatrow"`
	Num_st     string `json:"Num_st"`
	Room_id    string `json:"Room_id"` // เปลี่ยนจาก Room เป็น Room_id ตามฐานข้อมูล
	Lecturer   string `json:"Lecturer"`
	Type_exam  string `json:"type_exam"`
	Group_exam string `json:"group_exam"`
	Proctor    string `json:"Proctor"`
}

// Room model
type Room struct {
	RoomID   string `json:"room_id"`
	RoomName string `json:"room_name"`
	Capacity int    `json:"capacity"`
	RoomType string `json:"room_type"`
}

type FormData struct {
	Ref           int      `json:"Ref"`
	NoSt          int      `json:"NoSt"`
	Submit        string   `json:"Submit"`
	SubDate       string   `json:"SubDate"`
	Copy          int      `json:"Copy"`
	Page          int      `json:"Page"`
	Receive       string   `json:"Receive"`
	RecDate       string   `json:"RecDate"`
	Qty           int      `json:"Qty"`
	StapleApart   string   `json:"StapleApart"`
	Calculator    bool     `json:"calculator"`
	AnswerSheet   bool     `json:"AnswerSheet"`
	AnswerBookUse string   `json:"AnswerBookUse"`
	Remark        string   `json:"Remark"`
	Color         string   `json:"Color"`
	FileExam      []string `json:"fileexam"` // รองรับไฟล์ที่เป็น array

}

type ExamDetail struct {
	Ref           int      `json:"Ref"`
	Submit        string   `json:"submit"`
	SubDate       string   `json:"sub_date"`
	Copy          string   `json:"copy"`
	Page          string   `json:"page"`
	Recive        string   `json:"recive"`
	RecDate       string   `json:"recDate"`
	Qty           string   `json:"qty"`
	StapleConner  string   `json:"staple_conner"`
	StapleApart   string   `json:"staple_apart"`
	Calculator    string   `json:"calculator"`
	AnswerSheet   string   `json:"answesheet"`
	AnswerBookUse string   `json:"answerbook_use"`
	Remark        string   `json:"remark"`
	Color         string   `json:"color"`
	Lecturer      string   `json:"Lecturer"`
	No_st         string   `json:"No_st"`
	FileExam      []string `json:"files"` // รองรับไฟล์ที่เป็น array
	ExamType      string   `json:"exam_type"`
}

type JoinedExam struct {
	Ref     int    `json:"Ref"`
	No      int    `json:"No"`
	Edate   string `json:"Edate"`
	Etime   string `json:"Etime"`
	Hr      string `json:"Hr"`
	Course  string `json:"Course"`
	Num_st  string `json:"Num_st"`
	Room_id string `json:"Room_id"` // เปลี่ยนจาก Room เป็น Room_id
	Proctor string `json:"Proctor"`
	Remark  string `json:"Remark"`
	Submit  bool   `json:"Submit"`
	Page    string `json:"page"`
	Copy    string `json:"copy"`
	Seatrow string `json:"Seatrow"`
}

type Examtable struct {
	Ref      int    `json:"Ref"`
	EDate    string `json:"Edate"`
	ETime    string `json:"Etime"`
	Hr       string `json:"Hr"`
	Course   string `json:"Course"`
	Lecturer string `json:"Lecturer"`
	No_st    string `json:"No_st"` // เปลี่ยนเป็น NoSt แต่ยังคง json tag เดิม
}

// User model
type User struct {
	UserID     string `json:"user_id"`
	Username   string `json:"username"`
	FullName   string `json:"full_name"`
	Department int    `json:"department"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

// RoleType model
type RoleType struct {
	RoleID   string `json:"role_id"`
	RoleName string `json:"role_name"`
}

// UserRole model
type UserRole struct {
	ID     int    `json:"id"`
	UserID string `json:"user_id"`
	RoleID string `json:"role_id"`
}

// ProctorAssignment model
// ProctorAssignment model
type ProctorAssignment struct {
	ID       int    `json:"id"`
	UserID   string `json:"user_id"`
	Ref      int    `json:"ref"`
	Date     string `json:"date"`
	No       int    `json:"no"` // ตรวจสอบว่าตัวเล็กหรือตัวใหญ่
	IdConfig int    `json:"id_config"`
}

// ExamConfig model
type ExamConfig struct {
	Id_config       int    `json:"id_config"`
	AcademicYear    string `json:"academic_year"`
	Semester        string `json:"semester"`
	Phase           string `json:"phase"`
	PrepPeriodStart string `json:"prep_period_start"`
	PrepPeriodEnd   string `json:"prep_period_end"`
	ExamPeriodStart string `json:"exam_period_start"`
	ExamPeriodEnd   string `json:"exam_period_end"`
	Status          bool   `json:"status"`
	BackUp_exam     int    `json:"backup_exam"`
}

// ExamSubmissionHistory model
type ExamSubmissionHistory struct {
	ID           int    `json:"id"`
	Semester     string `json:"semester"`
	AcademicYear string `json:"academic_year"`
	Course       string `json:"course"`
	Page         string `json:"page"`
	Submit       string `json:"submit"`
	UserID       string `json:"user_id"`
	SubDate      string `json:"sub_date"`
}

// LecturerCourse model
type LecturerCourse struct {
	ID     int    `json:"id"`
	UserID string `json:"user_id"`
	Ref    int    `json:"ref"`
}

type ProctorCondition struct {
	Id              int    `json:"id"`
	User_id         string `json:"user_id"`
	BaseCondition   string `json:"base_condition"`
	SpecialDates    string `json:"special_dates"`
	TimePeriod      string `json:"time_period"`
	SpecialCourses  string `json:"special_courses"`
	TimeRestriction string `json:"time_restriction"`
	PairProctor     string `json:"pair_proctor"`
}

type Departments struct {
	Id_dept int    `json:"id_dept"`
	Name_th string `json:"name_th"`
}

type Departments_group struct {
	Id           int    `json:"id"`
	Id_dept      int    `json:"id_dept"`
	Id_dept_code string `json:"id_dept_code"`
}
