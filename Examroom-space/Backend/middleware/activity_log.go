package middleware

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/services/insertservice"
)

func ActivityLogMiddleware(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		start := time.Now()
		
		// ===== ดึงข้อมูลจาก context (AuthMiddleware set ไว้แล้ว) =====
		userID := ""
		if v, ok := c.Get("user_id"); ok {
			userID = fmt.Sprint(v)
		}

		
		username := c.GetString("username")

		// roles เป็น []interface{} → แปลงเป็น string
		role := ""
		if rolesVal, ok := c.Get("roles"); ok {
			if roles, ok := rolesVal.([]interface{}); ok && len(roles) > 0 {
				var roleList []string
				for _, r := range roles {
					if rs, ok := r.(string); ok {
						roleList = append(roleList, rs)
					}
				}
				role = strings.Join(roleList, ",")
			}
		}

		endpoint := c.FullPath()
		method := c.Request.Method
		ip := c.ClientIP()
		ua := c.Request.UserAgent()

		// ===== ให้ controller ทำงานก่อน =====
		c.Next()

		// ===== หลัง controller =====
		statusCode := c.Writer.Status()
		status := "SUCCESS"
		if statusCode >= 400 {
			status = "FAIL"
		}

		action := method + " " + endpoint
		desc := "duration=" + time.Since(start).String()

		// ===== insert log =====
		insertservice.InsertUserActivityLog(db, insertservice.UserActivityLog{
			UserID:      userID,
			Username:    username,
			Role:        role,
			Action:      action,
			Description: desc,
			Endpoint:    endpoint,
			Method:      method,
			IPAddress:   ip,
			UserAgent:   ua,
			Status:      status,
		})
	}
}
