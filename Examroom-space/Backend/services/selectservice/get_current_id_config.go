package selectservice

import (
	"database/sql"
	"fmt"
)

func (s *UserSelectService) GetCurrentIDConfig() (int, error) {
	var id int
	err := s.DB.QueryRow(`
		SELECT id_config
		FROM public.exam_config
		WHERE status = true
		ORDER BY id_config DESC
		LIMIT 1
	`).Scan(&id)

	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("ไม่พบ exam_config ที่กำลังใช้งานอยู่ (status=true)")
		}
		return 0, err
	}
	return id, nil
}
