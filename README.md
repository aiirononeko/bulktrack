# BulkTrack – モノレポ概要

## 1. BulkTrack とは？

BulkTrack は **TypeScript + Go** で構成されたフルスタック個人開発プロジェクトです。

* **フロントエンド** – React Router v7 (Framework Mode) を **Cloudflare Workers** 上で SSR
* **バックエンド** – Go 1.24 製 REST API を **Fly.io** にデプロイ
* **データベース** – **Neon (PostgreSQL)**
* **モノレポ管理** – **pnpm Workspaces** と **Go Workspace (`go.work`)**

---

## 2. ハイレベルアーキテクチャ

```text
┌──────────────────────────┐          ┌───────────────────────────┐
│  Cloudflare Workers      │  fetch   │   Fly.io  (Go API)        │
│  └── React Router v7 SSR ├─────────►│  └── Neon Serverless PG   │
└────────────┬─────────────┘          └───────────────────────────┘
             │                             (TCP, pgwire, TLS)
             ▼
      Cloudflare Pages ✧ CDN
```

---

## 3. コードベース構成

### 3.1 モノレポ構造

```text
/
├─ apps/
│   ├─ web/                  # React Router v7 + Workers
│   │   ├─ src/
│   │   ├─ public/
│   │   └─ wrangler.toml
│   └─ api/                  # Go + Fly.io
│       ├─ cmd/server/       # main.go (エントリポイント)
│       ├─ internal/         # ドメイン層・DB 層
│       ├─ go.mod
│       └─ Dockerfile
├─ packages/                 # 共有ライブラリ
│   ├─ ts-utils/             # TypeScript ヘルパー / API クライアント
│   └─ go-shared/            # Go ドメインモデル / DTO
├─ infra/                    # IaC (Terraform など)
│   └─ cloudrun.tf
├─ scripts/                  # Makefile / Taskfile / lint スクリプト
├─ pnpm-workspace.yaml       # pnpm ワークスペース定義
├─ go.work                   # Go ≥ 1.22 ワークスペース
├─ fly.toml                  # Fly.io 設定ファイル
└─ .github/workflows/        # CI/CD
```

### 3.2 Go バックエンド: DDD + レイヤード構成

```
apps/
└─ api/                         # Go バックエンド (独立 go.mod)
   ├─ cmd/                      # エントリポイント
   │   └─ server/
   │       └─ main.go
   ├─ internal/
   │   ├─ domain/              # ≒ エンタープライズ層
   │   │   ├─ training/
   │   │   │   ├─ model.go     # エンティティ & VO
   │   │   │   ├─ service.go   # ドメインサービス (集約横断)
   │   │   │   └─ errors.go
   │   │   └─ common/
   │   ├─ application/         # ユースケース層
   │   │   ├─ dto/             # 入出力 DTO (query, command)
   │   │   ├─ usecase/         # インターフェース
   │   │   └─ service/         # 実装 (orchestrator)
   │   ├─ infrastructure/      # DB / 外部 API 実装
   │   │   ├─ persistence/
   │   │   │   ├─ sqlc/        # 自動生成コード
   │   │   │   └─ training_repo.go
   │   │   └─ db/              # スキーマとSQL
   │   │       ├─ schema.sql   # データベーススキーマ定義
   │   │       └─ queries/     # SQLCクエリ
   │   └─ interfaces/          # プレゼンテーション層
   │       └─  http/
   │           ├─ handler/     # echo / chi など
   │           └─ middleware/
   ├─ pkg/                     # 共通ユーティリティ (公開可)
   ├─ test/                    # e2e / integration
   ├─ sqlc.yaml                # sqlc 設定
   └─ Dockerfile
```

* **依存方向**: `interfaces → application → domain` と `infrastructure → application`（DI）
- Circular 依存を避けるため、domain は他層に import しない
- application から infrastructure へは インターフェース逆依存 (DI)
      - 例: TrainingRepository インタフェースは application に置き、実装は infrastructure/persistence
* DB アクセスは **sqlc** を使用して型安全なコードを生成

---

## 4. データベーススキーマ（PostgreSQL）とSQLCによる管理

### 4.1 データベーススキーマ

```sql
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
```

### 4.2 スキーマ管理とデータアクセス

データベーススキーマ管理は「スキーマファーストアプローチ」を採用しています：

1. **単一の真実源**: `internal/infrastructure/db/schema.sql` ファイルが唯一の真実源（Single Source of Truth）
2. **型安全なコード生成**: スキーマとSQLクエリから型安全なGoコードを自動生成
3. **直接適用**: スキーマはデータベースに直接適用され、データベースの状態を正確に反映

#### SQLCの設定と使用方法

SQLCは次の設定で使用しています：

```yaml
# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    schema: "internal/infrastructure/db/schema.sql"
    queries: "internal/infrastructure/db/queries"
    gen:
      go:
        package: "sqlc"
        out: "internal/infrastructure/sqlc"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_interface: true
        emit_empty_slices: true
        overrides:
          - db_type: "uuid"
            go_type: "github.com/google/uuid.UUID"
          - db_type: "timestamptz"
            go_type: "time.Time"
```

重要なポイント：
- `sql_package: "pgx/v5"` - PostgreSQLドライバとしてpgx/v5を使用
- UUIDとTimestamp型の適切なマッピングを設定
- インターフェースを生成するように設定（リポジトリパターン用）

#### コンパイルエラーを回避するための設定

SQLCで生成されたコードが正しくコンパイルされるために：

1. **必要な依存関係**: 以下のパッケージを`go.mod`に追加してください
   ```
   github.com/google/uuid
   github.com/jackc/pgx/v5
   ```

2. **スキーマファイル**: UUIDの使用には`uuid-ossp`拡張が必要
   ```sql
   -- 必ずスキーマファイルの先頭に追加
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

3. **生成後の確認**: コード生成後は試験的にビルドして依存関係を確認
   ```bash
   # コンパイルエラーがないか確認
   cd apps/api
   go build ./...
   ```

#### スキーマ更新ワークフロー

```bash
# 1. schema.sqlファイルを更新
# これが唯一の真実源（Single Source of Truth）

# 2. SQLCでコード生成
cd apps/api
sqlc generate

# 3. コンパイルに問題がないか確認
go build ./...

# 4. 生成されたコードを使ってリポジトリ実装
# internal/infrastructure/sqlc/ に生成されたコードを利用
```

#### データベース初期化と更新

```bash
# データベースへの適用（.envファイルから接続情報を読み込む例）
cd apps/api
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql
```

---

## 5. 前提ツール

* **Node.js** ≥ 20 + **pnpm** ≥ 9
* **Go** ≥ 1.22
* **Docker**
* **flyctl CLI** (認証済み)
* **wrangler CLI**
* **sqlc CLI**
* **psql** (PostgreSQLクライアント)

---

## 6. ローカル開発

### 6.1 フロントエンド (Workers)

```bash
pnpm --filter web dev   # wrangler dev --remote で HMR
```

### 6.2 バックエンド (Go API)

```bash
cd apps/api
# .envファイルから環境変数を読み込む
source .env
go run ./cmd/server
```

### 6.3 データベース操作

#### 初期セットアップ

```bash
# .envファイルの準備（.env.exampleをコピーして編集）
cp apps/api/.env.example apps/api/.env
# エディタで.envを開き、実際の接続情報を設定する
vi apps/api/.env

# スキーマ適用
cd apps/api
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql

# コード生成
sqlc generate
```

#### スキーマ更新時

```bash
# スキーマを更新した後
cd apps/api
# コード再生成
sqlc generate
# データベースに反映
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql
```

---

## 7. デプロイ手順

### 7.1 API – Fly.io

```bash
# プロジェクトルートから実行
./scripts/deploy-api.sh

# または、詳細設定する場合
cd apps/api
flyctl deploy --dockerfile ./Dockerfile
```

### 7.2 環境変数の設定

```bash
# データベース接続情報を設定
flyctl secrets set DATABASE_URL='postgres://user:password@host:port/dbname'
```

### 7.3 フロントエンド – Cloudflare Workers

```bash
cd apps/web
wrangler deploy
```

---

## 8. 環境変数

| 変数名 | 例 | 作用範囲 |
|--------|----|-----------|
| `DATABASE_URL` | `postgres://user:password@host:port/dbname` | Fly.io / ローカル開発 |
| `PORT` | `8080` (Fly.io が自動注入) | Fly.io |

---

## 9. よく使うコマンド

```bash
# 依存整理
go work sync && go mod tidy ./...
pnpm install

# テスト
go test ./...
pnpm test -r

# Lint
go vet ./...
pnpm -r lint

# Fly.io へのデプロイ
./scripts/deploy-api.sh

# Fly.io ログの確認
flyctl logs

# スキーマ関連
cd apps/api
sqlc generate                                        # クエリからコード生成
source .env && psql "$DATABASE_URL" \               # スキーマ適用（安全なパターン）
  -f internal/infrastructure/db/schema.sql
```
