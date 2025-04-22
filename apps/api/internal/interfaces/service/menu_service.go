package service

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

// MenuService はメニュー関連のサービスを提供する
type MenuService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
	logger  *slog.Logger
}

// NewMenuService は新しいMenuServiceを作成する
func NewMenuService(pool *pgxpool.Pool, logger *slog.Logger) *MenuService {
	return &MenuService{
		pool:    pool,
		queries: sqlc.New(pool),
		logger:  logger,
	}
}

// CreateMenu は新しいメニューを作成する
func (s *MenuService) CreateMenu(ctx context.Context, req dto.CreateMenuRequest, userID uuid.UUID) (*dto.MenuResponse, error) {
	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to begin transaction for CreateMenu", slog.Any("error", err), slog.String("user_id", userID.String()))
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			s.logger.ErrorContext(ctx, "Recovered in CreateMenu, rolling back transaction", slog.Any("panic_value", r), slog.String("user_id", userID.String()))
			tx.Rollback(ctx)
			panic(r)
		} else if err != nil {
			rollErr := tx.Rollback(ctx)
			if rollErr != nil {
				s.logger.ErrorContext(ctx, "Failed to rollback transaction for CreateMenu", slog.Any("rollback_error", rollErr), slog.Any("original_error", err), slog.String("user_id", userID.String()))
			}
		}
	}()

	qtx := sqlc.New(tx)

	// UUIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// メニュー作成
	menu, err := qtx.CreateMenu(ctx, sqlc.CreateMenuParams{
		UserID: pgUserID,
		Name:   req.Name,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute CreateMenu query", slog.Any("error", err), slog.String("user_id", userID.String()), slog.String("menu_name", req.Name))
		return nil, err
	}

	// メニュー項目作成
	items := make([]dto.MenuItemView, 0, len(req.Items))
	for i, item := range req.Items {
		pgExerciseID := pgtype.UUID{Bytes: item.ExerciseID, Valid: true}

		// Nullable フィールドの変換 (pgtype.Int4)
		var pgPlannedSets pgtype.Int4
		if item.PlannedSets != nil {
			pgPlannedSets = pgtype.Int4{Int32: *item.PlannedSets, Valid: true}
		}
		var pgPlannedReps pgtype.Int4
		if item.PlannedReps != nil {
			pgPlannedReps = pgtype.Int4{Int32: *item.PlannedReps, Valid: true}
		}
		var pgPlannedIntervalSeconds pgtype.Int4
		if item.PlannedIntervalSeconds != nil {
			pgPlannedIntervalSeconds = pgtype.Int4{Int32: *item.PlannedIntervalSeconds, Valid: true}
		}

		pgMenuID := pgtype.UUID{Bytes: menu.ID, Valid: true}

		menuItem, err := qtx.CreateMenuItem(ctx, sqlc.CreateMenuItemParams{
			MenuID:                 pgMenuID,
			ExerciseID:             pgExerciseID,
			SetOrder:               item.SetOrder,
			PlannedSets:            pgPlannedSets,
			PlannedReps:            pgPlannedReps,
			PlannedIntervalSeconds: pgPlannedIntervalSeconds,
		})
		if err != nil {
			s.logger.ErrorContext(ctx, "Failed to execute CreateMenuItem query", slog.Any("error", err), slog.String("menu_id", menu.ID.String()), slog.Int("item_index", i), slog.Any("item", item))
			return nil, err
		}

		// ExerciseName を取得
		exercise, err := qtx.GetExercise(ctx, menuItem.ExerciseID.Bytes)
		var exerciseName string
		if err != nil {
			s.logger.WarnContext(ctx, "Failed to get exercise name for menu item", slog.Any("error", err), slog.String("exercise_id", uuid.UUID(menuItem.ExerciseID.Bytes).String()), slog.String("menu_item_id", menuItem.ID.String()))
			exerciseName = "不明な種目"
		} else {
			exerciseName = exercise.Name
		}

		// DTO に変換 (Nullable フィールドのポインタ化)
		itemView := dto.MenuItemView{
			ID:           menuItem.ID,
			ExerciseID:   menuItem.ExerciseID.Bytes,
			ExerciseName: exerciseName,
			SetOrder:     menuItem.SetOrder,
		}
		if menuItem.PlannedSets.Valid {
			val := menuItem.PlannedSets.Int32
			itemView.PlannedSets = &val
		}
		if menuItem.PlannedReps.Valid {
			val := menuItem.PlannedReps.Int32
			itemView.PlannedReps = &val
		}
		if menuItem.PlannedIntervalSeconds.Valid {
			val := menuItem.PlannedIntervalSeconds.Int32
			itemView.PlannedIntervalSeconds = &val
		}
		items = append(items, itemView)
	}

	// トランザクションコミット
	if err = tx.Commit(ctx); err != nil {
		s.logger.ErrorContext(ctx, "Failed to commit transaction for CreateMenu", slog.Any("error", err), slog.String("user_id", userID.String()), slog.String("menu_id", menu.ID.String()))
		return nil, err
	}

	// レスポンス作成
	return &dto.MenuResponse{
		ID:        menu.ID,
		Name:      menu.Name,
		CreatedAt: menu.CreatedAt.Time.Format(time.RFC3339),
		Items:     items,
	}, nil
}

// GetMenuWithItems はメニューとその項目を取得する
func (s *MenuService) GetMenuWithItems(ctx context.Context, menuID uuid.UUID) (*dto.MenuResponse, error) {
	// メニュー情報の取得
	menu, err := s.queries.GetMenu(ctx, menuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return nil, err
	}

	// メニューIDをpgtype.UUIDに変換
	pgMenuID := pgtype.UUID{Bytes: menuID, Valid: true}

	// メニュー項目の取得
	menuItems, err := s.queries.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return nil, err
	}

	// DTOに変換
	items := make([]dto.MenuItemView, 0, len(menuItems))
	for _, item := range menuItems {
		itemView := dto.MenuItemView{
			ID:           item.ID,
			ExerciseID:   item.ExerciseID.Bytes,
			ExerciseName: item.ExerciseName,
			SetOrder:     item.SetOrder,
		}
		// Nullable フィールドの変換 (pgtype.Int4 -> *int32)
		if item.PlannedSets.Valid {
			val := item.PlannedSets.Int32
			itemView.PlannedSets = &val
		}
		if item.PlannedReps.Valid {
			val := item.PlannedReps.Int32
			itemView.PlannedReps = &val
		}
		if item.PlannedIntervalSeconds.Valid {
			val := item.PlannedIntervalSeconds.Int32
			itemView.PlannedIntervalSeconds = &val
		}
		items = append(items, itemView)
	}

	// レスポンス作成
	return &dto.MenuResponse{
		ID:        menu.ID,
		Name:      menu.Name,
		CreatedAt: menu.CreatedAt.Time.Format(time.RFC3339),
		Items:     items,
	}, nil
}

// DeleteMenu はメニューを削除する
func (s *MenuService) DeleteMenu(ctx context.Context, menuID uuid.UUID) (err error) {
	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to begin transaction for DeleteMenu", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			s.logger.ErrorContext(ctx, "Recovered in DeleteMenu, rolling back transaction", slog.Any("panic_value", r), slog.String("menu_id", menuID.String()))
			tx.Rollback(ctx)
			panic(r)
		} else if err != nil {
			rollErr := tx.Rollback(ctx)
			if rollErr != nil {
				s.logger.ErrorContext(ctx, "Failed to rollback transaction for DeleteMenu", slog.Any("rollback_error", rollErr), slog.Any("original_error", err), slog.String("menu_id", menuID.String()))
			}
		}
	}()

	qtx := sqlc.New(tx)

	// メニュー項目の削除（外部キー制約があるため、先に削除）
	if err = qtx.DeleteMenuItem(ctx, menuID); err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute DeleteMenuItem query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return err
	}

	// メニューの削除
	if err = qtx.DeleteMenu(ctx, menuID); err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute DeleteMenu query", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return err
	}

	// トランザクションコミット
	if err = tx.Commit(ctx); err != nil {
		s.logger.ErrorContext(ctx, "Failed to commit transaction for DeleteMenu", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		return err
	}

	return nil
}

// ListMenusByUser はユーザーに紐づくメニュー一覧を取得する
func (s *MenuService) ListMenusByUser(ctx context.Context, userID uuid.UUID) ([]dto.MenuResponse, error) {
	// ユーザーIDをpgtype.UUIDに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// メニュー一覧の取得
	menus, err := s.queries.ListMenusByUser(ctx, pgUserID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListMenusByUser query", slog.Any("error", err), slog.String("user_id", userID.String()))
		return nil, err
	}

	// レスポンス作成
	result := make([]dto.MenuResponse, 0, len(menus))
	for _, menu := range menus {
		// メニューIDをpgtype.UUIDに変換
		pgMenuID := pgtype.UUID{Bytes: menu.ID, Valid: true}

		// メニュー項目の取得
		menuItems, err := s.queries.ListMenuItemsByMenu(ctx, pgMenuID)
		if err != nil {
			s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query for a menu in ListMenusByUser", slog.Any("error", err), slog.String("menu_id", menu.ID.String()), slog.String("user_id", userID.String()))
			return nil, err
		}

		// DTOに変換
		items := make([]dto.MenuItemView, 0, len(menuItems))
		for _, item := range menuItems {
			itemView := dto.MenuItemView{
				ID:           item.ID,
				ExerciseID:   item.ExerciseID.Bytes,
				ExerciseName: item.ExerciseName,
				SetOrder:     item.SetOrder,
			}
			// Nullable フィールドの変換 (pgtype.Int4 -> *int32)
			if item.PlannedSets.Valid {
				val := item.PlannedSets.Int32
				itemView.PlannedSets = &val
			}
			if item.PlannedReps.Valid {
				val := item.PlannedReps.Int32
				itemView.PlannedReps = &val
			}
			if item.PlannedIntervalSeconds.Valid {
				val := item.PlannedIntervalSeconds.Int32
				itemView.PlannedIntervalSeconds = &val
			}
			items = append(items, itemView)
		}

		result = append(result, dto.MenuResponse{
			ID:        menu.ID,
			Name:      menu.Name,
			CreatedAt: menu.CreatedAt.Time.Format(time.RFC3339),
			Items:     items,
		})
	}

	return result, nil
}
