# BulkTrack – README

## 1. BulkTrack とは？

BulkTrack は **TypeScript + Go** を採用したフルスタック個人開発プロジェクトです。

| レイヤ | 技術スタック | デプロイ先 |
| ------ | ------------ | ---------- |
| フロントエンド | React Router v7 (Framework Mode)、Vite、Tailwind CSS | **Cloudflare Workers / Pages** |
| バックエンド | Go 1.24、Echo (REST)、sqlc | **Fly.io** |
| データベース | **Neon (PostgreSQL)** | ― |
| モノレポ管理 | **pnpm Workspaces** / **Go Workspace (`go.work`)** | ― |

目的は「筋トレ記録アプリ」を題材に、**型安全**・**スキーマファースト**・**Serverless** を同時に検証することです。

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

- **Edge SSR**: React Router v7 の *Framework Mode* を Workers 上でストリーミング SSR
- **API → DB**: Go API は Serverless PostgreSQL (Neon) と pgx/v5 で接続
- **ビルド**: Vite + Bun / Go Releaser を GitHub Actions で自動化

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
├─ scripts/                  # Makefile / Taskfile / lint スクリプト
├─ pnpm-workspace.yaml       # pnpm ワークスペース定義
├─ go.work                   # Go ≥ 1.22 ワークスペース
├─ fly.toml                  # Fly.io 設定ファイル
└─ .github/workflows/        # CI/CD
```

<details>
<summary>ディレクトリ詳細 (Goバージョン)</summary>

```text
apps/
└─ api/
   ├─ cmd/server/             # main.go
   ├─ internal/
   │   ├─ domain/             # エンタープライズ層
   │   │   └─ training/       # エンティティ / VO
   │   ├─ application/        # ユースケース層
   │   ├─ infrastructure/     # DB / API 実装 (sqlc)
   │   └─ interfaces/http/    # プレゼンテーション層
   └─ pkg/                    # 公開ユーティリティ
```

</details>

---

## 4. React Router v7 – 型安全なルーティング

BulkTrack では **typegen** 機能を有効化し、ルートパラメータやアクションの型を自動生成しています。

1. **初回のみ** `bunx react-router typegen` を実行
2. dev サーバー (`pnpm dev`) 起動中はファイル変更で自動再生成

```ts
// app/routes/users.$id/route.tsx
import type { Route } from "./+types/users.$id";

export async function loader({ params }: Route.LoaderArgs) {
  return fetch(`/api/users/${params.id}`).then((r) => r.json());
}
```

### tsconfig 設定

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler",   // ★ 重要 – Workers 環境で Node built‑ins を除外
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./*"]
    }
  }
}
```

> **Tips** Cloudflare Workers では `fs`, `path` など Node コアモジュールを import するとビルドに失敗します。React Router プラグインの `platform: "cloudflare-workers"` オプションを必ず設定してください。

---

## 5. Go バックエンド – DDD + Layered Architecture

- 依存方向は `interfaces → application → domain`。`infrastructure` は application インターフェースを実装して注入 (DI)。
- DB アクセスは **sqlc** による型安全なコード生成。
- テスト容易性を高めるため、ドメイン層はフレームワーク非依存。

<details>
<summary>レイアウト図</summary>

```text
application ──┐
              │ calls (interface)
domain ◄──────┘
▲   ▲
│   │ use
│   └───────── interfaces (HTTP)
│             ▲
│ implements  │
└───────────── infrastructure (DB)
```

</details>

---

## 6. データベーススキーマ & SQLC

```sql
-- users\CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- 以下略 (menus, workouts, sets ...)
```

- スキーマファイルは `internal/infrastructure/db/schema.sql` が Single Source of Truth。
- `sqlc generate` で Go 構造体とリポジトリインターフェースを出力 (pgx/v5)。

```bash
cd apps/api
sqlc generate  # 型安全コード生成
```

---

## 7. 前提ツール

| Tool | Min ver | 用途 |
| ---- | ------- | ---- |
| Node.js | 20.x | フロントエンドビルド |
| pnpm | 9.x | モノレポ管理 |
| Bun | 1.x | react‑router typegen 実行 |
| Go | 1.24 | API サーバー |
| Docker | ― | CI / Fly.io デプロイ |
| flyctl | 1.x | Fly.io デプロイ |
| wrangler | 3.x | Workers デプロイ |
| sqlc | 1.x | DB コード生成 |
| psql | 15+ | スキーマ適用 |

---

## 8. ローカル開発

### 8.1 フロントエンド (Workers)

```bash
pnpm --filter web dev        # wrangler dev --remote
```

### 8.2 バックエンド (Go API)

```bash
cd apps/api
cp .env.example .env         # DB 接続情報を設定
source .env

go run ./cmd/server          # localhost:8080
```

### 8.3 DB スキーマ & コード生成

```bash
cd apps/api
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql
sqlc generate
```

---

## 9. デプロイ手順

### 9.1 API – Fly.io

```bash
./scripts/deploy-api.sh       # 推奨
# または手動
cd apps/api
flyctl deploy --dockerfile ./Dockerfile
```

### 9.2 フロントエンド – Cloudflare Workers

```bash
cd apps/web
wrangler deploy              # wrangler.toml 使用
```

### 9.3 環境変数 (例)

| Name | Example | Scope |
| ---- | ------- | ----- |
| DATABASE_URL | postgres://user:pwd@host:port/db | API / Local |
| PORT | 8080 (Fly.io 注入) | API |

---

## 10. よく使うコマンド

```bash
# 依存整理
pnpm install
 go work sync && go mod tidy ./...

# テスト & Lint
pnpm -r test && pnpm -r lint
 go test ./... && go vet ./...

# 型生成 (React Router)
 bunx react-router typegen

# スキーマ & DB
cd apps/api
sqlc generate
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql
```

---

## 11. AI / Copilot 用プロンプト集

| シナリオ | プロンプト例 | 補足 |
| -------- | ------------ | ---- |
| ルート雛形生成 | `"/posts/:slug" 用の React Router v7 ルート (TypeScript) を生成し、型は "+types/posts.$slug" を import してください。` | `import type` を明示すると誤 import を防げる |
| Worker ハンドラ | `Cloudflare Workers の fetch ハンドラを createCloudflareHandler で実装し、streaming HTML を返すコードを出力して` | Node API 誤用を回避 |
| tsconfig 修正 | `Cannot find module './+types/...' を解消する tsconfig 設定は?` | エラーメッセージ全文を貼る |
