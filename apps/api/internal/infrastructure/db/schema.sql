-- Schema definition for BulkTrack

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- training menus
CREATE TABLE menus (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
);

-- menu_items: planned sets per menu
CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id     UUID REFERENCES menus(id) ON DELETE CASCADE,
  exercise    TEXT NOT NULL,
  set_order   INT  NOT NULL,
  planned_reps INT,
  UNIQUE (menu_id, set_order)
);

-- workouts (actual sessions)
CREATE TABLE workouts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  menu_id      UUID REFERENCES menus(id),
  started_at   TIMESTAMPTZ DEFAULT now(),
  note         TEXT
);

-- sets (actual performance)
CREATE TABLE sets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id  UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise    TEXT NOT NULL,
  set_order   INT  NOT NULL,
  weight_kg   NUMERIC(5,2) NOT NULL,
  reps        INT NOT NULL,
  rpe         NUMERIC(3,1),
  UNIQUE (workout_id, set_order)
);

-- weekly summary (materialized view)
CREATE MATERIALIZED VIEW weekly_summaries AS
SELECT
  user_id,
  date_trunc('week', w.started_at)::date AS week,
  SUM(weight_kg * reps)              AS total_volume,
  MAX(weight_kg * (1 + reps / 30.0)) AS est_1rm
FROM workouts w
JOIN sets s ON s.workout_id = w.id
GROUP BY user_id, week;
