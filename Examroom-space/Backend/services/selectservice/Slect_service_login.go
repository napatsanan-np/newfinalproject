package selectservice

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/models"
	"golang.org/x/crypto/bcrypt"
)

// Secret key สำหรับเซ็นและตรวจสอบ JWT (ควรเก็บไว้ใน environment variables)
var jwtKey = []byte(os.Getenv("JWT_SECRET"))

type LoginData struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
	Roles []string    `json:"roles"`
}

// ฟังก์ชันใช้สร้างรหัสผ่าน hash ด้วย bcrypt (ตอนลงทะเบียน)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// ฟังก์ชันสร้าง JWT token
func generateToken(user models.User, roles []string) (string, error) {

	claims := jwt.MapClaims{
		"user_id":      user.UserID,
		"username":     user.Username,
		"full_name":    user.FullName,
		"department":   user.Department,
		"roles":        roles,
		"primary_role": roles[0], // <== ต้องมีบรรทัดนี้ม
		"exp":          time.Now().Add(12 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func generateTokenFromAzureClaims(azureClaims map[string]interface{}, roles []string) (string, error) {
	//   Log เพื่อ debug
	log.Println("azureClaims.roles =", azureClaims["roles"])

	//   ดึงข้อมูลจาก claims ด้วย type assertion แบบปลอดภัย
	userID, _ := azureClaims["azure_user_id"].(string)
	username, _ := azureClaims["username"].(string)
	fullName, _ := azureClaims["full_name"].(string)
	department, _ := azureClaims["department"].(string)

	log.Println("role", roles)

	//   สร้าง JWT claims
	claims := jwt.MapClaims{
		"user_id":    userID,
		"username":   username,
		"full_name":  fullName,
		"department": department,
		"roles":      roles,
		"exp":        time.Now().Add(12 * time.Hour).Unix(),
	}

	//   สร้างและเซ็น token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// ฟังก์ชัน Login
func (s *UserSelectService) Login(loginData LoginData) (*LoginResponse, int, error) {
	var userData models.User
	var storedPassword string

	err := s.DB.QueryRow(`
        SELECT user_id, username, full_name, department, password 
        FROM public.users 
        WHERE username = $1`, loginData.Username,
	).Scan(&userData.UserID, &userData.Username, &userData.FullName,
		&userData.Department, &storedPassword)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, http.StatusUnauthorized, fmt.Errorf("Invalid username or password")
		}
		return nil, http.StatusInternalServerError, fmt.Errorf("Database error")
	}

	// เปรียบเทียบ password ที่ป้อนกับ hash ใน database
	if err := bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(loginData.Password)); err != nil {
		return nil, http.StatusUnauthorized, fmt.Errorf("Invalid username or password")
	}

	// ดึง roles
	var roles []string
	rows, err := s.DB.Query(`
        SELECT rt.role_name 
        FROM public.user_role ur 
        JOIN public.role_type rt ON ur.role_id = rt.role_id 
        WHERE ur.user_id = $1`, userData.UserID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Error fetching user roles")
	}
	defer rows.Close()

	isAdmin := false
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err == nil {
			roles = append(roles, role)
			if role == "ผู้ดูแลระบบ" {
				isAdmin = true
			}
		}
	}

	if isAdmin {
		token, err := generateToken(userData, roles)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
		return &LoginResponse{Token: token, User: userData, Roles: roles}, http.StatusOK, nil
	}

	// ตรวจสอบ role ที่อนุญาต
	allowedRoles := map[string]bool{"กรรมการคุมสอบ": true, "อาจารย์": true}
	isAllowedRole := false
	for _, role := range roles {
		if allowedRoles[role] {
			isAllowedRole = true
			break
		}
	}
	if !isAllowedRole {
		return nil, http.StatusForbidden, fmt.Errorf("Access denied for your role")
	}

	// ตรวจสอบช่วงเวลา
	var prepStart, prepEnd, examStart, examEnd time.Time
	err = s.DB.QueryRow(`
        SELECT prep_period_start , prep_period_end ,  exam_period_start, exam_period_end 
        FROM public.exam_config 
        WHERE status = true 
        ORDER BY academic_year, semester DESC 
        LIMIT 1;
    `).Scan(&prepStart, &prepEnd, &examStart, &examEnd)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Error fetching exam period")
	}

	now := time.Now()
	if !(now.After(prepStart) && now.Before(prepEnd)) &&
		!(now.After(examStart) && now.Before(examEnd)) {
		return nil, http.StatusForbidden, fmt.Errorf("ห้องข้อสอบยังไม่เปิด")
	}

	// สร้าง token และ return
	token, err := generateToken(userData, roles)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return &LoginResponse{
		Token: token,
		User:  userData,
		Roles: roles,
	}, http.StatusOK, nil
}

type LoginResponses struct {
	Token string                 `json:"token"`
	User  map[string]interface{} `json:"user"`  // ← ข้อมูล user อยู่นี่
	Roles []string               `json:"roles"` // แนะนำให้เป็น slice ไม่ใช่ string เดียว
}

func (c *UserSelectService) generateUserID() (string, error) {
	// ดึงข้อมูล ID ล่าสุดจากฐานข้อมูล
	var lastID string
	err := c.DB.QueryRow("SELECT user_id FROM users ORDER BY user_id DESC LIMIT 1").Scan(&lastID)
	if err != nil && err.Error() != "no rows in result set" {
		return "", err
	}

	// ถ้าไม่มี ID ก่อนหน้า ให้ใช้ 'U001'
	if lastID == "" {
		return "U001", nil
	}

	// แยกตัวเลขออกจาก ID เดิมแล้วเพิ่มค่า
	var num int
	_, err = fmt.Sscanf(lastID, "U%d", &num)
	if err != nil {
		return "", err
	}

	// เพิ่มตัวเลขขึ้นหนึ่ง
	num++

	// สร้าง ID ใหม่ในรูปแบบ Uxxx
	newID := fmt.Sprintf("U%03d", num)
	return newID, nil
}

func (s *UserSelectService) LoginSso(data map[string]interface{}) (*LoginResponse, int, error) {

	var user models.User

	oid, _ := data["oid"].(string)
	username, _ := data["preferred_username"].(string)
	fullName, _ := data["name"].(string)

	if oid == "" || username == "" {
		return nil, http.StatusUnauthorized, errors.New("invalid azure claims")
	}

	// หา user จาก oid
	err := s.DB.QueryRow(`
		SELECT user_id, username, full_name, department
		FROM users
		WHERE oid = $1
	`, oid).Scan(&user.UserID, &user.Username, &user.FullName, &user.Department)

	if err == sql.ErrNoRows {

		// หา user เก่าจาก username
		err = s.DB.QueryRow(`
			SELECT user_id, username, full_name, department
			FROM users
			WHERE LOWER(username) = LOWER($1)
		`, username).Scan(&user.UserID, &user.Username, &user.FullName, &user.Department)

		if err == sql.ErrNoRows {

			// create user ใหม่
			newID, err := s.generateUserID()
			if err != nil {
				return nil, http.StatusInternalServerError, err
			}

			_, err = s.DB.Exec(`
				INSERT INTO users (user_id, username, full_name, oid)
				VALUES ($1,$2,$3,$4)
			`, newID, username, fullName, oid)

			if err != nil {
				return nil, http.StatusInternalServerError, err
			}

			user = models.User{
				UserID:   newID,
				Username: username,
				FullName: fullName,
			}

		} else if err == nil {

			// bind oid ให้ user เดิม
			_, err = s.DB.Exec(`
				UPDATE users SET oid=$1 WHERE user_id=$2
			`, oid, user.UserID)

			if err != nil {
				return nil, http.StatusInternalServerError, err
			}

		} else {
			return nil, http.StatusInternalServerError, err
		}

	} else if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	// -------- get roles --------
	rows, err := s.DB.Query(`
		SELECT rt.role_name
		FROM user_role ur
		JOIN role_type rt ON ur.role_id = rt.role_id
		WHERE ur.user_id = $1
	`, user.UserID)

	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	roles := []string{}
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err == nil {
			roles = append(roles, role)
		}
	}

	if len(roles) == 0 {
		return nil, http.StatusForbidden, errors.New("user has no role")
	}

	// ใช้ generateToken ตัวเดิม
	token, err := generateToken(user, roles)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return &LoginResponse{
		Token: token,
		User:  user,
		Roles: roles,
	}, http.StatusOK, nil
}
