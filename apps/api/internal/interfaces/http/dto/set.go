package dto

// UpdateSetRequest はセット更新リクエストを表す
// RIR と RPE はどちらか一方、または両方がnull許容で送信されることを想定
type UpdateSetRequest struct {
	WeightKg *float64 `json:"weight_kg"`     // ポインタにしてnullを許容 (重量0kgを区別するため)
	Reps     *int32   `json:"reps"`          // ポインタにしてnullを許容 (0 repsを区別するため)
	RIR      *float64 `json:"rir,omitempty"` // Reps in Reserve
	RPE      *float64 `json:"rpe,omitempty"` // Rating of Perceived Exertion
}
