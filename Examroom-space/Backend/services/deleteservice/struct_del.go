package deleteservice

import "database/sql"

type UserDeleteService struct {
	DB *sql.DB
}

func NewUserDeleteService(db *sql.DB) *UserDeleteService {
	return &UserDeleteService{DB: db}
}
