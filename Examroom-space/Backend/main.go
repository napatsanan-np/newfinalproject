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

func normalizeURL(u string) string {
	return strings.TrimRight(strings.TrimSpace(u), "/")
}

func getFrontendURL() string {
	host := os.Getenv("URL_FONTEND")
	if host == "" {
		host = os.Getenv("URL_FRONTEND")
	}
	if host == "" {
		fmt.Println("Warning: URL_FONTEND / URL_FRONTEND is not set. Using default localhost.")
		host = "http://localhost:5173"
	}
	return normalizeURL(host)
}

func isAllowedOrigin(origin string, frontendURL string) bool {
	origin = normalizeURL(origin)
	if origin == "" {
		return false
	}

	allowedExact := map[string]bool{
		normalizeURL(frontendURL):             true,
		"https://project-superend.vercel.app": true,
		"https://examroom-space.vercel.app":   true,
		"http://localhost:3000":               true,
		"http://localhost:5173":               true,
		"http://127.0.0.1:3000":               true,
		"http://127.0.0.1:5173":               true,
	}

	if allowedExact[origin] {
		return true
	}

	if strings.HasSuffix(origin, ".vercel.app") {
		return true
	}

	if strings.HasSuffix(origin, ".su.ac.th") {
		return true
	}

	return false
}

func SecurityHeaders(frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		connectSrc := strings.Join([]string{
			"'self'",
			frontendURL,
			"https://project-superend.vercel.app",
			"https://examroom-space.vercel.app",
			"https://*.vercel.app",
			"http://localhost:8080",
			"http://localhost:3000",
			"http://localhost:5173",
			"http://127.0.0.1:8080",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5173",
			"https:",
			"wss:",
		}, " ")

		c.Header("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: blob: https:; "+
				"font-src 'self' data: https:; "+
				"connect-src "+connectSrc+"; "+
				"media-src 'self' blob: data:; "+
				"object-src 'none'; "+
				"child-src 'self'; "+
				"frame-ancestors 'none'; "+
				"form-action 'self'; "+
				"base-uri 'self';")

		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("Cross-Origin-Embedder-Policy", "require-corp")
		c.Header("Cross-Origin-Opener-Policy", "same-origin")
		c.Header("Cross-Origin-Resource-Policy", "same-origin")

		c.Header("Server", "")
		c.Header("X-Powered-By", "")

		c.Next()
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

func main() {
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

	frontendURL := getFrontendURL()

	if os.Getenv("ENVIRONMENT") == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(SecurityHeaders(frontendURL))
	r.Use(CustomRecovery())

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Requested-With",
			"X-CSRF-Token",
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	routes.SetupRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Frontend URL ::: " + frontendURL)
	fmt.Println("Running HTTP on port " + port)

	if os.Getenv("ENVIRONMENT") == "production" {
		cert := os.Getenv("SSL_CERT_PATH")
		key := os.Getenv("SSL_KEY_PATH")

		if cert != "" && key != "" {
			if err := r.RunTLS(":443", cert, key); err != nil {
				fmt.Printf("Failed to start HTTPS server: %v\n", err)
				os.Exit(1)
			}
		} else {
			fmt.Println("Warning: SSL certificate paths not set. Running without TLS.")
			if err := r.Run(":" + port); err != nil {
				fmt.Printf("Failed to start server: %v\n", err)
				os.Exit(1)
			}
		}
	} else {
		if err := r.Run(":" + port); err != nil {
			fmt.Printf("Failed to start server: %v\n", err)
			os.Exit(1)
		}
	}
}
