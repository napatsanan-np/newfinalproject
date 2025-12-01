package selectservice

import (
	"encoding/json"

	"github.com/models"
)

type InnerJoinUser struct {
	User      models.User     `json:"user"`
	User_role models.UserRole `json:"user_role"`
}

func (s *UserSelectService) UserInnerjoin() ([]InnerJoinUser, error) {
	var err error
	var Jsondata []byte

	sql := `SELECT json_agg(
			json_build_object(
				'user', users,
				'user_role', user_role
			)
		)
		FROM users
		JOIN user_role ON user_role.user_id = users.user_id;`

	err = s.DB.QueryRow(sql).Scan(&Jsondata)
	if err != nil {
		return nil, err
	}
	var results []InnerJoinUser
	err = json.Unmarshal(Jsondata, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}
