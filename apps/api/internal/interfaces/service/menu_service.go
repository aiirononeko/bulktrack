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

// MenuService はメニュー関連のサービスを提供する
type MenuService struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

// NewMenuService は新しいMenuServiceを作成する
func NewMenuService(pool *pgxpool.Pool) *MenuService {
	return &MenuService{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// CreateMenu は新しいメニューを作成する
func (s *MenuService) CreateMenu(ctx context.Context, req dto.CreateMenuRequest, userID uuid.UUID) (*dto.MenuResponse, error) {
	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := sqlc.New(tx)

	// UUIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// メニュー作成
	menu, err := qtx.CreateMenu(ctx, sqlc.CreateMenuParams{
		UserID: pgUserID,
		Name:   req.Name,
	})
	if err != nil {
		return nil, err
	}

	// メニュー項目作成
	items := make([]dto.MenuItemView, 0, len(req.Items))
	for _, item := range req.Items {
		// PlannedRepsをpgtype.Int4に変換
		pgPlannedReps := pgtype.Int4{Int32: item.PlannedReps, Valid: true}

		// MenuIDをpgtype.UUIDに変換
		pgMenuID := pgtype.UUID{Bytes: menu.ID, Valid: true}

		menuItem, err := qtx.CreateMenuItem(ctx, sqlc.CreateMenuItemParams{
			MenuID:      pgMenuID,
			Exercise:    item.Exercise,
			SetOrder:    item.SetOrder,
			PlannedReps: pgPlannedReps,
		})
		if err != nil {
			return nil, err
		}

		items = append(items, dto.MenuItemView{
			ID:          menuItem.ID,
			Exercise:    menuItem.Exercise,
			SetOrder:    menuItem.SetOrder,
			PlannedReps: menuItem.PlannedReps.Int32,
		})
	}

	// トランザクションコミット
	if err := tx.Commit(ctx); err != nil {
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
		return nil, err
	}

	// メニューIDをpgtype.UUIDに変換
	pgMenuID := pgtype.UUID{Bytes: menuID, Valid: true}

	// メニュー項目の取得
	menuItems, err := s.queries.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		return nil, err
	}

	// DTOに変換
	items := make([]dto.MenuItemView, 0, len(menuItems))
	for _, item := range menuItems {
		items = append(items, dto.MenuItemView{
			ID:          item.ID,
			Exercise:    item.Exercise,
			SetOrder:    item.SetOrder,
			PlannedReps: item.PlannedReps.Int32,
		})
	}

	// レスポンス作成
	return &dto.MenuResponse{
		ID:        menu.ID,
		Name:      menu.Name,
		CreatedAt: menu.CreatedAt.Time.Format(time.RFC3339),
		Items:     items,
	}, nil
}
