package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Secret key สำหรับเซ็นและตรวจสอบ JWT (ควรเก็บไว้ใน environment variables)
var jwtKey = []byte(os.Getenv("JWT_SECRET"))

// AuthMiddleware เป็น middleware สำหรับตรวจสอบ JWT token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// ✅ ดึงข้อมูลจาก claims และเก็บลง context
		if userID, ok := claims["user_id"].(float64); ok {
			c.Set("user_id", int(userID)) // JSON number เป็น float64
		}
		if username, ok := claims["username"].(string); ok {
			c.Set("username", username)
		}
		if fullName, ok := claims["full_name"].(string); ok {
			c.Set("full_name", fullName)
		}
		if department, ok := claims["department"].(string); ok {
			c.Set("department", department)
		}
		if roles, ok := claims["roles"].([]interface{}); ok {
			c.Set("roles", roles)
		}

		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rolesVal, exists := c.Get("roles")
		log.Println("Mid", rolesVal)
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "No roles found in token"})
			c.Abort()
			return
		}

		roles, ok := rolesVal.([]interface{})
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid roles format"})
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			for _, r := range roles {
				if roleStr, ok := r.(string); ok && roleStr == allowed {
					c.Next()
					return
				}
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied for your roles"})
		c.Abort()
	}
}
