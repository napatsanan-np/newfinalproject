package selectservice

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/lib/pq"
	"github.com/models"
)

type InnerJoinRoomExam struct {
	RoomExam models.RoomExam `json:"roomexam"`
	Room     models.Room     `json:"rooms"`
}

type ConditionWithrole struct {
	RoomExam models.ProctorCondition `json:"condition_proctor"`
	Users    models.User             `json:"users"`
}

type ProctorInnerJoinRoomExam struct {
	RoomExam          models.RoomExam          `json:"roomexam"`
	Room              models.Room              `json:"rooms"`
	ProctorAssignment models.ProctorAssignment `json:"proctor_assignments"`
	User              models.User              `json:"users"`
}
type ProctornameassignmentsGetname struct {
	Ref       int    `json:"ref"`
	No        int    `json:"no"`
	Fullnames string `json:"fullnames"`
}

type UserWithRole struct {
	User models.User     `json:"users"`
	Role models.UserRole `json:"user_role"`
	Type models.RoleType `json:"role_type"`
}

// FetchUserWithRoles fetches and parses user, role, and role_type data
func (s *UserSelectService) FetchUserWithRoles() ([]UserWithRole, error) {
	var jsonData []byte

	// Define the query
	query := `
		SELECT json_agg(
			json_build_object(
				'users', u,
				'user_role', ur,
				'role_type', rt
			)
		) AS result
		FROM public.user_role ur
		INNER JOIN users u ON u.user_id = ur.user_id
		INNER JOIN role_type rt ON rt.role_id = ur.role_id ;
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
	var results []UserWithRole
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}
func (s *UserSelectService) ConditionWithproctor() ([]ConditionWithrole, error) {
	var jsonData []byte
	var err error
	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
		SELECT json_agg(
			json_build_object(
				'condition_proctor', condition_proctor,
				'users', users
			) ORDER BY users.user_id
		)
		FROM condition_proctor
		JOIN users ON users.user_id = condition_proctor.user_id;
	`
	// Execute Query
	err = s.DB.QueryRow(query).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	var results []ConditionWithrole
	// แปลง JSON เป็น struct ที่รับเข้ามา
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	// คืนค่าเป็น slice ของ InnerJoinRoomExam
	return results, nil
}

// InnerJoin ทำการดึงข้อมูลจากฐานข้อมูลโดยใช้การ JOIN และแปลงเป็น JSON
func (s *UserSelectService) InnerJoinRoomExam() ([]InnerJoinRoomExam, error) {
	var jsonData []byte
	var err error
	config, _ := s.GetConfig()
	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
		SELECT json_agg(
			json_build_object(
				'roomexam', roomexam,
				'rooms', rooms
			) ORDER BY roomexam.Ref
		)
		FROM roomexam
		JOIN rooms ON rooms.room_id = roomexam.room_id where roomexam.id_config = $1;
	`
	// Execute Query
	err = s.DB.QueryRow(query, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	var results []InnerJoinRoomExam
	// แปลง JSON เป็น struct ที่รับเข้ามา
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	// คืนค่าเป็น slice ของ InnerJoinRoomExam
	return results, nil
}
func (s *UserSelectService) InnerJoinRoomExamWithref(ref string) ([]InnerJoinRoomExam, error) {
	var jsonData []byte
	var err error
	config, _ := s.GetConfig()
	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
		SELECT json_agg(
			json_build_object(
				'roomexam', roomexam,
				'rooms', rooms
			) ORDER BY roomexam.Ref
		)
		FROM roomexam 
		JOIN rooms ON rooms.room_id = roomexam.room_id where ref = $1 and roomexam.id_config = $2;
	`
	// Execute Query
	err = s.DB.QueryRow(query, ref, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	var results []InnerJoinRoomExam
	// แปลง JSON เป็น struct ที่รับเข้ามา
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	// คืนค่าเป็น slice ของ InnerJoinRoomExam
	return results, nil
}

// InnerJoin ทำการดึงข้อมูลจากฐานข้อมูลโดยใช้การ JOIN และแปลงเป็น JSON
func (s *UserSelectService) GetProctorInnerJoinRoomExam() ([]ProctorInnerJoinRoomExam, error) {
	var jsonData []byte
	var err error
	config, _ := s.GetConfig()
	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
SELECT json_agg(
           json_build_object(
               'roomexam', roomexam,
               'rooms', rooms,
               'proctor_assignments', proctor_assignments,
               'users', users
           )
       )
FROM roomexam
JOIN rooms ON rooms.room_id = roomexam.room_id
JOIN proctor_assignments ON roomexam.ref = proctor_assignments.ref
JOIN users ON users.user_id = proctor_assignments.user_id where roomexam.id_config = $1;
	`
	// Execute Query
	err = s.DB.QueryRow(query, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	var results []ProctorInnerJoinRoomExam
	// แปลง JSON เป็น struct ที่รับเข้ามา
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	// คืนค่าเป็น slice ของ InnerJoinRoomExam
	return results, nil
}

func (s *UserSelectService) GetProctorName() ([]ProctornameassignmentsGetname, error) {
	config, _ := s.GetConfig()
	rows, err := s.DB.Query(`
        SELECT 
            pa.ref,
            pa.no,
            STRING_AGG(u.full_name, ', ' ORDER BY u.full_name ASC) AS fullnames
        FROM 
            public.proctor_assignments pa
        INNER JOIN 
            public.users u ON pa.user_id = u.user_id where pa.id_config = $1
        GROUP BY 
            pa.no , pa.ref;
    `, config[0].Id_config)
	if err != nil {
		fmt.Println("ERROR executing query:", err)
		return nil, err
	}
	defer rows.Close()

	var results []ProctornameassignmentsGetname
	for rows.Next() {
		var result ProctornameassignmentsGetname
		if err := rows.Scan(&result.Ref, &result.No, &result.Fullnames); err != nil {
			fmt.Println("ERROR scanning row:", err)
			return nil, err
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("ERROR with rows:", err)
		return nil, err
	}

	return results, nil
}

func (s *UserSelectService) GetProctorNamewithref() ([]ProctornameassignmentsGetname, error) {
	config, _ := s.GetConfig()
	rows, err := s.DB.Query(`
        SELECT 
            pa.ref,
            pa.no,
            STRING_AGG(u.full_name, ', ' ORDER BY u.full_name ASC) AS fullnames
        FROM 
            public.proctor_assignments pa
        INNER JOIN 
            public.users u ON pa.user_id = u.user_id  where pa.id_config = $1
        GROUP BY 
            pa.no , pa.ref;
    `, config[0].Id_config)
	if err != nil {
		fmt.Println("ERROR executing query:", err)
		return nil, err
	}
	defer rows.Close()

	var results []ProctornameassignmentsGetname
	for rows.Next() {
		var result ProctornameassignmentsGetname
		if err := rows.Scan(&result.Ref, &result.No, &result.Fullnames); err != nil {
			fmt.Println("ERROR scanning row:", err)
			return nil, err
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("ERROR with rows:", err)
		return nil, err
	}

	return results, nil
}

func (s *UserSelectService) GetProctorNamewithno(no string) ([]ProctornameassignmentsGetname, error) {

	config, _ := s.GetConfig()
	rows, err := s.DB.Query(`
        SELECT 
            pa.ref,
            pa.no,
            STRING_AGG(u.full_name, ', ' ORDER BY u.full_name ASC) AS fullnames
        FROM 
            public.proctor_assignments pa
        INNER JOIN 
            public.users u ON pa.user_id = u.user_id where pa.id_config = $1 and 
		where pa.no = $2 
        GROUP BY 
            pa.no , pa.ref;
    `, config[0].Id_config, no)
	if err != nil {
		fmt.Println("ERROR executing query:", err)
		return nil, err
	}
	defer rows.Close()

	var results []ProctornameassignmentsGetname
	for rows.Next() {
		var result ProctornameassignmentsGetname
		if err := rows.Scan(&result.Ref, &result.No, &result.Fullnames); err != nil {
			fmt.Println("ERROR scanning row:", err)
			return nil, err
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("ERROR with rows:", err)
		return nil, err
	}

	return results, nil
}

func (ctrl *UserSelectService) GetFilesFromDB(ref int) ([]string, error) {
	// Fetch configuration (example: ref = 1, id_config = 1)
	config, err := ctrl.GetConfig()
	if err != nil || len(config) == 0 {
		return nil, fmt.Errorf("failed to get config or config is empty")
	}
	// SQL query to fetch files array from the database
	query := `SELECT files FROM detail_exam WHERE ref = $1 AND id_config = $2`
	var files []string

	err = ctrl.DB.QueryRow(query, ref, config[0].Id_config).Scan(pq.Array(&files))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch files: %w", err)
	}
	log.Println("files", files)
	return files, nil
}
