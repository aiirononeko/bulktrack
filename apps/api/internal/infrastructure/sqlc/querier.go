// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0

package sqlc

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Querier interface {
	CreateMenu(ctx context.Context, arg CreateMenuParams) (Menu, error)
	CreateSet(ctx context.Context, arg CreateSetParams) (Set, error)
	CreateUser(ctx context.Context, arg CreateUserParams) (User, error)
	CreateWorkout(ctx context.Context, arg CreateWorkoutParams) (Workout, error)
	DeleteMenu(ctx context.Context, id uuid.UUID) error
	DeleteSet(ctx context.Context, id uuid.UUID) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
	DeleteWorkout(ctx context.Context, id uuid.UUID) error
	GetMenu(ctx context.Context, id uuid.UUID) (Menu, error)
	GetSet(ctx context.Context, id uuid.UUID) (Set, error)
	GetUser(ctx context.Context, id uuid.UUID) (User, error)
	GetWorkout(ctx context.Context, id uuid.UUID) (Workout, error)
	ListMenusByUser(ctx context.Context, userID pgtype.UUID) ([]Menu, error)
	ListSetsByWorkout(ctx context.Context, workoutID pgtype.UUID) ([]Set, error)
	ListUsers(ctx context.Context) ([]User, error)
	ListWorkoutsByUser(ctx context.Context, userID pgtype.UUID) ([]Workout, error)
	UpdateMenu(ctx context.Context, arg UpdateMenuParams) (Menu, error)
	UpdateSet(ctx context.Context, arg UpdateSetParams) (Set, error)
	UpdateUser(ctx context.Context, arg UpdateUserParams) (User, error)
	UpdateWorkoutNote(ctx context.Context, arg UpdateWorkoutNoteParams) (Workout, error)
}

var _ Querier = (*Queries)(nil)
