package controllers

import (
	"fmt"
	"log"
	"net/http"
	"os"
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

	// แปลงข้อมูลเป็น JSON
	var students []map[string]string
	for i, row := range rows {
		if i == 0 {
			continue // ข้าม header
		}
		if len(row) < 4 {
			continue // ข้ามแถวที่ข้อมูลไม่ครบ
		}

		seat := CalSeat1(ctx.Param("roomname"), i, rowFilterParam)

		// ตรวจสอบว่าเป็นแถวเสริมหรือไม่
		if strings.HasPrefix(seat, "แถวเสริม") {
			// แถวเสริมไม่ต้องกรอง จะเก็บไว้เสมอ
			student := map[string]string{
				"Seat":  seat,
				"ID":    row[0],
				"IdStd": row[1],
				"Name":  row[2],
				"Dep":   row[3],
				"Sig":   "---",
			}
			students = append(students, student)
			continue
		}

		// กรณี rowFilterParam เป็น "all" หรือค่าอื่นๆที่ไม่ใช่ตัวเลข จะไม่มีการกรอง

		student := map[string]string{
			"Seat":  seat,
			"ID":    row[0],
			"IdStd": row[1],
			"Name":  row[2],
			"Dep":   row[3],
			"Sig":   "---",
		}
		students = append(students, student)
	}

	sort.Slice(students, func(i, j int) bool {
		return students[i]["IdStd"] < students[j]["IdStd"]
	})

	// Group students by rows
	groupedStudents := c.GroupStd(students)

	// รวมข้อมูลที่ส่งมากับข้อมูลจาก Excel
	result := gin.H{
		"success":  true,
		"students": students,
		"grouped":  groupedStudents, // ส่งข้อมูลที่กรุ๊ปแล้ว
	}
	//log.Println(students)

	// ส่ง JSON กลับไปยัง frontend
	ctx.JSON(http.StatusOK, result)
	os.Remove("./uploads/" + ctx.Param("filename"))
}

// ============================
// CONTROLLER FOR CALCULATE EXTRAROW SEAT
// ============================

type GroupedRow struct {
	Row     int    `json:"row"`
	RowName string `json:"rowName"` // ชื่อแถวสำหรับแสดงผล เช่น "แถว 1" หรือ "แถวเสริม 1"
	Range   string `json:"range"`
	Count   int    `json:"count"`
	IsExtra bool   `json:"isExtra"` // เพิ่มฟิลด์สำหรับระบุว่าเป็นแถวเสริมหรือไม่
}

func (c *Controller) GroupStd(students []map[string]string) []GroupedRow {
	var groupedRows = make(map[string][]string)
	var regularRows = make(map[int]bool) // เก็บเฉพาะแถวปกติ
	var extraRows = make(map[int]bool)   // เก็บเฉพาะแถวเสริม

	// Iterate through the students list and group them by row number
	for _, student := range students {
		seat := student["Seat"]
		rowKey := seat // ใช้ seat เต็มๆ เป็น key

		// แยกประเภทของแถว
		if strings.HasPrefix(seat, "แถวเสริม") {
			rowNum := extractExtraRowFromSeat(seat)
			extraRows[rowNum] = true
		} else {
			rowNum := extractRowFromSeat(seat)
			regularRows[rowNum] = true
		}

		// เก็บ ID นักศึกษาในแถวนั้นๆ
		groupedRows[rowKey] = append(groupedRows[rowKey], student["IdStd"])
	}

	// สร้าง slice เพื่อเก็บผลลัพธ์
	var groupedResult []GroupedRow

	// จัดการแถวปกติก่อน
	var regularRowNumbers []int
	for row := range regularRows {
		regularRowNumbers = append(regularRowNumbers, row)
	}
	sort.Ints(regularRowNumbers)

	// สร้างข้อมูลสำหรับแถวปกติ
	for _, rowNum := range regularRowNumbers {
		rowKey := fmt.Sprintf("แถว %d", rowNum)
		ids := groupedRows[rowKey]

		if len(ids) == 0 {
			continue // ข้ามแถวที่ไม่มีนักศึกษา
		}

		// เรียง ID ตามลำดับ
		sort.Strings(ids)

		// สร้างข้อความที่แสดงช่วงของ ID
		start := ids[0]
		end := ids[len(ids)-1]
		count := len(ids)

		// เพิ่มข้อมูลเข้าใน slice ของ groupedResult
		groupedResult = append(groupedResult, GroupedRow{
			Row:     rowNum,
			Range:   fmt.Sprintf("%s - %s", start, end),
			Count:   count,
			IsExtra: false,
		})
	}

	// จัดการแถวเสริม
	var extraRowNumbers []int
	for row := range extraRows {
		extraRowNumbers = append(extraRowNumbers, row)
	}
	sort.Ints(extraRowNumbers)

	// สร้างข้อมูลสำหรับแถวเสริม
	for _, rowNum := range extraRowNumbers {
		log.Println("row", rowNum)
		rowKey := fmt.Sprintf("แถวเสริม %d", rowNum)
		ids := groupedRows[rowKey]

		if len(ids) == 0 {
			continue // ข้ามแถวที่ไม่มีนักศึกษา
		}

		// เรียง ID ตามลำดับ
		sort.Strings(ids)

		// สร้างข้อความที่แสดงช่วงของ ID
		start := ids[0]
		end := ids[len(ids)-1]
		count := len(ids)

		// เพิ่มข้อมูลเข้าใน slice ของ groupedResult โดยใช้ rowNum+1000 เพื่อให้แถวเสริมอยู่ท้ายสุด
		groupedResult = append(groupedResult, GroupedRow{
			Row:     1000 + rowNum, // ใช้ค่าสูงๆ เพื่อให้แถวเสริมอยู่ท้ายสุด
			Range:   fmt.Sprintf("%s - %s", start, end),
			Count:   count,
			IsExtra: true,
		})
	}

	// เรียงลำดับแถวทั้งหมด
	sort.Slice(groupedResult, func(i, j int) bool {
		return groupedResult[i].Row < groupedResult[j].Row
	})

	return groupedResult
}

// ฟังก์ชันในการดึงหมายเลขแถวจากข้อมูล Seat (สำหรับแถวปกติ)
func extractRowFromSeat(seat string) int {
	var row int
	_, err := fmt.Sscanf(seat, "แถว %d", &row)
	if err != nil {
		fmt.Println("ERROR: Unable to extract row from seat:", seat)
	}
	return row
}

// ==============================================
// CONTROLLER FOR QUERY EXTRASEAT
// ==============================================

// ฟังก์ชันในการดึงหมายเลขแถวจากข้อมูล Seat (สำหรับแถวเสริม)
func extractExtraRowFromSeat(seat string) int {
	var row int
	_, err := fmt.Sscanf(seat, "แถวเสริม %d", &row)
	if err != nil {
		fmt.Println("ERROR: Unable to extract extra row from seat:", seat)
	}
	return row
}

// ============================
// CONTROLLER FOR CALCULATE SEAT FOR SIGNATURE
// ============================

func CalSeat1(nameroom string, x int, rowFilterParam string) string {
	result := Getval1(nameroom)
	var cumulative []int
	var seats []int
	rowType, err := strconv.Atoi(rowFilterParam)
	if err != nil {
		//log.Println("Invalid rowFilterParam:", rowFilterParam, "=> defaulting to 0 (odd)")
		rowType = 0
	}

	switch rowFilterParam {
	case "odd":
		seats = result["x1"]
	case "even":
		seats = result["x2"]
	case "all":
		seats = mergeSeats1(result["x1"], result["x2"])
	default:

		seats = mergeSeats1(result["x1"], result["x2"])[rowType:]

	}

	if len(seats) == 0 {
		log.Println("No seat data available")
		return "ไม่พบข้อมูลที่นั่ง"
	}

	//log.Println("seattttt", seats[3])
	cumulative = cumulativeSum1(seats)

	for i, num := range cumulative {
		if num >= x {
			if rowType != 0 {
				return "แถว " + strconv.Itoa((i+1)+(rowType-1))
			} else {
				return "แถว " + strconv.Itoa((i+1)+(rowType))
			}

		}
	}

	// Extra row case
	total := cumulative[len(cumulative)-1]
	over := x - total
	extraRow := (over-1)/10 + 1

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

func Getval1(name string) map[string][]int {
	if name == "R005" {
		return map[string][]int{
			"x1":  {10, 0, 10, 0, 10, 0, 10, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0},
			"x2":  {0, 10, 0, 10, 0, 10, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 8},
			"sum": {10, 20, 30, 40, 50, 60, 70, 82, 94, 106, 118, 130, 142, 154, 166, 178, 190, 202, 214, 226, 238, 250, 262, 270, 280},
		}
	} else if name == "R001" || name == "R002" {
		return map[string][]int{
			"x1":  {10, 0, 10, 0, 12, 0, 12, 0, 14, 0, 14, 0, 8, 0},
			"x2":  {0, 10, 0, 12, 0, 12, 0, 14, 0, 14, 0, 12, 0, 8},
			"sum": {10, 20, 30, 42, 54, 66, 78, 92, 106, 120, 134, 146, 154, 162, 172, 182},
		}
	} else if name == "R004" {
		return map[string][]int{
			"x1":  {15, 0, 20, 0, 24, 0, 27, 0, 28, 0, 30, 0, 31, 0, 28, 0},
			"x2":  {0, 18, 0, 21, 0, 24, 0, 28, 0, 29, 0, 30, 0, 32, 0, 29},
			"sum": {15, 33, 53, 74, 98, 122, 149, 177, 205, 234, 264, 294, 325, 357, 385, 414},
		}
	} else if name == "R003" {
		return map[string][]int{
			"x1":  {10, 0, 13, 0, 14, 0, 17, 0, 20, 0, 23, 0, 24, 0, 11},
			"x2":  {0, 11, 0, 14, 0, 17, 0, 20, 0, 21, 0, 24, 0, 27, 0},
			"sum": {10, 21, 34, 48, 62, 79, 96, 116, 136, 157, 180, 204, 228, 255, 266},
		}
	}

	// ค่าดีฟอลต์ที่ return กลับเมื่อไม่ตรงกับเงื่อนไขใดๆ
	return map[string][]int{
		"x1":  {},
		"x2":  {},
		"sum": {},
	}
}
