package selectservice

// classifySubmissionStatus แปลงข้อความสถานะจาก DB → เป็นชนิดที่เราจะนับ
func classifySubmissionStatus(submitStatus string) string {
	switch submitStatus {
	case "ส่งแล้ว":
		return "submitted"
	case "มีสอบแต่ไม่มีข้อสอบส่ง":
		return "no_exam"
	default:
		return "pending"
	}
}
