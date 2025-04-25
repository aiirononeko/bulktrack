-- name: GetWeeklyVolumes :many
-- Get weekly volumes for a user for the specified number of weeks
-- Returns data for the last N weeks, filling in zeros for weeks with no data
SELECT 
    dates.week_start_date,
    COALESCE(wv.total_volume, 0) AS total_volume,
    COALESCE(wv.est_one_rm, 0) AS est_one_rm,
    COALESCE(wv.exercise_count, 0) AS exercise_count,
    COALESCE(wv.set_count, 0) AS set_count
FROM (
    -- Generate a series of dates for the last N weeks
    SELECT 
        generate_series(
            -- Start from N weeks ago (Monday)
            date_trunc('week', (CURRENT_DATE AT TIME ZONE 'Asia/Tokyo') - (sqlc.arg(weeks_count)::int * interval '1 week'))::date,
            -- End at current week (Monday)
            date_trunc('week', CURRENT_DATE AT TIME ZONE 'Asia/Tokyo')::date,
            -- Weekly interval
            interval '1 week'
        ) AS week_start_date
) dates
LEFT JOIN weekly_volumes wv ON 
    wv.week_start_date = dates.week_start_date AND 
    wv.user_id = sqlc.arg(user_id)::text
ORDER BY dates.week_start_date;

-- name: GetWeeklyVolumeForWeek :one
-- Get weekly volume for a specific user and week
SELECT 
    id,
    user_id,
    week_start_date,
    total_volume,
    est_one_rm,
    exercise_count,
    set_count,
    created_at,
    updated_at
FROM weekly_volumes
WHERE 
    user_id = sqlc.arg(user_id)::text AND 
    week_start_date = sqlc.arg(week_start_date)::date
LIMIT 1;

-- name: GetLatestWeeklyVolume :one
-- Get the most recent weekly volume for a user
SELECT 
    id,
    user_id,
    week_start_date,
    total_volume,
    est_one_rm,
    exercise_count,
    set_count,
    created_at,
    updated_at
FROM weekly_volumes
WHERE user_id = sqlc.arg(user_id)::text
ORDER BY week_start_date DESC
LIMIT 1;

-- name: GetWeeklyVolumeStats :one
-- Get statistics about weekly volumes for a user
SELECT 
    AVG(total_volume) AS avg_weekly_volume,
    MAX(total_volume) AS max_weekly_volume,
    MIN(total_volume) AS min_weekly_volume,
    MAX(est_one_rm) AS max_est_one_rm,
    AVG(exercise_count) AS avg_exercise_count,
    AVG(set_count) AS avg_set_count
FROM weekly_volumes
WHERE 
    user_id = sqlc.arg(user_id)::text AND
    week_start_date >= sqlc.arg(start_date)::date AND
    week_start_date <= sqlc.arg(end_date)::date;

-- name: RecalculateWeeklyVolume :exec
-- Manually recalculate weekly volume for a specific user and week
WITH volume_data AS (
    SELECT 
        w.user_id,
        get_jst_week_start(w.started_at) AS week_start_date,
        SUM(s.weight_kg * s.reps) AS total_volume,
        MAX(s.weight_kg * (1 + s.reps / 30.0)) AS est_one_rm,
        COUNT(DISTINCT s.exercise_id) AS exercise_count,
        COUNT(s.id) AS set_count
    FROM workouts w
    JOIN sets s ON w.id = s.workout_id
    WHERE 
        w.user_id = sqlc.arg(user_id)::text AND
        get_jst_week_start(w.started_at) = sqlc.arg(week_start_date)::date
    GROUP BY w.user_id, week_start_date
)
INSERT INTO weekly_volumes (
    user_id,
    week_start_date,
    total_volume,
    est_one_rm,
    exercise_count,
    set_count
)
SELECT 
    sqlc.arg(user_id)::text,
    sqlc.arg(week_start_date)::date,
    COALESCE(vd.total_volume, 0),
    COALESCE(vd.est_one_rm, 0),
    COALESCE(vd.exercise_count, 0),
    COALESCE(vd.set_count, 0)
FROM (SELECT 1) AS dummy
LEFT JOIN volume_data vd ON true
ON CONFLICT (user_id, week_start_date) 
DO UPDATE SET
    total_volume = EXCLUDED.total_volume,
    est_one_rm = EXCLUDED.est_one_rm,
    exercise_count = EXCLUDED.exercise_count,
    set_count = EXCLUDED.set_count,
    updated_at = now();

-- name: GetWeeklyVolumeByExercise :many
-- Get weekly volumes broken down by exercise for a specific user and week
SELECT 
    e.id AS exercise_id,
    e.name AS exercise_name,
    SUM(s.weight_kg * s.reps) AS total_volume,
    MAX(s.weight_kg * (1 + s.reps / 30.0)) AS est_one_rm,
    COUNT(s.id) AS set_count
FROM workouts w
JOIN sets s ON w.id = s.workout_id
JOIN exercises e ON s.exercise_id = e.id
WHERE 
    w.user_id = sqlc.arg(user_id)::text AND
    get_jst_week_start(w.started_at) = sqlc.arg(week_start_date)::date
GROUP BY e.id, e.name
ORDER BY total_volume DESC;

-- name: GetWeeklyVolumeByMuscleGroup :many
-- Get weekly volumes broken down by muscle group for a specific user and week
SELECT 
    mg.id AS muscle_group_id,
    mg.name AS muscle_group_name,
    SUM(s.weight_kg * s.reps) AS total_volume,
    COUNT(DISTINCT e.id) AS exercise_count,
    COUNT(s.id) AS set_count
FROM workouts w
JOIN sets s ON w.id = s.workout_id
JOIN exercises e ON s.exercise_id = e.id
JOIN exercise_target_muscle_groups etmg ON e.id = etmg.exercise_id
JOIN muscle_groups mg ON etmg.muscle_group_id = mg.id
WHERE 
    w.user_id = sqlc.arg(user_id)::text AND
    get_jst_week_start(w.started_at) = sqlc.arg(week_start_date)::date
GROUP BY mg.id, mg.name
ORDER BY total_volume DESC;