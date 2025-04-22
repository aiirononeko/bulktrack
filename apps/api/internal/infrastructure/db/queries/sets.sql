-- name: GetSet :one
SELECT id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe FROM sets
WHERE id = $1 LIMIT 1;

-- name: ListSetsByWorkout :many
SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name, s.set_order, s.weight_kg, s.reps, s.rir, s.rpe
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_id = $1
ORDER BY s.set_order;

-- name: CreateSet :one
INSERT INTO sets (
  workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe;

-- name: UpdateSet :one
UPDATE sets
SET weight_kg = $2, reps = $3, rir = $4, rpe = $5
WHERE id = $1
RETURNING id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe;

-- name: DeleteSet :exec
DELETE FROM sets
WHERE id = $1;
