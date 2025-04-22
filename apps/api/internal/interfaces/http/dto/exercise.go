package dto

import "github.com/google/uuid"

// Exercise は種目情報のレスポンスを表す
type Exercise struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}
