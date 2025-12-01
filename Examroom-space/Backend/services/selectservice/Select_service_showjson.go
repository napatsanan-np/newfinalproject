package selectservice

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/models"
)

var safeTableMap = map[string]string{
	"roomexam":                "roomexam",
	"examtable":               "examtable",
	"detail_exam":             "detail_exam",
	"proctor_assignments":     "proctor_assignments",
	"joinedexam":              "joinedexam",
	"users":                   "users",
	"role_type":               "role_type",
	"rooms":                   "rooms",
	"exam_configs":            "exam_configs",
	"exam_submission_history": "exam_submission_history",
	"lecturer_courses":        "lecturer_courses",
	"exam_config":             "exam_config",
	"condition_proctor":       "condition_proctor",
	"departments":             "departments",
	"departments_group":       "departments_group",
}

func (s *UserSelectService) SelectJson(tableName, ref string, result interface{}) error {
	var jsonData []byte
	var err error

	safeTable, ok := safeTableMap[tableName]
	if !ok {
		return errors.New("invalid or unauthorized table name")
	}

	useIdConfig := map[string]bool{
		"examtable":           true,
		"roomexam":            true,
		"proctor_assignments": true,
		"detail_exam":         true,
	}

	var params []interface{}
	query := ""

	if useIdConfig[tableName] {
		config, _ := s.GetConfig()
		if len(config) == 0 {
			return errors.New("config not found")
		}
		params = append(params, config[0].Id_config)
		query = fmt.Sprintf("SELECT json_agg(t ORDER BY t.*) FROM (SELECT * FROM %s WHERE id_config = $1", safeTable)

		if ref != "" {
			query += " AND ref = $2"
			params = append(params, ref)
		}
	} else {
		query = fmt.Sprintf("SELECT json_agg(t ORDER BY t.*) FROM (SELECT * FROM %s", safeTable)
		if ref != "" {
			query += " WHERE ref = $1"
			params = append(params, ref)
		}
	}

	query += ") AS t;"

	err = s.DB.QueryRow(query, params...).Scan(&jsonData)
	if err != nil {
		return err
	}

	if len(jsonData) > 0 {
		err = json.Unmarshal(jsonData, result)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *UserSelectService) FetchDetailExam() ([]models.ExamDetail, error) {

	config, err := s.GetConfig()
	if err != nil || len(config) == 0 {
		return nil, fmt.Errorf("failed to get config or config is empty")
	}

	query := `
    SELECT json_agg(t ORDER BY t.ref) 
    FROM (
        SELECT * FROM detail_exam 
        WHERE id_config = $1
    ) AS t
`
	var jsonData []byte
	err = s.DB.QueryRow(query, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch files: %w", err)
	}

	var results []models.ExamDetail
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}
	log.Println(results)
	return results, nil

}
