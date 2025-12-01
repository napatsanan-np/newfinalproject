package insertservice

import (
	"database/sql"

	"github.com/models"
)

func (s *UseInsertService) GetConditionProctors(db *sql.DB) ([]models.ProctorCondition, error) {
	query := `
        SELECT id, user_id, base_condition, special_dates, 
               time_period, special_courses, time_restriction, pair_proctor 
        FROM condition_proctor
        ORDER BY base_condition DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conditions []models.ProctorCondition
	for rows.Next() {
		var c models.ProctorCondition
		err := rows.Scan(
			&c.Id,
			&c.User_id,
			&c.BaseCondition,
			&c.SpecialDates,
			&c.TimePeriod,
			&c.SpecialCourses,
			&c.TimeRestriction,
			&c.PairProctor,
		)
		if err != nil {
			return nil, err
		}
		conditions = append(conditions, c)
	}

	return conditions, nil
}

func GetConditionProctorByUserID(db *sql.DB, userID string) (*models.ProctorCondition, error) {
	query := `
        SELECT id, user_id, base_condition, special_dates, 
               time_period, special_courses, time_restriction, pair_proctor 
        FROM condition_proctor 
        WHERE user_id = $1`

	var c models.ProctorCondition
	err := db.QueryRow(query, userID).Scan(
		&c.Id,
		&c.User_id,
		&c.BaseCondition,
		&c.SpecialDates,
		&c.TimePeriod,
		&c.SpecialCourses,
		&c.TimeRestriction,
		&c.PairProctor,
	)
	if err != nil {
		return nil, err
	}

	return &c, nil
}

// สร้างหรืออัปเดตข้อมูลผู้ใช้จากเงื่อนไขกรรมการ
func (s *UseInsertService) EnsureProctorUsers(db *sql.DB, conditions []models.ProctorCondition) error {
	for _, condition := range conditions {
		if condition.User_id == "" {
			continue
		}

		// ตรวจสอบว่ามีผู้ใช้นี้ในตาราง users หรือไม่
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM users WHERE user_id = $1", condition.User_id).Scan(&count)
		if err != nil {
			return err
		}

		// ถ้ายังไม่มีข้อมูลผู้ใช้ ให้สร้างใหม่
		if count == 0 {
			// สร้างข้อมูลเบื้องต้นสำหรับผู้ใช้ใหม่
			// ชื่อผู้ใช้อาจเอามาจากแหล่งอื่น ในที่นี้ใช้ user_id เป็นค่าเริ่มต้น
			username := condition.User_id
			_, err = db.Exec("INSERT INTO users (user_id, username, full_name, department, password) VALUES ($1, $2, $3, $4, $5)",
				condition.User_id,
				username,
				"", // full_name ว่าง (ควรอัปเดตภายหลัง)
				"", // department ว่าง (ควรอัปเดตภายหลัง)
				"") // password ว่าง (ควรอัปเดตภายหลัง)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// ตรวจสอบและนำเข้าเงื่อนไขกรรมการจากไฟล์ Excel
func (s *UseInsertService) ImportConditionProctors(db *sql.DB, conditions []models.ProctorCondition) error {
	// เริ่ม transaction
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	// เตรียม statement สำหรับการเพิ่มหรืออัปเดตข้อมูล
	stmt, err := tx.Prepare(`
		INSERT INTO condition_proctor 
		(user_id, base_condition, special_dates, time_period, special_courses, time_restriction, pair_proctor)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) 
		DO UPDATE SET 
			base_condition = EXCLUDED.base_condition,
			special_dates = EXCLUDED.special_dates,
			time_period = EXCLUDED.time_period,
			special_courses = EXCLUDED.special_courses,
			time_restriction = EXCLUDED.time_restriction,
			pair_proctor = EXCLUDED.pair_proctor
	`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	// ดำเนินการเพิ่มหรืออัปเดตข้อมูลทีละรายการ
	for _, condition := range conditions {
		if condition.User_id == "" {
			continue
		}

		_, err = stmt.Exec(
			condition.User_id,
			condition.BaseCondition,
			condition.SpecialDates,
			condition.TimePeriod,
			condition.SpecialCourses,
			condition.TimeRestriction,
			condition.PairProctor,
		)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// Commit transaction
	return tx.Commit()
}

// ลบเงื่อนไขกรรมการทั้งหมด
func (s *UseInsertService) ClearAllConditionProctors(db *sql.DB) error {
	_, err := db.Exec("TRUNCATE TABLE condition_proctor RESTART IDENTITY")
	return err
}
