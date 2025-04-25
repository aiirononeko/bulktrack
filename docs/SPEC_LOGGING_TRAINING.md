# BulkTrack — Training Log Refactor & UX Enhancement — **Specification v3**

> **Scope unchanged**: Refactor training‑log codebase and add an interval timer while raising UX quality on Web, iOS and watchOS.  
> **Change log**: v3 incorporates the second‑round review (2025‑04‑25) — clarifies conflict‑resolution, timing tolerances, security validation, CRDT storage, UX consistency, and risk mitigations.

---

## 1. 受け入れ基準 (Given‑When‑Then)

### 1.1 既存シナリオ

| #  | ユースケース | シナリオ (G‑W‑T) |
|----|------------|------------------|
| **A‑1** | トレーニングセットを登録 | *Given* 認証済みユーザーが`/workouts/:id`を開いている<br>*When* 種目="ベンチプレス", 重量=80kg, Reps=5 で **保存**<br>*Then* DB に新しい `sets` レコードが生成され一覧へ即時反映 |
| **A‑2** | セットを編集 | *Given* 編集アイコンを選択済み<br>*When* 重量を85kgに更新し **更新**<br>*Then* レコード更新 & 合計挙上量が再計算 |
| **A‑3** | セットを削除 | *Given* 行の "削除" を押下<br>*When* 確認ダイアログで **はい**<br>*Then* 物理削除され、集計が同期 |
| **A‑4** | インターバル自動起動 | *Given* 自動タイマー=ON, 間隔=120s<br>*When* 新セット保存<br>*Then* 2:00 からカウントダウン、0s で触覚+音通知 |
| **A‑5** | インターバル手動変更 | *Given* タイマー走行中<br>*When* ±9/10s 刻みで調整<br>*Then* 表示 & 内部値が即同期 |
| **A‑6** | タイマーBG維持 | *Given* 残30s で端末スリープ<br>*When* 復帰<br>*Then* 経過秒が正確・通知欠落なし |
| **A‑7** | 多端末同期 | *Given* Watch と Web が同一アカウント<br>*When* Watch で新セット保存<br>*Then* 3s 以内に Web へ Socket 反映 |
| **A‑8** | ロールバック | *Given* API が 5xx<br>*When* "再試行"<br>*Then* 楽観 UI の行がロールバックし再挿入 |

### 1.2 追加 & 改訂シナリオ

| # | ユースケース | シナリオ (G‑W‑T) |
|---|------------|------------------|
| **A‑9** | 新規ユーザー登録 | *Given* 未登録ユーザーが **Sign‑Up** 画面を開く<br>*When* メール・パスワードを入力し **登録**<br>*Then* Clerk でアカウント作成・メール検証トークン送信 |
| **A‑10** | ログイン | *Given* ユーザーが **Sign‑In** を開く<br>*When* 正しい資格情報で **ログイン**<br>*Then* JWT が発行・30日間リフレッシュトークン保存、ホームへリダイレクト |
| **A‑11** | ログアウト | *Given* ユーザーがプロフィールメニューを開く<br>*When* **ログアウト** を選択<br>*Then* セッション Cookie と RefreshToken が失効しログイン画面へ |
| **A‑12** | パスワードリセット | *Given* **Forgot Password** 画面<br>*When* 登録メール入力し **送信**<br>*Then* リセットリンクを含むメール送信、リンク押下で新パスワード登録 |
| **A‑13** | 履歴日/週/月表示 | *Given* **History** タブ<br>*When* 表示を「週」に切替<br>*Then* 週単位のボリューム・最大重量がカード&グラフで描画 |
| **A‑14** | 進捗グラフ | *Given* 種目=ベンチプレスを選択<br>*When* **Progress Graph** を開く<br>*Then* 1RM 推定値の折れ線が表示 (任意期間ズーム可) |
| **A‑15** | オフライン記録 | *Given* 機内モード<br>*When* セット保存<br>*Then* データが IndexedDB に Queue され **オフライン** ラベル付与 |
| **A‑16** | **オフライン同期 (衝突解決)** | *Given* A‑15 完了かつ端末がオンライン復帰<br>*When* 同期キューを送信<br>*Then* 競合時は `row_version` ベクタークロックが **辞書順で大きい方** (最新) を採用し、同一タイムスタンプ衝突時は `device_id` が大きい方を優先 |
| **A‑17** | 入力バリデーション | *Given* **Add Set** ダイアログ<br>*When* 重量に "-10" を入力し **保存**<br>*Then* フロントエンドで赤枠＆"正の値を入力" エラー、API 呼び出し無し |
| **A‑18** | **API 4xx / Timeout リトライ** | *Given* サーバが 400/401/408/429/504 を返す<br>*When* クライアントがリクエスト実行<br>*Then* **指数バックオフ (1 s → 2 s → 4 s) 最大3回再試行**し、失敗時は Sentry 送信 & UI エラー表示 |
| **A‑19** | ユーザー設定保存 | *Given* **Settings** で タイマー=90s に変更<br>*When* **保存**<br>*Then* PostgreSQL `user_settings` 行が Upsert、即座に UI へ反映 |
| **A‑20** | **設定多端末同期** | *Given* Web で A‑19 を実行済み<br>*When* Watch / iOS がオンライン<br>*Then* **10 秒以内** または **次回アプリ起動時** までに新タイマー値が反映 |

> **UI フィードバック**: オフライン時は雲に斜線の共通アイコン + ステータスバー「OFFLINE」表示。エラー時はトースト上部に共通エラーコード (UX‑ERROR‑###) と i18n メッセージ。

---

## 2. 非機能要件

| カテゴリ | 指標・制約 |
|---|---|
| **性能 (Web/API)** | `POST /workouts/:id/sets` p95 ≤ 150 ms / p99 ≤ 300 ms<br>Socket push ≤ 3 s<br>Web LCP ≤ 800 ms (Chrome 120, MacBook M2, 100/20 Mbps) |
| **性能 (iOS/watchOS)** | Cold‑start ≤ 1.5 s (iPhone 12 / Watch S9)<br>UI 応答 ≤ 100 ms<br>タイマー精度 ± 0.1 s /10 min<br>FPS 60 Mem ≤ 50 MB WatchConnectivity transfer ≤ 5 s |
| **オフライン性能** | IndexedDB queue flush ≤ 500 ms/100 sets (iPhone 12 Safari 17 / Chrome 120) |
| **同期整合性** | `row_version` **JSONB** 列 `{device:"<id>", counter:<int>}` をベクタークロックとし、LWW 判定は (counter, device) を辞書順比較。 nightly job でクロック単調性を検証 (≤ 1 h) |
| **セキュリティ** | JWT `exp` ≤ 24 h, silent refresh 10 min 前<br>保存データ AES‑256, 転送 TLS 1.3<br>RateLimit 100 req/IP/15 min (429)<br>検証: **OWASP ZAP 自動スキャン + 手動ペンテスト** (年2回) — OWASP Top10 脆弱性ゼロを保証 |
| **プライバシー** | GDPR — データエクスポート (JSON/CSV) & Right‑to‑Delete (30 d) 完全削除<br>健康データ共有は Opt‑in |
| **エラー処理/ロギング** | Front: Sentry 捕捉率 99%<br>Back: OpenTelemetry Trace + JSON ログ (bunyan) |
| **可用性 & 保守性** | Fly.io Machines ≥ 2 (Rolling Deploy) / PR ≤ 300 LoC / `.clinerules` 禁止操作厳守 |
| **テスト** | Playwright E2E 200 scenarios (< 3 min) / Go UT 90 % cov. |
| **電力効率** | Watch CPU ≤ 5 % / Battery ≤ 1 % per 30 min timer — **Instruments.app Energy Impact** で測定 |
| **アクセシビリティ** | WCAG 2.2 AA — コントラスト比 ≥ 4.5:1, 全 UI 要素キーボード操作可, VoiceOver / NVDA / TalkBack 対応確認 |

---

## 3. 外部依存 & バージョン制約

| レイヤ | パッケージ / サービス | バージョン範囲 |
|---|---|---|
| Web FE | React 19.x, React Router 7.5.x, Vite ^5, TS ≥ 5.7, Tailwind 4, react‑use ≥ 17 |
| iOS / watchOS | Swift 5.10, WatchKit 10, Xcode 16 |
| API | Go 1.24.x, chi v2, pgx v5, sqlc v2 |
| Auth | Clerk JS @clerk/react-router ^4.0 |
| DB | Neon Postgres 16 + pgvector, CRDT vectorClock JSONB |
| Infra | Fly.io, Cloudflare Workers Modules |
| CI/CD | GitHub Actions (2025‑04 Runner), Node 20, pnpm 9, Bun 1 |

---

## 4. 同期アーキテクチャ

### 4.1 ストレージモデル
```sql
CREATE TABLE sets (
  id           UUID PRIMARY KEY,
  user_id      UUID NOT NULL,
  ...,
  row_version  JSONB DEFAULT '{"device":"server","counter":0}'
);
```
* `row_version.device`: 発行元デバイス UUID
* `row_version.counter`: 単調増加カウンター

### 4.2 衝突解決アルゴリズム
1. 受信データと既存行の `row_version` を比較
2. `(counter, device)` が辞書順で大きい方 = 優先
3. 負けたレコードは tombstone としてローカル保持 (audit)

### 4.3 オンライン / オフライン 優先順位
* **オンライン**: WebSocket push を第一優先、成功応答でローカル DB 更新
* **オフライン**: IndexedDB キューへ追加
* **復帰**: キュー → API POST → 正常戻り値でソフトマージ → WebSocket サブスク再確立

---

## 5. バックアップ & 障害復旧フロー

| 項目 | 内容 |
|---|---|
| Neon Continuous | **Console 設定**: *Continuous Protection = ON* |
| Scheduled Backup | **6 h 間隔** — *Backups → Enable Scheduled → Every 6 h* |
| PITR | 最大 7 d 窓 / 15 min 粒度 |
| Fail‑over | Fly.io read‑replica Promote: ~30 s |
| Runbook | `scripts/restore.sh <timestamp>` → Staging Smoke Test → Prod Promote (RTO ≤ 30 min, RPO ≤ 15 min) |

---

## 6. UX 一貫性指針

1. **エラー表示**: `UX‑ERROR‑###`コード + i18n メッセージ (ja / en) — 全プラットフォーム共通。  
2. **オフライン表示**: *cloud‑slash* アイコン + ステータスバー灰色背景。  
3. **アクセシビリティ検証**: Lighthouse, axe‑core, Screen‑Reader 3種 (VoiceOver / NVDA / TalkBack) — 全 Critical Path 達成。

---

## 7. 段階的導入 & リスク対策

| リスク | 影響 | 対策 |
|---|---|---|
| CRDT 実装が複雑 | 実装遅延 | **Phase 0**: Simplified LWW (本仕様)<br>**Phase 1**: 本格 CRDT (pgvector) — Q3 2025 |
| Watch バッテリー検証 | UX 劣化 | Instruments.app Energy Log で 30 min タイマー実測。超過時は haptic 強度低減 |
| 多言語展開 | 翻訳コスト | Phase 1: ja / en (MVP) — Phase 2: zh / ko / es (Q4 2025) |

---

_Last updated: 2025‑04‑25 23:15 JST_