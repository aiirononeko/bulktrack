# 週次トレーニングボリューム ダッシュボード — QA 仕様書 (v3)

> **更新履歴**  
> *v3 – 2025-04-25*: レビュー指摘 (テスト戦略・追加エラーステート・デプロイ/ロールバック詳細・パフォーマンス最適化・アクセシビリティ試験方法) を反映。

---

## 1. 受け入れ基準（Given‑When‑Then 形式）

| # | シナリオ | Given | When | Then |
|---|---|---|---|---|
| 1 | **正常表示** | ユーザーがログインし、過去 12 週に ≥1 件のトレーニング記録 | ダッシュボードにアクセス | 1) 直近 12 週の総挙上量を折れ線グラフで描画 (デフォルト) <br>2) 最新週は当日分まで集計 |
| 2 | **データ追加の即時反映** | ダッシュボード表示中 | 新しいログを保存 | グラフが ≤2 秒でリフレッシュ |
| 3 | **データ欠損週** | ある週に記録なし | – | ゼロ値を描画し週次連続性を保つ |
| 4 | **タイムゾーン** | ユーザーのロケール=JST | ダッシュボードアクセス | 集計境界が月曜 00:00 JST |
| 5 | **アクセス制御** | A がログイン、DB に B のデータ | ダッシュボード表示 | B のデータを返さない (403/404) |
| 6 | **大量データ** | 5 万 set 以上保持 | ダッシュボード表示 | レスポンス <300 ms, FPS>55 |
| 7 | **オフライン** | ネットワーク断 | ページ再読み込み | 「オフラインです」トースト & キャッシュ描画 |
| 8 | **API 障害 (5xx/タイムアウト)** | バックエンド障害 | ダッシュボードアクセス | ① エラー UI + 再試行ボタン ② 指数バックオフで 3 回自動リトライ ③ キャッシュがあれば表示 |
| 9 | **入力バリデーション失敗 (400)** | 不正なパラメータ | API 送信 | ① バリデーションエラー UI (多言語) ② リクエスト拒否 |
|10 | **認可失敗 (401/403)** | セッション失効 or 権限不足 | API 呼び出し | ① 再ログイン誘導ダイアログ ② 処理中止 |
|11 | **新規ユーザー** | 記録 0 件 | ダッシュボードアクセス | ガイダンスカード + サンプルグラフ |
|12 | **期間切替** | ダッシュボード表示中 | 期間 UI で 52 週選択 | ① 52 週データ表示 ② 設定保持 |
|13 | **グラフ形式切替** | ダッシュボード表示中 | 棒グラフ選択 | ① 即時切替 ② 設定保持 |
|14 | **データエクスポート** | データ表示中 | CSV ボタン | CSV ダウンロード、ファイル名に期間含む |

---

## 2. 非機能要件

### 2.1 性能

| 指標 | 目標値 | 測定条件 |
|---|---|---|
| API レイテンシ (P95) | ≤200 ms (12 週), ≤400 ms (52 週) | Fly.io nrt, 4 vCPU/8 GB, RTT<50 ms |
| フロント描画 | Warm ≤100 ms (iPhone 12), Cold ≤300 ms (iPhone SE 2) | Lighthouse mobile‑throttle |
| 集計パフォ | 3 年分10 万 set を 1 s 未満 | go bench + Neon 15 |
| 同時負荷 | 100 ユーザー RPS50 で応答 <500 ms | k6 cloud |

### 2.2 スケーラビリティ

* MAU 1 万人、水平スケール。
* 週次集計済みテーブル参照で O(1) 近似。

### 2.3 セキュリティ

* JWT RS256 検証 (署名, exp, iat, aud)。
* zod バリデーション、型不一致=400。
* SameSite=Strict Cookie + Origin/Referer 検証 (CSRF)。
* sqlc 型安全、プリペアドのみ。
* Neon AES‑256‑GCM。
* CSP, X‑Frame‑Options:DENY, X‑Content‑Type‑Options:nosniff。

### 2.4 可用性

| 指標 | 目標値 | 備考 |
|---|---|---|
| SLA | 99.9 % / 月 | Planned MT 除外 |
| ダウンタイム | <30 秒 / 月 1 回 | CF Workers 3 リージョン冗長 |
| 障害検知 | 5 分内 Slack 通知 | Statuspage 自動更新 |
| ロールバック | 自動フェイルオーバー + 手動 Rollback 手順 Wiki |

### 2.5 アクセシビリティ

* WCAG 2.2 AA。コントラスト ≥4.5:1。
* Screen Reader Role/Label 対応。

### 2.6 ロギング & 監視

* OpenTelemetry 1.28, Grafana Cloud。

### 2.7 国際化

* `en`, `ja`、エラー文言含む。

---

## 3. テスト戦略

| レイヤ | ツール | 目的 | カバレッジ |
|---|---|---|---|
| 単体 | vitest (web), go test (api) | ビジネスロジックの関数レベル検証 | 関数カバレッジ 80 % |
| 統合 | msw + postgres‑testcontainer | API ↔ DB ↔ BFF 連携 | 主要 happy‑path & error‑path |
| E2E | Playwright | シナリオ #1‑#14 を自動実行 (iPhone 12 & デスクトップ) | 各シナリオ合格率 100 % |
| 負荷 | k6 cloud | 同時 100 ユーザー, RPS50 | 応答目標維持 |
| アクセシビリティ | axe‑playwright | WCAG 2.2 AA Rule 0 violation | 0 error |

*テストデータ*: prisma‑seed + Factory で週次固定データ生成。期待値は snapshot で固定。

---

## 4. デプロイ & リリース

| フェーズ | 環境 | 判定基準 | アクション |
|---|---|---|---|
| Canary | 5 % トラフィック | error_rate <1 % & p95<300 ms を 15 分 | Stable へ昇格 |
| Stable | 100 % | 失敗シグナル | 自動 Rollback (Fly release rollback) |
| バージョニング | SemVer (`vX.Y.Z`) | BREAKING=Major | – |

CI: GitHub Actions → pnpm lint/test → Playwright → docker‑build → Fly deploy。

---

## 5. パフォーマンス最適化指針

* グラフライブラリ: Recharts + memoized selectors。
* Virtualized List for >200 points。
* Web Worker で重い集計をオフスレッド化。
* HTTP Cache‑Control: `max-age=900, stale-while-revalidate`。

---

## 6. アクセシビリティ検証方法

1. **自動**: axe‑playwright CI で PR ごとに実行。
2. **手動**: NVDA・VoiceOver で主要フローを週次チェック。
3. **色覚バリアフリー**: Chrome DevTools 背景/前景シミュレーション確認。

---

## 7. リスク管理と緩和策

| リスク | 影響度 | 緩和策 |
|---|---|---|
| React 19 の安定性 | 高 | ① 事前検証環境での徹底テスト ② フォールバックパスの用意 ③ 段階的な機能採用 |
| 大規模データ処理のパフォーマンス | 中 | ① 集計済みテーブル導入 ② クエリキャッシュ ③ ページネーション |
| Clerk 認証の依存性 | 中 | ① 抽象化レイヤーの導入 ② 代替認証フローの検討 |
| モバイル表示の最適化 | 低 | ① レスポンシブデザインの徹底 ② モバイル専用ビューの検討 |

---

## 8. 技術的負債の管理

* **短期的妥協点**: 
  - 初期リリースでは CSV エクスポートのみ対応（Excel/PDF は v2 で検討）
  - 種目別フィルタは将来拡張として設計のみ実施

* **将来的な改善計画**:
  - 2025-Q3: データ分析機能の拡充
  - 2025-Q4: AI による進捗予測・推奨機能

---

## 9. ユーザーフィードバック収集

* ダッシュボード下部に簡易評価 UI (5段階 + コメント)
* 月次ユーザーインタビュー (5名)
* 利用統計分析 (ヒートマップ、機能使用頻度)

---

## 10. 外部依存 & バージョン制約

### 10.1 フロントエンド (`apps/web`)

| ライブラリ | バージョン | 重要制約 |
|---|---|---|
| React | 19.0.0 | **Server Components** 使用時はベータフラグを有効化。Vite 6 での互換確認が必要。 |
| Vite | 6.2.1 | `@cloudflare/vite-plugin` ≥ 1.0.0 と併用。React 19 の RSC プラグイン試験運用中。 |
| React Router | 7.5.0 | `react-router‑typegen` を CI で強制。 |
| Tailwind CSS | 4.0.0 | JIT、`tailwind‑merge` ≥ 3.2.0。 |
| Clerk SDK | @clerk/react-router 1.2.8 | SSR 対応。 |
| Lucide‑react | 0.503.0 | バンドルサイズ < 30 kB。 |
| TypeScript | 5.7.2 | `noUncheckedIndexedAccess`=true。 |

### 10.2 バックエンド (`apps/api`)

| ランタイム／ライブラリ | バージョン | 重要制約 |
|---|---|---|
| Go | 1.24 | `go.work` ワークスペース構成。 |
| Router | **Chi v1.5.0** (予定) or Echo | README は Echo、`go.mod` には Chi が想定。いずれかに統一すること。 |
| pgx | v5.5.5 | sqlc 生成コードと互換必須。 |
| sqlc | v2.0+ | `emit_interface: true`。 |
| Clerk Go SDK | v2.3.1 | JWT 検証。 |
| Postgres | Neon 15 Serverless | `pool_max_conns = 20`。 |

### 10.3 インフラ & ビルド

| 項目 | バージョン／プラン |
|---|---|
| Cloudflare Workers | miniflare v4、Durable Objects β。 |
| Fly.io Machines | nrt リージョン、rolling deploy。 |
| pnpm | 9.x (`pnpm-workspace.yaml`) |
| Wrangler CLI | 4.12.0 |
| GitHub Actions | ubuntu‑22.04, Go 1.24, Bun 1.1 |

---

## 11. 技術的備考

1. **バックエンド Router の不一致** — README と `go.mod` の差異を解消し、設計レビューで採用フレームワークを決定する。
2. **React 19 × Vite 6** — React Server Components 対応状況を E2E テストで検証。問題があれば Vite edge‑plugins への切替を検討。
3. **.clinerules CI** — `github/workflows/clinerules.yml` で Secrets & env ファイルへの diff を検出し、違反 PR を自動で `failed‑check` ラベル付与。
4. **CI/CD** — main ブランチマージ時に API & Web を Canary → Stable 順でデプロイ。失敗時は自動ロールバック。

---

## 用語集

| 用語 | 定義 |
|---|---|
| Set | 重量 × 回数 の 1 実施単位 |
| 総挙上量 | 重量 × Reps の総和 |
| P95 | 95 パーセンタイル |
| FCP | First Contentful Paint |
| MAU | 月間アクティブユーザー |
| RSC | React Server Components |

---

以上。