package dto

import "github.com/google/uuid"

// CreateMenuRequest はメニュー作成リクエストを表す
type CreateMenuRequest struct {
	Name        string          `json:"name"`
	Description *string         `json:"description,omitempty"`
	Items       []MenuItemInput `json:"items"`
}

// MenuItemInput はメニュー項目の入力を表す
type MenuItemInput struct {
	ExerciseID             uuid.UUID `json:"exercise_id"`
	SetOrder               int32     `json:"set_order"`
	PlannedSets            *int32    `json:"planned_sets,omitempty"`
	PlannedReps            *int32    `json:"planned_reps,omitempty"`
	PlannedIntervalSeconds *int32    `json:"planned_interval_seconds,omitempty"`
}

// MenuResponse はメニュー作成レスポンスを表す
type MenuResponse struct {
	ID          uuid.UUID      `json:"id"`
	Name        string         `json:"name"`
	Description *string        `json:"description,omitempty"`
	CreatedAt   string         `json:"created_at"`
	Items       []MenuItemView `json:"items"`
}

// MenuItemView はメニュー項目の表示を表す
type MenuItemView struct {
	ID                     uuid.UUID `json:"id"`
	ExerciseID             uuid.UUID `json:"exercise_id"`
	ExerciseName           string    `json:"exercise_name"`
	SetOrder               int32     `json:"set_order"`
	PlannedSets            *int32    `json:"planned_sets,omitempty"`
	PlannedReps            *int32    `json:"planned_reps,omitempty"`
	PlannedIntervalSeconds *int32    `json:"planned_interval_seconds,omitempty"`
}
