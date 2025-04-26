package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// VolumeService は週間トレーニングボリューム関連のサービスを提供する
type VolumeService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
	logger  *slog.Logger
}

// NewVolumeService は新しいVolumeServiceを作成する
func NewVolumeService(pool *pgxpool.Pool, logger *slog.Logger) *VolumeService {
	return &VolumeService{
		pool:    pool,
		queries: sqlc.New(pool),
		logger:  logger,
	}
}

// numericToFloat64 は pgtype.Numeric を float64 に変換するヘルパー関数
func numericToFloat64(ctx context.Context, logger *slog.Logger, n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0 // NULLの場合は0を返す
	}
	if n.Int == nil {
		return 0
	}
	d, err := decimal.NewFromString(n.Int.String())
	if err != nil {
		logger.WarnContext(ctx, "Failed to parse decimal from pgtype.Numeric Int", slog.Any("numeric", n), slog.Any("error", err))
		return 0
	}
	f, _ := d.Shift(n.Exp).Float64()
	return f
}

// GetWeeklyVolumes は指定されたユーザーの週間トレーニングボリュームを取得する
// weeksCount で指定された週数分のデータを返す（デフォルトは12週）
func (s *VolumeService) GetWeeklyVolumes(ctx context.Context, userID string, weeksCount int32) (*dto.WeeklyVolumeSummaryResponse, error) {
	if weeksCount <= 0 {
		weeksCount = 12 // デフォルトは12週
	}

	// 週間ボリュームデータの取得
	volumes, err := s.queries.GetWeeklyVolumes(ctx, sqlc.GetWeeklyVolumesParams{
		UserID:     userID,
		WeeksCount: weeksCount,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetWeeklyVolumes query",
			slog.Any("error", err),
			slog.String("user_id", userID),
			slog.Int("weeks_count", int(weeksCount)))
		return nil, fmt.Errorf("failed to get weekly volumes: %w", err)
	}

	// レスポンスの作成
	summaries := make([]dto.WeeklySummaryResponse, 0, len(volumes))
	for _, volume := range volumes {
		var weekStr string
		if volume.WeekStartDate.Valid {
			weekStr = volume.WeekStartDate.Time.Format(time.RFC3339)
		}

		// pgtype.Numeric を float64 に変換 (decimalヘルパー使用)
		totalVolume := numericToFloat64(ctx, s.logger, volume.TotalVolume)
		estOneRM := numericToFloat64(ctx, s.logger, volume.EstOneRm)

		summary := dto.WeeklySummaryResponse{
			Week:          weekStr,
			TotalVolume:   totalVolume,
			EstOneRM:      estOneRM,
			ExerciseCount: int(volume.ExerciseCount),
			SetCount:      int(volume.SetCount),
		}
		summaries = append(summaries, summary)
	}

	return &dto.WeeklyVolumeSummaryResponse{
		Summaries: summaries,
	}, nil
}

// GetWeeklyVolumeForWeek は指定されたユーザーと週の週間トレーニングボリュームを取得する
func (s *VolumeService) GetWeeklyVolumeForWeek(ctx context.Context, userID string, weekStartDate time.Time) (*dto.WeeklySummaryResponse, error) {
	// 週の開始日を計算（月曜日）
	year, month, day := weekStartDate.Date()
	weekStart := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)

	// 曜日を取得し、月曜日になるように調整
	weekday := weekStart.Weekday()
	if weekday == 0 { // 日曜日の場合
		weekStart = weekStart.AddDate(0, 0, -6) // 前の月曜日に移動
	} else {
		weekStart = weekStart.AddDate(0, 0, -int(weekday)+1) // 今週の月曜日に移動
	}

	// time.Time を pgtype.Date に変換
	var pgDate pgtype.Date
	pgDate.Valid = true
	pgDate.Time = weekStart

	// 週間ボリュームデータの取得
	volume, err := s.queries.GetWeeklyVolumeForWeek(ctx, sqlc.GetWeeklyVolumeForWeekParams{
		UserID:        userID,
		WeekStartDate: pgDate,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetWeeklyVolumeForWeek query",
			slog.Any("error", err),
			slog.String("user_id", userID),
			slog.Time("week_start_date", weekStart))
		return nil, fmt.Errorf("failed to get weekly volume for week: %w", err)
	}

	// pgtype.Numeric を float64 に変換 (decimalヘルパー使用)
	totalVolume := numericToFloat64(ctx, s.logger, volume.TotalVolume)
	estOneRM := numericToFloat64(ctx, s.logger, volume.EstOneRm)

	// レスポンスの作成
	return &dto.WeeklySummaryResponse{
		Week:          weekStart.Format(time.RFC3339),
		TotalVolume:   totalVolume,
		EstOneRM:      estOneRM,
		ExerciseCount: int(volume.ExerciseCount),
		SetCount:      int(volume.SetCount),
	}, nil
}

// RecalculateWeeklyVolume は指定されたユーザーと週の週間トレーニングボリュームを再計算する
func (s *VolumeService) RecalculateWeeklyVolume(ctx context.Context, userID string, weekStartDate time.Time) error {
	// 週の開始日を計算（月曜日）
	year, month, day := weekStartDate.Date()
	weekStart := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)

	// 曜日を取得し、月曜日になるように調整
	weekday := weekStart.Weekday()
	if weekday == 0 { // 日曜日の場合
		weekStart = weekStart.AddDate(0, 0, -6) // 前の月曜日に移動
	} else {
		weekStart = weekStart.AddDate(0, 0, -int(weekday)+1) // 今週の月曜日に移動
	}

	// time.Time を pgtype.Date に変換
	var pgDate pgtype.Date
	pgDate.Valid = true
	pgDate.Time = weekStart

	// 週間ボリュームの再計算
	err := s.queries.RecalculateWeeklyVolume(ctx, sqlc.RecalculateWeeklyVolumeParams{
		UserID:        userID,
		WeekStartDate: pgDate,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute RecalculateWeeklyVolume query",
			slog.Any("error", err),
			slog.String("user_id", userID),
			slog.Time("week_start_date", weekStart))
		return fmt.Errorf("failed to recalculate weekly volume: %w", err)
	}

	return nil
}

// GetWeeklyVolumeStats は指定されたユーザーと期間の週間トレーニングボリューム統計を取得する
func (s *VolumeService) GetWeeklyVolumeStats(ctx context.Context, userID string, startDate, endDate time.Time) (*dto.WeeklyVolumeStatsResponse, error) {
	// time.Time を pgtype.Date に変換
	var pgStartDate, pgEndDate pgtype.Date
	pgStartDate.Valid = true
	pgStartDate.Time = startDate
	pgEndDate.Valid = true
	pgEndDate.Time = endDate

	// 週間ボリューム統計データの取得
	statsRow, err := s.queries.GetWeeklyVolumeStats(ctx, sqlc.GetWeeklyVolumeStatsParams{
		UserID:    userID,
		StartDate: pgStartDate,
		EndDate:   pgEndDate,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetWeeklyVolumeStats query",
			slog.Any("error", err),
			slog.String("user_id", userID),
			slog.Time("start_date", startDate),
			slog.Time("end_date", endDate))
		return nil, fmt.Errorf("failed to get weekly volume stats: %w", err)
	}
	// ★ 修正点1: デバッグログ追加 (fmt.Println削除)
	s.logger.DebugContext(ctx, "Raw stats data from DB", slog.Any("statsRow", statsRow))

	// ★ 修正点2: 変換処理 (型スイッチ削除、decimalヘルパー使用)
	var avgWeeklyVolume, maxWeeklyVolume, minWeeklyVolume, maxEstOneRm, avgExerciseCount, avgSetCount float64

	// AVG系は float64 で返ってくる
	avgWeeklyVolume = statsRow.AvgWeeklyVolume
	avgExerciseCount = statsRow.AvgExerciseCount
	avgSetCount = statsRow.AvgSetCount

	// MAX/MIN系は interface{} なので型アサーションと変換が必要
	if maxVol, ok := statsRow.MaxWeeklyVolume.(pgtype.Numeric); ok {
		maxWeeklyVolume = numericToFloat64(ctx, s.logger, maxVol)
	} else if statsRow.MaxWeeklyVolume != nil {
		s.logger.WarnContext(ctx, "Unexpected type for MaxWeeklyVolume", slog.Any("type", fmt.Sprintf("%T", statsRow.MaxWeeklyVolume)), slog.Any("value", statsRow.MaxWeeklyVolume))
	}

	if minVol, ok := statsRow.MinWeeklyVolume.(pgtype.Numeric); ok {
		minWeeklyVolume = numericToFloat64(ctx, s.logger, minVol)
	} else if statsRow.MinWeeklyVolume != nil {
		s.logger.WarnContext(ctx, "Unexpected type for MinWeeklyVolume", slog.Any("type", fmt.Sprintf("%T", statsRow.MinWeeklyVolume)), slog.Any("value", statsRow.MinWeeklyVolume))
	}

	if max1rm, ok := statsRow.MaxEstOneRm.(pgtype.Numeric); ok {
		maxEstOneRm = numericToFloat64(ctx, s.logger, max1rm)
	} else if statsRow.MaxEstOneRm != nil {
		s.logger.WarnContext(ctx, "Unexpected type for MaxEstOneRm", slog.Any("type", fmt.Sprintf("%T", statsRow.MaxEstOneRm)), slog.Any("value", statsRow.MaxEstOneRm))
	}

	// レスポンスの作成
	dtoResponse := &dto.WeeklyVolumeStatsResponse{
		AvgWeeklyVolume:  avgWeeklyVolume,
		MaxWeeklyVolume:  maxWeeklyVolume,
		MinWeeklyVolume:  minWeeklyVolume,
		MaxEstOneRM:      maxEstOneRm,
		AvgExerciseCount: avgExerciseCount,
		AvgSetCount:      avgSetCount,
	}
	// ★ 修正点3: デバッグログ追加 (fmt.Println削除)
	s.logger.DebugContext(ctx, "Stats DTO after conversion", slog.Any("dto", dtoResponse))

	return dtoResponse, nil
}
