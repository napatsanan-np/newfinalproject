package selectservice

import (
	"encoding/json"

	"github.com/models"
)

type InnerJoinRoomExamExamdetail struct {
	RoomExam   models.RoomExam   `json:"roomexam"`
	Room       models.Room       `json:"rooms"`
	ExamDetail models.ExamDetail `json:"detail_exam"`
}

// InnerJoin ทำการดึงข้อมูลจากฐานข้อมูลโดยใช้การ JOIN และแปลงเป็น JSON
func (s *UserSelectService) InnerJoinRoomExamExamdetail() ([]InnerJoinRoomExamExamdetail, error) {
	var jsonData []byte
	var err error

	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
SELECT json_agg(
    json_build_object(
        'roomexam', roomexam,
        'detail_exam', detail_exam,
        'rooms', rooms
    ) ORDER BY roomexam.Ref
)
FROM roomexam
JOIN detail_exam ON detail_exam.Ref = roomexam.Ref and detail_exam.id_config = roomexam.id_config
JOIN rooms ON rooms.room_id = roomexam.room_id where detail_exam.id_config = $1;

	`
	config, _ := s.GetConfig()

	// Execute Query
	err = s.DB.QueryRow(query, config[0].Id_config).Scan(&jsonData)
	if err != nil {
		return nil, err
	}

	var results []InnerJoinRoomExamExamdetail
	// แปลง JSON เป็น struct ที่รับเข้ามา
	err = json.Unmarshal(jsonData, &results)
	if err != nil {
		return nil, err
	}

	// คืนค่าเป็น slice ของ InnerJoinRoomExam
	return results, nil
}

type InnerJoinRoomExamExamdetailRoleProctor struct {
	No        int    `json:"No"`        // หมายเลขห้องสอบ
	Course    string `json:"Course"`    // ชื่อวิชา
	RoomName  string `json:"Room_name"` // ชื่อห้องสอบ
	Edate     string `json:"Edate"`     // วันที่สอบ (ควรเป็น time.Time ถ้าจัดเก็บเป็น timestamp)
	Hr        string `json:"Hr"`        // จำนวนชั่วโมงสอบ
	NumSt     string `json:"Num_st"`    // จำนวนนักศึกษาที่เข้าสอบ
	Fullnames string `json:"fullnames"` // รายชื่อกรรมการสอบ (รวมกันเป็น String)
	Submit    string `json:"Submit"`    // สถานะการส่งข้อมูล
}

func (s *UserSelectService) InnerJoinRoomExamExamdetailRoleProctor(name string) ([]InnerJoinRoomExamExamdetailRoleProctor, error) {
	var results []InnerJoinRoomExamExamdetailRoleProctor

	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
SELECT 

    roomexam.no, 
    roomexam.course, 
    rooms.room_name, 
    roomexam.edate, 
    roomexam.hr, 
    roomexam.num_st, 
    p.fullnames, 
    detail_exam.submit
FROM roomexam 
JOIN detail_exam ON detail_exam.ref = roomexam.ref 
AND roomexam.id_config = detail_exam.id_config
JOIN rooms ON rooms.room_id = roomexam.room_id
JOIN (
    SELECT 
        pa.ref,
        pa.no,
        STRING_AGG(u.full_name, ', ' ORDER BY u.full_name ASC) AS fullnames
    FROM public.proctor_assignments pa
    INNER JOIN public.users u ON pa.user_id = u.user_id
	where pa.id_config = $1
    GROUP BY pa.ref, pa.no
) p ON p.no = roomexam.no AND p.ref = roomexam.ref
WHERE p.fullnames LIKE '%' || REGEXP_REPLACE($2, '^(นางสาว|นาย|นาง)\s*|(\s*\(ดร.\))$', '', 'g') || '%' 
AND roomexam.id_config = $3;
	`
	config, _ := s.GetConfig()
	// Execute Query
	rows, err := s.DB.Query(query, config[0].Id_config, name, config[0].Id_config)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// อ่านค่าจากผลลัพธ์ของ query
	for rows.Next() {
		var item InnerJoinRoomExamExamdetailRoleProctor
		err := rows.Scan(&item.No, &item.Course, &item.RoomName, &item.Edate, &item.Hr, &item.NumSt, &item.Fullnames, &item.Submit)
		if err != nil {
			return nil, err
		}
		results = append(results, item)
	}

	// ตรวจสอบ error จาก rows
	if err = rows.Err(); err != nil {
		return nil, err
	}
	//log.Println("roomxam", results)
	return results, nil
}

type AllInnerJoinRoomExamExamdetailRoleProctor struct {
	Ref       int    `json:"Ref"`
	No        int    `json:"No"`        // หมายเลขห้องสอบ
	Course    string `json:"Course"`    // ชื่อวิชา
	RoomName  string `json:"Room_name"` // ชื่อห้องสอบ
	Edate     string `json:"Edate"`     // วันที่สอบ (ควรเป็น time.Time ถ้าจัดเก็บเป็น timestamp)
	Etime     string `json:"Etime"`
	Hr        string `json:"Hr"`        // จำนวนชั่วโมงสอบ
	NumSt     string `json:"Num_st"`    // จำนวนนักศึกษาที่เข้าสอบ
	Fullnames string `json:"fullnames"` // รายชื่อกรรมการสอบ (รวมกันเป็น String)
	Submit    string `json:"Submit"`    // สถานะการส่งข้อมูล
}

func (s *UserSelectService) AllInnerJoinRoomExamExamdetailRoleProctor() ([]AllInnerJoinRoomExamExamdetailRoleProctor, error) {
	var results []AllInnerJoinRoomExamExamdetailRoleProctor

	// สร้าง SQL Query เพื่อดึงข้อมูล
	query := `
SELECT 
  roomexam.ref, 
    roomexam.no, 
    roomexam.course, 
    rooms.room_name, 
    roomexam.edate,
	 roomexam.etime,
    roomexam.hr, 
    roomexam.num_st, 
    p.fullnames, 
    detail_exam.submit
FROM roomexam 
JOIN detail_exam ON detail_exam.ref = roomexam.ref 
AND roomexam.id_config = detail_exam.id_config
JOIN rooms ON rooms.room_id = roomexam.room_id
JOIN (
    SELECT 
        pa.ref,
        pa.no,
        STRING_AGG(u.full_name, ', ' ORDER BY u.full_name ASC) AS fullnames
    FROM public.proctor_assignments pa
    INNER JOIN public.users u ON pa.user_id = u.user_id
	where pa.id_config = $1
    GROUP BY pa.ref, pa.no
) p ON p.no = roomexam.no AND p.ref = roomexam.ref
WHERE roomexam.id_config = $2 order by roomexam.no ;
	`
	config, _ := s.GetConfig()
	// Execute Query
	rows, err := s.DB.Query(query, config[0].Id_config, config[0].Id_config)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// อ่านค่าจากผลลัพธ์ของ query
	for rows.Next() {
		var item AllInnerJoinRoomExamExamdetailRoleProctor
		err := rows.Scan(&item.Ref, &item.No, &item.Course, &item.RoomName, &item.Edate, &item.Etime, &item.Hr, &item.NumSt, &item.Fullnames, &item.Submit)
		if err != nil {
			return nil, err
		}
		results = append(results, item)
	}

	// ตรวจสอบ error จาก rows
	if err = rows.Err(); err != nil {
		return nil, err
	}
	//log.Println("roomxam", results)
	return results, nil
}
