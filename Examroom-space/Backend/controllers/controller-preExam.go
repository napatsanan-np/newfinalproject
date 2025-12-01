package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/models"
	"github.com/services/updateservice"
)

// ============================
// FILE IMPORT CONTROLLERS
// ============================

// ImportCSV handles CSV file import for exam data
func (ctrl *Controller) ImportCSV(c *gin.Context) {
	fmt.Println("Api Import ss Csv")

	// รับไฟล์จาก request
	file, header, err := c.Request.FormFile("FileExcel")
	if err != nil {
		fmt.Println("ERROR: File Request", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer file.Close()

	filename := header.Filename
	fmt.Println("File Name ::", filename)

	// บันทึกไฟล์
	if err := ctrl.Insertservice.SaveFile(file, filename); err != nil {
		fmt.Println("ERROR: File SaveFile", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ประมวลผลไฟล์ตามประเภท
	ext := strings.ToLower(filename[strings.LastIndex(filename, "."):])
	switch ext {
	case ".xlsx":
		if err := ctrl.Insertservice.ProcessXLSX(filename); err != nil {
			fmt.Println("ERROR: File ProcessXLSX", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไฟล์ไม่ถูกต้อง"})
		return
	}

	// หากทุกอย่างสำเร็จ ส่ง response สถานะ 200
	c.JSON(http.StatusOK, gin.H{"filename": filename, "message": "File processed successfully"})
}

// ImportCSVProctor handles CSV file import for proctor data
func (ctrl *Controller) ImportCSVProctor(c *gin.Context) {
	fmt.Println("Api Import Protor Csv")

	// รับไฟล์จาก request
	file, header, err := c.Request.FormFile("Proctor_data")
	if err != nil {
		fmt.Println("ERROR: File Request", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer file.Close()

	filename := header.Filename
	fmt.Println("File Name ::", filename)

	// บันทึกไฟล์
	if err := ctrl.Insertservice.SaveFile(file, filename); err != nil {
		fmt.Println("ERROR: File SaveFile", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ประมวลผลไฟล์ตามประเภท
	ext := strings.ToLower(filename[strings.LastIndex(filename, "."):])
	switch ext {
	case ".xlsx":
		if err := ctrl.Insertservice.ProcessProtor(filename); err != nil {
			fmt.Println("ERROR: File ProcessProtor", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type"})
		return
	}

	// หากทุกอย่างสำเร็จ ส่ง response สถานะ 200
	c.JSON(http.StatusOK, gin.H{"filename": filename, "message": "File processed successfully"})
}

// ============================
// ROOM MANAGEMENT CONTROLLERS
// ============================

// CreateRoom handles the creation of a new room
func (c *Controller) CreateRoom(ctx *gin.Context) {
	var room models.Room
	if err := ctx.ShouldBindJSON(&room); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.Insertservice.InsertRoom(room); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"message": "Room created successfully"})
}

// UpdateRoom handles updating an existing room
func (c *Controller) UpdateRoom(ctx *gin.Context) {
	roomID := ctx.Param("room_id")

	var room models.Room
	if err := ctx.ShouldBindJSON(&room); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room.RoomID = roomID

	if err := c.Updateservice.UpdateRoom(room); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Room updated successfully"})
}

// DeleteRoom handles deleting a room
func (c *Controller) DeleteRoom(ctx *gin.Context) {
	roomID := ctx.Param("room_id")

	if err := c.Deleteservice.DeleteRoom(roomID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

// ============================
// EXAM ROOM MANAGEMENT CONTROLLERS
// ============================

// UpdateRoomExam handles updating exam room configuration
func (ctrl *Controller) UpdateRoomExam(c *gin.Context) {
	var data models.RoomExam
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	fmt.Println("Edit_RoomExam RoomExam ::", data)
	err := ctrl.Updateservice.Update_RoomExam(data)
	if err != nil {
		// If the Edit_System method returns an error, return a 500 internal server error
		c.JSON(400, gin.H{"error": "Failed to edit system configuration", "details": err.Error()})
		return
	}

	// If the operation is successful, return a 200 OK response
	c.JSON(200, gin.H{"message": "RoomExam configuration edit successfully"})
}

// DelRoomExam handles deleting exam room configuration
func (ctrl *Controller) DelRoomExam(c *gin.Context) {
	var data models.RoomExam
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	fmt.Println("Del_RoomExam RoomExam ::", data)
	err := ctrl.Updateservice.Delete_RoomExam(data)
	if err != nil {
		// If the Edit_System method returns an error, return a 500 internal server error
		c.JSON(400, gin.H{"error": "Failed to edit system configuration", "details": err.Error()})
		return
	}

	// If the operation is successful, return a 200 OK response
	c.JSON(200, gin.H{"message": "RoomExam configuration del successfully"})
}

// ============================
// EXAM ALLOCATION CONTROLLERS
// ============================

// AutoExamRoom จะทำการจัดห้องสอบและคำนวณเวลาที่ใช้ในการประมวลผล
func (ctrl *Controller) AutoExamRoom(c *gin.Context) {
	// เริ่มต้น timer
	start := time.Now()

	var requestData struct {
		Date          string   `json:"date"`
		Time          string   `json:"time"`
		SelectedRooms []string `json:"selectedRooms"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		log.Printf("Invalid request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	log.Printf("Received Date: %s, Time: %s SelectedRooms: %s", requestData.Date, requestData.Time, requestData.SelectedRooms)

	// สร้าง allocator สำหรับการจัดห้อง
	examAllocator, err := ctrl.Insertservice.NewLect(requestData.Date, requestData.Time, requestData.SelectedRooms)
	if err != nil {
		log.Printf("Failed to create exam allocator: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exam allocator"})
		return
	}

	// เรียกใช้งานฟังก์ชัน AllocateRooms เพื่อจัดห้อง
	result, err := examAllocator.AllocateRooms()
	if err != nil {
		log.Printf("Failed to allocate rooms: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to allocate rooms"})
		return
	}
	examAllocators, err := ctrl.Insertservice.New(requestData.Date, requestData.Time, requestData.SelectedRooms)
	if err != nil {
		log.Printf("Failed to create exam allocator: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exam allocator"})
		return
	}

	resultLab, err := examAllocators.AllocateRooms()
	if err != nil {
		log.Printf("Failed to allocate rooms: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to allocate rooms"})
		return
	}

	// ส่งข้อความผลลัพธ์กลับไปยังผู้ใช้
	c.JSON(http.StatusOK, gin.H{
		"message":                result.Message,
		"messageLAb":             resultLab.Message,
		"execution_time_seconds": fmt.Sprintf("%.6f", time.Since(start).Seconds()),
	})
}

// ============================
// PROCTOR ASSIGNMENT CONTROLLERS
// ============================

// AutoProctor handles automatic proctor assignment
func (ctrl *Controller) AutoProctor(c *gin.Context) {
	// สร้าง service
	assignmentService := ctrl.Insertservice.NewAssignmentService(ctrl.Insertservice.DB)

	// เคลียร์ข้อมูลการจัดเก่า
	err := assignmentService.ClearAssignments()
	if err != nil {
		log.Println("Error clearing assignments:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear assignments"})
		return
	}

	// ดึงข้อมูล
	conditions, err := ctrl.Insertservice.GetConditionProctors(ctrl.Insertservice.DB)
	if err != nil {
		log.Println("Error getting condition proctors:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve proctor conditions"})
		return
	}

	rooms, err := ctrl.Insertservice.GetRoomExams(ctrl.Insertservice.DB)
	if err != nil {
		log.Println("Error getting room exams:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room exams"})
		return
	}

	// จัดกรรมการคุมสอบ
	assignments, err := assignmentService.AssignProctors(rooms, conditions)
	if err != nil {
		log.Println("Error assigning proctors:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign proctors"})
		return
	}

	// บันทึกผลการจัด
	err = assignmentService.SaveAssignments(assignments)
	if err != nil {
		log.Println("Error saving assignments:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save assignments"})
		return
	}

	// ส่ง JSON ตอบกลับสำเร็จ
	c.JSON(http.StatusOK, gin.H{"message": "Proctor assignments completed successfully"})
}

// HandleUpdateProctorAssignments จัดการการอัพเดตกรรมการคุมสอบ
func (ctrl *Controller) HandleUpdateProctorAssignments(c *gin.Context) {
	var requestBody struct {
		IdConfig int `json:"id_config"`
		Ref      int `json:"ref"`
		No       int `json:"no"`
		Proctors []struct {
			UserID string `json:"user_id"`
		} `json:"proctors"`
	}

	// อ่านข้อมูลจาก request body
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		log.Printf("Invalid request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	log.Printf("Received update request: ref=%d, no=%d, id_config=%d, proctors=%d items",
		requestBody.Ref, requestBody.No, requestBody.IdConfig, len(requestBody.Proctors))

	// ตรวจสอบว่าห้องสอบนี้มีอยู่จริง
	var exists bool
	err := ctrl.Insertservice.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM roomexam WHERE ref = $1 AND id_config = $2)",
		requestBody.Ref, requestBody.IdConfig).Scan(&exists)

	if err != nil {
		log.Printf("Error checking room existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking room existence"})
		return
	}

	if !exists {
		log.Printf("Room with ref=%d, id_config=%d not found", requestBody.Ref, requestBody.IdConfig)
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// แปลงข้อมูลจาก request เป็นรูปแบบที่ updateservice ต้องการ
	proctorInputs := make([]updateservice.ProctorInput, len(requestBody.Proctors))
	for i, p := range requestBody.Proctors {
		proctorInputs[i] = updateservice.ProctorInput{
			UserID: p.UserID,
		}
	}

	// สร้างข้อมูลสำหรับอัพเดต
	updateData := updateservice.ProctorAssignmentUpdate{
		IdConfig: requestBody.IdConfig,
		Ref:      requestBody.Ref,
		Proctors: proctorInputs,
	}

	// เรียกใช้ฟังก์ชันอัพเดต
	err = updateservice.UpdateProctorAssignments(ctrl.Insertservice.DB, updateData)
	if err != nil {
		log.Printf("Error updating proctor assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update proctor assignments"})
		return
	}

	// ส่งคำตอบกลับ
	c.JSON(http.StatusOK, gin.H{
		"message": "Proctor assignments updated successfully",
		"updated": len(requestBody.Proctors),
	})
}

// HandleDeleteProctorsByRef จัดการการลบกรรมการคุมสอบทั้งหมดจาก ref
func (ctrl *Controller) HandleDeleteProctorsByRef(c *gin.Context) {
	// อ่านค่า ref จาก URL
	refStr := c.Param("ref")
	ref, err := strconv.Atoi(refStr)
	if err != nil {
		log.Printf("Invalid reference ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reference ID"})
		return
	}

	// หา ID config ที่กำลังใช้งานอยู่
	var idConfig int
	row := ctrl.Insertservice.DB.QueryRow("SELECT id_config FROM exam_config WHERE status = true LIMIT 1")
	err = row.Scan(&idConfig)
	if err != nil {
		log.Printf("Failed to get active config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active config"})
		return
	}

	// ลบกรรมการคุมสอบทั้งหมดจาก ref
	err = updateservice.DeleteProctorsByRef(ctrl.Insertservice.DB, ref, idConfig)
	if err != nil {
		log.Printf("Failed to delete proctor assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete proctor assignments"})
		return
	}

	// ส่งคำตอบกลับ
	c.JSON(http.StatusOK, gin.H{"message": "Proctor assignments deleted successfully"})
}

// ============================
// TABLE MANAGEMENT CONTROLLERS
// ============================

// Deltable handles table deletion by reference
func (ctrl *Controller) Deltable(c *gin.Context) {
	fmt.Println("del table", c.Param("ref"))
	ctrl.Deleteservice.Deltables(c.Param("ref"))
}

// DeltableCondition handles deletion of condition proctor table
func (ctrl *Controller) DeltableCondition(c *gin.Context) {
	//fmt.Println("del table", c.Param("ref"))
	ctrl.Deleteservice.Delete_Condition_Proctor()
}

// ... import ด้านบนถูกแล้ว
// "github.com/services/updateservice"

func (h *Controller) UpdateExamTableNew(c *gin.Context) {
	var req updateservice.UpdateExamTableReq // <-- แก้จาก services. เป็น updateservice.
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body: " + err.Error()})
		return
	}
	if err := h.Updateservice.UpdateExamTable(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "update examtable success"})
}

func (h *Controller) UpdateRoomExamNew(c *gin.Context) {
	var req updateservice.UpdateRoomExamReq // <-- แก้จาก services.
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body: " + err.Error()})
		return
	}
	if err := h.Updateservice.UpdateRoomExamFields(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "update roomexam success"})
}

func (h *Controller) UpdateDetailExamNew(c *gin.Context) {
	var req updateservice.UpdateDetailExamReq // <-- แก้จาก services.
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body: " + err.Error()})
		return
	}
	if err := h.Updateservice.UpdateDetailExam(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "update detail_exam success"})
}

// UpdateConditionProctorNew แก้ไขเงื่อนไขกรรมการคุมสอบ
func (ctrl *Controller) UpdateConditionProctorNew(c *gin.Context) {
	type Req struct {
		UserID          string `json:"user_id" binding:"required"`
		BaseCondition   string `json:"base_condition"`
		SpecialDates    string `json:"special_dates"`
		TimePeriod      string `json:"time_period"`
		SpecialCourses  string `json:"special_courses"`
		TimeRestriction string `json:"time_restriction"`
	}
	var req Req
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// เรียก service ที่มีอยู่แล้ว
	if err := ctrl.Updateservice.UpdateConditionProctor(
		req.UserID,
		req.BaseCondition,
		req.SpecialDates,
		req.TimePeriod,
		req.SpecialCourses,
		req.TimeRestriction,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "update condition_proctor success"})
}

func (ctrl *Controller) GetDetailExamForEdit(c *gin.Context) {
	ctx := c.Request.Context()

	data, err := ctrl.Insertservice.ListDetailExamForEdit(ctx)
	if err != nil {
		log.Println("GetDetailExamForEdit error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}
