package selectservice

import (
	"strings"
	"testing"
)

func TestSafeTableMap_AllEntriesResolvable(t *testing.T) {
	if len(safeTableMap) == 0 {
		t.Fatalf("safeTableMap must not be empty")
	}

	for key, expectedTable := range safeTableMap {
		// 1) key และ value ต้องไม่ว่าง
		if strings.TrimSpace(key) == "" {
			t.Fatalf("safeTableMap has empty key")
		}
		if strings.TrimSpace(expectedTable) == "" {
			t.Fatalf("safeTableMap[%q] has empty value", key)
		}

		// 2) key ใน map ควรเป็น lowercase เพื่อความสม่ำเสมอ (แนะนำ)
		if key != strings.ToLower(key) {
			t.Fatalf("safeTableMap key should be lowercase: got %q", key)
		}

		// 3) ResolveSafeTable(key) ต้องได้ค่าเดียวกับใน map
		gotTable, ok := ResolveSafeTable(key)
		if !ok {
			t.Fatalf("ResolveSafeTable(%q) should be ok=true", key)
		}
		if gotTable != expectedTable {
			t.Fatalf("ResolveSafeTable(%q) = %q; want %q", key, gotTable, expectedTable)
		}

		// 4) Test normalization: trim + case-insensitive
		mixed := "  " + strings.ToUpper(key) + "  "
		gotTable2, ok2 := ResolveSafeTable(mixed)
		if !ok2 {
			t.Fatalf("ResolveSafeTable(%q) should be ok=true", mixed)
		}
		if gotTable2 != expectedTable {
			t.Fatalf("ResolveSafeTable(%q) = %q; want %q", mixed, gotTable2, expectedTable)
		}

		// 5) ป้องกัน “หลุด allowlist”: table ที่คืนกลับมาควรอยู่ใน values ของ allowlist จริง
		if !isSafeTableValue(gotTable) {
			t.Fatalf("ResolveSafeTable returned table %q which is not in allowlist values", gotTable)
		}
	}
}

// helper: เช็คว่า value ที่คืนกลับมา เป็นหนึ่งใน values ของ allowlist จริง ๆ
func isSafeTableValue(v string) bool {
	for _, vv := range safeTableMap {
		if v == vv {
			return true
		}
	}
	return false
}

func TestResolveSafeTable_RejectedInputs(t *testing.T) {
	badInputs := []string{
		"",
		"   ",
		"unknown_table",
		"users; DROP TABLE examtable;--",
		"examtable;select * from users",
		"examtable--",
		"examtable/*comment*/",
	}

	for _, in := range badInputs {
		if _, ok := ResolveSafeTable(in); ok {
			t.Fatalf("ResolveSafeTable(%q) should be rejected (ok=false)", in)
		}
	}
}
