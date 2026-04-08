package controllers


import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/models"
)

func (c *Controller) UpdateBackupExam(ctx *gin.Context) {

	var data models.ExamConfig
	if err := ctx.ShouldBindJSON(&data); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Println("examConfig", data)
	if err := c.Updateservice.UpdateBackup(data); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Room updated successfully"})
}

func (ctrl *Controller) UpdateDetailExam(c *gin.Context) {

	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to parse form data"})
		return
	}

	data := c.PostForm("data")

	var formData models.ExamDetail
	if err := json.Unmarshal([]byte(data), &formData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data"})
		return
	}

	files := c.Request.MultipartForm.File["fileexam[]"]

	if len(files) > 0 {
		for _, file := range files {

			filePath := filepath.Join("./Exam-file", file.Filename)

			if err := c.SaveUploadedFile(file, filePath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": fmt.Sprintf("Failed to save file %s", file.Filename),
				})
				return
			}

			formData.FileExam = append(formData.FileExam, filePath)
		}
	}

	log.Printf("Received data: %+v", formData)

	// ตรวจ id_config
	if formData.IdConfig <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "id_config is required",
		})
		return
	}

	// เรียก service
	if err := ctrl.Updateservice.Edit_DetailExam(formData); err != nil {

		log.Println("UpdateDetailExam error:", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data updated successfully",
	})
}

func (ctrl *Controller) GetFiles(c *gin.Context) {
	// Get query parameter (ref) from URL
	ref := c.Param("ref")

	// Convert ref to integer
	refInt, err := strconv.Atoi(ref)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ref parameter"})
		return
	}

	results := &[]models.Examtable{}
	err = ctrl.SelectService.SelectJson("examtable", ref, results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Println("results", (*results)[0].Course)
	filename := strconv.Itoa(refInt) + "--" + (*results)[0].Course + ".zip"

	files, err := ctrl.SelectService.GetFilesFromDB(refInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		log.Println("Get file err", err.Error())
		return
	}

	if len(files) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No files found"})
		return
	}

	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	log.Println("filePath:::", files)
	for _, filePath := range files {
		fullFilePath := filepath.Join("./", filePath)
		if _, err := os.Stat(fullFilePath); os.IsNotExist(err) {
			log.Println("File not found:", fullFilePath)
			continue
		}

		file, err := os.Open(fullFilePath)
		if err != nil {
			log.Println("Error opening file:", fullFilePath, err)
			continue
		}
		defer file.Close()

		zipFileWriter, err := zipWriter.Create(filepath.Base(filePath))
		if err != nil {
			log.Println("Error creating zip entry:", err)
			continue
		}

		_, err = io.Copy(zipFileWriter, file)
		if err != nil {
			log.Println("Error writing file to zip:", err)
			continue
		}
	}

	err = zipWriter.Close()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create zip file"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}

func (ctrl *Controller) NewExam(c *gin.Context) {
	var data models.RoomExam
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	fmt.Println("Param ::", data)
	ctrl.Insertservice.InsertNewExam(data)
	fmt.Println("del table")
}


func (ctrl *Controller) GetPendingOnlineExam(c *gin.Context) {
	results, err := ctrl.Updateservice.GetPendingOnlineExam()
	if err != nil {
		log.Println("GetPendingOnlineExam error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (ctrl *Controller) ReceiveOnlineExam(c *gin.Context) {
	var req struct {
		Ref      int    `json:"ref"`
		IdConfig int    `json:"id_config"`
		Receiver string `json:"receiver"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if req.Ref <= 0 || req.IdConfig <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ref and id_config are required",
		})
		return
	}

	if req.Receiver == "" {
		req.Receiver = "เจ้าหน้าที่ห้องข้อสอบ"
	}

	now := time.Now()
	subDate := fmt.Sprintf("%02d-%02d-%d", now.Day(), int(now.Month()), now.Year()+543)

	err := ctrl.Updateservice.ReceiveOnlineExam(req.Ref, req.IdConfig, req.Receiver, subDate)
	if err != nil {
		log.Println("ReceiveOnlineExam error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "รับข้อสอบออนไลน์สำเร็จ",
	})
}