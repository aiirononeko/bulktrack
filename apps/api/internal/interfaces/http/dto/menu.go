package dto

import "github.com/google/uuid"

// CreateMenuRequest はメニュー作成リクエストを表す
type CreateMenuRequest struct {
	Name  string          `json:"name"`
	Items []MenuItemInput `json:"items"`
}

// MenuItemInput はメニュー項目の入力を表す
type MenuItemInput struct {
	Exercise    string `json:"exercise"`
	SetOrder    int32  `json:"set_order"`
	PlannedReps int32  `json:"planned_reps"`
}

// MenuResponse はメニュー作成レスポンスを表す
type MenuResponse struct {
	ID        uuid.UUID      `json:"id"`
	Name      string         `json:"name"`
	CreatedAt string         `json:"created_at"`
	Items     []MenuItemView `json:"items"`
}

// MenuItemView はメニュー項目の表示を表す
type MenuItemView struct {
	ID          uuid.UUID `json:"id"`
	Exercise    string    `json:"exercise"`
	SetOrder    int32     `json:"set_order"`
	PlannedReps int32     `json:"planned_reps"`
}
