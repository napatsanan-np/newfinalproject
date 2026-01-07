package selectservice

import (
	"database/sql"
	"testing"
 
	"github.com/DATA-DOG/go-sqlmock" // sqlmock คือไลบรารีสำหรับม็อกฐานข้อมูล SQL ในการทดสอบ
)

func newMockDB(t *testing.T) (*sql.DB, sqlmock.Sqlmock) { // t *testing.T คือพารามิเตอร์ที่ใช้ในการทดสอบ รับ Report error 
	//คืนค่า 2 ค่า: *sql.DB (ฐานข้อมูลม็อก) กับ sqlmock.Sqlmock (อินเทอร์เฟซสำหรับตั้งค่าม็อก)
	t.Helper() // บอกว่า ฟังก์ชันนี้เป็น helper function (ถ้ามี error จะรายงานที่ caller แทน) //ถ้า test fail  error จะชี้ไปที่ test จริง

	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))// สร้าง DB ม็อก โดยใช้ regex matcher สำหรับแมตช์ query
//db คือฐานข้อมูลม็อก, mock คืออินเทอร์เฟซสำหรับตั้งค่าม็อก/ตัวควบคุมพฤติกรรม DB 
	if err != nil { // ถ้า mock สร้างไม่ได้ test จบ
		t.Fatalf("failed to open sqlmock db: %v", err)//ใช้ Fatalf เพราะ test ต่อไปทำไม่ได้แล้ว
	}
	t.Cleanup(func() { _ = db.Close() }) //เมื่อ test จบ (ผ่านหรือ fail) DB mock จะถูกปิดอัตโนมัติ ไม่ต้อง defer ใน test แต่ละไฟล์

	return db, mock
}
//Fatalf = fail แล้วหยุดทันที (เหมาะกับกรณีนี้ เพราะถ้าผิดก็ไม่ต้องทำอะไรต่อ)