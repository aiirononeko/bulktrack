-- name: GetMenu :one
SELECT id, user_id, name, description, created_at
FROM menus
WHERE id = $1 LIMIT 1;

-- name: ListMenusByUser :many
SELECT id, user_id, name, description, created_at
FROM menus
WHERE user_id = sqlc.arg(user_id)::text
ORDER BY created_at DESC;

-- name: CreateMenu :one
INSERT INTO menus (
  user_id, name, description
) VALUES (
  sqlc.arg(user_id)::text, sqlc.arg(name), sqlc.narg(description)
)
RETURNING *;

-- name: UpdateMenu :one
UPDATE menus
SET
  name = sqlc.arg(name),
  description = sqlc.narg(description)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteMenu :exec
DELETE FROM menus
WHERE id = $1;
