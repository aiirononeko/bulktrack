-- Migration to create weekly_volume table for aggregated training volume data
-- This table will store pre-calculated weekly volume data to optimize dashboard performance

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create weekly_volume table for storing aggregated weekly training data
CREATE TABLE weekly_volumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    week_start_date DATE NOT NULL, -- Monday 00:00 JST of the week
    total_volume NUMERIC(10,2) NOT NULL DEFAULT 0, -- Sum of weight_kg * reps for all sets in the week
    est_one_rm NUMERIC(10,2), -- Estimated 1RM based on the week's best performance
    exercise_count INTEGER NOT NULL DEFAULT 0, -- Number of unique exercises performed in the week
    set_count INTEGER NOT NULL DEFAULT 0, -- Total number of sets performed in the week
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, week_start_date)
);

-- Create index for faster queries by user_id and date range
CREATE INDEX idx_weekly_volumes_user_date ON weekly_volumes (user_id, week_start_date);

-- Create function to calculate the start of the week (Monday) in JST timezone for any given timestamp
CREATE OR REPLACE FUNCTION get_jst_week_start(timestamp_value TIMESTAMPTZ) 
RETURNS DATE AS $$
BEGIN
    -- Convert to JST timezone, truncate to day, then find the Monday of that week
    RETURN date_trunc('week', timestamp_value AT TIME ZONE 'Asia/Tokyo')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update weekly_volumes when a new set is added or updated
CREATE OR REPLACE FUNCTION update_weekly_volume() 
RETURNS TRIGGER AS $$
DECLARE
    workout_start TIMESTAMPTZ;
    workout_user_id TEXT;
    week_start DATE;
BEGIN
    -- Get workout information
    SELECT started_at, user_id INTO workout_start, workout_user_id
    FROM workouts
    WHERE id = NEW.workout_id;
    
    -- Calculate the week start date in JST
    week_start := get_jst_week_start(workout_start);
    
    -- Update or insert weekly volume record
    INSERT INTO weekly_volumes (
        user_id, 
        week_start_date, 
        total_volume,
        est_one_rm,
        exercise_count,
        set_count
    )
    VALUES (
        workout_user_id,
        week_start,
        (NEW.weight_kg * NEW.reps),
        (NEW.weight_kg * (1 + NEW.reps / 30.0)), -- Simple Epley formula for 1RM estimation
        1,
        1
    )
    ON CONFLICT (user_id, week_start_date) DO UPDATE
    SET 
        total_volume = weekly_volumes.total_volume + (NEW.weight_kg * NEW.reps),
        est_one_rm = GREATEST(weekly_volumes.est_one_rm, (NEW.weight_kg * (1 + NEW.reps / 30.0))),
        exercise_count = (
            SELECT COUNT(DISTINCT exercise_id) 
            FROM sets s
            JOIN workouts w ON s.workout_id = w.id
            WHERE w.user_id = workout_user_id
            AND get_jst_week_start(w.started_at) = week_start
        ),
        set_count = weekly_volumes.set_count + 1,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update weekly_volumes when a new set is inserted
CREATE TRIGGER after_set_insert
AFTER INSERT ON sets
FOR EACH ROW
EXECUTE FUNCTION update_weekly_volume();

-- Create function to recalculate weekly volume when a set is deleted
CREATE OR REPLACE FUNCTION recalculate_weekly_volume_after_delete() 
RETURNS TRIGGER AS $$
DECLARE
    workout_start TIMESTAMPTZ;
    workout_user_id TEXT;
    week_start DATE;
    new_total_volume NUMERIC(10,2);
    new_est_one_rm NUMERIC(10,2);
    new_exercise_count INTEGER;
    new_set_count INTEGER;
BEGIN
    -- Get workout information
    SELECT started_at, user_id INTO workout_start, workout_user_id
    FROM workouts
    WHERE id = OLD.workout_id;
    
    -- Calculate the week start date in JST
    week_start := get_jst_week_start(workout_start);
    
    -- Recalculate total volume for the week
    SELECT COALESCE(SUM(weight_kg * reps), 0) INTO new_total_volume
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Recalculate estimated 1RM for the week
    SELECT COALESCE(MAX(weight_kg * (1 + reps / 30.0)), 0) INTO new_est_one_rm
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Count unique exercises for the week
    SELECT COUNT(DISTINCT exercise_id) INTO new_exercise_count
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Count total sets for the week
    SELECT COUNT(*) INTO new_set_count
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Update weekly volume record
    UPDATE weekly_volumes
    SET 
        total_volume = new_total_volume,
        est_one_rm = new_est_one_rm,
        exercise_count = new_exercise_count,
        set_count = new_set_count,
        updated_at = now()
    WHERE user_id = workout_user_id
    AND week_start_date = week_start;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to recalculate weekly_volumes when a set is deleted
CREATE TRIGGER after_set_delete
AFTER DELETE ON sets
FOR EACH ROW
EXECUTE FUNCTION recalculate_weekly_volume_after_delete();

-- Create function to recalculate weekly volume when a set is updated
CREATE OR REPLACE FUNCTION recalculate_weekly_volume_after_update() 
RETURNS TRIGGER AS $$
DECLARE
    workout_start TIMESTAMPTZ;
    workout_user_id TEXT;
    week_start DATE;
    new_total_volume NUMERIC(10,2);
    new_est_one_rm NUMERIC(10,2);
BEGIN
    -- Get workout information
    SELECT started_at, user_id INTO workout_start, workout_user_id
    FROM workouts
    WHERE id = NEW.workout_id;
    
    -- Calculate the week start date in JST
    week_start := get_jst_week_start(workout_start);
    
    -- Recalculate total volume for the week
    SELECT COALESCE(SUM(weight_kg * reps), 0) INTO new_total_volume
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Recalculate estimated 1RM for the week
    SELECT COALESCE(MAX(weight_kg * (1 + reps / 30.0)), 0) INTO new_est_one_rm
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = workout_user_id
    AND get_jst_week_start(w.started_at) = week_start;
    
    -- Update weekly volume record
    UPDATE weekly_volumes
    SET 
        total_volume = new_total_volume,
        est_one_rm = new_est_one_rm,
        updated_at = now()
    WHERE user_id = workout_user_id
    AND week_start_date = week_start;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to recalculate weekly_volumes when a set is updated
CREATE TRIGGER after_set_update
AFTER UPDATE ON sets
FOR EACH ROW
EXECUTE FUNCTION recalculate_weekly_volume_after_update();

-- Create a function to populate historical data
CREATE OR REPLACE FUNCTION populate_weekly_volumes() 
RETURNS void AS $$
BEGIN
    -- Clear existing data
    DELETE FROM weekly_volumes;
    
    -- Insert aggregated data for all weeks
    INSERT INTO weekly_volumes (
        user_id,
        week_start_date,
        total_volume,
        est_one_rm,
        exercise_count,
        set_count
    )
    SELECT 
        w.user_id,
        get_jst_week_start(w.started_at) AS week_start_date,
        SUM(s.weight_kg * s.reps) AS total_volume,
        MAX(s.weight_kg * (1 + s.reps / 30.0)) AS est_one_rm,
        COUNT(DISTINCT s.exercise_id) AS exercise_count,
        COUNT(s.id) AS set_count
    FROM workouts w
    JOIN sets s ON w.id = s.workout_id
    GROUP BY w.user_id, week_start_date;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate historical data
SELECT populate_weekly_volumes();