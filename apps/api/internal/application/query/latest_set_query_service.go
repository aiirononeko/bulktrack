package query

import (
	"context"
	"log/slog"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LatestSetQueryService は種目の最新セット情報を取得するためのサービスインターフェース
type LatestSetQueryService interface {
	ListByMenu(ctx context.Context, userID string, menuID uuid.UUID) ([]dto.ExerciseLastRecord, error)
}

// latestSetQueryService は最新セット情報を取得するサービスの実装
type latestSetQueryService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
	logger  *slog.Logger
}

// NewLatestSetQueryService は新しいLatestSetQueryServiceを作成する
func NewLatestSetQueryService(pool *pgxpool.Pool, logger *slog.Logger) LatestSetQueryService {
	return &latestSetQueryService{
		pool:    pool,
		queries: sqlc.New(pool),
		logger:  logger,
	}
}

// ListByMenu はメニューに紐づく各種目の最新セット情報を取得する
func (s *latestSetQueryService) ListByMenu(ctx context.Context, userID string, menuID uuid.UUID) ([]dto.ExerciseLastRecord, error) {
	// メニューIDをpgtype.UUIDに変換
	pgMenuID := pgtype.UUID{Bytes: menuID, Valid: true}

	// メニュー項目の取得（メニューに含まれる種目一覧）
	menuItems, err := s.queries.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return nil, err
	}

	// メニューに種目が含まれていない場合は空配列を返す
	if len(menuItems) == 0 {
		return []dto.ExerciseLastRecord{}, nil
	}

	// 最新のセット情報を取得
	latestSets, err := s.queries.ListLatestSetsByMenu(ctx, sqlc.ListLatestSetsByMenuParams{
		MenuID: pgMenuID,
		UserID: userID,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListLatestSetsByMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()), slog.String("user_id", userID))
		return nil, err
	}

	// メニュー項目とセット情報を突合して結果を生成
	// メニューの種目ごとに前回の記録を含むDTOを作成
	result := make([]dto.ExerciseLastRecord, 0, len(menuItems))

	// 種目IDをキーにしたマップを作成（高速検索用）
	latestSetsMap := make(map[uuid.UUID]sqlc.ListLatestSetsByMenuRow)
	for _, set := range latestSets {
		latestSetsMap[set.ExerciseID] = set
	}

	// 各メニュー項目に対して前回の記録を関連付け
	for _, item := range menuItems {
		record := dto.ExerciseLastRecord{
			ExerciseID:   item.ExerciseID.Bytes,
			ExerciseName: item.ExerciseName,
			LastRecord:   nil, // デフォルトはnull
		}

		// 種目の最新セットが存在する場合、LastRecordを設定
		if latestSet, ok := latestSetsMap[item.ExerciseID.Bytes]; ok {
			var reps int32
			if latestSet.Reps.Valid {
				reps = latestSet.Reps.Int32
			}

			lastRecord := &dto.LastRecordData{
				Date: latestSet.StartedAt.Time.Format(time.RFC3339),
				Reps: reps,
			}

			// WeightKgを変換
			if latestSet.WeightKg.Valid {
				wVal, errConv := latestSet.WeightKg.Float64Value()
				if errConv == nil && wVal.Valid {
					lastRecord.WeightKg = wVal.Float64
				}
			}

			// RIRを変換
			if latestSet.Rir.Valid {
				rirVal, errConv := latestSet.Rir.Float64Value()
				if errConv == nil && rirVal.Valid {
					rir := rirVal.Float64
					lastRecord.RIR = &rir
				}
			}

			// RPEを変換
			if latestSet.Rpe.Valid {
				rpeVal, errConv := latestSet.Rpe.Float64Value()
				if errConv == nil && rpeVal.Valid {
					rpe := rpeVal.Float64
					lastRecord.RPE = &rpe
				}
			}

			record.LastRecord = lastRecord
		}

		result = append(result, record)
	}

	return result, nil
}
