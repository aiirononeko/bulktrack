-- name: GetSet :one
SELECT * FROM sets
WHERE id = $1 LIMIT 1;

-- name: ListSetsByWorkout :many
SELECT * FROM sets
WHERE workout_id = $1
ORDER BY set_order;

-- name: CreateSet :one
INSERT INTO sets (
  workout_id, exercise, set_order, weight_kg, reps, rpe
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: UpdateSet :one
UPDATE sets
SET weight_kg = $2, reps = $3, rpe = $4
WHERE id = $1
RETURNING *;

-- name: DeleteSet :exec
DELETE FROM sets
WHERE id = $1;
