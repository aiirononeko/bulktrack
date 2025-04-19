package dto

import "github.com/google/uuid"

// CreateWorkoutRequest はワークアウト作成リクエストを表す
type CreateWorkoutRequest struct {
	MenuID uuid.UUID `json:"menu_id"`
	Note   string    `json:"note,omitempty"`
}

// WorkoutResponse はワークアウト作成レスポンスを表す
type WorkoutResponse struct {
	ID        uuid.UUID `json:"id"`
	MenuID    uuid.UUID `json:"menu_id"`
	MenuName  string    `json:"menu_name"`
	StartedAt string    `json:"started_at"`
	Note      string    `json:"note,omitempty"`
	Sets      []SetView `json:"sets"`
}

// SetView はセットの表示を表す
type SetView struct {
	ID       uuid.UUID `json:"id"`
	Exercise string    `json:"exercise"`
	SetOrder int32     `json:"set_order"`
	WeightKg float64   `json:"weight_kg"`
	Reps     int32     `json:"reps"`
	RPE      float64   `json:"rpe,omitempty"`
}
