package insertservice

import (
	"database/sql"

	"github.com/models"
)

func (s *UseInsertService) GetRoomExams(db *sql.DB) ([]models.RoomExam, error) {
	config, _ := s.GetConfig()
	query := `
        SELECT ref, no, edate, etime, hr, course, num_st, 
               room_id, lecturer, seatrow, type_exam, group_exam 
        FROM roomexam where id_config = $1
        ORDER BY edate, etime, room_id`

	rows, err := db.Query(query, config[0].Id_config)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []models.RoomExam
	for rows.Next() {
		var r models.RoomExam
		err := rows.Scan(
			&r.Ref,
			&r.No,
			&r.Edate,
			&r.Etime,
			&r.Hr,
			&r.Course,
			&r.Num_st,
			&r.Room_id,
			&r.Lecturer,
			&r.Seatrow,
			&r.Type_exam,
			&r.Group_exam,
		)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, r)
	}

	return rooms, nil
}
