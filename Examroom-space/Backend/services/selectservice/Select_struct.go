package selectservice

import "database/sql"

type UserSelectService struct {
	DB *sql.DB
}

// NewUserSelectService สร้าง UserSelectService ใหม่
func NewUserSelectService(db *sql.DB) *UserSelectService {
	return &UserSelectService{DB: db}
}
