package service

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
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
		// Unix timestamp を time.Time に変換し、ISO形式の文字列に変換
		// weekTime := time.Unix(volume.WeekStartDate, 0) // No longer needed
		var weekStr string
		if volume.WeekStartDate.Valid { // Check if pgtype.Date is valid
			weekStr = volume.WeekStartDate.Time.Format(time.RFC3339) // Convert pgtype.Date to time.Time
		} else {
			// Handle invalid date if necessary, e.g., set to empty string or log error
		}

		// pgtype.Numeric を float64 に変換
		var totalVolume, estOneRM float64

		// TotalVolume の変換
		if volume.TotalVolume.Valid {
			totalVolumeStr := volume.TotalVolume.Int.String()
			totalVolume, _ = strconv.ParseFloat(totalVolumeStr, 64)
		}

		// EstOneRM の変換
		if volume.EstOneRm.Valid {
			estOneRMStr := volume.EstOneRm.Int.String()
			estOneRM, _ = strconv.ParseFloat(estOneRMStr, 64)
		}

		summary := dto.WeeklySummaryResponse{
			Week:        weekStr,
			TotalVolume: totalVolume,
			EstOneRM:    estOneRM,
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

	// pgtype.Numeric を float64 に変換
	var totalVolume, estOneRM float64

	// TotalVolume の変換
	if volume.TotalVolume.Valid {
		totalVolumeStr := volume.TotalVolume.Int.String()
		totalVolume, _ = strconv.ParseFloat(totalVolumeStr, 64)
	}

	// EstOneRM の変換
	if volume.EstOneRm.Valid {
		estOneRMStr := volume.EstOneRm.Int.String()
		estOneRM, _ = strconv.ParseFloat(estOneRMStr, 64)
	}

	// レスポンスの作成
	return &dto.WeeklySummaryResponse{
		Week:        weekStart.Format(time.RFC3339),
		TotalVolume: totalVolume,
		EstOneRM:    estOneRM,
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

// GetWeeklyVolumeStats は指定されたユーザーの週間トレーニングボリューム統計を取得する
func (s *VolumeService) GetWeeklyVolumeStats(ctx context.Context, userID string, startDate, endDate time.Time) (*dto.WeeklyVolumeStatsResponse, error) {
	// time.Time を pgtype.Date に変換
	var pgStartDate, pgEndDate pgtype.Date
	pgStartDate.Valid = true
	pgStartDate.Time = startDate
	pgEndDate.Valid = true
	pgEndDate.Time = endDate

	// 週間ボリューム統計データの取得
	stats, err := s.queries.GetWeeklyVolumeStats(ctx, sqlc.GetWeeklyVolumeStatsParams{
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

	// interface{} 型の値を float64 に変換
	var maxWeeklyVolume, minWeeklyVolume, maxEstOneRm float64

	// MaxWeeklyVolume の変換
	if stats.MaxWeeklyVolume != nil {
		switch v := stats.MaxWeeklyVolume.(type) {
		case float64:
			maxWeeklyVolume = v
		case int64:
			maxWeeklyVolume = float64(v)
		case string:
			maxWeeklyVolume, _ = strconv.ParseFloat(v, 64)
		}
	}

	// MinWeeklyVolume の変換
	if stats.MinWeeklyVolume != nil {
		switch v := stats.MinWeeklyVolume.(type) {
		case float64:
			minWeeklyVolume = v
		case int64:
			minWeeklyVolume = float64(v)
		case string:
			minWeeklyVolume, _ = strconv.ParseFloat(v, 64)
		}
	}

	// MaxEstOneRm の変換
	if stats.MaxEstOneRm != nil {
		switch v := stats.MaxEstOneRm.(type) {
		case float64:
			maxEstOneRm = v
		case int64:
			maxEstOneRm = float64(v)
		case string:
			maxEstOneRm, _ = strconv.ParseFloat(v, 64)
		}
	}

	// レスポンスの作成
	return &dto.WeeklyVolumeStatsResponse{
		AvgWeeklyVolume:  stats.AvgWeeklyVolume,
		MaxWeeklyVolume:  maxWeeklyVolume,
		MinWeeklyVolume:  minWeeklyVolume,
		MaxEstOneRM:      maxEstOneRm,
		AvgExerciseCount: stats.AvgExerciseCount,
		AvgSetCount:      stats.AvgSetCount,
	}, nil
}
