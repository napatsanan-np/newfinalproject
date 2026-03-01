package insertservice

import (
	"context"
	"encoding/json"
	"fmt"
)

func (s *UseInsertService) UpsertRoomSeatPlan(ctx context.Context, roomID string, odd, even []int, extraRowSize int) error {
	oddJSON, err := json.Marshal(odd)
	if err != nil {
		return err
	}
	evenJSON, err := json.Marshal(even)
	if err != nil {
		return err
	}

	const q = `
		INSERT INTO public.room_seat_plan (room_id, odd_pattern, even_pattern, extra_row_size, updated_at)
		VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())
		ON CONFLICT (room_id)
		DO UPDATE SET
			odd_pattern = EXCLUDED.odd_pattern,
			even_pattern = EXCLUDED.even_pattern,
			extra_row_size = EXCLUDED.extra_row_size,
			updated_at = NOW()
	`
	_, err = s.DB.ExecContext(ctx, q, roomID, string(oddJSON), string(evenJSON), extraRowSize)
	if err != nil {
		return fmt.Errorf("upsert room_seat_plan: %w", err)
	}
	return nil
}
