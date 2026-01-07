package selectservice

import (
	"database/sql"
	"net/http"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"golang.org/x/crypto/bcrypt"
)


// t *testing.T คือ object สำหรับรายงานผล test (pass/fail) และพิมพ์ error
func TestLogin_AdminSuccess(t *testing.T) {
	//กำหนด secret key สำหรับ JWT เป็นค่าคงที่ เพื่อให้ทดสอบได้
	//แปลง string เป็น []byte เพราะ JWT signing ใช้ byte key
	jwtKey = []byte("testsecret")
	//เรียกใช้ helper function เพื่อสร้าง mock database และ mock controller
	db, mock := newMockDB(t)
	//สร้าง service ตัวที่ต้องการทดสอบ (UserSelectService) Inject DB ปลอม (db) เข้าไป
	//ทำให้ตอน svc.Login(...) โค้ดภายในไป query ที่ sqlmock ควบคุมอยู่  นี่คือแนวคิด Dependency Injection ในการทำ unit test
	svc := &UserSelectService{DB: db}
	// สร้าง hash ของรหัสผ่าน "examroom@1234" เพื่อใช้ในการตั้งค่าม็อก เพราะใน DB จะเก็บรหัสผ่านแบบ hash ดังนั้นใน test เราต้องสร้าง hash ให้เหมือน DB จริง
	hashed, _ := bcrypt.GenerateFromPassword([]byte("examroom@1234"), bcrypt.DefaultCost)
	//bcrypt.GenerateFromPassword แปลงรหัสผ่านเป็น hash โดยใช้ cost ที่กำหนด (DefaultCost คือค่าที่เหมาะสม)	
	

	// ตั้งค่าม็อก: คาดหวังว่าเมื่อมีการ query ข้อมูลผู้ใช้ด้วย username "Admin1"
	//
	mock.ExpectQuery(`(?s).*FROM\s+public\.users.*WHERE\s+username\s*=\s*\$1.*`).
		WithArgs("Admin1").
		WillReturnRows(sqlmock.NewRows(
			[]string{"user_id", "username", "full_name", "department", "password"},
		).
			//  ต้องให้ department เป็นชนิดเดียวกับที่ Scan รับ (ส่วนใหญ่เป็น int)
			AddRow("U001", "Admin1", "Admin", 1, string(hashed)),
		)

	// roles
	mock.ExpectQuery(`(?s).*FROM\s+public\.user_role.*WHERE\s+ur\.user_id\s*=\s*\$1.*`).
		WithArgs("U001").
		WillReturnRows(sqlmock.NewRows([]string{"role_name"}).
			AddRow("ผู้ดูแลระบบ"))

	//  ไม่ต้อง Expect exam_config เพราะ Admin จะ return ก่อนถึงส่วนนี้ (ในโค้ดจริง)

	resp, code, err := svc.Login(LoginData{
		Username: "Admin1",
		Password: "examroom@1234",
	})

	if err != nil {
		if e := mock.ExpectationsWereMet(); e != nil {
			t.Fatalf("unexpected err: %v | unmet expectations: %v", err, e)
		}
		t.Fatalf("unexpected err: %v", err)
	}
	if code != http.StatusOK {
		t.Fatalf("expected 200 got %d", code)
	}
	if resp.Token == "" {
		t.Fatalf("expected token")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}




func TestLogin_UserNotFound_Unauthorized(t *testing.T) {
	jwtKey = []byte("testsecret")

	db, mock := newMockDB(t)
	svc := &UserSelectService{DB: db}

	mock.ExpectQuery(`(?s)SELECT\s+user_id,\s*username,\s*full_name,\s*department,\s*password\s+FROM\s+public\.users\s+WHERE\s+username\s*=\s*\$1`).
		WithArgs("noone").
		WillReturnError(sql.ErrNoRows)

	_, code, _ := svc.Login(LoginData{Username: "noone", Password: "1234"})
	if code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_WrongPassword_Unauthorized(t *testing.T) {
	jwtKey = []byte("testsecret")

	db, mock := newMockDB(t)
	svc := &UserSelectService{DB: db}

	// hash ของ "correct" แต่ส่ง "wrong"
	hashed, _ := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.DefaultCost)

	mock.ExpectQuery(`(?s)SELECT\s+user_id,\s*username,\s*full_name,\s*department,\s*password\s+FROM\s+public\.users\s+WHERE\s+username\s*=\s*\$1`).
		WithArgs("user1").
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "username", "full_name", "department", "password"}).
			AddRow("U100", "user1", "User One", 1, string(hashed)))

	_, code, _ := svc.Login(LoginData{Username: "user1", Password: "wrong"})
	if code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_RoleNotAllowed_Forbidden(t *testing.T) {
	jwtKey = []byte("testsecret")

	db, mock := newMockDB(t)
	svc := &UserSelectService{DB: db}

	hashed, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)

	mock.ExpectQuery(`(?s)SELECT\s+user_id,\s*username,\s*full_name,\s*department,\s*password\s+FROM\s+public\.users\s+WHERE\s+username\s*=\s*\$1`).
		WithArgs("user2").
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "username", "full_name", "department", "password"}).
			AddRow("U200", "user2", "User Two", 1, string(hashed)))

	mock.ExpectQuery(`(?s)SELECT\s+rt\.role_name\s+FROM\s+public\.user_role\s+ur\s+JOIN\s+public\.role_type\s+rt\s+ON\s+ur\.role_id\s*=\s*rt\.role_id\s+WHERE\s+ur\.user_id\s*=\s*\$1`).
		WithArgs("U200").
		WillReturnRows(sqlmock.NewRows([]string{"role_name"}).
			AddRow("เจ้าหน้าที่ทั่วไป"))

	_, code, _ := svc.Login(LoginData{Username: "user2", Password: "1234"})
	if code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_AllowedRole_ButOutsidePeriod_Forbidden(t *testing.T) {
	jwtKey = []byte("testsecret")

	db, mock := newMockDB(t)
	svc := &UserSelectService{DB: db}

	hashed, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)

	mock.ExpectQuery(`(?s)SELECT\s+user_id,\s*username,\s*full_name,\s*department,\s*password\s+FROM\s+public\.users\s+WHERE\s+username\s*=\s*\$1`).
		WithArgs("teacher1").
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "username", "full_name", "department", "password"}).
			AddRow("U300", "teacher1", "Teacher One", 1, string(hashed)))

	mock.ExpectQuery(`(?s)SELECT\s+rt\.role_name\s+FROM\s+public\.user_role\s+ur\s+JOIN\s+public\.role_type\s+rt\s+ON\s+ur\.role_id\s*=\s*rt\.role_id\s+WHERE\s+ur\.user_id\s*=\s*\$1`).
		WithArgs("U300").
		WillReturnRows(sqlmock.NewRows([]string{"role_name"}).
			AddRow("อาจารย์"))

	// (C) exam_config: ไม่มี args
	pastStart := time.Now().Add(-48 * time.Hour)
	pastEnd := time.Now().Add(-24 * time.Hour)

	mock.ExpectQuery(`(?s)SELECT\s+prep_period_start\s*,\s*prep_period_end\s*,\s*exam_period_start\s*,\s*exam_period_end\s+FROM\s+public\.exam_config\s+WHERE\s+status\s*=\s*true\s+ORDER\s+BY\s+academic_year,\s*semester\s+DESC\s+LIMIT\s+1;`).
		WillReturnRows(sqlmock.NewRows([]string{"prep_period_start", "prep_period_end", "exam_period_start", "exam_period_end"}).
			AddRow(pastStart, pastEnd, pastStart, pastEnd))

	_, code, _ := svc.Login(LoginData{Username: "teacher1", Password: "1234"})
	if code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_AllowedRole_WithinPeriod_Success(t *testing.T) {
	jwtKey = []byte("testsecret")

	db, mock := newMockDB(t)
	svc := &UserSelectService{DB: db}

	hashed, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)

	mock.ExpectQuery(`(?s)SELECT\s+user_id,\s*username,\s*full_name,\s*department,\s*password\s+FROM\s+public\.users\s+WHERE\s+username\s*=\s*\$1`).
		WithArgs("proctor1").
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "username", "full_name", "department", "password"}).
			AddRow("U400", "proctor1", "Proctor One", 1, string(hashed)))

	mock.ExpectQuery(`(?s)SELECT\s+rt\.role_name\s+FROM\s+public\.user_role\s+ur\s+JOIN\s+public\.role_type\s+rt\s+ON\s+ur\.role_id\s*=\s*rt\.role_id\s+WHERE\s+ur\.user_id\s*=\s*\$1`).
		WithArgs("U400").
		WillReturnRows(sqlmock.NewRows([]string{"role_name"}).
			AddRow("กรรมการคุมสอบ"))

	start := time.Now().Add(-1 * time.Hour)
	end := time.Now().Add(1 * time.Hour)

	mock.ExpectQuery(`(?s)SELECT\s+prep_period_start\s*,\s*prep_period_end\s*,\s*exam_period_start\s*,\s*exam_period_end\s+FROM\s+public\.exam_config\s+WHERE\s+status\s*=\s*true\s+ORDER\s+BY\s+academic_year,\s*semester\s+DESC\s+LIMIT\s+1;`).
		WillReturnRows(sqlmock.NewRows([]string{"prep_period_start", "prep_period_end", "exam_period_start", "exam_period_end"}).
			AddRow(start, end, start, end))

	resp, code, err := svc.Login(LoginData{Username: "proctor1", Password: "1234"})
	if err != nil {
		t.Fatalf("expected success, got err: %v", err)
	}
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if resp == nil || resp.Token == "" {
		t.Fatalf("expected token, got %+v", resp)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
