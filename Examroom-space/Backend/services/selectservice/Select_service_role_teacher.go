package selectservice

import (
	"encoding/json"
	"errors"
	"log"

	"github.com/models"
)

// FetchUserWithRoles fetches and parses user, role, and role_type data
func (s *UserSelectService) GetExamTableTeacher(name string) ([]models.Examtable, error) {
	var jsonData []byte
	config, _ := s.GetConfig()
	// Define the query
	query := `
SELECT json_agg(t) 
FROM (
    SELECT * FROM public.examtable 
    WHERE lecturer ILIKE '%' || REGEXP_REPLACE($1, '^(นางสาว|นาย|นาง)\s*|(\s*\(ดร.\))$', '', 'g') || '%' and id_config = $2
) t;`

	// Execute the query
	err := s.DB.QueryRow(query, name, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	// Check if no data was returned
	if jsonData == nil {
		return nil, errors.New("no data found")
	}

	// Unmarshal the JSON data into a slice of UserWithRole
	var results []models.Examtable
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}
	log.Println(results)
	return results, nil
}
