module github.com/aiirononeko/bulktrack/apps/api

go 1.24.0

require github.com/jackc/pgx/v5 v5.7.2

require (
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/stretchr/testify v1.10.0 // indirect
	golang.org/x/crypto v0.36.0 // indirect
	golang.org/x/sync v0.12.0 // indirect
	golang.org/x/text v0.23.0 // indirect
)

// TODO: go mod graph | grep 'google.golang.org/genproto@v0.0.0-'を実行して最新化する
replace google.golang.org/genproto => google.golang.org/genproto/googleapis/api v0.0.0-20250106144421-5f5ef82da422
