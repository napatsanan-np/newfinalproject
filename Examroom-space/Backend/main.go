package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/config"
	"github.com/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SecurityHeaders(frontendURL, backendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		connectSrc := []string{
			"'self'",
			"http://localhost:8080",
			"http://localhost:5173",
		}

		if frontendURL != "" {
			connectSrc = append(connectSrc, frontendURL)
		}
		if backendURL != "" {
			connectSrc = append(connectSrc, backendURL)
		}

		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: blob: https:; " +
			"font-src 'self' data:; " +
			"connect-src " + strings.Join(connectSrc, " ") + "; " +
			"media-src 'self'; " +
			"object-src 'none'; " +
			"child-src 'self'; " +
			"frame-ancestors 'none'; " +
			"form-action 'self'; " +
			"base-uri 'self';"

		c.Header("Content-Security-Policy", csp)

		// Security headers
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("Cross-Origin-Embedder-Policy", "require-corp")
		c.Header("Cross-Origin-Opener-Policy", "same-origin")
		c.Header("Cross-Origin-Resource-Policy", "same-origin")

		// Hide server info
		c.Header("Server", "")
		c.Header("X-Powered-By", "")

		c.Next()
	}
}

func main() {
	// DB connection
	db, err := config.Connect()
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Printf("Failed to ping database: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Database connected successfully with connection pooling")

	environment := os.Getenv("ENVIRONMENT")
	if environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(CustomRecovery())

	frontendPublicURL := os.Getenv("FRONTEND_PUBLIC_URL")
	backendPublicURL := os.Getenv("BACKEND_PUBLIC_URL")

	r.Use(SecurityHeaders(frontendPublicURL, backendPublicURL))

	// CORS origins
	corsOriginsEnv := os.Getenv("CORS_ORIGINS")
	allowedOrigins := []string{"http://localhost:5173"}

	if corsOriginsEnv != "" {
		rawOrigins := strings.Split(corsOriginsEnv, ",")
		allowedOrigins = []string{}
		for _, origin := range rawOrigins {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
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

	// Routes
	routes.SetupRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	fmt.Printf("ENVIRONMENT=%s\n", environment)
	fmt.Printf("CORS_ORIGINS=%v\n", allowedOrigins)

	if err := r.Run(":" + port); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
		os.Exit(1)
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
				c.Abort()
			}
		}()
		c.Next()
	}
}
