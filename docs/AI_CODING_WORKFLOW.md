# 週次トレーニングボリューム・ダッシュボード
## 開発タスク分割（200–300 行／タスク）

> **目的**: Cline での実装をスムーズにするため、1 プルリクあたり 200–300 行規模に細分化し、各タスクへ **①ゴールファイル** **②変更禁止ファイル** **③エッジケーステスト** を明示する。

---

### 📦 全体レポジトリ構成（抜粋）

```
apps/
  api/
    cmd/
    internal/
  web/
    src/
      components/
      pages/
      hooks/
  shared/
    types/
    utils/
config/
.github/workflows/
```

---

## ✅ タスク一覧

### **Task 1 – DB マイグレーション & 週次集計ビュー**  *(~220 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/api/migrations/20250425_create_weekly_volume.sql`<br>`apps/api/sqlc/volume.sql` |
| 変更禁止ファイル | 既存 `go` ソース全て（読み取り専用） |
| エッジケーステスト | `go test ./internal/repository -run TestAggregate_12Weeks_NoData` – 空データ週ゼロ埋め<br>`go test ./internal/repository -run TestAggregate_TimezoneBoundary` – JST 月曜 00:00 境界確認 |

---

### **Task 2 – API ハンドラ `/v1/weekly-volume` (12週デフォルト)** *(~250 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/api/internal/handler/volume.go`<br>`apps/api/internal/service/volume.go` |
| 変更禁止ファイル | `apps/api/internal/repository/*` (Task1 で作成済み分含む) |
| エッジケーステスト | `go test ./internal/handler -run TestWeeklyVolume_AuthZ` – 他ユーザー403<br>`msw/playwright` E2E: `volume.spec.ts` Scenario#1 正常表示 |

---

### **Task 3 – API 単体＋統合テスト拡充** *(~200 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/api/internal/handler/volume_test.go`<br>`apps/api/internal/service/volume_test.go` |
| 変更禁止ファイル | `apps/api/internal/handler/volume.go` (コードロジックのみ固定) |
| エッジケーステスト | `TestWeeklyVolume_MissingWeeks` – 欠損週ゼロ描画確認<br>`TestWeeklyVolume_LargeDatasetPerformance` – 10万 set <1s |

---

### **Task 4 – 認証／認可ミドルウェア** *(~210 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/api/internal/middleware/auth.go`<br>`apps/api/internal/middleware/auth_test.go` |
| 変更禁止ファイル | `apps/api/go.mod` `go.sum` （依存追加は禁止） |
| エッジケーステスト | `TestAuth_InvalidJWT` – 401<br>`TestAuth_ExpiredJWT` – 401<br>`TestAuth_WrongAudience` – 403 |

---

### **Task 5 – フロント: ダッシュボード骨組み & 折れ線グラフ** *(~300 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/pages/Dashboard.tsx`<br>`apps/web/src/components/WeeklyVolumeChart.tsx` |
| 変更禁止ファイル | `tailwind.config.ts` (テーマ変更不可) |
| エッジケーステスト | Playwright `dashboard.spec.ts`: Scenario#1 & #3 – 欠損週穴埋め確認<br>axe-playwright – WCAG violation 0 |

---

### **Task 6 – リアルタイム更新 (SWR + WebSocket)** *(~230 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/hooks/useWeeklyVolume.ts`<br>`apps/web/src/lib/socket.ts` |
| 変更禁止ファイル | `apps/api/internal/handler/volume.go` (API 仕様変更不可) |
| エッジケーステスト | Playwright `realtime.spec.ts`: Scenario#2 保存→2秒以内更新確認 |

---

### **Task 7 – オフライン & エラー UI** *(~210 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/components/OfflineToast.tsx`<br>`apps/web/src/components/ErrorBoundary.tsx` |
| 変更禁止ファイル | Service Worker 登録スクリプト (編集は Task11) |
| エッジケーステスト | Lighthouse – offline 模式で Scenario#7<br>Playwright – API stub 5xx で Scenario#8 UI 確認 |

---

### **Task 8 – パフォーマンス最適化 & Virtualized List** *(~220 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/components/WeeklyVolumeChart.tsx` (追加実装のみ)<br>`apps/web/src/hooks/useVirtualizedVolume.ts` |
| 変更禁止ファイル | `apps/web/src/pages/Dashboard.tsx` (レイアウト変更不可) |
| エッジケーステスト | vitest `fps.test.ts` – 55 FPS 以上<br>k6 script `load.js` – P95 <200ms |

---

### **Task 9 – 期間 & グラフ形式トグル** *(~240 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/components/Controls/PeriodToggle.tsx`<br>`apps/web/src/components/Controls/ChartTypeToggle.tsx` |
| 変更禁止ファイル | `apps/web/src/components/WeeklyVolumeChart.tsx` （レンダリング API 変更不可） |
| エッジケーステスト | Playwright `toggle.spec.ts`: Scenario#12 & #13 設定保持確認 |

---

### **Task 10 – CSV エクスポート** *(~200 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/api/internal/handler/export.go`<br>`apps/web/src/components/ExportButton.tsx` |
| 変更禁止ファイル | `apps/web/src/hooks/useWeeklyVolume.ts` (fetch 形式保持) |
| エッジケーステスト | vitest `export.test.ts` – ファイル名に期間含む<br>Playwright `export.spec.ts` – ダウンロード検証 |

---

### **Task 11 – アクセシビリティ & i18n 強化** *(~250 行)*
| | 内容 |
|---|---|
| ゴールファイル | `apps/web/src/i18n/messages.{ja,en}.json`<br>`apps/web/src/components/AccessibleGraph.tsx`<br>`apps/web/src/serviceWorker.ts` (オフラインラベル) |
| 変更禁止ファイル | `apps/web/src/components/ErrorBoundary.tsx` (文言のみ変更可) |
| エッジケーステスト | axe-playwright 全ページ – 0 error<br>Jest `i18n.test.ts` – 多言語切替保証 |

---

### **Task 12 – CI/CD & Rollback スクリプト** *(~200 行)*
| | 内容 |
|---|---|
| ゴールファイル | `.github/workflows/deploy.yml`<br>`config/fly/rollback.sh` |
| 変更禁止ファイル | 既存 GitHub Actions ワークフロー (lint/test) |
| エッジケーステスト | Act でモックデプロイ – Canary 5% 成功時 Stable へ昇格<br>Bats `rollback.bats` – 障害シグナル時自動ロールバック |

---

## 📖 運用ルール
* **1 タスク = 1 ブランチ = 1 PR**
* Reviewer: Lead ⇒ QA ⇒ Author merge
* 全ての PR は上記「エッジケーステスト」を **必須通過**
* 変更禁止ファイルへの差分がある場合、CI で PR を `changes‑requested` ラベル付与

---

> 🙌 **これで以上です。** そのままコピーして管理シートや GitHub Projects に貼り付けてご利用ください。

