package config

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
	var connStr string

	// ใช้ DATABASE_URL ก่อนสำหรับ Railway / Cloud
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL != "" {
		connStr = databaseURL
	} else {
		// fallback สำหรับรันในเครื่อง
		connStr = fmt.Sprintf(
			"user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
			os.Getenv("POSTGRES_USER"),
			os.Getenv("POSTGRES_PASSWORD"),
			os.Getenv("POSTGRES_DB"),
			os.Getenv("POSTGRES_HOST"),
			os.Getenv("POSTGRES_PORT"),
		)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open a DB connection: %w", err)
	}

	// Verify the connection is valid
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping DB: %w", err)
	}

	// Connection Pool Settings
	maxOpenConns := getEnvAsInt("DB_MAX_OPEN_CONNS", 25)
	maxIdleConns := getEnvAsInt("DB_MAX_IDLE_CONNS", 10)
	connLifetimeMinutes := getEnvAsInt("DB_CONN_LIFETIME_MINUTES", 5)
	idleTimeoutSeconds := getEnvAsInt("DB_IDLE_TIMEOUT_SECONDS", 30)

	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxLifetime(time.Duration(connLifetimeMinutes) * time.Minute)
	db.SetConnMaxIdleTime(time.Duration(idleTimeoutSeconds) * time.Second)

	return db, nil
}

// Helper function to get environment variable as int with default value
func getEnvAsInt(name string, defaultVal int) int {
	valueStr := os.Getenv(name)
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultVal
}

func init() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Warning: No .env file found")
	}
}
