package dto

import (
	"time"

	"github.com/google/uuid"
)

// ExerciseLastRecord はメニューに紐づく種目の前回のトレーニング記録（全セット）を表す
type ExerciseLastRecord struct {
	ExerciseID   uuid.UUID        `json:"exercise_id"`
	ExerciseName string           `json:"exercise_name"`
	LastRecord   []LastRecordData `json:"last_records"` // フィールド名を複数形に、型をスライスに変更
}

// LastRecordData は前回の記録セットデータを表す
type LastRecordData struct {
	SetOrder int32     `json:"set_order"` // セット順序を追加
	Date     time.Time `json:"date"`      // SQLCが time.Time を返す想定
	WeightKg float64   `json:"weight_kg"`
	Reps     int32     `json:"reps"`
	RIR      *float64  `json:"rir,omitempty"`
	RPE      *float64  `json:"rpe,omitempty"`
}
