package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ============================
// REPORT CONTROLLERS
// ============================

// GetPaperUsageReport รายงานการใช้กระดาษ
func (rc *Controller) GetPaperUsageReport(c *gin.Context) {
	academicYear := c.Param("academic_year")
	semester := c.Param("semester")
	phase := c.Param("phase") // optional

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GetPaperUsageReport academic_year and semester are required"})
		return
	}

	stats, err := rc.SelectService.GetPaperUsageStats(academicYear, semester, phase)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetExamSubmissionReport รายงานการส่งข้อสอบ
func (rc *Controller) GetExamSubmissionReport(c *gin.Context) {
	academicYear := c.Param("academic_year")
	semester := c.Param("semester")
	phase := c.Param("phase") // optional

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year and semester are required"})
		return
	}

	stats, err := rc.SelectService.GetExamSubmissionStats(academicYear, semester, phase)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetProctorReport รายงานการคุมสอบ
func (rc *Controller) GetProctorReport(c *gin.Context) {
	academicYear := c.Param("academic_year")
	semester := c.Param("semester")

	// รองรับ 2 แบบ:
	// 1) /reports/proctor-stats/:academic_year/:semester/:user_id (เดิม)
	// 2) /reports/proctor-stats/:academic_year/:semester/:phase/:user_id (ใหม่)
	phase := c.Param("phase")    // อาจเป็น "" หรืออาจโดน bind เป็น user_id (กรณี route เดิม)
	userId := c.Param("user_id") // จะมีเมื่อ route มี :user_id

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year and semester are required"})
		return
	}

	// เคส route เดิมแบบ 3 segment: /.../:semester/:user_id
	// ตอนนี้ phase จะเท่ากับ user_id และ user_id จะว่าง -> normalize
	if userId == "" && phase != "" {
		userId = phase
		phase = ""
	}

	stats, err := rc.SelectService.GetProctorStats(academicYear, semester, phase, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ============================
// EXAM CONFIGURATION CONTROLLERS
// ============================

// GetExamConfigs ดึงข้อมูล exam configs ทั้งหมด
func (rc *Controller) GetExamConfigs(c *gin.Context) {
	configs, err := rc.SelectService.GetExamConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// GetActiveExamConfig ดึงข้อมูล exam config ที่กำลังใช้งาน
func (rc *Controller) GetActiveExamConfig(c *gin.Context) {
	config, err := rc.SelectService.GetActiveExamConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}