package controllers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"log"
	"net/http"
	"os"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

func generateRandomState() string {
	b := make([]byte, 16) // 16 bytes = 128-bit
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(b)
}
func (ctrl *Controller) LoginHandler(c *gin.Context) {
	ctrl.InitSSO()
	state := generateRandomState() //   ปลอดภัยกว่า hardcoded

	// แนะนำ: เก็บ state ลง session หรือ cookie เพื่อตรวจสอบภายหลัง
	c.SetCookie("oauth_state", state, 300, "/", "exam.sc.su.ac.th", true, true)
	log.Println("STATE", state)
	url := Oauth2Config.AuthCodeURL(
		"state-token",
		oauth2.SetAuthURLParam("prompt", "login"),
	)
	c.Redirect(http.StatusFound, url)
}

var (
	DB           *sql.DB
	Oauth2Config *oauth2.Config
	OidcVerifier *oidc.IDTokenVerifier
)

func (ctrl *Controller) InitSSO() {
	DB = ctrl.Insertservice.DB

	//   Load config จาก .env ด้วย prefix AZURE_
	clientID := os.Getenv("AZURE_CLIENT_ID")
	clientSecret := os.Getenv("AZURE_CLIENT_SECRET")
	redirectURL := os.Getenv("AZURE_REDIRECT_URL")
	tenantID := os.Getenv("AZURE_TENANT_ID")
	providerURL := "https://login.microsoftonline.com/" + tenantID + "/v2.0"
	log.Println("  REDIRECT_URL =", redirectURL)
	log.Println("  CLIENT_ID =", clientID)
	log.Println("  clientSecret =", clientSecret)
	//  Init OIDC provider
	ctx := context.Background()
	provider, err := oidc.NewProvider(ctx, providerURL)
	if err != nil {
		log.Fatalf(" Failed to connect to provider: %v", err)
	}

	//   Verifier ใช้สำหรับ verify ID token
	OidcVerifier = provider.Verifier(&oidc.Config{ClientID: clientID})

	//   OAuth2 config ใช้สำหรับแลก token
	Oauth2Config = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "profile", "email", "User.Read"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://login.microsoftonline.com/" + tenantID + "/oauth2/v2.0/authorize",
			TokenURL: "https://login.microsoftonline.com/" + tenantID + "/oauth2/v2.0/token",
		},
	}
}

func (ctrl *Controller) CallbackHandler(c *gin.Context) {

	ctx := context.Background()

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is missing"})
		return
	}
	log.Println("code :::", code)

	token, err := Oauth2Config.Exchange(ctx, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to exchange token",
			"details": err.Error(),
		})
		return
	}
	log.Println("token :::", token)

	//   ดึง id_token
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "id_token not found"})
		return
	}
	log.Println("rawIDToken :::", rawIDToken)
	//   ตรวจสอบ token ด้วย verifier
	idToken, err := OidcVerifier.Verify(ctx, rawIDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "invalid id_token",
			"details": err.Error(),
		})
		return
	}
	log.Println("id_token :::", idToken)
	// --------------------- เริ่มแก้จากตรงนี้------------------------
	//   decode claims จาก id_token
	var claims struct {
		Oid               string `json:"oid"`
		Email             string `json:"email"`
		Name              string `json:"name"`
		PreferredUsername string `json:"preferred_username"`
	}
	if err := idToken.Claims(&claims); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse claims"})
		return
	}

	//   สร้าง claimsMap สำหรับ LoginSso
	claimsMap := map[string]interface{}{
		"oid":                claims.Oid,
		"email":              claims.Email,
		"name":               claims.Name,
		"preferred_username": claims.PreferredUsername,
	}
	log.Println("Claims:", claimsMap)

	//   ส่งไปสร้าง JWT ของระบบเอง

	appToken, _, err := ctrl.SelectService.LoginSso(claimsMap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate JWT"})
		return
	}

	//   ส่งกลับ token + user info
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"status":  true,
		"token":   appToken.Token,
		"user": gin.H{
			"user_id":    appToken.User.UserID,
			"username":   appToken.User.Username,
			"full_name":  appToken.User.FullName,
			"department": appToken.User.Department,
			"roles":      appToken.Roles,
		},
	})
}
