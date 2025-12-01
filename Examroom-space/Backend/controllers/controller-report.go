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

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GetPaperUsageReport academic_year and semester are required"})
		return
	}

	stats, err := rc.SelectService.GetPaperUsageStats(academicYear, semester)
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

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year and semester are required"})
		return
	}

	stats, err := rc.SelectService.GetExamSubmissionStats(academicYear, semester)
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
	userId := c.Param("user_id")

	if academicYear == "" || semester == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_year and semester are required"})
		return
	}

	stats, err := rc.SelectService.GetProctorStats(academicYear, semester, userId)
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
