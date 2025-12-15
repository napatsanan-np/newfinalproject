package selectservice

// SubmissionRow แถวข้อมูล 1 รายการที่เราจะใช้รวมสถิติ (จำลองจากผล query)
type SubmissionRow struct {
	DeptCode     string
	CourseCode   string
	CourseName   string
	SubmitStatus string
	SubDate      string
	Lecturer     string
}

// DeptStats สถิติของ 1 ภาควิชา
type DeptStats struct {
	DeptCode   string
	TotalExams int
	Submitted  int
	Pending    int
	NoExam     int
	Details    []SubmissionRow
}

// AggregateSubmissionStats รวมสถิติ “ตามภาควิชา” จาก rows
func AggregateSubmissionStats(rows []SubmissionRow) map[string]*DeptStats {
	result := make(map[string]*DeptStats)

	for _, r := range rows {
		// ถ้ายังไม่มีภาควิชานี้ใน result ให้สร้างก่อน
		if _, ok := result[r.DeptCode]; !ok {
			result[r.DeptCode] = &DeptStats{
				DeptCode:   r.DeptCode,
				TotalExams: 0,
				Submitted:  0,
				Pending:    0,
				NoExam:     0,
				Details:    []SubmissionRow{},
			}
		}

		ds := result[r.DeptCode]

		// 1 แถว = 1 วิชา/1 รายการสอบ (นับ total)
		ds.TotalExams++

		// classifySubmissionStatus() คือ logic ที่คุณทำไว้แล้ว
		switch classifySubmissionStatus(r.SubmitStatus) {
		case "submitted":
			ds.Submitted++
		case "no_exam":
			ds.NoExam++
		default:
			ds.Pending++
		}

		// เก็บรายละเอียดไว้ด้วย เผื่อเอาไปแสดงตารางใน report
		ds.Details = append(ds.Details, r)
	}

	return result
}
