-- name: ListLatestSetsByMenu :many
SELECT DISTINCT ON (mi.exercise_id)
    e.id as exercise_id, 
    e.name as exercise_name,
    s.weight_kg,
    s.reps,
    s.rir,
    s.rpe,
    w.started_at
FROM menu_items mi
JOIN exercises e ON mi.exercise_id = e.id
LEFT JOIN sets s ON s.exercise_id = mi.exercise_id
LEFT JOIN workouts w ON w.id = s.workout_id
WHERE mi.menu_id = sqlc.arg(menu_id)
  AND w.user_id = sqlc.arg(user_id)
ORDER BY mi.exercise_id, w.started_at DESC, s.set_order;
