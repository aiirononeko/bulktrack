-- name: GetLatestWorkoutIDByMenu :one
SELECT w.id
FROM workouts w
JOIN menu_items mi ON w.menu_id = mi.menu_id AND w.user_id = sqlc.arg(user_id) -- 結合条件修正の可能性あり
WHERE mi.menu_id = sqlc.arg(menu_id) AND w.user_id = sqlc.arg(user_id)
ORDER BY w.started_at DESC
LIMIT 1;

-- name: ListSetsByWorkoutAndExercises :many
SELECT
    s.exercise_id,
    e.name AS exercise_name,
    s.set_order,
    s.weight_kg,
    s.reps,
    s.rir,
    s.rpe,
    w.started_at
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
JOIN workouts w ON s.workout_id = w.id
WHERE s.workout_id = sqlc.arg(workout_id)
  AND s.exercise_id = ANY(sqlc.arg(exercise_ids)::uuid[]) -- exercise_ids はメニューに含まれる種目IDの配列
ORDER BY s.exercise_id, s.set_order;

-- name: ListLatestSetsByMenu :many
-- ... (既存のクエリはコメントアウトまたは削除、あるいは別名で残す) ...
-- SELECT DISTINCT ON (mi.exercise_id)
--     e.id as exercise_id,
--     e.name as exercise_name,
--     s.weight_kg,
--     s.reps,
--     s.rir,
--     s.rpe,
--     w.started_at
-- FROM menu_items mi
-- JOIN exercises e ON mi.exercise_id = e.id
-- LEFT JOIN sets s ON s.exercise_id = mi.exercise_id
-- LEFT JOIN workouts w ON w.id = s.workout_id
-- WHERE mi.menu_id = sqlc.arg(menu_id)
--   AND w.user_id = sqlc.arg(user_id)
-- ORDER BY mi.exercise_id, w.started_at DESC, s.set_order;
