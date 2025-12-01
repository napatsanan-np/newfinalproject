package selectservice

import (
	"context"
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

func (s *UserSelectService) LoginSso(data map[string]interface{}) (*LoginResponses, int, error) {
	ctx := context.Background()

	userID, ok := data["azure_user_id"].(string)
	if !ok || userID == "" {
		log.Println("Missing or invalid oid in claims:", data)
		return nil, http.StatusBadRequest, errors.New("missing or invalid oid")
	}

	username, _ := data["username"].(string)
	fullName, _ := data["full_name"].(string)
	department, _ := data["department"].(int)
	email, _ := data["email"].(string)
	log.Println()
	//   Log ตรวจ user
	log.Println("username:", username, "| fullName:", fullName, "| department:", department, "| email:", email, "|azure_user_id", userID)

	var exists bool

	likePattern := "%" + fullName + "%"
	err := s.DB.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE full_name ILIKE $1)", likePattern).Scan(&exists)
	if err != nil {
		log.Println("  Failed to check user existence:", err)
		return nil, http.StatusInternalServerError, err
	}
	log.Println("exists::", exists)
	if !exists {
		//  ถ้าไม่พบชื่อในระบบและหา oid ไม่เจอ  ก็ให้ ----> insert ข้อมูลใหม่ทั้ง (กรณีไม่พบผู้ใช้)
		//  ถ้าไม่พบชื่อในระบบและหา oid เจอ  ก็ให้ ----> update ข้อมูลใหม่ ผ่าน oid (กรณีผู้ใช้เปลี่ยนชื่อ)
		var checkOid bool
		likePatternOID := "%" + userID + "%"
		log.Println("likePatternOID::", likePatternOID)
		err := s.DB.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE azure_user_id ILIKE $1)", likePatternOID).Scan(&checkOid)
		log.Println("checkOid::", checkOid)
		if err != nil {
			log.Println("  Failed to check user existence:", err)
			return nil, http.StatusInternalServerError, err
		}
		if checkOid { //  ถ้าไม่พบชื่อในระบบและหา oid เจอ ก็ให้ ----> update ข้อมูลใหม่ ผ่าน oid (กรณีผู้ใช้เปลี่ยนชื่อ)
			_, err = s.DB.ExecContext(ctx, `
			update users set username = $1 , full_name = $2 , department = $3 , email = $4 where azure_user_id = $5;
		`, username, fullName, department, email, userID)
			if err != nil {
				log.Println("  Failed to update:", err)
				return nil, http.StatusInternalServerError, err
			}
			//log.Println("  Inserted new user:", username)

		} else { //  ถ้าไม่พบชื่อในระบบและหา oid ไม่เจอ  ก็ให้ ----> insert ข้อมูลใหม่ทั้ง (กรณีไม่พบผู้ใช้)
			UID, _ := s.generateUserID()
			_, err = s.DB.ExecContext(ctx, `
			INSERT INTO users (user_id, username, full_name, department , azure_user_id , email) 
			VALUES ($1, $2, $3, $4 , $5 , $6)
		`, UID, username, fullName, department, userID, email)
			if err != nil {
				log.Println("  Failed to insert new user:", err)
				return nil, http.StatusInternalServerError, err
			}
		}

	} else {
		// ถ้าพบชื่อในระบบ แต่ oid เป็น null ให้ update oid email ผ่าน full_name
		log.Println("Case :: ถ้าพบชื่อในระบบ แต่ oid เป็น null ให้ update oid email ผ่าน full_name", email, userID, fullName)
		_, err = s.DB.ExecContext(ctx, `
			update users set email = $1 , azure_user_id = $2 where full_name ILIKE $3
		`, email, userID, fullName)
		if err != nil {
			log.Println("  Failed to update:", err)
			return nil, http.StatusInternalServerError, err
		}
	}

	//   Log ตรวจ role
	rows, err := s.DB.QueryContext(ctx, `
	SELECT  role_type.role_name FROM public.user_role inner join role_type on role_type.role_id = user_role.role_id where user_id = 
	(SELECT user_id FROM users WHERE full_name ILIKE $1) ;

	`, likePattern)
	if err != nil {
		log.Println("  Failed to query user roles:", err)
		return nil, http.StatusInternalServerError, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			log.Println("  Failed to scan role:", err)
			return nil, http.StatusInternalServerError, err
		}
		roles = append(roles, roleName)
	}
	log.Println("  Roles:", roles)

	data["roles"] = roles
	log.Println("  Role:", roles)

	if err != nil {
		log.Println("  Failed to generate JWT token:", err)
		return nil, http.StatusInternalServerError, err
	}

	token, err := generateTokenFromAzureClaims(data, roles)
	//log.Println("  JWT Token generated:", token)
	if err != nil {
		log.Println("  Failed to generate JWT token:", err)
		return nil, http.StatusInternalServerError, err
	}

	return &LoginResponses{
		Token: token,
		User:  data,
	}, http.StatusOK, nil
}
