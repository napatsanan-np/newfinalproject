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

	dbURL := os.Getenv("DATABASE_URL")

	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// 🔥 สำคัญ: Render ต้องใช้ SSL
	if !strings.Contains(dbURL, "sslmode") {
		dbURL += "?sslmode=require"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open DB: %w", err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping DB: %w", err)
	}

	// Connection Pool
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
		fmt.Println("Warning: No .env file found (expected in production)")
	}
}