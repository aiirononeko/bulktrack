package service

import (
	"context"
	"fmt"
	"log/slog"
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
	logger  *slog.Logger
}

// NewWorkoutService は新しいWorkoutServiceを作成する
func NewWorkoutService(pool *pgxpool.Pool, logger *slog.Logger) *WorkoutService {
	return &WorkoutService{
		pool:    pool,
		queries: sqlc.New(pool),
		logger:  logger,
	}
}

// ListWorkoutsByUser はユーザーのワークアウト一覧を取得する
func (s *WorkoutService) ListWorkoutsByUser(ctx context.Context, userID uuid.UUID) ([]dto.WorkoutSummary, error) {
	// ユーザーIDをpgtypeに変換
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// ワークアウト一覧の取得
	workouts, err := s.queries.ListWorkoutsByUser(ctx, pgUserID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListWorkoutsByUser query", slog.Any("error", err), slog.String("user_id", userID.String()))
		return nil, err
	}

	// メニュー情報をキャッシュするためのマップ
	menuCache := make(map[uuid.UUID]string)

	// ワークアウト一覧をDTOに変換
	summaries := make([]dto.WorkoutSummary, 0, len(workouts))
	for i, workout := range workouts {
		var menuName string
		menuID := workout.MenuID.Bytes

		// メニュー名をキャッシュから取得するか、DBから取得してキャッシュする
		if name, ok := menuCache[menuID]; ok {
			menuName = name
		} else {
			menu, err := s.queries.GetMenu(ctx, menuID)
			if err != nil {
				// メニューが見つからない場合はログに残す (Warnレベル)
				s.logger.WarnContext(ctx, "Failed to get menu for workout summary", slog.Any("error", err), slog.String("menu_id", uuid.UUID(menuID).String()), slog.String("workout_id", workout.ID.String()), slog.Int("workout_index", i))
				menuName = "不明なメニュー"
			} else {
				menuName = menu.Name
				menuCache[menuID] = menuName
			}
		}

		// ノートの変換
		var noteStr string
		if workout.Note.Valid {
			noteStr = workout.Note.String
		}

		// サマリの作成
		summary := dto.WorkoutSummary{
			ID:        workout.ID,
			MenuID:    menuID,
			MenuName:  menuName,
			StartedAt: workout.StartedAt.Time.Format(time.RFC3339),
			Note:      noteStr,
		}

		summaries = append(summaries, summary)
	}

	return summaries, nil
}

// StartWorkout は新しいワークアウトを開始する
func (s *WorkoutService) StartWorkout(ctx context.Context, req dto.CreateWorkoutRequest, userID uuid.UUID) (resp *dto.WorkoutResponse, err error) {
	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to begin transaction for StartWorkout", slog.Any("error", err), slog.String("user_id", userID.String()))
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			s.logger.ErrorContext(ctx, "Recovered in StartWorkout, rolling back transaction", slog.Any("panic_value", r), slog.String("user_id", userID.String()))
			tx.Rollback(ctx)
			panic(r)
		} else if err != nil {
			rollErr := tx.Rollback(ctx)
			if rollErr != nil {
				s.logger.ErrorContext(ctx, "Failed to rollback transaction for StartWorkout", slog.Any("rollback_error", rollErr), slog.Any("original_error", err), slog.String("user_id", userID.String()))
			}
		}
	}()

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
		s.logger.ErrorContext(ctx, "Failed to execute CreateWorkout query", slog.Any("error", err), slog.String("user_id", userID.String()), slog.String("menu_id", req.MenuID.String()))
		return nil, err
	}

	// メニュー情報の取得
	menu, err := qtx.GetMenu(ctx, req.MenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetMenu query after creating workout", slog.Any("error", err), slog.String("menu_id", req.MenuID.String()), slog.String("workout_id", workout.ID.String()))
		return nil, err
	}

	// メニュー項目の取得
	menuItems, err := qtx.ListMenuItemsByMenu(ctx, pgMenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query after creating workout", slog.Any("error", err), slog.String("menu_id", req.MenuID.String()), slog.String("workout_id", workout.ID.String()))
		return nil, err
	}

	// セットの作成
	sets := make([]dto.SetView, 0, len(menuItems))
	pgWorkoutID := pgtype.UUID{Bytes: workout.ID, Valid: true}

	for i, item := range menuItems {
		// 初期値は0で設定
		var weightKg pgtype.Numeric
		if errConv := weightKg.Scan("0"); errConv != nil {
			s.logger.ErrorContext(ctx, "Failed to scan '0' into weightKg", slog.Any("error", errConv), slog.String("workout_id", workout.ID.String()), slog.Int("item_index", i))
			err = fmt.Errorf("weight_kg conversion error: %w", errConv)
			return nil, err
		}

		// RIR, RPE は初期状態では NULL (Valid: false)
		var rir pgtype.Numeric
		var rpe pgtype.Numeric

		// ワークアウトセット作成
		set, err := qtx.CreateSet(ctx, sqlc.CreateSetParams{
			WorkoutID:  pgWorkoutID,
			ExerciseID: item.ExerciseID,
			SetOrder:   item.SetOrder,
			WeightKg:   weightKg,
			Reps:       0,
			Rir:        rir,
			Rpe:        rpe,
		})
		if err != nil {
			s.logger.ErrorContext(ctx, "Failed to execute CreateSet query", slog.Any("error", err), slog.String("workout_id", workout.ID.String()), slog.Int("item_index", i), slog.Any("item", item))
			return nil, err
		}

		// DTOに変換
		sets = append(sets, dto.SetView{
			ID:       set.ID,
			Exercise: item.ExerciseName,
			SetOrder: set.SetOrder,
			WeightKg: 0,
			Reps:     set.Reps,
			RIR:      nil,
			RPE:      nil,
		})
	}

	// トランザクションコミット
	if err = tx.Commit(ctx); err != nil {
		s.logger.ErrorContext(ctx, "Failed to commit transaction for StartWorkout", slog.Any("error", err), slog.String("user_id", userID.String()), slog.String("workout_id", workout.ID.String()))
		return nil, err
	}

	// レスポンス作成
	resp = &dto.WorkoutResponse{
		ID:        workout.ID,
		MenuID:    req.MenuID,
		MenuName:  menu.Name,
		StartedAt: workout.StartedAt.Time.Format(time.RFC3339),
		Note:      req.Note,
		Sets:      sets,
	}
	return resp, nil
}

// UpdateSet はセットを更新する
func (s *WorkoutService) UpdateSet(ctx context.Context, setID uuid.UUID, req dto.UpdateSetRequest) (*dto.SetView, error) {
	// リクエストから値を取得し、pgtypeに変換
	params := sqlc.UpdateSetParams{ID: setID}

	// WeightKg
	var weightKg pgtype.Numeric
	if req.WeightKg != nil {
		weightKgStr := strconv.FormatFloat(*req.WeightKg, 'f', 2, 64)
		if err := weightKg.Scan(weightKgStr); err != nil {
			s.logger.ErrorContext(ctx, "weight_kg conversion error during UpdateSet", slog.Any("error", err), slog.String("set_id", setID.String()), slog.String("input", weightKgStr))
			return nil, fmt.Errorf("weight_kg conversion error: %w", err)
		}
	}
	params.WeightKg = weightKg

	// Reps (SetReps は使わない)
	if req.Reps != nil {
		// params.SetReps = true // コメントアウト
		params.Reps = *req.Reps // sqlcクエリ側で NULL を考慮する必要あり
	} // else { // コメントアウト
	// 	params.SetReps = false // コメントアウト
	// } // コメントアウト

	// RIR
	var rir pgtype.Numeric
	if req.RIR != nil {
		rirStr := strconv.FormatFloat(*req.RIR, 'f', 1, 64)
		if err := rir.Scan(rirStr); err != nil {
			s.logger.ErrorContext(ctx, "rir conversion error during UpdateSet", slog.Any("error", err), slog.String("set_id", setID.String()), slog.String("input", rirStr))
			return nil, fmt.Errorf("rir conversion error: %w", err)
		}
	}
	params.Rir = rir

	// RPE
	var rpe pgtype.Numeric
	if req.RPE != nil {
		rpeStr := strconv.FormatFloat(*req.RPE, 'f', 1, 64)
		if err := rpe.Scan(rpeStr); err != nil {
			s.logger.ErrorContext(ctx, "rpe conversion error during UpdateSet", slog.Any("error", err), slog.String("set_id", setID.String()), slog.String("input", rpeStr))
			return nil, fmt.Errorf("rpe conversion error: %w", err)
		}
	}
	params.Rpe = rpe

	// セット更新
	updatedSet, err := s.queries.UpdateSet(ctx, params)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute UpdateSet query", slog.Any("error", err), slog.String("set_id", setID.String()), slog.Any("params", params))
		return nil, fmt.Errorf("failed to update set (ID: %s): %w", setID, err)
	}

	// 更新後のセット情報を取得 (GetSetView の代わりに updatedSet と GetExercise を使う)
	// setView, err := s.queries.GetSetView(ctx, updatedSet.ID) // コメントアウト
	// if err != nil {
	// 	s.logger.ErrorContext(ctx, "Failed to execute GetSetView query after UpdateSet", slog.Any("error", err), slog.String("set_id", updatedSet.ID.String()))
	// 	return nil, fmt.Errorf("failed to retrieve updated set view (ID: %s): %w", updatedSet.ID, err)
	// }

	// Exercise Name を取得
	exerciseName := "不明な種目"
	if updatedSet.ExerciseID.Valid {
		exercise, err := s.queries.GetExercise(ctx, updatedSet.ExerciseID.Bytes)
		if err != nil {
			s.logger.WarnContext(ctx, "Failed to get exercise name after updating set", slog.Any("error", err), slog.String("exercise_id", uuid.UUID(updatedSet.ExerciseID.Bytes).String()), slog.String("set_id", updatedSet.ID.String()))
		} else {
			exerciseName = exercise.Name
		}
	}

	// DTOに変換
	result := dto.SetView{
		ID:       updatedSet.ID,
		Exercise: exerciseName, // 取得した名前を使用
		SetOrder: updatedSet.SetOrder,
		WeightKg: 0, // 初期化
		Reps:     updatedSet.Reps,
		// RIR, RPE は pgtype.Numeric から *float64 に変換
	}
	// WeightKg の変換
	if updatedSet.WeightKg.Valid {
		wVal, err := updatedSet.WeightKg.Float64Value() // Float64Value を使用
		if err != nil {
			s.logger.WarnContext(ctx, "Failed to get Float64Value for WeightKg from DB for SetView", slog.Any("error", err), slog.String("set_id", updatedSet.ID.String()))
		} else if wVal.Valid { // pgtype.Float8Val の Valid をチェック
			result.WeightKg = wVal.Float64 // Float64 フィールドを使用
		}
	}
	// RIR の変換
	if updatedSet.Rir.Valid {
		rirVal, err := updatedSet.Rir.Float64Value() // Float64Value を使用
		if err != nil {
			s.logger.WarnContext(ctx, "Failed to get Float64Value for Rir from DB for SetView", slog.Any("error", err), slog.String("set_id", updatedSet.ID.String()))
		} else if rirVal.Valid { // pgtype.Float8Val の Valid をチェック
			result.RIR = &rirVal.Float64 // ポインタにして Float64 フィールドを使用
		}
	}
	// RPE の変換
	if updatedSet.Rpe.Valid {
		rpeVal, err := updatedSet.Rpe.Float64Value() // Float64Value を使用
		if err != nil {
			s.logger.WarnContext(ctx, "Failed to get Float64Value for Rpe from DB for SetView", slog.Any("error", err), slog.String("set_id", updatedSet.ID.String()))
		} else if rpeVal.Valid { // pgtype.Float8Val の Valid をチェック
			result.RPE = &rpeVal.Float64 // ポインタにして Float64 フィールドを使用
		}
	}

	return &result, nil
}

// GetWorkoutWithSets はワークアウトとそのセットを取得する
func (s *WorkoutService) GetWorkoutWithSets(ctx context.Context, workoutID uuid.UUID) (*dto.WorkoutResponse, error) {
	// ワークアウト情報の取得
	workout, err := s.queries.GetWorkout(ctx, workoutID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetWorkout query", slog.Any("error", err), slog.String("workout_id", workoutID.String()))
		return nil, err
	}

	// メニュー情報の取得
	menu, err := s.queries.GetMenu(ctx, workout.MenuID.Bytes)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetMenu query for workout", slog.Any("error", err), slog.String("menu_id", uuid.UUID(workout.MenuID.Bytes).String()), slog.String("workout_id", workoutID.String())) // 修正: uuid.UUID(...) で囲む
		return nil, err
	}

	// セット一覧の取得 (ListSetViewsByWorkout の代わりに ListSetsByWorkout を使用)
	// setsView, err := s.queries.ListSetViewsByWorkout(ctx, pgtype.UUID{Bytes: workoutID, Valid: true}) // コメントアウト
	setsRow, err := s.queries.ListSetsByWorkout(ctx, pgtype.UUID{Bytes: workoutID, Valid: true}) // ListSetsByWorkout を使用 (ExerciseName を含まない)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListSetsByWorkout query", slog.Any("error", err), slog.String("workout_id", workoutID.String())) // ListSetsByWorkout に変更
		return nil, err
	}

	// DTOに変換 (ループ内で ExerciseName を取得)
	sets := make([]dto.SetView, 0, len(setsRow))
	for _, setRow := range setsRow { // 変数名変更
		// Exercise Name を取得
		exerciseName := "不明な種目"
		if setRow.ExerciseID.Valid {
			exercise, err := s.queries.GetExercise(ctx, setRow.ExerciseID.Bytes)
			if err != nil {
				s.logger.WarnContext(ctx, "Failed to get exercise name while listing sets", slog.Any("error", err), slog.String("exercise_id", uuid.UUID(setRow.ExerciseID.Bytes).String()), slog.String("set_id", setRow.ID.String()))
			} else {
				exerciseName = exercise.Name
			}
		}

		setDTO := dto.SetView{
			ID:       setRow.ID,       // setRow を使用
			Exercise: exerciseName,    // 取得した名前を使用
			SetOrder: setRow.SetOrder, // setRow を使用
			WeightKg: 0,               // 初期化
			Reps:     setRow.Reps,     // setRow を使用
		}
		// WeightKg の変換
		if setRow.WeightKg.Valid { // setRow を使用
			wVal, errConv := setRow.WeightKg.Float64Value() // Float64Value を使用
			if errConv != nil {
				s.logger.WarnContext(ctx, "Failed to get Float64Value for WeightKg from DB for ListSetsByWorkout", slog.Any("error", errConv), slog.String("set_id", setRow.ID.String()))
			} else if wVal.Valid { // pgtype.Float8Val の Valid をチェック
				setDTO.WeightKg = wVal.Float64 // Float64 フィールドを使用
			}
		}
		// RIR の変換
		if setRow.Rir.Valid { // setRow を使用
			rirVal, errConv := setRow.Rir.Float64Value() // Float64Value を使用
			if errConv != nil {
				s.logger.WarnContext(ctx, "Failed to get Float64Value for Rir from DB for ListSetsByWorkout", slog.Any("error", errConv), slog.String("set_id", setRow.ID.String()))
			} else if rirVal.Valid { // pgtype.Float8Val の Valid をチェック
				setDTO.RIR = &rirVal.Float64 // ポインタにして Float64 フィールドを使用
			}
		}
		// RPE の変換
		if setRow.Rpe.Valid { // setRow を使用
			rpeVal, errConv := setRow.Rpe.Float64Value() // Float64Value を使用
			if errConv != nil {
				s.logger.WarnContext(ctx, "Failed to get Float64Value for Rpe from DB for ListSetsByWorkout", slog.Any("error", errConv), slog.String("set_id", setRow.ID.String()))
			} else if rpeVal.Valid { // pgtype.Float8Val の Valid をチェック
				setDTO.RPE = &rpeVal.Float64 // ポインタにして Float64 フィールドを使用
			}
		}
		sets = append(sets, setDTO)
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
		Sets:      sets,
	}, nil
}
