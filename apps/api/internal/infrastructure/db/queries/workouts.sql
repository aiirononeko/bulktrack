-- name: GetWorkout :one
SELECT * FROM workouts
WHERE id = $1 LIMIT 1;

-- name: ListWorkoutsByUser :many
SELECT * FROM workouts
WHERE user_id = $1
ORDER BY started_at DESC;

-- name: CreateWorkout :one
INSERT INTO workouts (
  user_id, menu_id, note
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: UpdateWorkoutNote :one
UPDATE workouts
SET note = $2
WHERE id = $1
RETURNING *;

-- name: DeleteWorkout :exec
DELETE FROM workouts
WHERE id = $1;
