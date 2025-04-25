# メニュー機能リファクタリング – QA 仕様書 v2
対象リポジトリ: <https://github.com/aiirononeko/bulktrack>

---

## 1. 受け入れ基準（Gherkin Given‑When‑Then）

### 1.1 メニュー一覧取得 `GET /menus`
| No | シナリオ | Given | When | Then |
|----|----------|-------|------|------|
| 1‑1 | 正常 – 第1ページ取得 | 有効 Clerk JWT | `/menus?limit=20` | 200 OK / `data`配列(≤20件)・`nextCursor` を返す |
| 1‑2 | 正常 – 続き取得 | `nextCursor` を保持 | `/menus?cursor=<nextCursor>` | 200 OK / 次ページ・終端時 `nextCursor=null` |
| 1‑3 | パラメータ不正 | `limit` > 100 または負数 | GET | 400 + `ERROR.INVALID_LIMIT` |
| 1‑4 | 未認証 | JWT 無効/欠落 | GET | 401 + `ERROR.UNAUTHORIZED` |

### 1.2 メニュー作成 `POST /menus`
| No | シナリオ | Given | When | Then |
|----|----------|-------|------|------|
| 2‑1 | 正常 | 必須 `name`, `items[]` | POST | 201 / `MenuResponse` |
| 2‑2 | 名称重複 | 同一ユーザーに同名 | POST | 409 + `ERROR.DUPLICATE_NAME` |
| 2‑3 | 配列最大超過 | `items` 件数 > 100 | POST | 400 + `ERROR.ITEMS_TOO_MANY` |
| 2‑4 | 不存在 exercise_id | `items[0].exercise_id` が DB に無い | POST | 404 + `ERROR.EXERCISE_NOT_FOUND` |
| 2‑5 | JSON 型不整合 | 文字列に数値 etc. | POST | 400 + `ERROR.VALIDATION_ERROR` |

### 1.3 メニュー更新 `PUT /menus/{id}`
| No | シナリオ | Given | When | Then |
|----|----------|-------|------|------|
| 3‑1 | 正常 – 全更新 | 所有ユーザー JWT + `If‑Match: W/"v1"` | PUT | 200 / `ETag: W/"v2"` |
| 3‑2 | 競合 | `If‑Match` と DB の version 不一致 | PUT | 412 + `ERROR.VERSION_MISMATCH` |
| 3‑3 | 権限外 | 他ユーザーの ID | PUT | 403 + `ERROR.FORBIDDEN` |
| 3‑4 | 不存在 ID | UUID 存在せず | PUT | 404 + `ERROR.NOT_FOUND` |

### 1.4 メニュー削除 `DELETE /menus/{id}`
| No | シナリオ | Given | When | Then |
|----|----------|-------|------|------|
| 4‑1 | 正常 | 所有ユーザー JWT | DELETE | 204 No Content (物理削除) |
| 4‑2 | 権限外 | 他ユーザー ID | DELETE | 403 |
| 4‑3 | 不存在 ID | UUID 無 | DELETE | 404 |

### 1.5 一括作成 `POST /menus/batch-create`
| No | シナリオ | Given | When | Then |
|----|----------|-------|------|------|
| 5‑1 | 正常 – 全成功 | 10 件以下の配列 | POST | 201 / 作成済み配列 |
| 5‑2 | 部分失敗 → 全ロールバック | 1件が重複名 | POST | 409 / すべて未作成 |

---

## 2. API 共通仕様

### 2.1 統一エラーレスポンス
```json
{
  "error": {
    "code": "ERROR.VALIDATION_ERROR",
    "message": "メニュー名が重複しています",
    "details": [{
      "field": "name",
      "reason": "DUPLICATE"
    }]
  }
}
```
- `code`: **SCREAMING_SNAKE** + `.` 区切り名前空間
- `message`: 開発者向け日本語または英語
- `details`: 任意。フィールド単位の理由

### 2.2 競合制御 (Optimistic Lock)
- `ETag: W/"v{integer}"` を `GET /menus/{id}` と更新系レスポンスで返却
- 更新系は `If‑Match` 必須。欠落時 428 Precondition Required

### 2.3 キャッシュ & ページング
| 項目 | ポリシー |
|------|----------|
| 一覧 | `Cache-Control: private, max-age=60, stale-while-revalidate=30` |
| 単体 | `Cache-Control: private, max-age=0, must-revalidate` |
| 条件付き | 304 Not Modified を返却（`If-None-Match`） |
| ページング | Cursor ベース。`limit` ≤ 100。`nextCursor` Base64URL |

---

## 3. バリデーション一覧
| フィールド | 型 | 制約 |
|------------|----|------|
| `name` | string | 1‑50 文字／前後空白トリム / UTF‑8 含む |
| `items` | array | **1‑100 要素** |
| `items[*].set_order` | int | 1‑100／重複禁止 |
| `items[*].exercise_id` | UUID | exercises テーブルに存在必須 |
| `planned_sets` / `planned_reps` | int | 1‑999 nullable |
| `planned_interval_seconds` | int | 1‑999 nullable |

---

## 4. 非機能要件

### 4.1 性能
| 指標 | 目標 |
|------|------|
| P95 レイテンシ | < 200 ms (GET), < 300 ms (POST/PUT/DELETE) |
| スループット | **500 RPS** まで *線形スケール*: RPS を 2× にしたとき CPU 使用率も ≦1.8×, レイテンシ増加 ≦15 % |
| 同接テスト | k6 にて 5 min 持続負荷で指標達成 |

### 4.2 可用性・回復性
| 項目 | 要件 |
|------|------|
| RTO | **30 s** 未満：Fly.io VM 再起動シミュレーションで計測 (watchdog + health check) |
| RPO | 0 (Neon の即時 WAL ストリーミング) |

### 4.3 セキュリティ
- **OWASP Top10 2023** すべて対策を追跡項目に追加 (A01–A10)
- JWT HS256 → RS256 検証
- Rate‑Limit: 60 RPM/IP 非認証, 240 RPM/IP 認証
- 個人情報ログ出力禁止。`email`, `jwt`, `ip` は SHA‑256 マスク

### 4.4 オブザーバビリティ
| レイヤ | 収集 |
|--------|------|
| メトリクス | Prometheus `/metrics`: http_req_total, http_req_duration_seconds_bucket, http_error_total |
| ログ | Zap JSON (`level`,`method`,`path`,`status`,`latency_ms`,`user_id`) |
| トレース | OpenTelemetry (OTLP) → Grafana Tempo。span: handler, db.Query |

---

## 5. 外部依存 & バージョン制約
変更なし

---

## 6. 参考スキーマ
```sql
-- 変更なし (menus, menu_items)
```

---

## 7. テスト戦略

### 7.1 単体テスト
- 標準パッケージ testing を使用し、テーブルドリブン形式で網羅率を高める。
- アサーション／モックは testing + Assertions/Mocksを採用。

### 7.2 統合テスト
- testcontainers-go で PostgreSQL、Clerk Mock サービスを Docker 上に起動。
- go test -tags=integration ./... で実行し、Container ライフサイクルは自動管理。
- testcontainers は Go モジュール依存のみで完結し、ホストに Docker さえあれば CI/CD で再現可能。

### 7.3 シナリオ / E2E テスト
- runn (YAML ベース) で API シナリオを宣言的に記述。
- セットアップ／アサーションも YAML で表現し、runn run e2e/ で実行。
- 生成されたレポート (JUnit, HTML) は GitHub Actions の Artifacts として公開。

### 7.4 CI/CD 組込例 (GitHub Actions)

| ジョブ         | 内容                                                                                     |
|----------------|------------------------------------------------------------------------------------------|
| lint‑test (Pull Request) | `go vet`, `golangci-lint` 実行。単体テスト & 統合テストを並列実行 (`testing`, `testcontainers-go`) |
| e2e (PR & main) | `runn run e2e/` をコンテナ上で実行し、JUnit 形式で結果を出力                                         |
| release (tag)  | 上記すべて通過後、`Docker build & push` → `Fly.io deploy`                                   |

---

## 8. グローバリゼーション対応

| 項目 | 方針 |
|------|------|
| 言語判定 | `Accept-Language` 最優先 → ユーザー設定 → `ja-JP` デフォルト |
| サポート言語 | `ja-JP`, `en-US` |
| メッセージ格納 | i18n JSON (`code` → `message`) を versioned Cloud Storage に配置 |
| UI & CSV | 区切り文字：ロケールごとに自動判定（JP = `,`、US = `,`）<br>日付フォーマット：ISO-8601 例 `2025-04-25` |

### 8.1 エラーメッセージ多言語化

- API が返す `error.message` を i18n テーブルから動的解決  
- 未訳キー → 英語をフォールバック  
- **統合テスト**：`Accept-Language: en-US` + `ERROR.DUPLICATE_NAME` ⇒ *“Menu name already exists”* を検証

### 8.2 タイムゾーン処理

| フィールド | ストレージ | API 出力 |
|------------|-----------|----------|
| `created_at` / `updated_at` | UTC (TIMESTAMP WITH TIME ZONE) | RFC 3339 (例 `2025-04-25T02:10:00Z`) |
| クライアント送信 | 任意 `tz` クエリ or `X-User-TZ` ヘッダを許可 (`Asia/Tokyo` 等) |
| 内部処理 | すべて UTC。クライアントへの表示はフロントで変換 |

---