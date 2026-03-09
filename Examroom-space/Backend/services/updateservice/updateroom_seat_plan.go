package updateservice

import (
	"context"
	"encoding/json"
	"fmt"
)

func (s *Userupdateservice) UpsertRoomSeatPlan(
	ctx context.Context,
	roomID string,
	odd []int,
	even []int,
	extra int,
) error {
	oddJSON, err := json.Marshal(odd)
	if err != nil {
		return fmt.Errorf("marshal odd_pattern: %w", err)
	}
	evenJSON, err := json.Marshal(even)
	if err != nil {
		return fmt.Errorf("marshal even_pattern: %w", err)
	}

	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO public.room_seat_plan (room_id, odd_pattern, even_pattern, extra_row_size)
		VALUES ($1, $2::jsonb, $3::jsonb, $4)
		ON CONFLICT (room_id)
		DO UPDATE SET
			odd_pattern    = EXCLUDED.odd_pattern,
			even_pattern   = EXCLUDED.even_pattern,
			extra_row_size = EXCLUDED.extra_row_size
	`, roomID, oddJSON, evenJSON, extra)

	return err
}

func (s *Userupdateservice) DeleteRoomSeatPlan(ctx context.Context, roomID string) error {
	_, err := s.DB.ExecContext(ctx, `
		DELETE FROM public.room_seat_plan
		WHERE room_id = $1
	`, roomID)
	return err
}
