-- name: GetWeeklySummary :one
SELECT * FROM weekly_summaries
WHERE user_id = $1 AND week = date_trunc('week', $2::date)::date
LIMIT 1;

-- name: ListWeeklySummaries :many
SELECT * FROM weekly_summaries
WHERE user_id = $1
ORDER BY week DESC
LIMIT $2;

-- name: RefreshWeeklySummaries :exec
REFRESH MATERIALIZED VIEW weekly_summaries;
