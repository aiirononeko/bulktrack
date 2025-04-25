# AI 支援開発ワークフロー（BulkTrack）

> **目的**: 本ドキュメントは、BulkTrack リポジトリで **Cline**（および補助的に GPT o3 (Web UI) / Claude 3.7）を活用して計画 → 実装 → レビュー → 運用を回すための標準フローを定義します。スプリントごとのふりかえりで本ファイルも更新してください。

---

## 🗺️ ハイレベルフロー

| フェーズ                 | 推奨アクション                                                                                                                                                                   | 使用モデル／ツール                    | 補足                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| **0 ルール整備**         | 既存 `.clinerules` を棚卸しし、**コードスタイル**・**禁止操作**・**CI 合格条件** を明文化。まずは **CursorRules Hub** などのテンプレートをコピーしてプロジェクトに合わせて修正。 | ✍️ 手動 (Web UI) + 🤖 GPT o3 (Web UI) | テンプレ集: <https://cursorrules.org> |
| **1‑A 要件ドラフト**     | GPT o3 (Web UI) と壁打ちし、以下を必ず含む **Markdown 仕様書** を生成: ① 受け入れ基準（テストケース）② 非機能要件（性能・セキュリティ）③ 依存関係                                | GPT o3 (Web UI)                       | プロンプト例は下部参照                |
| **1‑B 仕様レビュー**     | Claude 3.7 Sonnet で仕様をレビューし、抜け漏れ・矛盾を指摘させる                                                                                                                 | Claude 3.7                            | ギャップ検知が得意                    |
| **2 実装スプリント**     | 作業を **200〜300 行** 規模に分割し、各タスクに ① ゴールファイル ② 変更禁止ファイル ③ エッジケーステスト を付与                                                                  | Cline（Code モード）                  | チャンクが小さいほどルール逸脱が減少  |
| **3 自動セルフレビュー** | 生成直後に **自己評価プロンプト** を実行し、Lint/型検査/テストに通るかを 0‑100% で判定。90% 未満なら自動で修正案を出力                                                           | Cline Architect モード                | `.clinerules` でモード自動切替設定    |
| **4 CI / CD**            | ヒューマンレビュー → CI 実行: ① 静的解析 ② 単体 + e2e テスト ③ 脆弱性スキャン。失敗したら **patch‑only PR** を自動生成                                                           | GitHub Actions + Cline                | グリーンになるまで再試行              |
| **5 回顧 & ルール更新**  | スプリント終了後、失敗原因を抽出し `.clinerules` に追記。次サイクルの GPT o3 (Web UI) 壁打ちで読み込ませる                                                                       | ✍️ 手動 + GPT o3 (Web UI)             | ルールは生き物！                      |

---

## 🎯 サンプルプロンプト

> **注**: モデルは英語入力の方が一貫した結果を返しやすい傾向があります。下記では **日本語プロンプト** と **推奨英語プロンプト** を併記しています。チームの慣れに合わせて選択してください。

### 1‑A 要件ドラフト（GPT o3 (Web UI)）

<details>
<summary>日本語プロンプト</summary>

```text
あなたは QA エンジニアです。以下を必ず含む Markdown 仕様書を作成してください。
1. 受け入れ基準（Given‑When‑Then 形式）
2. 非機能要件（性能目標、セキュリティ制約）
3. 外部依存とバージョン制約
機能: "ワークアウトセッションを Google Sheets に CSV エクスポートする"
```

</details>

<details>
<summary>推奨英語プロンプト</summary>

```text
You are a QA engineer.
Produce a **Markdown spec** containing:
1. Acceptance criteria (Given‑When‑Then)
2. Non‑functional requirements (performance budgets, security constraints)
3. External dependencies & version constraints
Feature: "Export workout sessions to Google Sheets as CSV".
```

</details>

### 1‑B 仕様レビュー（Claude 3.7）

```text
役割: シニアアーキテクト。以下の仕様書をレビューし、
- 受け入れ基準の抜け
- 性能/セキュリティ要件の曖昧さ
- 具体的な改善提案（最大 5 件）
を指摘してください。
```

### 2 実装タスク（Cline に渡す）

````text
### Context
- Tech Stack: React 19 / React‑Router 7 (framework) / Cloudflare Workers / Go 1.24
- Out‑of‑scope: scripts/, infra/
- Lint/Type rules: follow .clinerules v1.1

### Task
1. Create `apps/web/src/components/ExportDialog.tsx` ...
2. Update `apps/web/src/routes/dashboard.tsx` to use it.

### Acceptance
- `pnpm test --filter export-dialog` passes
- CLS ≤ 0.1 (Web‑Vitals)

### Self‑check
```bash
pnpm lint && pnpm typecheck && pnpm test
````

失敗したら最大 2 回自動修正し、人間に確認を求める。

````

### 3 セルフレビュー（Architect モード）
```text
最新差分を評価してください。
1. Lint/型検査/単体テストに通る確率 (0‑100%)
2. 90% 未満なら最小パッチを提案
短い要約 + patch を返してください。
````

### 4 CI 失敗時のパッチ（PMO モード）

```text
CI ジョブ *backend-tests* が失敗しました。
<エラーログ抜粋>
関連ファイルのみを修正する **patch‑only PR** を作成し、PR 本文に簡潔な説明を含めてください。
```

### 5 ふりかえり

```text
役割: PMO。
このスプリントの失敗を要約し、再発防止のために追加する新ルール案を Markdown 箇条書きで出力してください。（見出し: "Rule additions"）
```

---

## 📌 運用メモ

- 本ファイルは `docs/AI_Coding_Workflow.md` に配置し、PR から直接リンクしてチームへ周知します。
- `.clinerules` と内容がズレたら必ず両方を更新してください。
- モデルへのプロンプトは **英語の方が一貫性・再現性が高い** ため、チームが許容できれば英語を推奨します。日本語でも動作はしますが、稀に形式ブレが増える傾向があります。
