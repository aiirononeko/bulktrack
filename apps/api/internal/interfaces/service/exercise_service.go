package service

import (
	"context"
	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ExerciseService は種目関連のサービスを提供する
type ExerciseService struct {
	pool    *pgxpool.Pool // pool は直接使わないかもしれないが、他のメソッド追加時に必要になるかも
	queries *sqlc.Queries
	logger  *slog.Logger
}

// NewExerciseService は新しい ExerciseService を作成する
func NewExerciseService(pool *pgxpool.Pool, logger *slog.Logger) *ExerciseService {
	return &ExerciseService{
		pool:    pool,
		queries: sqlc.New(pool),
		logger:  logger,
	}
}

// ListExercises は基本的な種目（カスタムを除く）の一覧を取得する
func (s *ExerciseService) ListExercises(ctx context.Context) ([]dto.Exercise, error) {
	// データベースから種目一覧を取得 (is_custom = false のもの)
	exercisesDB, err := s.queries.ListExercises(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListExercises query", slog.Any("error", err))
		return nil, err // エラーをそのまま返す
	}

	// sqlc の結果を DTO に変換
	result := make([]dto.Exercise, 0, len(exercisesDB))
	for _, dbExercise := range exercisesDB {
		result = append(result, dto.Exercise{
			ID:   dbExercise.ID,
			Name: dbExercise.Name,
		})
	}

	return result, nil
}
