package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// ============================
// CONTROLLER FOR CALCULATE FOR STUDENT SIGNATURE
// ============================

func (c *Controller) StudentSig(ctx *gin.Context) {
	// รับไฟล์จาก `form-data`
	file, header, err := ctx.Request.FormFile("SigStd")
	if err != nil {
		fmt.Println("ERROR: File Request", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer file.Close()

	filename := header.Filename
	fmt.Println("File Name ::", filename)

	// ตรวจสอบประเภทของไฟล์ (เฉพาะ Excel)
	if !strings.HasSuffix(filename, ".xlsx") {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Only .xlsx files are allowed"})
		return
	}

	// บันทึกไฟล์
	if err := c.Insertservice.SaveFile(file, filename); err != nil {
		fmt.Println("ERROR: File SaveFile", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
}

func (c *Controller) GetStd(ctx *gin.Context) {
	f, err := excelize.OpenFile("./uploads/" + ctx.Param("filename"))
	if err != nil {
		fmt.Println("ERROR: Open Excel File", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open Excel file"})
		return
	}
	defer f.Close()

	// อ่านข้อมูลจากชีต "Sheet1"
	rows, err := f.GetRows("Sheet1")
	if err != nil {
		fmt.Println("ERROR: Read Sheet", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read Sheet1"})
		return
	}

	rowFilterParam := ctx.Param("rowFilterParam")
	log.Println("Format Row", rowFilterParam)

	// ตรวจสอบว่า rowFilterParam มีค่าหรือไม่ ถ้าไม่มีให้เป็น "all"
	if rowFilterParam == "all" {
		rowFilterParam = "all"
	}

	// ✅ ดึงผังที่นั่งจาก DB (room_seat_plan) แทน hardcode
	roomName := ctx.Param("roomname")
	plan, err := c.getRoomSeatPlan(roomName)
	if err != nil {
		// ถ้าไม่พบผัง ให้แจ้งชัดเจน (เพื่อบังคับให้ตั้งค่าแทนการ hardcode)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("ห้อง %s ยังไม่ได้ตั้งค่าผังที่นั่ง (room_seat_plan)", roomName)})
		return
	}

	// แปลงข้อมูลเป็น JSON
	var students []map[string]string
	for i, row := range rows {
		if i == 0 {
			continue // ข้าม header
		}
		if len(row) < 3 {
			continue
		}

		students = append(students, map[string]string{
			"student_id":   row[0],
			"student_name": row[1],
			"dep":          row[2],
		})
	}

	// เรียงชื่อ A-Z
	sort.SliceStable(students, func(i, j int) bool {
		return students[i]["student_name"] < students[j]["student_name"]
	})

	// ใส่ seat_no (แถว) ตามลำดับ
	for i := range students {
		seat := CalSeat1(plan, i+1, rowFilterParam) // ✅ ใช้ plan จาก DB
		students[i]["seat_no"] = seat
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"room":    roomName,
		"count":   len(students),
		"data":    students,
	})
}

// ============================
// SEAT PLAN (DB) + CALCULATOR (NO HARDCODE)
// ============================

type RoomSeatPlan struct {
	OddPattern   []int
	EvenPattern  []int
	ExtraRowSize int
}

// getRoomSeatPlan ดึงผังที่นั่งของห้องจากตาราง room_seat_plan (ไม่มี hardcode แล้ว)
func (c *Controller) getRoomSeatPlan(roomID string) (*RoomSeatPlan, error) {
	if c == nil || c.SelectService == nil || c.SelectService.DB == nil {
		return nil, fmt.Errorf("DB not initialized")
	}

	var oddStr, evenStr string
	var extra int

	q := `
		SELECT odd_pattern::text, even_pattern::text, extra_row_size
		FROM public.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
		
		WHERE room_id = $1
	`
	err := c.SelectService.DB.QueryRow(q, roomID).Scan(&oddStr, &evenStr, &extra)
	if err != nil {
		return nil, err
	}

	var odd, even []int
	if err := json.Unmarshal([]byte(oddStr), &odd); err != nil {
		return nil, fmt.Errorf("invalid odd_pattern for %s: %w", roomID, err)
	}
	if err := json.Unmarshal([]byte(evenStr), &even); err != nil {
		return nil, fmt.Errorf("invalid even_pattern for %s: %w", roomID, err)
	}

	if extra <= 0 {
		extra = 10
	}

	return &RoomSeatPlan{OddPattern: odd, EvenPattern: even, ExtraRowSize: extra}, nil
}

// CalSeat1 คำนวณแถวที่นั่งแบบเดิม (odd/even/all/custom) แต่ใช้ผังจาก DB (room_seat_plan)
func CalSeat1(plan *RoomSeatPlan, x int, rowFilterParam string) string {
	if plan == nil {
		return "ไม่พบข้อมูลที่นั่ง"
	}

	var seats []int
	rowType, err := strconv.Atoi(rowFilterParam)
	if err != nil {
		rowType = 0
	}

	switch rowFilterParam {
	case "odd":
		seats = plan.OddPattern
	case "even":
		seats = plan.EvenPattern
	case "all":
		seats = mergeSeats1(plan.OddPattern, plan.EvenPattern)
	default:
		// custom: ส่งเป็นตัวเลข (เช่น "2") ให้เริ่มตั้งแต่แถวนั้น (ตัด index ออก)
		merged := mergeSeats1(plan.OddPattern, plan.EvenPattern)
		if rowType < 0 {
			rowType = 0
		}
		if rowType >= len(merged) {
			seats = []int{}
		} else {
			seats = merged[rowType:]
		}
	}

	if len(seats) == 0 {
		log.Println("No seat data available")
		return "ไม่พบข้อมูลที่นั่ง"
	}

	cumulative := cumulativeSum1(seats)

	for i, num := range cumulative {
		if num >= x {
			// รักษาพฤติกรรมเดิม: ถ้าเป็น custom (rowType != 0) ให้ offset แถวตาม rowType-1
			if rowType != 0 {
				return "แถว " + strconv.Itoa((i+1)+(rowType-1))
			}
			return "แถว " + strconv.Itoa(i + 1)
		}
	}

	// Extra row case
	total := cumulative[len(cumulative)-1]
	over := x - total
	extraSize := plan.ExtraRowSize
	if extraSize <= 0 {
		extraSize = 10
	}
	extraRow := (over-1)/extraSize + 1

	return "แถวเสริม " + strconv.Itoa(extraRow)
}

func cumulativeSum1(arr []int) []int {
	sum := 0
	result := []int{}
	for _, num := range arr {
		sum += num
		result = append(result, sum)
	}
	return result
}

func mergeSeats1(x1, x2 []int) []int {
	merged := []int{}

	// ตรวจสอบว่าทั้งสอง array มีขนาดเท่ากัน
	length := len(x1)
	if len(x2) < length {
		length = len(x2)
	}

	// รวมค่าโดยเลือกค่าที่ไม่เป็น 0
	for i := 0; i < length; i++ {
		if x1[i] != 0 {
			merged = append(merged, x1[i])
		}
		if x2[i] != 0 {
			merged = append(merged, x2[i])
		}
	}

	return merged
}

// ============================
// (ส่วนอื่น ๆ ของไฟล์เดิม ถ้ามี) ไม่จำเป็นต้องแตะ
// ============================

// NOTE: ถ้าในไฟล์เดิมมีฟังก์ชันอื่นอยู่ต่อ ให้คงไว้ตามเดิม
// (ผมไม่ได้ลบส่วนอื่นที่ไม่เกี่ยวกับ seat plan)