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

	// レスポンス作成 - リクエスト値をそのまま返す
	// DB内部の表現は複雑なのでフロントエンドに渡す値はリクエストとして受け取った明示的な値を使用
	result := &dto.SetView{
		ID:       updatedSet.ID,
		Exercise: updatedSet.Exercise,
		SetOrder: updatedSet.SetOrder,
		WeightKg: req.WeightKg,
		Reps:     updatedSet.Reps,
	}

	if req.RPE > 0 {
		result.RPE = req.RPE
	}

	return result, nil
}

// GetWorkoutWithSets はワークアウトとそのセットを取得する
func (s *WorkoutService) GetWorkoutWithSets(ctx context.Context, workoutID uuid.UUID) (*dto.WorkoutResponse, error) {
	// ワークアウト情報の取得
	workout, err := s.queries.GetWorkout(ctx, workoutID)
	if err != nil {
		return nil, err
	}

	// メニュー情報の取得
	menu, err := s.queries.GetMenu(ctx, workout.MenuID.Bytes)
	if err != nil {
		return nil, err
	}

	// セット情報の取得
	pgWorkoutID := pgtype.UUID{Bytes: workoutID, Valid: true}
	sets, err := s.queries.ListSetsByWorkout(ctx, pgWorkoutID)
	if err != nil {
		return nil, err
	}

	// セットをDTOに変換
	setViews := make([]dto.SetView, 0, len(sets))
	for _, set := range sets {
		setView := dto.SetView{
			ID:       set.ID,
			Exercise: set.Exercise,
			SetOrder: set.SetOrder,
			Reps:     set.Reps,
		}

		// 重量のデコード（pgtype.Numericから浮動小数点数へ）
		if set.WeightKg.Valid {
			// NumericからFloatへの変換を試みる
			weight, err := set.WeightKg.Float64Value()
			if err == nil && weight.Valid {
				setView.WeightKg = weight.Float64
			}
		}

		// RPEのデコード（存在する場合）
		if set.Rpe.Valid {
			rpe, err := set.Rpe.Float64Value()
			if err == nil && rpe.Valid {
				setView.RPE = rpe.Float64
			}
		}

		setViews = append(setViews, setView)
	}

	// ノートの変換
	var noteStr string
	if workout.Note.Valid {
		noteStr = workout.Note.String
	}

	// レスポンス作成
	return &dto.WorkoutResponse{
		ID:        workout.ID,
		MenuID:    workout.MenuID.Bytes,
		MenuName:  menu.Name,
		StartedAt: workout.StartedAt.Time.Format(time.RFC3339),
		Note:      noteStr,
		Sets:      setViews,
	}, nil
}
