// safe_table.go
package selectservice

import "strings"

// ใช้ safeTableMap ที่ประกาศไว้ใน Select_service_showjson.go ได้ทันที
func ResolveSafeTable(input string) (string, bool) {
	key := strings.TrimSpace(strings.ToLower(input))
	table, ok := safeTableMap[key]
	return table, ok
}
