package dto

// WeeklySummaryResponse は週間トレーニングボリュームのレスポンス
type WeeklySummaryResponse struct {
	Week        string  `json:"week"`         // 週の開始日（ISO形式）
	TotalVolume float64 `json:"total_volume"` // 総ボリューム（重量 x レップ数の合計）
	EstOneRM    float64 `json:"est_1rm"`      // 推定1RMの最大値
}

// WeeklyVolumeSummaryResponse は週間ボリューム統計のレスポンス
type WeeklyVolumeSummaryResponse struct {
	Summaries []WeeklySummaryResponse `json:"summaries"` // 週間サマリーの配列
}
