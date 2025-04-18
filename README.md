# BulkTrack – モノレポ概要

## 1. BulkTrack とは？

BulkTrack は **TypeScript + Go** で構成されたフルスタック個人開発プロジェクトです。

* **フロントエンド** – React Router v7 (Framework Mode) を **Cloudflare Workers** 上で SSR
* **バックエンド** – Go 1.24 製 REST API を **Google Cloud Run** にデプロイ
* **データベース** – **Cloud SQL (PostgreSQL)** を *Cloud SQL Go Connector* 経由で利用
* **IaC** – Terraform (GCP) & Wrangler v3 (Cloudflare)
* **モノレポ管理** – **pnpm Workspaces** と **Go Workspace (`go.work`)**

---

## 2. ハイレベルアーキテクチャ

```text
┌──────────────────────────┐          ┌───────────────────────────┐
│  Cloudflare Workers      │  fetch   │  Cloud Run (Go API)       │
│  └── React Router v7 SSR ├─────────►│  └── Cloud SQL Connector  │
└────────────┬─────────────┘          └────────────┬──────────────┘
             │  static HTML / assets               │ IAM / Unix socket
             ▼                                     ▼
      Cloudflare Pages ✧ CDN               Google Cloud SQL (PostgreSQL)
```

---

## 3. リポジトリ構成

```text
/
├─ apps/
│   ├─ web/                  # React Router v7 + Workers
│   │   ├─ src/
│   │   ├─ public/
│   │   └─ wrangler.toml
│   └─ api/                  # Go + Cloud Run
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
└─ .github/workflows/        # CI/CD
```

---

## 4. 前提ツール

* **Node.js** ≥ 20 + **pnpm** ≥ 9
* **Go** ≥ 1.22
* **Docker**
* **gcloud CLI** (認証済み)
* **wrangler CLI**

---

## 5. ローカル開発

### 5.1 フロントエンド (Workers)

```bash
pnpm --filter web dev   # wrangler dev --remote で HMR
```

### 5.2 バックエンド (Go API)

```bash
cd apps/api
# Auth Proxy 起動済み前提で…
go run ./cmd/server
```

---

## 6. デプロイ手順

### 6.1 API – Cloud Run

```bash
cd apps/api
gcloud run deploy bulktrack-api \
  --source . \
  --region asia-northeast1 \
  --set-env-vars DB_USER=postgres,DB_NAME=bulktrack \
  --set-env-vars DB_CONNECTION_NAME=project:asia-northeast1:instance \
  --allow-unauthenticated
```

### 6.2 フロントエンド – Cloudflare Workers

```bash
cd apps/web
wrangler deploy
```

---

## 7. 環境変数

| 変数名 | 例 | 作用範囲 |
|--------|----|-----------|
| `DB_USER` | `postgres` | Cloud Run |
| `DB_NAME` | `bulktrack` | Cloud Run |
| `DB_CONNECTION_NAME` | `project:asia-northeast1:instance` | Cloud Run |
| `PORT` | `8080` (Cloud Run が自動注入) | Cloud Run |

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
```
