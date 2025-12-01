package updateservice

import "database/sql"

type Userupdateservice struct {
	DB *sql.DB
}

func NewUserUpdateService(Db *sql.DB) *Userupdateservice {
	return &Userupdateservice{DB: Db}
}
