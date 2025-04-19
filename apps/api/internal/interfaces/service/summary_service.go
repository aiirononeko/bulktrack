package service

import (
	"context"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SummaryService はトレーニング概要関連のサービスを提供する
type SummaryService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

// NewSummaryService は新しいSummaryServiceを作成する
func NewSummaryService(pool *pgxpool.Pool) *SummaryService {
	return &SummaryService{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// GetCurrentWeeklySummary は現在週のトレーニング要約を取得する
func (s *SummaryService) GetCurrentWeeklySummary(ctx context.Context, userID uuid.UUID) (*dto.WeeklySummaryResponse, error) {
	// マテリアライズドビューを更新
	if err := s.queries.RefreshWeeklySummaries(ctx); err != nil {
		return nil, err
	}

	// 現在の日付
	now := time.Now()

	// UUIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// 現在週のサマリー取得
	summary, err := s.queries.GetWeeklySummary(ctx, sqlc.GetWeeklySummaryParams{
		UserID:  pgUserID,
		Column2: pgtype.Date{Time: now, Valid: true},
	})

	// 該当データがない場合は空のレスポンスを返す
	if err != nil {
		return &dto.WeeklySummaryResponse{
			Week:        now.Format("2006-01-02"),
			TotalVolume: 0.0,
			EstOneRM:    0.0,
		}, nil
	}

	// レスポンス作成
	return &dto.WeeklySummaryResponse{
		Week:        summary.Week.Time.Format("2006-01-02"),
		TotalVolume: float64(summary.TotalVolume),
		EstOneRM:    0.0, // 現在はest_1rmの具体的な実装がない
	}, nil
}

// GetRecentWeeklySummaries は最近のN週間分のトレーニング要約を取得する
func (s *SummaryService) GetRecentWeeklySummaries(ctx context.Context, userID uuid.UUID, limit int32) ([]dto.WeeklySummaryResponse, error) {
	// マテリアライズドビューを更新
	if err := s.queries.RefreshWeeklySummaries(ctx); err != nil {
		return nil, err
	}

	// UUIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// 最近のサマリーを取得
	summaries, err := s.queries.ListWeeklySummaries(ctx, sqlc.ListWeeklySummariesParams{
		UserID: pgUserID,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}

	// DTOに変換
	result := make([]dto.WeeklySummaryResponse, 0, len(summaries))
	for _, summary := range summaries {
		result = append(result, dto.WeeklySummaryResponse{
			Week:        summary.Week.Time.Format("2006-01-02"),
			TotalVolume: float64(summary.TotalVolume),
			EstOneRM:    0.0, // 現在はest_1rmの具体的な実装がない
		})
	}

	return result, nil
}
