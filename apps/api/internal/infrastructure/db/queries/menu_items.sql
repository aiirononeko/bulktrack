-- name: CreateMenuItem :one
INSERT INTO menu_items (
  menu_id, exercise, set_order, planned_reps
) VALUES (
  $1, $2, $3, $4
)
RETURNING id, menu_id, exercise, set_order, planned_reps;

-- name: GetMenuItem :one
SELECT id, menu_id, exercise, set_order, planned_reps FROM menu_items
WHERE id = $1 LIMIT 1;

-- name: ListMenuItemsByMenu :many
SELECT id, menu_id, exercise, set_order, planned_reps FROM menu_items
WHERE menu_id = $1
ORDER BY set_order;

-- name: UpdateMenuItem :one
UPDATE menu_items
SET exercise = $2, planned_reps = $3
WHERE id = $1
RETURNING id, menu_id, exercise, set_order, planned_reps;

-- name: DeleteMenuItem :exec
DELETE FROM menu_items
WHERE id = $1;
