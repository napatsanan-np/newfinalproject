package selectservice

import "testing"

func TestAggregateSubmissionStats(t *testing.T) {
	rows := []SubmissionRow{
		// ภาควิชา CS
		{DeptCode: "CS", CourseCode: "CS101", CourseName: "Intro", SubmitStatus: "ส่งแล้ว"},
		{DeptCode: "CS", CourseCode: "CS102", CourseName: "Algo", SubmitStatus: "ยังไม่ส่ง"},
		{DeptCode: "CS", CourseCode: "CS103", CourseName: "DB", SubmitStatus: "มีสอบแต่ไม่มีข้อสอบส่ง"},

		// ภาควิชา IT
		{DeptCode: "IT", CourseCode: "IT201", CourseName: "Web", SubmitStatus: "ส่งแล้ว"},
		{DeptCode: "IT", CourseCode: "IT202", CourseName: "Net", SubmitStatus: ""},
	}

	got := AggregateSubmissionStats(rows)

	// ตรวจว่าได้ 2 ภาควิชา
	if len(got) != 2 {
		t.Fatalf("expected 2 departments, got %d", len(got))
	}

	// ---- ตรวจ CS ----
	cs := got["CS"]
	if cs == nil {
		t.Fatalf("expected CS stats, got nil")
	}
	if cs.TotalExams != 3 {
		t.Fatalf("CS total = %d; want 3", cs.TotalExams)
	}
	if cs.Submitted != 1 {
		t.Fatalf("CS submitted = %d; want 1", cs.Submitted)
	}
	if cs.Pending != 1 {
		t.Fatalf("CS pending = %d; want 1", cs.Pending)
	}
	if cs.NoExam != 1 {
		t.Fatalf("CS no_exam = %d; want 1", cs.NoExam)
	}
	if len(cs.Details) != 3 {
		t.Fatalf("CS details len = %d; want 3", len(cs.Details))
	}

	// ---- ตรวจ IT ----
	it := got["IT"]
	if it == nil {
		t.Fatalf("expected IT stats, got nil")
	}
	if it.TotalExams != 2 {
		t.Fatalf("IT total = %d; want 2", it.TotalExams)
	}
	if it.Submitted != 1 {
		t.Fatalf("IT submitted = %d; want 1", it.Submitted)
	}
	if it.Pending != 1 {
		t.Fatalf("IT pending = %d; want 1", it.Pending) // "" -> pending
	}
	if it.NoExam != 0 {
		t.Fatalf("IT no_exam = %d; want 0", it.NoExam)
	}
}
