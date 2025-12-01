package controllers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/models"
)

// ============================
// CONTROLLER FOR QUERY AND SHOWING DATA
// ============================

func (ctrl *Controller) ShowData(c *gin.Context) {
	tableName := c.Param("tablename")
	ref := c.Param("ref") // ใช้ Query parameter สำหรับ ref (optional)
	log.Println("user_id:", c.GetInt("user_id"))
	roles, _ := c.Get("roles") // ได้ []interface{}{"กรรมการคุมสอบ", "อาจารย์"}
	log.Println("role:", roles)
	var results interface{}

	// Mapping ชื่อ table ไปยัง struct ที่เกี่ยวข้อง
	switch tableName {
	case "roomexam":
		results = &[]models.RoomExam{}
	case "examtable":
		results = &[]models.Examtable{}
	case "detail_exam":
		results = &[]models.ExamDetail{}
	case "joinedexam":
		results = &[]models.JoinedExam{}
	case "users":
		results = &[]models.User{}
	case "role_type":
		results = &[]models.RoleType{}
	case "user_role":
		results = &[]models.UserRole{}
	case "rooms":
		results = &[]models.Room{}
	case "proctor_assignments":
		results = &[]models.ProctorAssignment{}
	case "exam_submission_history":
		results = &[]models.ExamSubmissionHistory{}
	case "lecturer_courses":
		results = &[]models.LecturerCourse{}
	case "exam_config":
		results = &[]models.ExamConfig{}
	case "condition_proctor":
		results = &[]models.ProctorCondition{}
	case "departments":
		results = &[]models.Departments{}
	case "departments_group":
		results = &[]models.Departments_group{}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid table name"})
		return
	}

	// เรียกใช้ฟังก์ชัน SelectJson
	err := ctrl.SelectService.SelectJson(tableName, ref, results)
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	c.JSON(http.StatusOK, results)
}
func (ctrl *Controller) ShowDataUser(c *gin.Context) {
	re, err := ctrl.SelectService.UserInnerjoin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, err.Error())
	}
	c.JSON(http.StatusOK, re)
}

func (ctrl *Controller) FetchDetailExam(c *gin.Context) {
	re, err := ctrl.SelectService.FetchDetailExam()
	if err != nil {
		c.JSON(http.StatusInternalServerError, err.Error())
	}
	c.JSON(http.StatusOK, re)
}

// FetchRoomExam ดึงข้อมูล RoomExam จากฐานข้อมูลและส่งผลลัพธ์ในรูปแบบ JSON
func (ctrl *Controller) FetchRoomExam(c *gin.Context) {
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.InnerJoinRoomExam()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) ExamDatawithRoleTeach(c *gin.Context) {
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล

	fullNameRaw, exists := c.Get("full_name")
	if !exists {
		log.Println("ไม่พบ full_name ใน context")
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบชื่อผู้ใช้ใน token"})
		return
	}

	fullName, ok := fullNameRaw.(string)
	if !ok {
		log.Println("full_name ไม่ใช่ string:", fullNameRaw)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ประเภทของ full_name ไม่ถูกต้อง"})
		return
	}

	log.Println("full_name:", fullName)

	results, err := ctrl.SelectService.GetExamTableTeacher(fullName)
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) ExamDatawithRoleProctor(c *gin.Context) {

	fullNameRaw, exists := c.Get("full_name")
	if !exists {
		log.Println("ไม่พบ full_name ใน context")
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบชื่อผู้ใช้ใน token"})
		return
	}

	fullName, ok := fullNameRaw.(string)
	if !ok {
		log.Println("full_name ไม่ใช่ string:", fullNameRaw)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ประเภทของ full_name ไม่ถูกต้อง"})
		return
	}

	log.Println("full_name:", fullName)

	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	log.Println("Ctrl ExamDatawithRoleProctor")
	results, err := ctrl.SelectService.InnerJoinRoomExamExamdetailRoleProctor(fullName)
	if err != nil {
		log.Println("Ctrl ExamDatawithRoleProctor err", err)
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) AllExamDatawithRoleProctor(c *gin.Context) {
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	log.Println("Ctrl AllExamDatawithRoleProctor")
	results, err := ctrl.SelectService.AllInnerJoinRoomExamExamdetailRoleProctor()
	if err != nil {
		log.Println("Ctrl AllExamDatawithRoleProctor err", err)
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) Getroomexamwithref(c *gin.Context) {
	ref := c.Param("ref")
	results, err := ctrl.SelectService.InnerJoinRoomExamWithref(ref)
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) InnerJoinExamroomExamdetail(c *gin.Context) {
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.InnerJoinRoomExamExamdetail()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) GetProtorWithRoomexam(c *gin.Context) {
	// เรียกใช้ฟังก์ชัน SelectJson
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.GetProctorInnerJoinRoomExam()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) GetProctorNames(c *gin.Context) {
	// เรียกใช้ฟังก์ชัน SelectJson
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.GetProctorName()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}
func (ctrl *Controller) GetProctorNameswithRef(c *gin.Context) {
	// เรียกใช้ฟังก์ชัน SelectJson
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.GetProctorName()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}
func (ctrl *Controller) GetProctorNameswithNo(c *gin.Context) {
	// เรียกใช้ฟังก์ชัน SelectJson
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	no := c.Param("no")
	results, err := ctrl.SelectService.GetProctorNamewithno(no)
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) GetUserWithRole(c *gin.Context) {
	// เรียกใช้ฟังก์ชัน SelectJson
	// เรียกฟังก์ชัน InnerJoin เพื่อดึงข้อมูล
	results, err := ctrl.SelectService.FetchUserWithRoles()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	// ส่งข้อมูลผลลัพธ์กลับไปยัง client
	c.JSON(http.StatusOK, results)
}

//ConditionWithproctor()

func (ctrl *Controller) ConditionWithproctor(c *gin.Context) {

	results, err := ctrl.SelectService.ConditionWithproctor()
	if err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, results)
}
