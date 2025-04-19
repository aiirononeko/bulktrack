-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY created_at DESC;

-- name: CreateUser :one
INSERT INTO users (
  email, nickname
) VALUES (
  $1, $2
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET nickname = $2
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
