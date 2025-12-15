package selectservice

import "testing"

func TestClassifySubmissionStatus(t *testing.T) {
	tests := []struct {
		name string //ชื่อเคส (เอาไปโชว์ในผลลัพธ์)
		in   string //input ที่จะส่งเข้าไปในฟังก์ชัน
		want string //output ที่ออกมา
	}{
		{"submitted", "ส่งแล้ว", "submitted"},            //ถ้า input เป็น "ส่งแล้ว" ต้องได้ "submitted"
		{"no_exam", "มีสอบแต่ไม่มีข้อสอบส่ง", "no_exam"}, //เคสใหม่ของคุณ ต้องจัดหมวดเป็น "no_exam"
		{"pending_other", "ยังไม่ส่ง", "pending"},        //อะไรก็ตามที่ไม่ตรง 2 เคสแรก ให้เป็น pending
		{"pending_empty", "", "pending"},                 //เคสของสตริงว่าง

		// {"submitted", "ส่งแล้ว", "pending"},
		// {"no_exam", "มีสอบแต่ไม่มีข้อสอบส่ง", "pending"},
		// {"pending_other", "ยังไม่ส่ง", "pending"},
		// {"pending_empty", "", "pending"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := classifySubmissionStatus(tt.in)
			if got != tt.want {
				t.Fatalf("classifySubmissionStatus(%q) = %q; want %q", tt.in, got, tt.want)
			}
		})
	}
}

//Fatalf = fail แล้วหยุดทันที (เหมาะกับกรณีนี้ เพราะถ้าผิดก็ไม่ต้องทำอะไรต่อ)

//Errorf = fail แต่ยังรันต่อ (ใช้กับเคสที่อยากเก็บ error หลายจุด)
