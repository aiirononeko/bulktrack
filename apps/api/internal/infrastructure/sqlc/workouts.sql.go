// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0
// source: workouts.sql

package sqlc

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const createWorkout = `-- name: CreateWorkout :one
INSERT INTO workouts (
  user_id, menu_id, note
) VALUES (
  $1::text, $2, $3
)
RETURNING id, user_id, menu_id, started_at, note
`

type CreateWorkoutParams struct {
	UserID string      `json:"user_id"`
	MenuID pgtype.UUID `json:"menu_id"`
	Note   pgtype.Text `json:"note"`
}

func (q *Queries) CreateWorkout(ctx context.Context, arg CreateWorkoutParams) (Workout, error) {
	row := q.db.QueryRow(ctx, createWorkout, arg.UserID, arg.MenuID, arg.Note)
	var i Workout
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.MenuID,
		&i.StartedAt,
		&i.Note,
	)
	return i, err
}

const deleteWorkout = `-- name: DeleteWorkout :exec
DELETE FROM workouts
WHERE id = $1
`

func (q *Queries) DeleteWorkout(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteWorkout, id)
	return err
}

const getWorkout = `-- name: GetWorkout :one
SELECT id, user_id, menu_id, started_at, note FROM workouts
WHERE id = $1 LIMIT 1
`

func (q *Queries) GetWorkout(ctx context.Context, id uuid.UUID) (Workout, error) {
	row := q.db.QueryRow(ctx, getWorkout, id)
	var i Workout
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.MenuID,
		&i.StartedAt,
		&i.Note,
	)
	return i, err
}

const listWorkoutsByUser = `-- name: ListWorkoutsByUser :many
SELECT id, user_id, menu_id, started_at, note FROM workouts
WHERE user_id = $1::text
ORDER BY started_at DESC
`

func (q *Queries) ListWorkoutsByUser(ctx context.Context, userID string) ([]Workout, error) {
	rows, err := q.db.Query(ctx, listWorkoutsByUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Workout{}
	for rows.Next() {
		var i Workout
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.MenuID,
			&i.StartedAt,
			&i.Note,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateWorkoutNote = `-- name: UpdateWorkoutNote :one
UPDATE workouts
SET note = $2
WHERE id = $1
RETURNING id, user_id, menu_id, started_at, note
`

type UpdateWorkoutNoteParams struct {
	ID   uuid.UUID   `json:"id"`
	Note pgtype.Text `json:"note"`
}

func (q *Queries) UpdateWorkoutNote(ctx context.Context, arg UpdateWorkoutNoteParams) (Workout, error) {
	row := q.db.QueryRow(ctx, updateWorkoutNote, arg.ID, arg.Note)
	var i Workout
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.MenuID,
		&i.StartedAt,
		&i.Note,
	)
	return i, err
}
