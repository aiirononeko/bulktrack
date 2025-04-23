package dto

import (
	"github.com/google/uuid"
)

// ExerciseLastRecord はメニューに紐づく種目の前回のトレーニング記録を表す
type ExerciseLastRecord struct {
	ExerciseID   uuid.UUID       `json:"exercise_id"`
	ExerciseName string          `json:"exercise_name"`
	LastRecord   *LastRecordData `json:"last_record"`
}

// LastRecordData は前回の記録データを表す
type LastRecordData struct {
	Date     string   `json:"date"`
	WeightKg float64  `json:"weight_kg"`
	Reps     int32    `json:"reps"`
	RIR      *float64 `json:"rir,omitempty"`
	RPE      *float64 `json:"rpe,omitempty"`
}
