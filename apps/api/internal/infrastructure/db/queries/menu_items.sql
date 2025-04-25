-- name: CreateMenuItem :one
INSERT INTO menu_items (
  menu_id, exercise_id, set_order, planned_sets, planned_reps, planned_interval_seconds
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING id, menu_id, exercise_id, set_order, planned_sets, planned_reps, planned_interval_seconds;

-- name: GetMenuItem :one
SELECT id, menu_id, exercise_id, set_order, planned_sets, planned_reps, planned_interval_seconds FROM menu_items
WHERE id = $1 LIMIT 1;

-- name: ListMenuItemsByMenu :many
SELECT mi.id, mi.menu_id, mi.exercise_id, e.name as exercise_name, mi.set_order, mi.planned_sets, mi.planned_reps, mi.planned_interval_seconds 
FROM menu_items mi
JOIN exercises e ON mi.exercise_id = e.id
WHERE mi.menu_id = $1
ORDER BY mi.set_order;

-- name: UpdateMenuItem :one
UPDATE menu_items
SET exercise_id = $2, planned_sets = $3, planned_reps = $4, planned_interval_seconds = $5
WHERE id = $1
RETURNING id, menu_id, exercise_id, set_order, planned_sets, planned_reps, planned_interval_seconds;

-- name: DeleteMenuItem :exec
DELETE FROM menu_items
WHERE id = $1;

-- name: DeleteMenuItems :exec
DELETE FROM menu_items
WHERE menu_id = $1;
