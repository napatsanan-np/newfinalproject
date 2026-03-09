package main

import (
	"fmt"
	"os"
	"time"

	"github.com/config"
	"github.com/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// อัพเดท CSP
		c.Header("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: blob: https:; "+
				"font-src 'self' data:; "+
				"connect-src 'self' http://localhost:8080 http://localhost:3000/ "+
				"media-src 'self'; "+
				"object-src 'none'; "+
				"child-src 'self'; "+
				"frame-ancestors 'none'; "+
				"form-action 'self'; "+
				"base-uri 'self';")

		// เพิ่ม Security Headers
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("Cross-Origin-Embedder-Policy", "require-corp")
		c.Header("Cross-Origin-Opener-Policy", "same-origin")
		c.Header("Cross-Origin-Resource-Policy", "same-origin")

		// ลบ headers ที่อาจเปิดเผยข้อมูล
		c.Header("Server", "")
		c.Header("X-Powered-By", "")

		c.Next()
	}
}

func main() {
	// Initialize database connection with connection pooling
	db, err := config.Connect()
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		fmt.Printf("Failed to ping database: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Database connected successfully with connection pooling")

	gin.SetMode(gin.DebugMode)
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(SecurityHeaders())
	r.Use(CustomRecovery())

	host := os.Getenv("URL_FONTEND")
	if host == "" {
		fmt.Println("Warning: URL_FONTEND is not set. Using default localhost.")
		host = "http://localhost:5173"
	}

	// อัพเดท CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{host},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Requested-With",
			"X-CSRF-Token",
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
		AllowWildcard:    false,
		AllowWebSockets:  false,
		AllowFiles:       false,
	}))

	// Security Headers middleware

	// Rate limiting middleware (ถ้าต้องการ)
	// r.Use(ratelimit.RateLimiter(time.Second, 100))

	// ตั้งค่า Routes with database connection
	routes.SetupRoutes(r, db)

	fmt.Println("รันที่ DNS ::: " + host)

	// Environment-based server configuration
	if os.Getenv("ENVIRONMENT") == "production" {
		// Production settings
		cert := os.Getenv("SSL_CERT_PATH")
		key := os.Getenv("SSL_KEY_PATH")
		if cert != "" && key != "" {
			r.RunTLS(":443", cert, key)
		} else {
			fmt.Println("Warning: SSL certificate paths not set. Running without TLS.")
			r.Run(":8080")
		}
	} else {
		// Development settings
		r.Run(":8080")
	}
}

// Custom recovery middleware
func CustomRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.Header("Content-Type", "application/json")
				c.JSON(500, gin.H{
					"error": "Internal Server Error",
				})
			}
		}()
		c.Next()
	}
}
