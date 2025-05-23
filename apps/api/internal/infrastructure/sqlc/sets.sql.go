// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0
// source: sets.sql

package sqlc

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const createSet = `-- name: CreateSet :one
INSERT INTO sets (
  workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe
`

type CreateSetParams struct {
	WorkoutID  pgtype.UUID    `json:"workout_id"`
	ExerciseID pgtype.UUID    `json:"exercise_id"`
	SetOrder   int32          `json:"set_order"`
	WeightKg   pgtype.Numeric `json:"weight_kg"`
	Reps       int32          `json:"reps"`
	Rir        pgtype.Numeric `json:"rir"`
	Rpe        pgtype.Numeric `json:"rpe"`
}

func (q *Queries) CreateSet(ctx context.Context, arg CreateSetParams) (Set, error) {
	row := q.db.QueryRow(ctx, createSet,
		arg.WorkoutID,
		arg.ExerciseID,
		arg.SetOrder,
		arg.WeightKg,
		arg.Reps,
		arg.Rir,
		arg.Rpe,
	)
	var i Set
	err := row.Scan(
		&i.ID,
		&i.WorkoutID,
		&i.ExerciseID,
		&i.SetOrder,
		&i.WeightKg,
		&i.Reps,
		&i.Rir,
		&i.Rpe,
	)
	return i, err
}

const deleteSet = `-- name: DeleteSet :exec
DELETE FROM sets
WHERE id = $1
`

func (q *Queries) DeleteSet(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteSet, id)
	return err
}

const getSet = `-- name: GetSet :one
SELECT id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe FROM sets
WHERE id = $1 LIMIT 1
`

func (q *Queries) GetSet(ctx context.Context, id uuid.UUID) (Set, error) {
	row := q.db.QueryRow(ctx, getSet, id)
	var i Set
	err := row.Scan(
		&i.ID,
		&i.WorkoutID,
		&i.ExerciseID,
		&i.SetOrder,
		&i.WeightKg,
		&i.Reps,
		&i.Rir,
		&i.Rpe,
	)
	return i, err
}

const listSetsByWorkout = `-- name: ListSetsByWorkout :many
SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name, s.set_order, s.weight_kg, s.reps, s.rir, s.rpe
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_id = $1
ORDER BY s.set_order
`

type ListSetsByWorkoutRow struct {
	ID           uuid.UUID      `json:"id"`
	WorkoutID    pgtype.UUID    `json:"workout_id"`
	ExerciseID   pgtype.UUID    `json:"exercise_id"`
	ExerciseName string         `json:"exercise_name"`
	SetOrder     int32          `json:"set_order"`
	WeightKg     pgtype.Numeric `json:"weight_kg"`
	Reps         int32          `json:"reps"`
	Rir          pgtype.Numeric `json:"rir"`
	Rpe          pgtype.Numeric `json:"rpe"`
}

func (q *Queries) ListSetsByWorkout(ctx context.Context, workoutID pgtype.UUID) ([]ListSetsByWorkoutRow, error) {
	rows, err := q.db.Query(ctx, listSetsByWorkout, workoutID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ListSetsByWorkoutRow{}
	for rows.Next() {
		var i ListSetsByWorkoutRow
		if err := rows.Scan(
			&i.ID,
			&i.WorkoutID,
			&i.ExerciseID,
			&i.ExerciseName,
			&i.SetOrder,
			&i.WeightKg,
			&i.Reps,
			&i.Rir,
			&i.Rpe,
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

const updateSet = `-- name: UpdateSet :one
UPDATE sets
SET weight_kg = $2, reps = $3, rir = $4, rpe = $5
WHERE id = $1
RETURNING id, workout_id, exercise_id, set_order, weight_kg, reps, rir, rpe
`

type UpdateSetParams struct {
	ID       uuid.UUID      `json:"id"`
	WeightKg pgtype.Numeric `json:"weight_kg"`
	Reps     int32          `json:"reps"`
	Rir      pgtype.Numeric `json:"rir"`
	Rpe      pgtype.Numeric `json:"rpe"`
}

func (q *Queries) UpdateSet(ctx context.Context, arg UpdateSetParams) (Set, error) {
	row := q.db.QueryRow(ctx, updateSet,
		arg.ID,
		arg.WeightKg,
		arg.Reps,
		arg.Rir,
		arg.Rpe,
	)
	var i Set
	err := row.Scan(
		&i.ID,
		&i.WorkoutID,
		&i.ExerciseID,
		&i.SetOrder,
		&i.WeightKg,
		&i.Reps,
		&i.Rir,
		&i.Rpe,
	)
	return i, err
}
