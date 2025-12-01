package insertservice

import "database/sql"

type UseInsertService struct {
	DB *sql.DB
}

func NewUserInsertService(db *sql.DB) *UseInsertService {
	return &UseInsertService{DB: db}
}
