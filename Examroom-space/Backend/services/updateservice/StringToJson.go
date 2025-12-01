package updateservice

import (
	"encoding/json"
	"fmt"

	"github.com/models"
)

func StringToJson(data string) models.ExamDetail {
	var mixedArray models.ExamDetail

	err := json.Unmarshal([]byte(data), &mixedArray)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(mixedArray)
	return mixedArray

}
