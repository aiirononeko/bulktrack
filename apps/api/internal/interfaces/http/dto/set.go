package dto

// UpdateSetRequest はセット更新リクエストを表す
type UpdateSetRequest struct {
	WeightKg float64 `json:"weight_kg"`
	Reps     int32   `json:"reps"`
	RPE      float64 `json:"rpe,omitempty"`
}
