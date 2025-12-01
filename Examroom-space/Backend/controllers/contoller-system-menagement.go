package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/models"
)

func (ctrl *Controller) Edit_System(c *gin.Context) {
	var data models.ExamConfig
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}
	
	err := ctrl.Updateservice.Update_ExamConfigByYearSemester(data, c.Param("academic_year"), c.Param("semester"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถแก้ไขการตั้งค่าระบบได้", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "แก้ไขการตั้งค่าระบบสำเร็จแล้ว"})
}

func (ctrl *Controller) DeltableConfig(c *gin.Context) {
	var data models.ExamConfig
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	err := ctrl.Deleteservice.Delete_ExamConfigByYearSemester(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถลบการตั้งค่าระบบได้", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ลบการตั้งค่าระบบสำเร็จแล้ว"})
}

func (ctrl *Controller) Edit_System_Status(c *gin.Context) {
	var data models.ExamConfig
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	fmt.Println("Edit_System SystemMenagement ::", data)

	err := ctrl.Updateservice.Update_ExamConfigByStatus(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถแก้ไขสถานะการตั้งค่าระบบได้", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "แก้ไขสถานะการตั้งค่าระบบสำเร็จแล้ว"})
}

func (ctrl *Controller) SystemMenagement(c *gin.Context) {
	var data models.ExamConfig
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง", "details": err.Error()})
		return
	}

	err := ctrl.Insertservice.Insert_System(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเพิ่มการตั้งค่าระบบได้", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "เพิ่มการตั้งค่าระบบสำเร็จแล้ว"})
}
