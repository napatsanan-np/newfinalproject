package controllers


import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	pdf "github.com/ledongthuc/pdf"

	"github.com/gin-gonic/gin"
	"github.com/models"
)

// pdfMagicNumber is the byte signature every valid PDF file starts with.
var pdfMagicNumber = []byte("%PDF-")

// validatePDFUpload rejects files that aren't really PDFs, even if named
// "*.pdf" (e.g. a ZIP/DOCX renamed to .pdf), by checking both the extension
// and the actual file signature instead of trusting the filename.
func validatePDFUpload(fh *multipart.FileHeader) error {
	if strings.ToLower(filepath.Ext(fh.Filename)) != ".pdf" {
		return fmt.Errorf("%s: only .pdf files are allowed", fh.Filename)
	}

	f, err := fh.Open()
	if err != nil {
		return fmt.Errorf("%s: unable to read file", fh.Filename)
	}
	defer f.Close()

	header := make([]byte, len(pdfMagicNumber))
	if _, err := io.ReadFull(f, header); err != nil || !bytes.Equal(header, pdfMagicNumber) {
		return fmt.Errorf("%s: file is not a valid PDF", fh.Filename)
	}

	return nil
}

// countPDFPages returns the real number of pages in the PDF file saved at
// filePath, read straight from the file's page tree (not the filename or a
// user-typed value), so it can be compared against what staff entered.
func countPDFPages(filePath string) (int, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return 0, fmt.Errorf("%s: unable to read page count: %w", filepath.Base(filePath), err)
	}
	defer f.Close()

	return r.NumPage(), nil
}

// removeFiles best-effort deletes files saved during a request that ends up
// being rejected, so a failed submission doesn't leave orphaned files behind.
func removeFiles(paths []string) {
	for _, p := range paths {
		if err := os.Remove(p); err != nil {
			log.Println("cleanup: failed to remove file", p, err)
		}
	}
}

// contentDispositionHeader builds a Content-Disposition value that survives
// non-ASCII (เช่น ชื่อวิชาภาษาไทย) filenames: an ASCII-safe fallback for old
// clients (filename=) plus the real UTF-8 name per RFC 6266 (filename*=).
func contentDispositionHeader(filename string) string {
	return fmt.Sprintf(`attachment; filename="download%s"; filename*=UTF-8''%s`,
		filepath.Ext(filename), url.PathEscape(filename))
}

// windowsIllegalFilenameChars matches characters Windows forbids in filenames
// (< > : " / \ | ? * and control chars). Browsers auto-replace these with an
// underscore on save, so we substitute a readable dash ourselves instead.
var windowsIllegalFilenameChars = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1F]`)

func sanitizeFilename(name string) string {
	return strings.TrimSpace(windowsIllegalFilenameChars.ReplaceAllString(name, "-"))
}

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

	for _, file := range files {
		if err := validatePDFUpload(file); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	pageCounts := map[string]int{}
	var savedFilePaths []string

	if len(files) > 0 {
		for _, file := range files {

			filePath := filepath.Join("./Exam-file", file.Filename)

			if err := c.SaveUploadedFile(file, filePath); err != nil {
				removeFiles(savedFilePaths)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": fmt.Sprintf("Failed to save file %s", file.Filename),
				})
				return
			}
			savedFilePaths = append(savedFilePaths, filePath)

			formData.FileExam = append(formData.FileExam, filePath)

			pages, err := countPDFPages(filePath)
			if err != nil {
				log.Println("countPDFPages error:", err)
				removeFiles(savedFilePaths)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("%s: ไม่สามารถตรวจสอบจำนวนหน้าของไฟล์ได้ กรุณาอัปโหลดไฟล์ใหม่", file.Filename),
				})
				return
			}
			pageCounts[file.Filename] = pages
		}

		if declaredPages, err := strconv.Atoi(strings.TrimSpace(formData.Page)); err == nil && declaredPages > 0 {
			actualTotalPages := 0
			for _, n := range pageCounts {
				actualTotalPages += n
			}
			if actualTotalPages != declaredPages {
				removeFiles(savedFilePaths)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "กรุณาตรวจสอบไฟล์ข้อสอบหรือแก้จำนวนหน้าให้ถูกต้องก่อนส่งข้อสอบ",
				})
				return
			}
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
		"message":     "Data updated successfully",
		"page_counts": pageCounts,
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
	baseFilename := sanitizeFilename((*results)[0].Course)

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

	log.Println("filePath:::", files)

	var existingFilePaths []string
	for _, filePath := range files {
		fullFilePath := filepath.Join("./", filePath)
		if _, err := os.Stat(fullFilePath); os.IsNotExist(err) {
			log.Println("File not found:", fullFilePath)
			continue
		}
		existingFilePaths = append(existingFilePaths, fullFilePath)
	}

	if len(existingFilePaths) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No files found"})
		return
	}

	// มีข้อสอบชุดเดียว: ส่งไฟล์ PDF ต้นฉบับตรงๆ ไม่ต้อง zip
	if len(existingFilePaths) == 1 {
		fileBytes, err := os.ReadFile(existingFilePaths[0])
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
			return
		}
		c.Header("Content-Disposition", contentDispositionHeader(baseFilename+".pdf"))
		c.Data(http.StatusOK, "application/pdf", fileBytes)
		return
	}

	// มีตั้งแต่ 2 ชุดขึ้นไป: รวมเป็น zip เหมือนเดิม
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	for _, fullFilePath := range existingFilePaths {
		file, err := os.Open(fullFilePath)
		if err != nil {
			log.Println("Error opening file:", fullFilePath, err)
			continue
		}
		defer file.Close()

		zipFileWriter, err := zipWriter.Create(filepath.Base(fullFilePath))
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

	c.Header("Content-Disposition", contentDispositionHeader(baseFilename+".zip"))
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