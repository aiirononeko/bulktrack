module github.com/aiirononeko/bulktrack/apps/api

go 1.24

require (
	github.com/google/uuid v1.6.0
	github.com/jackc/pgx/v5 v5.5.5
)

require (
	github.com/clerk/clerk-sdk-go/v2 v2.3.1 // indirect
	github.com/go-jose/go-jose/v3 v3.0.3 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20221227161230-091c0ba34f0a // indirect
	github.com/jackc/puddle/v2 v2.2.1 // indirect
	golang.org/x/crypto v0.22.0 // indirect
	golang.org/x/sync v0.7.0 // indirect
	golang.org/x/text v0.16.0 // indirect
)

// TODO: go mod graph | grep 'google.golang.org/genproto@v0.0.0-'を実行して最新化する
replace google.golang.org/genproto => google.golang.org/genproto/googleapis/api v0.0.0-20250106144421-5f5ef82da422
