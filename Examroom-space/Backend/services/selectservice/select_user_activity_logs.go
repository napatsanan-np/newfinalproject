package selectservice

import (
	"fmt"
	"strings"
	"time"
)

type UserActivityLogRow struct {
	LogID       int       `json:"log_id"`
	UserID      string    `json:"user_id"`
	Username    string    `json:"username"`
	Role        string    `json:"role"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
	Endpoint    string    `json:"endpoint"`
	Method      string    `json:"method"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type GetUserActivityLogsFilter struct {
	Username string
	Role     string
	Action   string
	Status   string
	DateFrom string // YYYY-MM-DD
	DateTo   string // YYYY-MM-DD
	Limit    int
	Offset   int
}

func (s *UserSelectService) GetUserActivityLogs(f GetUserActivityLogsFilter) ([]UserActivityLogRow, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where := []string{"1=1"}
	args := []any{}
	i := 1

	addLike := func(col, val string) {
		val = strings.TrimSpace(val)
		if val == "" {
			return
		}
		where = append(where, fmt.Sprintf("%s ILIKE $%d", col, i))
		args = append(args, "%"+val+"%")
		i++
	}

	addEq := func(col, val string) {
		val = strings.TrimSpace(val)
		if val == "" {
			return
		}
		where = append(where, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}

	addDate := func(col, val, op string) {
		val = strings.TrimSpace(val)
		if val == "" {
			return
		}
		where = append(where, fmt.Sprintf("%s::date %s $%d::date", col, op, i))
		args = append(args, val)
		i++
	}

	addLike("username", f.Username)
	addLike("role", f.Role)
	addLike("action", f.Action)
	addEq("status", f.Status)
	addDate("created_at", f.DateFrom, ">=")
	addDate("created_at", f.DateTo, "<=")

	whereSQL := strings.Join(where, " AND ")

	// count
	var total int
	if err := s.DB.QueryRow("SELECT COUNT(*) FROM user_activity_logs WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list
	q := fmt.Sprintf(`
		SELECT log_id, user_id, username, role, action, description,
		       endpoint, method, ip_address, user_agent, status, created_at
		FROM user_activity_logs
		WHERE %s
		ORDER BY log_id DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, i, i+1)

	args = append(args, f.Limit, f.Offset)

	rows, err := s.DB.Query(q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []UserActivityLogRow{}
	for rows.Next() {
		var r UserActivityLogRow
		if err := rows.Scan(
			&r.LogID, &r.UserID, &r.Username, &r.Role, &r.Action, &r.Description,
			&r.Endpoint, &r.Method, &r.IPAddress, &r.UserAgent, &r.Status, &r.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, r)
	}
	return out, total, rows.Err()
}
