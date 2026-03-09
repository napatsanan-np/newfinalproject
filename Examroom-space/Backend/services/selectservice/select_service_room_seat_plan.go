package selectservice

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type RoomSeatPlanDTO struct {
	RoomID       string `json:"room_id"`
	OddPattern   []int  `json:"odd_pattern"`
	EvenPattern  []int  `json:"even_pattern"`
	ExtraRowSize int    `json:"extra_row_size"`
}

func (s *UserSelectService) GetRoomSeatPlanByRoomID(ctx context.Context, roomID string) (*RoomSeatPlanDTO, error) {
	query := `
		SELECT room_id, odd_pattern, even_pattern, extra_row_size
		FROM public.room_seat_plan
		WHERE room_id = $1
		LIMIT 1
	`

	var rid string
	var oddJSON, evenJSON []byte
	var extra int

	err := s.DB.QueryRowContext(ctx, query, roomID).Scan(&rid, &oddJSON, &evenJSON, &extra)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("not found")
		}
		return nil, err
	}

	var odd []int
	var even []int
	if len(oddJSON) > 0 {
		if err := json.Unmarshal(oddJSON, &odd); err != nil {
			return nil, fmt.Errorf("invalid odd_pattern json: %w", err)
		}
	}
	if len(evenJSON) > 0 {
		if err := json.Unmarshal(evenJSON, &even); err != nil {
			return nil, fmt.Errorf("invalid even_pattern json: %w", err)
		}
	}

	return &RoomSeatPlanDTO{
		RoomID:       rid,
		OddPattern:   odd,
		EvenPattern:  even,
		ExtraRowSize: extra,
	}, nil
}