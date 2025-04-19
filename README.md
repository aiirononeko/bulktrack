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
│  Cloudflare Workers      │  fetch   │  Fly.io (Go API)          │
│  └── React Router v7 SSR ├─────────►│                           │
└────────────┬─────────────┘          └────────────┬──────────────┘
             │  static HTML / assets               │ 
             ▼                                     ▼
      Cloudflare Pages ✧ CDN                 Neon (PostgreSQL)
```

---

## 3. リポジトリ構成

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

---

## 4. 前提ツール

* **Node.js** ≥ 20 + **pnpm** ≥ 9
* **Go** ≥ 1.22
* **Docker**
* **flyctl CLI** (認証済み)
* **wrangler CLI**

---

## 5. ローカル開発

### 5.1 フロントエンド (Workers)

```bash
pnpm --filter web dev   # wrangler dev --remote で HMR
```

### 5.2 バックエンド (Go API)

```bash
cd apps/api
# 環境変数 DATABASE_URL が設定されていることを確認
go run ./cmd/server
```

---

## 6. デプロイ手順

### 6.1 API – Fly.io

```bash
# プロジェクトルートから実行
flyctl deploy

# または、詳細設定する場合
cd apps/api
flyctl deploy --dockerfile ./Dockerfile
```

### 6.2 環境変数の設定

```bash
# データベース接続情報を設定
flyctl secrets set DATABASE_URL='postgres://user:password@host:port/dbname'
```

### 6.3 フロントエンド – Cloudflare Workers

```bash
cd apps/web
wrangler deploy
```

---

## 7. 環境変数

| 変数名 | 例 | 作用範囲 |
|--------|----|-----------|
| `DATABASE_URL` | `postgres://user:password@host:port/dbname` | Fly.io / ローカル開発 |
| `PORT` | `8080` (Fly.io が自動注入) | Fly.io |

---

## 8. よく使うコマンド

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
flyctl deploy

# Fly.io ログの確認
flyctl logs
```
