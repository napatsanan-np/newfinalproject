package updateservice

import (
	"database/sql"
	"log"
)

// ProctorAssignmentUpdate ใช้สำหรับอัพเดตการจัดกรรมการคุมสอบ
type ProctorAssignmentUpdate struct {
	IdConfig int            `json:"id_config"`
	Ref      int            `json:"ref"`
	Proctors []ProctorInput `json:"proctors"`
}

// ProctorInput ใช้สำหรับรับข้อมูลกรรมการคุมสอบที่ต้องการเพิ่ม
type ProctorInput struct {
	UserID string `json:"user_id"`
}

// DeleteProctorsByRef ลบกรรมการคุมสอบทั้งหมดจาก ref และ id_config
func DeleteProctorsByRef(db *sql.DB, ref int, idConfig int) error {
	query := `DELETE FROM proctor_assignments WHERE ref = $1 AND id_config = $2`

	_, err := db.Exec(query, ref, idConfig)
	if err != nil {
		log.Printf("Error deleting proctors: %v", err)
		return err
	}

	return nil
}

// InsertNewProctors เพิ่มกรรมการคุมสอบใหม่
func InsertNewProctors(db *sql.DB, ref int, idConfig int, proctors []ProctorInput) error {
	// หา no จาก ref และ id_config
	var no int
	queryNo := `SELECT no FROM roomexam WHERE ref = $1 AND id_config = $2 LIMIT 1`
	err := db.QueryRow(queryNo, ref, idConfig).Scan(&no)
	if err != nil {
		log.Printf("Error finding room no: %v", err)
		return err
	}

	// เพิ่มกรรมการใหม่
	query := `INSERT INTO proctor_assignments (id_config, user_id, ref, no) VALUES ($1, $2, $3, $4)`

	for _, proctor := range proctors {
		_, err := db.Exec(query, idConfig, proctor.UserID, ref, no)
		if err != nil {
			log.Printf("Error inserting proctor: %v", err)
			return err
		}
	}

	return nil
}

// UpdateProctorAssignments อัพเดตกรรมการคุมสอบ (ลบเก่าแล้วเพิ่มใหม่)
func UpdateProctorAssignments(db *sql.DB, update ProctorAssignmentUpdate) error {
	// เริ่ม transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}

	// รับรองว่ามีการ rollback เมื่อเกิดข้อผิดพลาด
	defer func() {
		if err != nil {
			tx.Rollback()
			log.Printf("Transaction rolled back due to error")
		}
	}()

	// ลบกรรมการคุมสอบเดิม
	deleteQuery := `DELETE FROM proctor_assignments WHERE ref = $1 AND id_config = $2`
	_, err = tx.Exec(deleteQuery, update.Ref, update.IdConfig)
	if err != nil {
		log.Printf("Error deleting existing proctors: %v", err)
		return err
	}
	log.Printf("Deleted existing proctors for ref=%d, id_config=%d", update.Ref, update.IdConfig)

	// หา no จาก ref และ id_config
	var no int
	queryNo := `SELECT no FROM roomexam WHERE ref = $1 AND id_config = $2 LIMIT 1`
	err = tx.QueryRow(queryNo, update.Ref, update.IdConfig).Scan(&no)
	if err != nil {
		log.Printf("Error finding room no: %v", err)
		return err
	}
	log.Printf("Found room no=%d for ref=%d, id_config=%d", no, update.Ref, update.IdConfig)

	// เพิ่มกรรมการใหม่
	if len(update.Proctors) > 0 {
		insertQuery := `INSERT INTO proctor_assignments (id_config, user_id, ref, no) VALUES ($1, $2, $3, $4)`

		for _, proctor := range update.Proctors {
			_, err = tx.Exec(insertQuery, update.IdConfig, proctor.UserID, update.Ref, no)
			if err != nil {
				log.Printf("Error inserting proctor %s: %v", proctor.UserID, err)
				return err
			}
			log.Printf("Inserted proctor %s for ref=%d, no=%d, id_config=%d",
				proctor.UserID, update.Ref, no, update.IdConfig)
		}
		log.Printf("Inserted %d new proctors", len(update.Proctors))
	} else {
		log.Printf("No new proctors to insert")
	}

	// ยืนยัน transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		return err
	}
	log.Printf("Transaction committed successfully")

	return nil
}
