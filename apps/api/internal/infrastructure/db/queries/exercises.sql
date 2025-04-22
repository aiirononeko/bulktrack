-- name: GetExercise :one
SELECT id, name, main_target_muscle_group_id, is_custom, created_by_user_id, created_at FROM exercises
WHERE id = $1 LIMIT 1;

-- name: ListExercises :many
SELECT id, name FROM exercises
WHERE is_custom = false -- 基本的な種目のみリストアップ (カスタムは除く)
ORDER BY name;

-- name: CreateExercise :one
INSERT INTO exercises (
  name, main_target_muscle_group_id, is_custom, created_by_user_id
) VALUES (
  $1, $2, $3, $4
)
RETURNING id, name, main_target_muscle_group_id, is_custom, created_by_user_id, created_at;

-- TODO: 必要に応じて ListExercisesByUser (カスタム種目含む) や UpdateExercise, DeleteExercise などを追加
