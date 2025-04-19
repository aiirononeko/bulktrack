package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// WorkoutService はワークアウト関連のサービスを提供する
type WorkoutService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

// NewWorkoutService は新しいWorkoutServiceを作成する
func NewWorkoutService(pool *pgxpool.Pool) *WorkoutService {
	return &WorkoutService{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// StartWorkout は新しいワークアウトを開始する
func (s *WorkoutService) StartWorkout(ctx context.Context, req dto.CreateWorkoutRequest, userID uuid.UUID) (*dto.WorkoutResponse, error) {
	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := sqlc.New(tx)

	// UUIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}
	pgMenuID := pgtype.UUID{Bytes: req.MenuID, Valid: true}

	// ノートのpgtype変換
	var pgNote pgtype.Text
	if req.Note != "" {
		pgNote = pgtype.Text{String: req.Note, Valid: true}
	}

	// ワークアウト作成
	workout, err := qtx.CreateWorkout(ctx, sqlc.CreateWorkoutParams{
		UserID: pgUserID,
		MenuID: pgMenuID,
		Note:   pgNote,
	})
	if err != nil {
		return nil, err
	}

	// メニュー情報の取得
	menu, err := qtx.GetMenu(ctx, req.MenuID)
	if err != nil {
		return nil, err
	}

	// メニュー項目の取得
	menuItems, err := qtx.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		return nil, err
	}

	// セットの作成
	sets := make([]dto.SetView, 0, len(menuItems))
	pgWorkoutID := pgtype.UUID{Bytes: workout.ID, Valid: true}

	for _, item := range menuItems {
		// 初期値は0で設定
		var weightKg pgtype.Numeric
		if err := weightKg.Scan("0"); err != nil {
			return nil, fmt.Errorf("weight_kg conversion error: %w", err)
		}

		var rpe pgtype.Numeric // デフォルトではValid: falseになる

		// ワークアウトセット作成
		set, err := qtx.CreateSet(ctx, sqlc.CreateSetParams{
			WorkoutID: pgWorkoutID,
			Exercise:  item.Exercise,
			SetOrder:  item.SetOrder,
			WeightKg:  weightKg,
			Reps:      0, // 初期値は0
			Rpe:       rpe,
		})
		if err != nil {
			return nil, err
		}

		// DTOに変換
		sets = append(sets, dto.SetView{
			ID:       set.ID,
			Exercise: set.Exercise,
			SetOrder: set.SetOrder,
			WeightKg: 0,
			Reps:     set.Reps,
			RPE:      0,
		})
	}

	// トランザクションコミット
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// レスポンス作成
	return &dto.WorkoutResponse{
		ID:        workout.ID,
		MenuID:    req.MenuID,
		MenuName:  menu.Name,
		StartedAt: workout.StartedAt.Time.Format(time.RFC3339),
		Note:      req.Note,
		Sets:      sets,
	}, nil
}

// UpdateSet はセットを更新する
func (s *WorkoutService) UpdateSet(ctx context.Context, setID uuid.UUID, req dto.UpdateSetRequest) (*dto.SetView, error) {
	// 重量と反復回数をpgtypeに変換
	var weightKg pgtype.Numeric
	weightKgStr := strconv.FormatFloat(req.WeightKg, 'f', 2, 64)
	if err := weightKg.Scan(weightKgStr); err != nil {
		return nil, fmt.Errorf("weight_kg conversion error: %w", err)
	}

	var rpe pgtype.Numeric
	if req.RPE > 0 {
		rpeStr := strconv.FormatFloat(req.RPE, 'f', 1, 64)
		if err := rpe.Scan(rpeStr); err != nil {
			return nil, fmt.Errorf("rpe conversion error: %w", err)
		}
	}

	// セット更新
	updatedSet, err := s.queries.UpdateSet(ctx, sqlc.UpdateSetParams{
		ID:       setID,
		WeightKg: weightKg,
		Reps:     req.Reps,
		Rpe:      rpe,
	})
	if err != nil {
		return nil, err
	}

	// レスポンス作成
	result := &dto.SetView{
		ID:       updatedSet.ID,
		Exercise: updatedSet.Exercise,
		SetOrder: updatedSet.SetOrder,
		WeightKg: req.WeightKg, // リクエストの値をそのまま返す
		Reps:     updatedSet.Reps,
	}

	if req.RPE > 0 {
		result.RPE = req.RPE // リクエストの値をそのまま返す
	}

	return result, nil
}
