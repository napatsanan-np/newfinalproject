package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/services/selectservice"
)

// ============================
// CONTROLLER FOR LOGIN SERVICE
// ============================

func (ctrl *Controller) Login(c *gin.Context) {
	var loginData selectservice.LoginData
	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	res, status, err := ctrl.SelectService.Login(loginData)
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

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
