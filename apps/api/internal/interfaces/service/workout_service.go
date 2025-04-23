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
func (s *WorkoutService) ListWorkoutsByUser(ctx context.Context, userID string) ([]dto.WorkoutSummary, error) {
	// ワークアウト一覧の取得
	workouts, err := s.queries.ListWorkoutsByUser(ctx, userID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute ListWorkoutsByUser query", slog.Any("error", err), slog.String("user_id", userID))
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
func (s *WorkoutService) StartWorkout(ctx context.Context, req dto.CreateWorkoutRequest, userID string) (resp *dto.WorkoutResponse, err error) {
	// デバッグログ: リクエスト情報
	s.logger.InfoContext(ctx, "StartWorkout requested",
		slog.String("user_id", userID),
		slog.String("menu_id", req.MenuID.String()),
		slog.Int("exercises_count", len(req.Exercises)),
		slog.Int("note_length", len(req.Note)))

	// トランザクション開始
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to begin transaction for StartWorkout", slog.Any("error", err), slog.String("user_id", userID))
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			s.logger.ErrorContext(ctx, "Recovered in StartWorkout, rolling back transaction", slog.Any("panic_value", r), slog.String("user_id", userID))
			tx.Rollback(ctx)
			panic(r)
		} else if err != nil {
			rollErr := tx.Rollback(ctx)
			if rollErr != nil {
				s.logger.ErrorContext(ctx, "Failed to rollback transaction for StartWorkout", slog.Any("rollback_error", rollErr), slog.Any("original_error", err), slog.String("user_id", userID))
			}
		}
	}()

	qtx := sqlc.New(tx)

	// UUIDをpgtypeに変換
	pgMenuID := pgtype.UUID{Bytes: req.MenuID, Valid: true}

	// ノートのpgtype変換
	var pgNote pgtype.Text
	if req.Note != "" {
		pgNote = pgtype.Text{String: req.Note, Valid: true}
	}

	// デバッグログ: DB挿入前の値確認
	s.logger.InfoContext(ctx, "Creating workout in DB",
		slog.String("user_id", userID),
		slog.String("menu_id", req.MenuID.String()),
		slog.Bool("has_note", req.Note != ""))

	// ワークアウト作成
	workout, err := qtx.CreateWorkout(ctx, sqlc.CreateWorkoutParams{
		UserID: userID,
		MenuID: pgMenuID,
		Note:   pgNote,
	})
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute CreateWorkout query", slog.Any("error", err), slog.String("user_id", userID), slog.String("menu_id", req.MenuID.String()))
		return nil, err
	}

	// デバッグログ: ワークアウト作成成功
	s.logger.InfoContext(ctx, "Workout created in DB",
		slog.String("user_id", userID),
		slog.String("menu_id", req.MenuID.String()),
		slog.String("workout_id", workout.ID.String()),
		slog.String("started_at", workout.StartedAt.Time.Format(time.RFC3339)))

	// メニュー情報の取得
	menu, err := qtx.GetMenu(ctx, req.MenuID)
	if err != nil {
		s.logger.ErrorContext(ctx, "Failed to execute GetMenu query after creating workout", slog.Any("error", err), slog.String("menu_id", req.MenuID.String()), slog.String("workout_id", workout.ID.String()))
		return nil, err
	}

	// デバッグログ: メニュー情報取得成功
	s.logger.InfoContext(ctx, "Menu info retrieved",
		slog.String("menu_id", req.MenuID.String()),
		slog.String("menu_name", menu.Name),
		slog.String("workout_id", workout.ID.String()))

	pgWorkoutID := pgtype.UUID{Bytes: workout.ID, Valid: true}
	sets := make([]dto.SetView, 0)

	// リクエストからエクササイズとセットの情報がある場合は、それを使用
	if len(req.Exercises) > 0 {
		s.logger.InfoContext(ctx, "Creating sets from request data",
			slog.Int("exercise_count", len(req.Exercises)),
			slog.String("workout_id", workout.ID.String()))

		// エクササイズIDと名前のマップを作成(N+1問題を防ぐ)
		exerciseMap := make(map[string]string)

		for exerciseIndex, exercise := range req.Exercises {
			// エクササイズIDをUUIDに変換
			exerciseID, err := uuid.Parse(exercise.ExerciseID)
			if err != nil {
				s.logger.WarnContext(ctx, "Invalid exercise ID format",
					slog.String("exercise_id", exercise.ExerciseID),
					slog.Any("error", err),
					slog.String("workout_id", workout.ID.String()),
					slog.Int("exercise_index", exerciseIndex))
				continue
			}

			// デバッグログ: エクササイズ処理
			s.logger.InfoContext(ctx, "Processing exercise",
				slog.Int("exercise_index", exerciseIndex),
				slog.String("exercise_id", exercise.ExerciseID),
				slog.Int("sets_count", len(exercise.Sets)),
				slog.String("workout_id", workout.ID.String()))

			// エクササイズ名をキャッシュまたは取得
			exerciseName, ok := exerciseMap[exercise.ExerciseID]
			if !ok {
				exerciseObj, err := qtx.GetExercise(ctx, exerciseID)
				if err != nil {
					s.logger.WarnContext(ctx, "Failed to get exercise",
						slog.String("exercise_id", exercise.ExerciseID),
						slog.Any("error", err),
						slog.String("workout_id", workout.ID.String()))
					exerciseName = "不明な種目"
				} else {
					exerciseName = exerciseObj.Name
					exerciseMap[exercise.ExerciseID] = exerciseName
					s.logger.InfoContext(ctx, "Exercise name retrieved",
						slog.String("exercise_id", exercise.ExerciseID),
						slog.String("exercise_name", exerciseName),
						slog.String("workout_id", workout.ID.String()))
				}
			}

			// 各セットを作成
			pgExerciseID := pgtype.UUID{Bytes: exerciseID, Valid: true}

			for setIndex, set := range exercise.Sets {
				// デバッグログ: セット情報
				s.logger.InfoContext(ctx, "Processing set",
					slog.Int("exercise_index", exerciseIndex),
					slog.Int("set_index", setIndex),
					slog.Float64("weight_kg", set.WeightKg),
					slog.Int("reps", int(set.Reps)),
					slog.Any("rir", set.RIR),
					slog.Any("rpe", set.RPE),
					slog.String("workout_id", workout.ID.String()))

				// 重量をNumericに変換
				var weightKg pgtype.Numeric
				weightKgStr := strconv.FormatFloat(set.WeightKg, 'f', 2, 64)
				if err := weightKg.Scan(weightKgStr); err != nil {
					s.logger.WarnContext(ctx, "Weight conversion error",
						slog.Any("error", err),
						slog.Float64("weight", set.WeightKg),
						slog.String("workout_id", workout.ID.String()),
						slog.Int("exercise_index", exerciseIndex),
						slog.Int("set_index", setIndex))
					continue
				}

				// RIR, RPE 変換
				var rir, rpe pgtype.Numeric
				if set.RIR != nil {
					rirStr := strconv.FormatFloat(*set.RIR, 'f', 1, 64)
					if err := rir.Scan(rirStr); err != nil {
						s.logger.WarnContext(ctx, "RIR conversion error",
							slog.Any("error", err),
							slog.Float64("rir", *set.RIR),
							slog.String("workout_id", workout.ID.String()),
							slog.Int("exercise_index", exerciseIndex),
							slog.Int("set_index", setIndex))
					}
				}

				if set.RPE != nil {
					rpeStr := strconv.FormatFloat(*set.RPE, 'f', 1, 64)
					if err := rpe.Scan(rpeStr); err != nil {
						s.logger.WarnContext(ctx, "RPE conversion error",
							slog.Any("error", err),
							slog.Float64("rpe", *set.RPE),
							slog.String("workout_id", workout.ID.String()),
							slog.Int("exercise_index", exerciseIndex),
							slog.Int("set_index", setIndex))
					}
				}

				// セットの順番
				setOrder := int32(setIndex + 1)

				// デバッグログ: セット作成試行
				s.logger.InfoContext(ctx, "Creating set in DB",
					slog.Int("exercise_index", exerciseIndex),
					slog.Int("set_index", setIndex),
					slog.Int("set_order", int(setOrder)),
					slog.String("exercise_name", exerciseName),
					slog.String("workout_id", workout.ID.String()))

				// セット作成
				createdSet, err := qtx.CreateSet(ctx, sqlc.CreateSetParams{
					WorkoutID:  pgWorkoutID,
					ExerciseID: pgExerciseID,
					SetOrder:   setOrder,
					WeightKg:   weightKg,
					Reps:       set.Reps,
					Rir:        rir,
					Rpe:        rpe,
				})
				if err != nil {
					s.logger.ErrorContext(ctx, "Failed to create set",
						slog.Any("error", err),
						slog.String("workout_id", workout.ID.String()),
						slog.Int("exercise_index", exerciseIndex),
						slog.Int("set_index", setIndex))
					continue
				}

				// デバッグログ: セット作成成功
				s.logger.InfoContext(ctx, "Set created in DB",
					slog.String("set_id", createdSet.ID.String()),
					slog.Int("exercise_index", exerciseIndex),
					slog.Int("set_index", setIndex),
					slog.String("workout_id", workout.ID.String()))

				// DTOに変換
				setView := dto.SetView{
					ID:       createdSet.ID,
					Exercise: exerciseName,
					SetOrder: setOrder,
					WeightKg: set.WeightKg,
					Reps:     set.Reps,
				}

				// RIR/RPEの設定
				if set.RIR != nil {
					setView.RIR = set.RIR
				}
				if set.RPE != nil {
					setView.RPE = set.RPE
				}

				sets = append(sets, setView)
			}
		}
	} else {
		// 既存の処理: メニュー項目に基づいたセット作成（フロントエンドから送信されたデータがない場合のフォールバック）
		s.logger.InfoContext(ctx, "No exercises in request, creating sets based on menu items",
			slog.String("menu_id", req.MenuID.String()),
			slog.String("workout_id", workout.ID.String()))

		menuItems, err := qtx.ListMenuItemsByMenu(ctx, pgMenuID)
		if err != nil {
			s.logger.ErrorContext(ctx, "Failed to execute ListMenuItemsByMenu query after creating workout", slog.Any("error", err), slog.String("menu_id", req.MenuID.String()), slog.String("workout_id", workout.ID.String()))
			return nil, err
		}

		s.logger.InfoContext(ctx, "Menu items retrieved for fallback set creation",
			slog.Int("menu_items_count", len(menuItems)),
			slog.String("menu_id", req.MenuID.String()),
			slog.String("workout_id", workout.ID.String()))

		// セットの作成
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
	}

	// トランザクションコミット
	if err = tx.Commit(ctx); err != nil {
		s.logger.ErrorContext(ctx, "Failed to commit transaction for StartWorkout", slog.Any("error", err), slog.String("user_id", userID), slog.String("workout_id", workout.ID.String()))
		return nil, err
	}

	// デバッグログ: トランザクション完了
	s.logger.InfoContext(ctx, "Transaction committed successfully",
		slog.String("workout_id", workout.ID.String()),
		slog.Int("sets_count", len(sets)))

	// ノートの変換
	var noteStr string
	if workout.Note.Valid {
		noteStr = workout.Note.String
	}

	// レスポンス作成
	response := &dto.WorkoutResponse{
		ID:        workout.ID,
		MenuID:    req.MenuID,
		MenuName:  menu.Name,
		StartedAt: workout.StartedAt.Time.Format(time.RFC3339),
		Note:      noteStr,
		Sets:      sets,
	}

	// デバッグログ: 最終レスポンス
	s.logger.InfoContext(ctx, "StartWorkout response prepared",
		slog.String("workout_id", workout.ID.String()),
		slog.String("menu_id", req.MenuID.String()),
		slog.String("menu_name", menu.Name),
		slog.Int("sets_count", len(sets)))

	return response, nil
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
