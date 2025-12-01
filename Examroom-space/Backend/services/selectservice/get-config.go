package selectservice

import (
	"encoding/json"
	"errors"
	"log"

	"github.com/models"
)

// SelectJson รองรับการเลือกข้อมูลในรูปแบบ JSON สำหรับทุกโมเดล
func (s *UserSelectService) GetConfig() ([]models.ExamConfig, error) {
	var jsonData []byte

	// Define the query
	query := `

SELECT json_agg(t) 
	FROM (SELECT * FROM public.exam_config where status = true order by id_config desc limit 1 ) t ;

	`

	// Execute the query
	err := s.DB.QueryRow(query).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	// Check if no data was returned
	if jsonData == nil {
		return nil, errors.New("no data found")
	}

	// Unmarshal the JSON data into a slice of UserWithRole
	var results []models.ExamConfig
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}
	log.Println(results)
	return results, nil
}
