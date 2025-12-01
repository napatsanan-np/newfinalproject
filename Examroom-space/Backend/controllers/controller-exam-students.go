// controller-exam-students.go
package controllers

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"

	"github.com/services/insertservice"
)

/* -------------------- อนุญาตเฉพาะ R001–R005 -------------------- */
var allowedRooms = map[string]bool{
	"R001": true, "R002": true, "R003": true, "R004": true, "R005": true,
}

func isAllowedRoom(roomID string) bool {
	return allowedRooms[strings.ToUpper(strings.TrimSpace(roomID))]
}

/* =========================
   1) ENDPOINTS
   ========================= */

// POST /students/import  (form-data: id_config, room_id, file|SigStd, course[optional])
func (ctl *Controller) ImportStudents(c *gin.Context) {
	idConfig, _ := strconv.Atoi(c.PostForm("id_config"))
	roomID := strings.TrimSpace(c.PostForm("room_id"))
	courseFallback := strings.TrimSpace(c.PostForm("course")) // ใช้แทน ถ้า Excel ไม่มี/ว่าง

	if idConfig == 0 || roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id_config or room_id missing"})
		return
	}
	if !isAllowedRoom(roomID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หน้านี้รองรับเฉพาะห้อง R001–R005 เท่านั้น"})
		return
	}

	// รองรับทั้ง "file" และของเก่า "SigStd"
	fh, err := c.FormFile("file")
	if err != nil {
		fh, err = c.FormFile("SigStd")
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "file is required"})
		return
	}
	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer f.Close()

	buf, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// อ่าน Excel (ยอมรับกรณีไม่มีคอลัมน์ Course โดยใช้ courseFallback)
	rows, count, warn, err := parseExcelToStudents(buf, courseFallback)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	meta := insertservice.Meta{
		IDConfig: idConfig,
		RoomID:   roomID,
	}

	if err := ctl.Insertservice.ReplaceExamStudents(c, meta, rows); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// ตอบ 200 เสมอ + แนบคำเตือนถ้ามี
	c.JSON(http.StatusOK, gin.H{"success": true, "count": count, "warning": warn})
}

// GET /students?id_config=&room_id=&course=&mode=all|even|odd|custom&custom=1-5,8,12-14
func (ctl *Controller) GetStudents(c *gin.Context) {
	idConfig, _ := strconv.Atoi(c.Query("id_config"))
	roomID := strings.TrimSpace(c.Query("room_id"))
	course := strings.TrimSpace(c.Query("course"))
	mode := strings.ToLower(strings.TrimSpace(c.Query("mode")))
	custom := strings.TrimSpace(c.Query("custom"))

	if idConfig == 0 || roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id_config/room_id required"})
		return
	}
	if !isAllowedRoom(roomID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หน้านี้รองรับเฉพาะห้อง R001–R005 เท่านั้น"})
		return
	}

	var list []insertservice.StudentRow
	var err error

	// 1) ถ้ามี course -> ลอง exact ก่อน
	if course != "" {
		list, err = ctl.Insertservice.ListExamStudentsExact(c, idConfig, roomID, course)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
			return
		}
		// 2) ว่าง -> ลอง ILIKE
		if len(list) == 0 {
			list, err = ctl.Insertservice.ListExamStudentsILike(c, idConfig, roomID, "%"+course+"%")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
				return
			}
		}
	} else {
		// 3) ไม่ส่ง course -> ดึงทุกวิชาในห้องนั้น
		list, err = ctl.Insertservice.ListExamStudentsAll(c, idConfig, roomID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
			return
		}
	}

	// เติมเลขแถวจากสูตร
	list = ensureSeatMappingLegacy(list, roomID)

	// กรองตามโหมดแถว
	filtered, grouped := applySelection(list, mode, custom)
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"students": filtered,
		"grouped":  grouped,
	})
}

/* =========================
   2) EXCEL PARSER (ยืดหยุ่น)
   ========================= */

func parseExcelToStudents(file []byte, courseFallback string) ([]insertservice.StudentRow, int, string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(file))
	if err != nil {
		return nil, 0, "", err
	}
	defer f.Close()

	// ใช้ชีทแรก
	sheet := f.WorkBook.Sheets.Sheet[0].Name
	rs, err := f.GetRows(sheet)
	if err != nil {
		return nil, 0, "", err
	}
	if len(rs) == 0 {
		return nil, 0, "", fmt.Errorf("empty sheet")
	}

	// map หัวคอลัมน์ (case-insensitive)
	header := rs[0]
	col := func(name string) int {
		n := strings.ToLower(strings.TrimSpace(name))
		for i, h := range header {
			if strings.ToLower(strings.TrimSpace(h)) == n {
				return i
			}
		}
		return -1
	}

	idxID := col("IdStd")
	if idxID < 0 {
		idxID = col("idstd")
	}
	idxName := col("Name")
	if idxName < 0 {
		idxName = col("name")
	}
	idxDep := col("Dep")
	if idxDep < 0 {
		idxDep = col("dep")
	}
	idxCourse := col("Course")
	if idxCourse < 0 {
		idxCourse = col("course")
	}

	warn := ""
	if idxCourse < 0 && courseFallback == "" {
		return nil, 0, "", fmt.Errorf("missing column 'Course' and no fallback in form")
	}
	if idxCourse < 0 && courseFallback != "" {
		warn = "Course column not found, fallback to form 'course'"
	}

	var out []insertservice.StudentRow
	for i := 1; i < len(rs); i++ {
		r := rs[i]
		get := func(ix int) string {
			if ix >= 0 && ix < len(r) {
				return strings.TrimSpace(r[ix])
			}
			return ""
		}
		idStd := get(idxID)
		name := get(idxName)
		dep := get(idxDep)
		course := ""
		if idxCourse >= 0 {
			course = get(idxCourse)
		}
		if course == "" {
			course = courseFallback // ใช้ fallback ถ้า cell ว่าง
		}

		if idStd == "" && name == "" {
			continue
		}
		if course == "" {
			// ข้ามแถวที่ไม่มี course จริง ๆ (ป้องกันมั่ว)
			continue
		}

		out = append(out, insertservice.StudentRow{
			StudentID:   idStd,
			StudentName: name,
			Dep:         dep,
			SeatNo:      "",
			Course:      course,
		})
	}
	return out, len(out), warn, nil
}

/* =========================
   3) SEAT MAPPING (สูตรเดิม)
   ========================= */

func ensureSeatMappingLegacy(list []insertservice.StudentRow, roomID string) []insertservice.StudentRow {
	// เรียงให้คงที่ก่อน (สูตรอิงลำดับ)
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].StudentID != list[j].StudentID {
			return list[i].StudentID < list[j].StudentID
		}
		return list[i].StudentName < list[j].StudentName
	})
	for i := range list {
		row, extra := seatRowFromLegacy(roomID, i)
		if row <= 0 {
			list[i].SeatNo = ""
			continue
		}
		if !extra {
			list[i].SeatNo = fmt.Sprintf("แถว %d", row)
		} else {
			list[i].SeatNo = fmt.Sprintf("แถวเสริม %d", row)
		}
	}
	return list
}

// ✅ CalSeat ต้องรับ index เริ่มที่ 1
func seatLabelFromLegacy(roomID string, indexZero int) string {
	return CalSeat(roomID, indexZero+1, "all")
}
func seatRowFromLegacy(roomID string, indexZero int) (int, bool) {
	label := strings.TrimSpace(seatLabelFromLegacy(roomID, indexZero))
	if label == "" {
		return 0, false
	}
	isExtra := strings.Contains(label, "เสริม")
	re := regexp.MustCompile(`\d+`)
	m := re.FindString(label)
	if m == "" {
		return 0, isExtra
	}
	n, _ := strconv.Atoi(m)
	return n, isExtra
}

/* =========================
   4) FILTER (all/even/odd/custom)
   ========================= */

type GroupRow struct {
	Row   int    `json:"row"`
	Count int    `json:"count"`
	Range string `json:"range"`
}

func applySelection(list []insertservice.StudentRow, mode, custom string) ([]insertservice.StudentRow, []GroupRow) {
	parseRow := func(seat string) (int, bool) {
		re := regexp.MustCompile(`\d+`)
		m := re.FindString(seat)
		if m == "" {
			return 0, false
		}
		n, _ := strconv.Atoi(m)
		return n, strings.Contains(seat, "เสริม")
	}
	// "1-5,8,12-14" -> set
	toSet := func(spec string) map[int]bool {
		set := map[int]bool{}
		if strings.TrimSpace(spec) == "" {
			return set
		}
		for _, p := range strings.Split(spec, ",") {
			t := strings.TrimSpace(p)
			if t == "" {
				continue
			}
			if strings.Contains(t, "-") {
				ab := strings.SplitN(t, "-", 2)
				a, _ := strconv.Atoi(strings.TrimSpace(ab[0]))
				b, _ := strconv.Atoi(strings.TrimSpace(ab[1]))
				if a > b {
					a, b = b, a
				}
				for i := a; i <= b; i++ {
					if i > 0 {
						set[i] = true
					}
				}
			} else {
				n, _ := strconv.Atoi(t)
				if n > 0 {
					set[n] = true
				}
			}
		}
		return set
	}
	want := toSet(custom)

	filtered := make([]insertservice.StudentRow, 0, len(list))
	byRow := map[int][]string{}

	for _, s := range list {
		row, extra := parseRow(s.SeatNo)
		pass := false
		switch mode {
		case "", "all":
			pass = true
		case "even":
			pass = (row > 0 && !extra && row%2 == 0)
		case "odd":
			pass = (row > 0 && !extra && row%2 == 1)
		case "custom":
			if len(want) == 0 {
				pass = true
			} else {
				pass = (row > 0 && want[row])
			}
		default:
			pass = true
		}
		if pass {
			filtered = append(filtered, s)
			if row > 0 {
				byRow[row] = append(byRow[row], s.StudentID)
			}
		}
	}
	rows := make([]int, 0, len(byRow))
	for k := range byRow {
		rows = append(rows, k)
	}
	sort.Ints(rows)

	grouped := make([]GroupRow, 0, len(rows))
	for _, r := range rows {
		ids := byRow[r]
		rng := ""
		if len(ids) >= 2 {
			rng = fmt.Sprintf("%s - %s", ids[0], ids[len(ids)-1])
		}
		grouped = append(grouped, GroupRow{Row: r, Count: len(ids), Range: rng})
	}
	return filtered, grouped
}

/* =========================
   5) สูตรเดิม (CalSeat/mergeSeats/Getval)
   ========================= */

func CalSeat(nameroom string, x int, rowFilterParam string) string {
	result := Getval(nameroom)
	var cumulative []int
	var seats []int
	rowType, err := strconv.Atoi(rowFilterParam)
	if err != nil {
		rowType = 0
	}

	switch rowFilterParam {
	case "odd":
		seats = result["x1"]
	case "even":
		seats = result["x2"]
	case "all":
		seats = mergeSeats(result["x1"], result["x2"])
	default:
		seats = mergeSeats(result["x1"], result["x2"])[rowType:]
	}

	if len(seats) == 0 {
		log.Println("No seat data available")
		return "ไม่พบข้อมูลที่นั่ง"
	}

	cumulative = cumulativeSum(seats)

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

func cumulativeSum(arr []int) []int {
	sum := 0
	result := []int{}
	for _, num := range arr {
		sum += num
		result = append(result, sum)
	}
	return result
}

func mergeSeats(x1, x2 []int) []int {
	merged := []int{}

	length := len(x1)
	if len(x2) < length {
		length = len(x2)
	}
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

func Getval(name string) map[string][]int {
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

	// ไม่อนุญาตห้องอื่น => ไม่มีผัง
	return map[string][]int{
		"x1":  {},
		"x2":  {},
		"sum": {},
	}
}
