package dto

import "github.com/google/uuid"

// ExerciseWithSets はワークアウト時のエクササイズとセットを表す
type ExerciseWithSets struct {
	ExerciseID string       `json:"exercise_id"`
	Sets       []WorkoutSet `json:"sets"`
}

// WorkoutSet はワークアウトセットの詳細を表す
type WorkoutSet struct {
	WeightKg float64  `json:"weight_kg"`
	Reps     int32    `json:"reps"`
	RIR      *float64 `json:"rir,omitempty"`
	RPE      *float64 `json:"rpe,omitempty"`
}

// CreateWorkoutRequest はワークアウト作成リクエストを表す
type CreateWorkoutRequest struct {
	MenuID    uuid.UUID          `json:"menu_id"`
	Note      string             `json:"note,omitempty"`
	Exercises []ExerciseWithSets `json:"exercises,omitempty"` // クライアントから複数セットの情報を受け取る
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

// WorkoutSummary はワークアウト一覧表示用の概要情報を表す
type WorkoutSummary struct {
	ID        uuid.UUID `json:"id"`
	MenuID    uuid.UUID `json:"menu_id"`
	MenuName  string    `json:"menu_name"`
	StartedAt string    `json:"started_at"`
	Note      string    `json:"note,omitempty"`
}

// SetView はセットの表示を表す
type SetView struct {
	ID       uuid.UUID `json:"id"`
	Exercise string    `json:"exercise_name"`
	SetOrder int32     `json:"set_order"`
	WeightKg float64   `json:"weight_kg"`
	Reps     int32     `json:"reps"`
	RIR      *float64  `json:"rir,omitempty"`
	RPE      *float64  `json:"rpe,omitempty"`
}
