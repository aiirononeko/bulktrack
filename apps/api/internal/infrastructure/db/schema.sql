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

-- 部位マスター
CREATE TABLE muscle_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL
);

-- 種目マスター
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    main_target_muscle_group_id UUID REFERENCES muscle_groups(id),
    is_custom BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 種目とサブターゲット部位の中間テーブル
CREATE TABLE exercise_target_muscle_groups (
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID REFERENCES muscle_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

-- training menus
CREATE TABLE menus (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
);

-- menu_items: planned sets per menu (修正後)
CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id     UUID REFERENCES menus(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT, -- exercise TEXT NOT NULL から変更
  set_order   INT  NOT NULL,
  planned_sets INT, -- 追加
  planned_reps INT,
  planned_interval_seconds INT, -- 追加
  UNIQUE (menu_id, set_order)
);

-- workouts (actual sessions)
CREATE TABLE workouts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  menu_id      UUID REFERENCES menus(id), -- NULL許可（フリーワークアウトの場合）
  started_at   TIMESTAMPTZ DEFAULT now(),
  note         TEXT
);

-- sets (actual performance)
CREATE TABLE sets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id  UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT, -- exercise TEXT NOT NULL から変更
  set_order   INT  NOT NULL,
  weight_kg   NUMERIC(5,2) NOT NULL,
  reps        INT NOT NULL,
  rir         NUMERIC(3,1), -- デフォルトで使用 (Nullable)
  rpe         NUMERIC(3,1), -- 選択的に使用 (Nullable)
  UNIQUE (workout_id, set_order)
);

-- weekly summary (materialized view) - TODO: 修正が必要になる可能性
-- CREATE MATERIALIZED VIEW weekly_summaries AS
-- SELECT
--   user_id,
--   date_trunc('week', w.started_at)::date AS week,
--   SUM(weight_kg * reps)              AS total_volume,
--   MAX(weight_kg * (1 + reps / 30.0)) AS est_1rm -- 計算式は例
-- FROM workouts w
-- JOIN sets s ON s.workout_id = w.id
-- GROUP BY user_id, week;
