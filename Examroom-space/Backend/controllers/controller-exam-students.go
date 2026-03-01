package controllers

import (
	"bytes"
	"database/sql"
	"encoding/json"
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

/* =========================
   0) Seat Plan (DB)
   ========================= */

type SeatPlan struct {
	Odd          []int
	Even         []int
	ExtraRowSize int
}

func (ctl *Controller) getSeatPlan(roomID string) (*SeatPlan, error) {
	roomID = strings.TrimSpace(roomID)
	if roomID == "" {
		return nil, fmt.Errorf("room_id missing")
	}

	var oddJSON, evenJSON []byte
	var extra int

	// ✅ ดึงผังจาก room_seat_plan (แทน hardcode)
	err := ctl.SelectService.DB.QueryRow(`
		SELECT odd_pattern, even_pattern, COALESCE(extra_row_size, 10)
		FROM public.room_seat_plan
		WHERE room_id = $1
	`, roomID).Scan(&oddJSON, &evenJSON, &extra)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ห้องนี้ยังไม่ได้ตั้งผังที่นั่ง (room_seat_plan) กรุณาตั้งค่าผังก่อน")
		}
		return nil, err
	}

	var odd, even []int
	if len(oddJSON) > 0 {
		if e := json.Unmarshal(oddJSON, &odd); e != nil {
			return nil, fmt.Errorf("odd_pattern invalid: %v", e)
		}
	}
	if len(evenJSON) > 0 {
		if e := json.Unmarshal(evenJSON, &even); e != nil {
			return nil, fmt.Errorf("even_pattern invalid: %v", e)
		}
	}

	if extra <= 0 {
		extra = 10
	}

	// ถ้าทั้งคู่ยังว่าง ถือว่าไม่มีผังจริง
	if len(odd) == 0 && len(even) == 0 {
		return nil, fmt.Errorf("ห้องนี้ยังไม่ได้ตั้งผังที่นั่ง (room_seat_plan) กรุณาตั้งค่าผังก่อน")
	}

	return &SeatPlan{Odd: odd, Even: even, ExtraRowSize: extra}, nil
}

/* =========================
   1) ENDPOINTS
   ========================= */

// POST /students/import  (form-data: id_config, room_id, file|SigStd, course[optional])
func (ctl *Controller) ImportStudents(c *gin.Context) {
	idConfig, _ := strconv.Atoi(c.PostForm("id_config"))
	roomID := strings.TrimSpace(c.PostForm("room_id"))
	courseFallback := strings.TrimSpace(c.PostForm("course")) // ใช้แทน ถ้า Excel ไม่มี/ว่าง

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "room_id missing"})
		return
	}

	// ถ้าไม่ได้ส่ง id_config มา ให้ดึง config ปัจจุบันมาแทน
	if idConfig == 0 {
		cur, err := ctl.SelectService.GetCurrentIDConfig()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
			return
		}
		idConfig = cur
	}

	// ✅ เช็คว่าห้องนี้มีผังที่นั่งใน DB ไหม (แทน hardcode R001-R005)
	if _, err := ctl.getSeatPlan(roomID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
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

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "room_id required"})
		return
	}

	// ถ้าไม่ได้ส่ง id_config มา ให้ดึง config ปัจจุบันมาแทน
	if idConfig == 0 {
		cur, err := ctl.SelectService.GetCurrentIDConfig()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
			return
		}
		idConfig = cur
	}

	// ✅ โหลดผังจาก DB (ถ้าไม่มีผัง -> ไม่ให้คำนวณ)
	plan, err := ctl.getSeatPlan(roomID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var list []insertservice.StudentRow

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

	// ✅ เติมเลขแถวจาก “ผังใน DB”
	list = ensureSeatMappingWithPlan(list, plan)

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

	iId := col("IdStd")
	iName := col("Name")
	iDep := col("Dep")
	iCourse := col("Course")

	if iId < 0 || iName < 0 || iDep < 0 {
		return nil, 0, "", fmt.Errorf("missing required columns: IdStd, Name, Dep (Course optional)")
	}

	warn := ""
	out := make([]insertservice.StudentRow, 0, len(rs)-1)

	for r := 1; r < len(rs); r++ {
		row := rs[r]
		get := func(i int) string {
			if i < 0 || i >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[i])
		}

		id := get(iId)
		name := get(iName)
		dep := get(iDep)
		course := ""
		if iCourse >= 0 {
			course = get(iCourse)
		}
		if course == "" {
			course = strings.TrimSpace(courseFallback)
		}

		if id == "" && name == "" && dep == "" && course == "" {
			continue
		}
		if course == "" && warn == "" {
			warn = "บางแถวไม่มี Course และไม่ได้ส่ง course มา ระบบจะข้ามแถวนั้น"
		}
		if course == "" {
			continue
		}

		out = append(out, insertservice.StudentRow{
			StudentID:   id,
			StudentName: name,
			Dep:         dep,
			Course:      course,
			SeatNo:      "",
		})
	}

	return out, len(out), warn, nil
}

/* =========================
   3) SEAT MAPPING (จาก DB plan)
   ========================= */

func ensureSeatMappingWithPlan(list []insertservice.StudentRow, plan *SeatPlan) []insertservice.StudentRow {
	// เรียงให้คงที่ก่อน (สูตรอิงลำดับ)
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].StudentID != list[j].StudentID {
			return list[i].StudentID < list[j].StudentID
		}
		return list[i].StudentName < list[j].StudentName
	})

	for i := range list {
		label := CalSeatFromPlan(plan, i+1, "all") // index เริ่ม 1
		label = strings.TrimSpace(label)
		if label == "" || strings.Contains(label, "ไม่พบ") {
			list[i].SeatNo = ""
			continue
		}
		list[i].SeatNo = label
	}
	return list
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
   5) สูตรคำนวณแถว (ใช้ plan จาก DB)
   ========================= */

func CalSeatFromPlan(plan *SeatPlan, x int, rowFilterParam string) string {
	if plan == nil {
		return "ไม่พบข้อมูลที่นั่ง"
	}

	resultX1 := plan.Odd
	resultX2 := plan.Even
	extraRowSize := plan.ExtraRowSize
	if extraRowSize <= 0 {
		extraRowSize = 10
	}

	var seats []int
	rowType, err := strconv.Atoi(rowFilterParam)
	if err != nil {
		rowType = 0
	}

	switch rowFilterParam {
	case "odd":
		seats = resultX1
	case "even":
		seats = resultX2
	case "all", "":
		seats = mergeSeats(resultX1, resultX2)
	default:
		// legacy: ส่งเป็นตัวเลขเริ่มต้น slice
		merged := mergeSeats(resultX1, resultX2)
		if rowType >= 0 && rowType < len(merged) {
			seats = merged[rowType:]
		} else {
			seats = merged
		}
	}

	if len(seats) == 0 {
		log.Println("No seat data available")
		return "ไม่พบข้อมูลที่นั่ง"
	}

	cumulative := cumulativeSum(seats)

	for i, num := range cumulative {
		if num >= x {
			if rowType != 0 {
				return "แถว " + strconv.Itoa((i+1)+(rowType-1))
			}
			return "แถว " + strconv.Itoa(i+1)
		}
	}

	// Extra row case
	total := cumulative[len(cumulative)-1]
	over := x - total
	extraRow := (over-1)/extraRowSize + 1
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
