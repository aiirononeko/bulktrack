package dto

// WeeklySummaryResponse は週間トレーニングボリュームのレスポンス
type WeeklySummaryResponse struct {
	Week          string  `json:"week"`           // 週の開始日（ISO形式）
	TotalVolume   float64 `json:"total_volume"`   // 総ボリューム（重量 x レップ数の合計）
	EstOneRM      float64 `json:"est_1rm"`        // 推定1RMの最大値
	ExerciseCount int     `json:"exercise_count"` // 種目数
	SetCount      int     `json:"set_count"`      // セット数
}

// WeeklyVolumeSummaryResponse は週間ボリューム統計のレスポンス
type WeeklyVolumeSummaryResponse struct {
	Summaries []WeeklySummaryResponse `json:"summaries"` // 週間サマリーの配列
}

// WeeklyVolumeStatsResponse は週間ボリューム統計情報のレスポンス
type WeeklyVolumeStatsResponse struct {
	AvgWeeklyVolume  float64 `json:"avg_weekly_volume"`  // 平均週間ボリューム
	MaxWeeklyVolume  float64 `json:"max_weekly_volume"`  // 最大週間ボリューム
	MinWeeklyVolume  float64 `json:"min_weekly_volume"`  // 最小週間ボリューム
	MaxEstOneRM      float64 `json:"max_est_1rm"`        // 最大推定1RM
	AvgExerciseCount float64 `json:"avg_exercise_count"` // 平均種目数
	AvgSetCount      float64 `json:"avg_set_count"`      // 平均セット数
}
