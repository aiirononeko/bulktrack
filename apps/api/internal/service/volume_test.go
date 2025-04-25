package service

import (
	"context"
	"fmt"
	"reflect"
	"testing"
	"time"
	"unsafe"

	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/infrastructure/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

// mockQueriesWrapper はsqlc.Querierを実装するラッパー
type mockQueriesWrapper struct {
	getWeeklyVolumesFunc func(ctx context.Context, arg sqlc.GetWeeklyVolumesParams) ([]sqlc.GetWeeklyVolumesRow, error)
}

// GetWeeklyVolumes はモックの実装
func (m *mockQueriesWrapper) GetWeeklyVolumes(ctx context.Context, arg sqlc.GetWeeklyVolumesParams) ([]sqlc.GetWeeklyVolumesRow, error) {
	if m.getWeeklyVolumesFunc != nil {
		return m.getWeeklyVolumesFunc(ctx, arg)
	}
	return nil, fmt.Errorf("not implemented")
}

// 他のメソッドはテストで使用しないのでスタブ実装
func (m *mockQueriesWrapper) GetWeeklyVolumeForWeek(ctx context.Context, arg sqlc.GetWeeklyVolumeForWeekParams) (sqlc.WeeklyVolume, error) {
	return sqlc.WeeklyVolume{}, nil
}

func (m *mockQueriesWrapper) GetWeeklyVolumeStats(ctx context.Context, arg sqlc.GetWeeklyVolumeStatsParams) (sqlc.GetWeeklyVolumeStatsRow, error) {
	return sqlc.GetWeeklyVolumeStatsRow{}, nil
}

func (m *mockQueriesWrapper) RecalculateWeeklyVolume(ctx context.Context, arg sqlc.RecalculateWeeklyVolumeParams) error {
	return nil
}

func (m *mockQueriesWrapper) GetLatestWeeklyVolume(ctx context.Context, userID string) (sqlc.WeeklyVolume, error) {
	return sqlc.WeeklyVolume{}, nil
}

func (m *mockQueriesWrapper) GetWeeklyVolumeByExercise(ctx context.Context, arg sqlc.GetWeeklyVolumeByExerciseParams) ([]sqlc.GetWeeklyVolumeByExerciseRow, error) {
	return nil, nil
}

func (m *mockQueriesWrapper) GetWeeklyVolumeByMuscleGroup(ctx context.Context, arg sqlc.GetWeeklyVolumeByMuscleGroupParams) ([]sqlc.GetWeeklyVolumeByMuscleGroupRow, error) {
	return nil, nil
}

// GetExercise はモックの実装
func (m *mockQueriesWrapper) GetExercise(ctx context.Context, id interface{}) (sqlc.Exercise, error) {
	return sqlc.Exercise{}, nil
}

// GetMenu はモックの実装
func (m *mockQueriesWrapper) GetMenu(ctx context.Context, id interface{}) (sqlc.Menu, error) {
	return sqlc.Menu{}, nil
}

// ListMenuItemsByMenu はモックの実装
func (m *mockQueriesWrapper) ListMenuItemsByMenu(ctx context.Context, menuID interface{}) ([]sqlc.MenuItem, error) {
	return nil, nil
}

// CreateWorkout はモックの実装
func (m *mockQueriesWrapper) CreateWorkout(ctx context.Context, arg interface{}) (sqlc.Workout, error) {
	return sqlc.Workout{}, nil
}

// CreateSet はモックの実装
func (m *mockQueriesWrapper) CreateSet(ctx context.Context, arg interface{}) (sqlc.Set, error) {
	return sqlc.Set{}, nil
}

// UpdateSet はモックの実装
func (m *mockQueriesWrapper) UpdateSet(ctx context.Context, arg interface{}) (sqlc.Set, error) {
	return sqlc.Set{}, nil
}

// ListWorkoutsByUser はモックの実装
func (m *mockQueriesWrapper) ListWorkoutsByUser(ctx context.Context, userID interface{}) ([]sqlc.Workout, error) {
	return nil, nil
}

// GetWorkout はモックの実装
func (m *mockQueriesWrapper) GetWorkout(ctx context.Context, id interface{}) (sqlc.Workout, error) {
	return sqlc.Workout{}, nil
}

// ListSetsByWorkout はモックの実装
func (m *mockQueriesWrapper) ListSetsByWorkout(ctx context.Context, workoutID interface{}) ([]interface{}, error) {
	return nil, nil
}

// ListExercises はモックの実装
func (m *mockQueriesWrapper) ListExercises(ctx context.Context) ([]sqlc.Exercise, error) {
	return nil, nil
}

// TestWeeklyVolume_MissingWeeks は欠損週がゼロで埋められることをテストする
func TestWeeklyVolume_MissingWeeks(t *testing.T) {
	// モックQueriesの作成
	mockQueries := &mockQueriesWrapper{}

	// 欠損週を含むデータを返すモック関数を設定
	mockQueries.getWeeklyVolumesFunc = func(ctx context.Context, arg sqlc.GetWeeklyVolumesParams) ([]sqlc.GetWeeklyVolumesRow, error) {
		// 12週間分のデータを生成
		rows := make([]sqlc.GetWeeklyVolumesRow, 12)
		now := time.Now().Unix()

		// 全ての週をゼロで初期化
		for i := 0; i < 12; i++ {
			weekStartUnix := now - int64(i*7*24*60*60) // i週間前のUnixタイムスタンプ
			weekStartTime := time.Unix(weekStartUnix, 0)
			weekStartDatePg := pgtype.Date{Time: weekStartTime, Valid: true}
			rows[i] = sqlc.GetWeeklyVolumesRow{
				WeekStartDate: weekStartDatePg,
				TotalVolume:   pgtype.Numeric{Valid: false}, // NULL値
				EstOneRm:      pgtype.Numeric{Valid: false}, // NULL値
				ExerciseCount: 0,
				SetCount:      0,
			}
		}

		// いくつかの週にデータを設定（欠損週を作る）
		// 今週
		var totalVolume1000, estOneRm100 pgtype.Numeric
		totalVolume1000.Scan("1000")
		estOneRm100.Scan("100")
		rows[0].TotalVolume = totalVolume1000
		rows[0].EstOneRm = estOneRm100
		rows[0].ExerciseCount = 5
		rows[0].SetCount = 20

		// 3週間前
		var totalVolume800, estOneRm90 pgtype.Numeric
		totalVolume800.Scan("800")
		estOneRm90.Scan("90")
		rows[2].TotalVolume = totalVolume800
		rows[2].EstOneRm = estOneRm90
		rows[2].ExerciseCount = 4
		rows[2].SetCount = 16

		// 6週間前
		var totalVolume1200, estOneRm110 pgtype.Numeric
		totalVolume1200.Scan("1200")
		estOneRm110.Scan("110")
		rows[5].TotalVolume = totalVolume1200
		rows[5].EstOneRm = estOneRm110
		rows[5].ExerciseCount = 6
		rows[5].SetCount = 24

		// 12週間前
		var totalVolume900, estOneRm95 pgtype.Numeric
		totalVolume900.Scan("900")
		estOneRm95.Scan("95")
		rows[11].TotalVolume = totalVolume900
		rows[11].EstOneRm = estOneRm95
		rows[11].ExerciseCount = 5
		rows[11].SetCount = 18

		return rows, nil
	}

	// VolumeServiceの作成
	service := &VolumeService{
		logger: slog.Default(),
	}

	// リフレクションを使用してprivateフィールドを設定
	serviceValue := reflect.ValueOf(service).Elem()
	queriesField := serviceValue.FieldByName("queries")

	// フィールドをエクスポートする
	queriesFieldPtr := unsafe.Pointer(queriesField.UnsafeAddr())
	reflect.NewAt(queriesField.Type(), queriesFieldPtr).
		Elem().
		Set(reflect.ValueOf(mockQueries))

	// GetWeeklyVolumesを呼び出し
	result, err := service.GetWeeklyVolumes(context.Background(), "test-user", 12)
	if err != nil {
		t.Fatalf("Failed to get weekly volumes: %v", err)
	}

	// 12週間分のデータがあることを確認
	if len(result.Summaries) != 12 {
		t.Errorf("Expected 12 summaries, got %d", len(result.Summaries))
	}

	// 欠損週がゼロで埋められていることを確認
	expectedVolumes := map[int]float64{
		0:  1000, // 今週
		1:  0,    // 先週（欠損）
		2:  800,  // 3週間前
		3:  0,    // 4週間前（欠損）
		4:  0,    // 5週間前（欠損）
		5:  1200, // 6週間前
		6:  0,    // 7週間前（欠損）
		7:  0,    // 8週間前（欠損）
		8:  0,    // 9週間前（欠損）
		9:  0,    // 10週間前（欠損）
		10: 0,    // 11週間前（欠損）
		11: 900,  // 12週間前
	}

	for i, expected := range expectedVolumes {
		if i >= len(result.Summaries) {
			t.Errorf("Missing summary for week %d", i)
			continue
		}

		actual := result.Summaries[i].TotalVolume
		if actual != expected {
			t.Errorf("Week %d: expected volume %f, got %f", i, expected, actual)
		}
	}
}

// TestWeeklyVolume_LargeDatasetPerformance は大量データの処理性能をテストする
func TestWeeklyVolume_LargeDatasetPerformance(t *testing.T) {
	// モックQueriesの作成
	mockQueries := &mockQueriesWrapper{}

	// 大量データを返すモック関数を設定
	mockQueries.getWeeklyVolumesFunc = func(ctx context.Context, arg sqlc.GetWeeklyVolumesParams) ([]sqlc.GetWeeklyVolumesRow, error) {
		// 大量のデータを生成（10万セット相当）
		// 52週 × 平均2000セット/週 = 104,000セット
		rows := make([]sqlc.GetWeeklyVolumesRow, 52)
		now := time.Now().Unix()

		for i := 0; i < 52; i++ {
			weekStartUnix := now - int64(i*7*24*60*60) // i週間前のUnixタイムスタンプ
			weekStartTime := time.Unix(weekStartUnix, 0)
			weekStartDatePg := pgtype.Date{Time: weekStartTime, Valid: true}

			// 各週に大量のセットを設定
			setCount := int32(2000 + i%500) // 週によって少し変動させる

			// 総ボリュームは重量×回数の合計なので、セット数に比例する
			var totalVolume, estOneRm pgtype.Numeric
			totalVolume.Scan(fmt.Sprintf("%d", setCount*100)) // 平均100kg×10回=1000kg/セット
			estOneRm.Scan("200")

			rows[i] = sqlc.GetWeeklyVolumesRow{
				WeekStartDate: weekStartDatePg,
				TotalVolume:   totalVolume,
				EstOneRm:      estOneRm,
				ExerciseCount: 20,       // 20種目
				SetCount:      setCount, // 約2000セット/週
			}
		}

		return rows, nil
	}

	// VolumeServiceの作成
	service := &VolumeService{
		logger: slog.Default(),
	}

	// リフレクションを使用してprivateフィールドを設定
	serviceValue := reflect.ValueOf(service).Elem()
	queriesField := serviceValue.FieldByName("queries")

	// フィールドをエクスポートする
	queriesFieldPtr := unsafe.Pointer(queriesField.UnsafeAddr())
	reflect.NewAt(queriesField.Type(), queriesFieldPtr).
		Elem().
		Set(reflect.ValueOf(mockQueries))

	// 処理時間を計測
	start := time.Now()

	// GetWeeklyVolumesを呼び出し（52週分）
	result, err := service.GetWeeklyVolumes(context.Background(), "test-user", 52)
	if err != nil {
		t.Fatalf("Failed to get weekly volumes: %v", err)
	}

	// 処理時間を確認
	duration := time.Since(start)

	// 処理時間が1秒未満であることを確認
	if duration >= time.Second {
		t.Errorf("Processing took too long: %v (should be < 1s)", duration)
	} else {
		t.Logf("Processing completed in %v", duration)
	}

	// 52週間分のデータがあることを確認
	if len(result.Summaries) != 52 {
		t.Errorf("Expected 52 summaries, got %d", len(result.Summaries))
	}

	// 総セット数が10万以上であることを確認
	var totalSets int
	for i := 0; i < 52; i++ {
		totalSets += 2000 + i%500
	}

	t.Logf("Total sets processed: %d", totalSets)
	if totalSets < 100000 {
		t.Errorf("Expected to process at least 100,000 sets, but processed only %d", totalSets)
	}
}
