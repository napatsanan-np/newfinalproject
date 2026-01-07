package insertservice

import (
	"database/sql"
	"log"
)

type UserActivityLog struct {
	UserID      string
	Username    string
	Role        string
	Action      string
	Description string
	Endpoint    string
	Method      string
	IPAddress   string
	UserAgent   string
	Status      string // "SUCCESS" / "FAIL"
}

func InsertUserActivityLog(db *sql.DB, a UserActivityLog) {
	// Log ห้ามทำให้ระบบหลักล่ม
	if db == nil {
		log.Println("[user_activity_logs] db is nil, skip logging")
		return
	}

	q := `
		INSERT INTO user_activity_logs
		(user_id, username, role, action, description, endpoint, method, ip_address, user_agent, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	`

	_, err := db.Exec(q,
		a.UserID,
		a.Username,
		a.Role,
		a.Action,
		a.Description,
		a.Endpoint,
		a.Method,
		a.IPAddress,
		a.UserAgent,
		a.Status,
	)

	if err != nil {
		log.Println("[user_activity_logs] insert failed:", err)
	}
}
