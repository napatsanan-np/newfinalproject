package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/services/insertservice"
	"github.com/services/selectservice"
)

// ============================
// CONTROLLER FOR LOGIN SERVICE
// ============================

func (ctrl *Controller) Login(c *gin.Context) {
	var loginData selectservice.LoginData

	if err := c.ShouldBindJSON(&loginData); err != nil {
		insertservice.InsertUserActivityLog(ctrl.Insertservice.DB, insertservice.UserActivityLog{
			UserID:      "",
			Username:    "",
			Role:        "",
			Action:      "LOGIN_FAIL",
			Description: "invalid request body",
			Endpoint:    c.FullPath(),
			Method:      c.Request.Method,
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			Status:      "FAIL",
		})

		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	res, status, err := ctrl.SelectService.Login(loginData)
	if err != nil {
		insertservice.InsertUserActivityLog(ctrl.Insertservice.DB, insertservice.UserActivityLog{
			UserID:      "",
			Username:    loginData.Username,
			Role:        "",
			Action:      "LOGIN_FAIL",
			Description: err.Error(),
			Endpoint:    c.FullPath(),
			Method:      c.Request.Method,
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			Status:      "FAIL",
		})
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	role := ""
	if len(res.Roles) > 0 {
		role = res.Roles[0]
	}
	insertservice.InsertUserActivityLog(ctrl.Insertservice.DB, insertservice.UserActivityLog{
		UserID:      res.User.UserID,
		Username:    res.User.Username,
		Role:        role,
		Action:      "LOGIN_SUCCESS",
		Description: "login successful",
		Endpoint:    c.FullPath(),
		Method:      c.Request.Method,
		IPAddress:   c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
		Status:      "SUCCESS",
	})

	c.JSON(status, gin.H{
		"message": "Login successful",
		"token":   res.Token,
		"user": gin.H{
			"user_id":    res.User.UserID,
			"username":   res.User.Username,
			"full_name":  res.User.FullName,
			"department": res.User.Department,
			"roles":      res.Roles,
		},
	})

}
