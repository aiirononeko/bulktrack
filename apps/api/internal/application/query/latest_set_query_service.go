package query

import (
	"context"
	"errors"
	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

// ListByMenu はメニューに紐づく各種目の**最新ワークアウトの全セット情報**を取得する
func (s *latestSetQueryService) ListByMenu(ctx context.Context, userID string, menuID uuid.UUID) ([]dto.ExerciseLastRecord, error) {
	// メニューIDをpgtype.UUIDに変換
	pgMenuID := pgtype.UUID{Bytes: menuID, Valid: true}

	// 1. メニュー項目の取得（メニューに含まれる種目一覧）
	menuItems, err := s.queries.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return nil, err
	}

	if len(menuItems) == 0 {
		return []dto.ExerciseLastRecord{}, nil
	}

	// menuItems から exercise_id のスライスを作成 (uuid.UUID 型)
	exerciseUUIDs := make([]uuid.UUID, len(menuItems)) // 型を []uuid.UUID に変更し、変数名も変更
	for i, item := range menuItems {
		exerciseUUIDs[i] = item.ExerciseID.Bytes // pgtype.UUID から uuid.UUID を抽出
	}

	// 2. 最新のワークアウトIDを取得 (sqlc は uuid.UUID を返すと想定)
	var latestWorkoutID uuid.UUID
	noLatestWorkout := false // 最新ワークアウトが見つからなかったかどうかのフラグ
	latestWorkoutID, err = s.queries.GetLatestWorkoutIDByMenu(ctx, sqlc.GetLatestWorkoutIDByMenuParams{
		MenuID: pgMenuID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// 最新ワークアウトが見つからないのはエラーではない。ログを出力して続行。
			s.logger.InfoContext(ctx, "No latest workout found for menu", slog.String("menu_id", menuID.String()), slog.String("user_id", userID))
			noLatestWorkout = true
			// latestWorkoutID は uuid.Nil のまま。pgtype.UUID の代入は不要。
		} else {
			// その他のDBエラー
			s.logger.ErrorContext(ctx, "Failed to execute GetLatestWorkoutIDByMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()), slog.String("user_id", userID))
			return nil, err
		}
	}

	// 3. 最新ワークアウトの全セット情報を取得
	var allSets []sqlc.ListSetsByWorkoutAndExercisesRow = []sqlc.ListSetsByWorkoutAndExercisesRow{}
	// 最新ワークアウトが見つかった場合のみクエリを実行 (!noLatestWorkout フラグを使用)
	if !noLatestWorkout {
		// WorkoutID を pgtype.UUID に変換して渡す
		pgLatestWorkoutID := pgtype.UUID{Bytes: latestWorkoutID, Valid: true}
		allSets, err = s.queries.ListSetsByWorkoutAndExercises(ctx, sqlc.ListSetsByWorkoutAndExercisesParams{
			WorkoutID:   pgLatestWorkoutID, // pgtype.UUID を渡す
			ExerciseIds: exerciseUUIDs,     // 修正した []uuid.UUID スライスを渡す
		})
		// セットが見つからない(ErrNoRows)のはエラーではない。
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			// ログ出力には uuid.UUID の String() メソッドを使用
			s.logger.ErrorContext(ctx, "Failed to execute ListSetsByWorkoutAndExercises query", slog.Any("error", err), slog.String("workout_id", latestWorkoutID.String()))
			return nil, err
		}
	}

	// 4. セットデータを種目IDごとにグループ化
	// キーを uuid.UUID、値を []dto.LastRecordData とするマップ
	setsByExercise := make(map[uuid.UUID][]dto.LastRecordData)
	for _, set := range allSets {
		recordData := dto.LastRecordData{
			SetOrder: set.SetOrder,
			Date:     set.StartedAt.Time,
		}
		if set.WeightKg.Valid {
			wVal, errConv := set.WeightKg.Float64Value()
			if errConv == nil && wVal.Valid {
				recordData.WeightKg = wVal.Float64
			}
		}
		recordData.Reps = set.Reps
		if set.Rir.Valid {
			rirVal, errConv := set.Rir.Float64Value()
			if errConv == nil && rirVal.Valid {
				rir := rirVal.Float64
				recordData.RIR = &rir
			}
		}
		if set.Rpe.Valid {
			rpeVal, errConv := set.Rpe.Float64Value()
			if errConv == nil && rpeVal.Valid {
				rpe := rpeVal.Float64
				recordData.RPE = &rpe
			}
		}
		exerciseUUID := set.ExerciseID.Bytes
		setsByExercise[exerciseUUID] = append(setsByExercise[exerciseUUID], recordData)
	}

	// 5. 最終結果リストを作成
	result := make([]dto.ExerciseLastRecord, 0, len(menuItems))
	for _, item := range menuItems {
		exerciseUUID := item.ExerciseID.Bytes
		lastRecords := setsByExercise[exerciseUUID]
		if lastRecords == nil {
			lastRecords = []dto.LastRecordData{}
		}

		record := dto.ExerciseLastRecord{
			ExerciseID:   exerciseUUID,
			ExerciseName: item.ExerciseName,
			LastRecord:   lastRecords,
		}
		result = append(result, record)
	}

	return result, nil
}
