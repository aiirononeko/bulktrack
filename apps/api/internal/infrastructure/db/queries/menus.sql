-- name: GetMenu :one
SELECT * FROM menus
WHERE id = $1 LIMIT 1;

-- name: ListMenusByUser :many
SELECT * FROM menus
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: CreateMenu :one
INSERT INTO menus (
  user_id, name
) VALUES (
  $1, $2
)
RETURNING *;

-- name: UpdateMenu :one
UPDATE menus
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteMenu :exec
DELETE FROM menus
WHERE id = $1;
