package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/models"
	"github.com/services/selectservice"
)

// ============================
// Role Management
// ============================

func (ctrl *Controller) Edit_RoleProctorExamroom(c *gin.Context) {
	var data models.User
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	fmt.Println("Edit_RoleProctorExamroom::", data)

	if err := ctrl.Updateservice.Update_RoleExamProctor(data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถแก้กรรมการห้องอำนวยการสอบได้",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "แก้ไขบทบาทสำเร็จแล้ว"})
}

func (ctrl *Controller) Edit_RoleProctor(c *gin.Context) {
	var data models.User
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	fmt.Println("Edit_RoleProctor::", data)

	if err := ctrl.Updateservice.Update_Roleroctor(data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถแก้กรรมการห้องอำนวยการสอบได้",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "แก้ไขบทบาทสำเร็จแล้ว"})
}

// ============================
// Department Management
// ============================

func (c *Controller) AddDept(ctx *gin.Context) {
	var department models.Departments

	if err := ctx.ShouldBindJSON(&department); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	log.Println("department", department)

	if err := c.Insertservice.AddDepartment(department); err != nil {
		log.Println("Error adding department:", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถเพิ่มภาควิชาได้",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "เพิ่มภาควิชาเรียบร้อยแล้ว"})
}

func (c *Controller) EditDept(ctx *gin.Context) {
	id := ctx.Param("id")

	var input struct {
		Name      string   `json:"name" binding:"required"`
		DeptCodes []string `json:"id_dept_codes"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":   "ข้อมูลไม่ถูกต้อง",
			"details": err.Error(),
		})
		return
	}

	if err := c.Updateservice.UpdateDepartment(id, input.Name, input.DeptCodes); err != nil {
		log.Println(err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถอัปเดตข้อมูลภาควิชาได้",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "อัปเดตข้อมูลภาควิชาเรียบร้อยแล้ว"})
}

func (c *Controller) DelDept(ctx *gin.Context) {
	id := ctx.Param("id")

	if id == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รหัสภาควิชาหายไป"})
		return
	}

	if err := c.Deleteservice.DeleteDepartment(id); err != nil {
		log.Println("Error deleting department:", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถลบภาควิชาได้",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบภาควิชาเรียบร้อยแล้ว"})
}

// ============================
// User Management
// ============================

func (c *Controller) Insert(ctx *gin.Context) {
	var user models.User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	if err := c.Insertservice.InsertUser(user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถเพิ่มผู้ใช้ได้",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "เพิ่มผู้ใช้เรียบร้อยแล้ว"})
}

func (c *Controller) EditUser(ctx *gin.Context) {
	idStr := ctx.Param("id")

	var user models.User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	user.UserID = idStr

	if err := c.Updateservice.UpdateUser(user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว"})
}

func (c *Controller) DelUser(ctx *gin.Context) {
	idStr := ctx.Param("id")

	if err := c.Deleteservice.DeleteUser(idStr); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ไม่สามารถลบผู้ใช้ได้ เนื่องจากรายชื่อที่ต้องการถูกจัดเป็นกรรมการคุมสอบหรือกรรมการห้องอำนวยการสอบ",
			"details": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบผู้ใช้เรียบร้อยแล้ว"})
}

func (ctrl *Controller) GetUserActivityLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filter := selectservice.GetUserActivityLogsFilter{
		Username: c.Query("username"),
		Role:     c.Query("role"),
		Action:   c.Query("action"),
		Status:   c.Query("status"),
		DateFrom: c.Query("date_from"),
		DateTo:   c.Query("date_to"),
		Limit:    limit,
		Offset:   offset,
	}

	items, total, err := ctrl.SelectService.GetUserActivityLogs(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total": total,
		"items": items,
	})
}
