# BulkTrack

## 1. プロダクト概要

### 1-1. BulkTrack とは？

BulkTrack は "筋肥大に必要な週次ボリューム管理" を、Apple Watch から 3 タップ以内で完結させる ウエイトトレーニング記録アプリです。

- **Track**：部位別・種目別・総セット数／総挙上量を自動集計し、カラーコードで "足りない／過多" を即判断。
- **Bulk**：ダッシュボードには 「先週比 +12 % ↑」など漸進的加負荷が一目でわかるゲージ を搭載。
- **UI**：デジタルクラウンだけで重量 ⇄rep を連続入力し、iPhone を取り出す必要がありません。
- **クラウド連携**：iCloud Sync・CSV / Apple Health Export でコーチや研究用データにも即活用。

### 1-2. BulkTrack が "強い" 5 つの理由

| 差別化ポイント                                        | 既存アプリの状況                                                     | BulkTrack の打ち手                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ① 完全スタンドアロン watchOS                          | Strong は「Watch と iPhone の併用を推奨」 ストロングヘルプセンター   | Watch 単体でログ完結。休憩タイマーも触覚通知のみで集中を切らさない |
| ② 部位 × 週次ボリュームのリアルタイム可視化           | Fitbod も「Volume Targets」を導入したが "全身合計" 表示が中心 Fitbod | 筋群ごとに閾値を設定 → "胸 18 sets / 目標 20" をリングで表示       |
| ③ Volume Guard™ 通知                                  | HeavySet は PR 通知中心で過剰ボリューム警告なし Apple                | オーバーワーク警告 / 未達リマインダー を週中にプッシュ             |
| ④ Advanced Override (RIR/RPE・テンポ・ドロップセット) | Fitbod/Strong は一部 RPE のみ AppleFitbod                            | セット単位で RIR・テンポをクイック入力 → グラフに反映              |
| ⑤ オープンデータ思想                                  | 多くが PRO 課金で CSV 解放                                           | CSV・Health Export 無料開放。研究者／オンラインコーチと連携容易    |

### 1-3. BulkTrack が創る世界

> "ログはただの記録ではなく、リアルタイムのナビゲーションになる"

1. データで語る筋トレ文化
   Weekly volume・RIR 推移が共通言語になり、SNS やオンラインコミュニティで「胸は 16 → 18 set で伸びた」など エビデンスベースの会話 が日常化。
2. コーチングの民主化
   CSV API を通じてオンラインコーチが即座にクライアントのボトルネックを分析。パーソナル指導のコストを 1/5 まで削減。
3. "オーバーワークゼロ" のジムライフ
   Volume Guard™ が過剰セットを自動警告。ケガや慢性疲労を未然に防ぎ、継続率と QOL を最大化。

### 1-4. どんなユーザーをどう喜ばせるか

| ペルソナ                                | Pain Point                                                   | BulkTrack が届ける Joy                                            |
| --------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| 中上級トレーニー（週 5 日・1 回 90 分） | Excel 管理が煩雑／ボリュームの伸び停滞                       | "胸+肩は+10 % / 脚は維持" を即判断 → 自己プログラミングが加速     |
| 忙しいビジネスパーソン（昼休み 45 分）  | iPhone 操作が面倒、セット抜け発生                            | 腕時計をクルッと回すだけでログ → 1 分短縮／回、合計月 1 時間節約  |
| オンラインコーチ                        | クライアントのフォーム動画は見れるが、細かいセット情報が遅い | リアルタイム CSV Webhook で即レビュー → 24 h 以内にフィードバック |
| 研究者・理学療法士                      | 大規模な筋肥大データ不足                                     | 無料で 匿名化 CSV が得られ、科学的知見の更新スピードが向上        |

### 1-5. キーメッセージ（タグライン案）

> "Track volume. Maximize gains — all from your wrist."

BulkTrack は 「筋肥大 × データ × Apple Watch 体験」 を再発明し、
筋トレの成功確率をこれまで以上に "可視化・自動化・最適化" します。

これからの筋トレは、数字が導く。BulkTrack と共に、次の PB (Personal Bulk) を打ち立てよう。

## 2. 技術スタック

| レイヤ         | 技術スタック                                         | デプロイ先                     |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| フロントエンド | React Router v7 (Framework Mode)、Vite、Tailwind CSS | **Cloudflare Workers / Pages** |
| バックエンド   | Go 1.24、Echo (REST)、sqlc                           | **Fly.io**                     |
| データベース   | **Neon (PostgreSQL)**                                | ―                              |
| モノレポ管理   | **pnpm Workspaces** / **Go Workspace (`go.work`)**   | ―                              |

目的は「筋トレ記録アプリ」を題材に、**型安全**・**スキーマファースト**・**Serverless** を同時に検証することです。

---

## 3. ハイレベルアーキテクチャ

```text
┌──────────────────────────┐          ┌───────────────────────────┐
│  Cloudflare Workers      │  fetch   │   Fly.io  (Go API)        │
│  └── React Router v7 SSR ├─────────►│  └── Neon Serverless PG   │
└────────────┬─────────────┘          └───────────────────────────┘
             │                             (TCP, pgwire, TLS)
             ▼
      Cloudflare Pages ✧ CDN
```

- **Edge SSR**: React Router v7 の _Framework Mode_ を Workers 上でストリーミング SSR
- **API → DB**: Go API は Serverless PostgreSQL (Neon) と pgx/v5 で接続
- **ビルド**: Vite + Bun / Go Releaser を GitHub Actions で自動化

---

## 4. コードベース構成

### 4.1 モノレポ構造

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

## 5. React Router v7 – 型安全なルーティング

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
    "moduleResolution": "bundler", // ★ 重要 – Workers 環境で Node built‑ins を除外
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./*"]
    }
  }
}
```

> **Tips** Cloudflare Workers では `fs`, `path` など Node コアモジュールを import するとビルドに失敗します。React Router プラグインの `platform: "cloudflare-workers"` オプションを必ず設定してください。

---

## 6. Go バックエンド – DDD + Layered Architecture

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

## 7. データベーススキーマ & SQLC

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

## 8. 前提ツール

| Tool     | Min ver | 用途                      |
| -------- | ------- | ------------------------- |
| Node.js  | 20.x    | フロントエンドビルド      |
| pnpm     | 9.x     | モノレポ管理              |
| Bun      | 1.x     | react‑router typegen 実行 |
| Go       | 1.24    | API サーバー              |
| Docker   | ―       | CI / Fly.io デプロイ      |
| flyctl   | 1.x     | Fly.io デプロイ           |
| wrangler | 3.x     | Workers デプロイ          |
| sqlc     | 1.x     | DB コード生成             |
| psql     | 15+     | スキーマ適用              |

---

## 9. ローカル開発

### 9.1 フロントエンド (Workers)

```bash
pnpm --filter web dev        # wrangler dev --remote
```

### 9.2 バックエンド (Go API)

```bash
cd apps/api
cp .env.example .env         # DB 接続情報を設定
source .env

go run ./cmd/server          # localhost:5555
```

### 9.3 DB スキーマ & コード生成

```bash
cd apps/api
source .env && psql "$DATABASE_URL" -f internal/infrastructure/db/schema.sql
sqlc generate
```

---

## 10. デプロイ手順

### 10.1 API – Fly.io

```bash
./scripts/deploy-api.sh       # 推奨
# または手動
cd apps/api
flyctl deploy --dockerfile ./Dockerfile
```

### 10.2 フロントエンド – Cloudflare Workers

```bash
cd apps/web
wrangler deploy              # wrangler.toml 使用
```

### 10.3 環境変数 (例)

| Name         | Example                          | Scope       |
| ------------ | -------------------------------- | ----------- |
| DATABASE_URL | postgres://user:pwd@host:port/db | API / Local |
| PORT         | 5555 (Fly.io 注入)               | API         |

---

## 11. よく使うコマンド

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

## 12. AI / Copilot 用プロンプト集

| シナリオ        | プロンプト例                                                                                                           | 補足                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| ルート雛形生成  | `"/posts/:slug" 用の React Router v7 ルート (TypeScript) を生成し、型は "+types/posts.$slug" を import してください。` | `import type` を明示すると誤 import を防げる |
| Worker ハンドラ | `Cloudflare Workers の fetch ハンドラを createCloudflareHandler で実装し、streaming HTML を返すコードを出力して`       | Node API 誤用を回避                          |
| tsconfig 修正   | `Cannot find module './+types/...' を解消する tsconfig 設定は?`                                                        | エラーメッセージ全文を貼る                   |

## 認証・認可 (Authentication & Authorization)

本アプリケーションでは、認証・認可基盤として [Clerk](https://clerk.com/) を全面的に採用しています。Clerk の利用により、堅牢な認証フローとユーザー管理機能を迅速に導入しています。

### フロントエンド (React Router + Cloudflare Workers)

- **Clerk SDK:** `@clerk/remix` (React Router v7 Framework Mode との互換性) を利用し、サインイン・サインアップ、ユーザープロファイル管理などの UI コンポーネントを組み込んでいます。
- **認証状態管理:** `useAuth`, `useUser` フックを使用して、クライアントサイドでの認証状態やユーザー情報を取得します。
- **API 認証:**
  - React Router の `loader` や `action` 関数内で `clerkClient.getToken()` を呼び出し、Clerk が発行した JWT (JSON Web Token) を取得します。
  - 取得した JWT を `Authorization: Bearer <token>` ヘッダーに付与して、バックエンド API へのリクエストを行います。

### バックエンド (Go API on Fly.io)

- **JWT 検証ミドルウェア:**
  - フロントエンドから送信された `Authorization` ヘッダー内の JWT を受け取ります。
  - `apps/api/internal/interfaces/http/middleware/auth.go` (または同様のミドルウェア) で、Clerk の公開鍵 (JWKS) を用いて JWT の署名と有効期限を検証します。
  - 検証に成功した場合、トークンのペイロードから Clerk User ID (`user_` プレフィックス付きの文字列) を抽出します。
- **ユーザー識別:**
  - 抽出した Clerk User ID をリクエストコンテキストに格納します。
  - 各 API ハンドラは、コンテキストから User ID を取得し、リソースへのアクセス制御やデータフィルタリングを行います。
- **ユーザー情報の Single Source of Truth:** データベースには `users` テーブルを持たず、Clerk 上のユーザー情報を信頼できる唯一の情報源 (Single Source of Truth) としています。バックエンド全体で Clerk User ID (文字列型) をユーザー識別子として扱います。

```
psql "postgresql://neondb_owner:npg_DnFTk9d5mIzV@ep-square-boat-a1vteajv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -c "DROP TABLE IF EXISTS sets CASCADE; DROP TABLE IF EXISTS workouts CASCADE; DROP TABLE IF EXISTS menu_items CASCADE; DROP TABLE IF EXISTS menus CASCADE; DROP TABLE IF EXISTS exercise_target_muscle_groups CASCADE; DROP TABLE IF EXISTS exercises CASCADE; DROP TABLE IF EXISTS muscle_groups CASCADE;"
```

```
psql "postgresql://neondb_owner:npg_DnFTk9d5mIzV@ep-square-boat-a1vteajv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f internal/infrastructure/db/schema.sql
```

```
psql "postgresql://neondb_owner:npg_DnFTk9d5mIzV@ep-square-boat-a1vteajv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f internal/infrastructure/db/seed.sql
```
