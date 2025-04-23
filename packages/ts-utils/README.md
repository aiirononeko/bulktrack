# ts-utils

BulkTrack アプリケーションで使用される共通ユーティリティライブラリです。フロントエンドとバックエンド間の型安全な通信を提供します。

## 構造

```
src/
├── api/                   # API関連機能
│   ├── client.ts          # 基本的なAPIクライアント関数
│   ├── endpoints/         # リソース別のAPI関数
│   │   ├── exercises.ts   # 種目関連のAPI
│   │   └── menus.ts       # メニュー関連のAPI
│   └── types/             # API型定義
│       ├── common.ts      # 共通型定義
│       ├── exercises.ts   # 種目関連の型
│       └── menus.ts       # メニュー関連の型
└── index.ts               # エントリーポイント
```

## 特徴

- **型安全な API 通信**: リクエスト/レスポンスの型が完全に定義されています
- **自動認証トークン処理**: Clerk の認証トークンが自動的にリクエストヘッダーに追加されます
- **リソース指向の API 関数**: リソースごとにメソッドが整理されています
- **統一エラーハンドリング**: すべての API 呼び出しで一貫したエラー処理が行われます

## 使用方法

### 1. 型定義のインポート

```typescript
import { Menu, Exercise, MenuCreateRequest } from "ts-utils";
```

### 2. API 関数の使用

#### loader 関数での使用例

```typescript
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { getMenus } from "ts-utils";
import type { Route } from "./+types/route";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    // 型安全なAPI呼び出し
    // 認証トークンは自動的にリクエストヘッダーに追加されます
    const menus = await getMenus(args);
    return { menus };
  } catch (error) {
    console.error("Error fetching menus:", error);
    return { menus: [] };
  }
}
```

#### action 関数での使用例

```typescript
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { createMenu } from "ts-utils";
import type { Route } from "./+types/route";
import { MenuFormSchema } from "./schema";

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/signin");
  }

  // フォームデータの取得
  const formData = await args.request.formData();
  const result = MenuFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  try {
    // 型安全なAPI呼び出し
    // 認証トークンは自動的にリクエストヘッダーに追加されます
    const newMenu = await createMenu(args, result.data);
    return redirect(`/menus/${newMenu.id}`);
  } catch (error) {
    console.error("Error creating menu:", error);
    return { error: "メニューの作成に失敗しました" };
  }
}
```

### 3. 新しいエンドポイントの追加方法

1. `src/api/types/` に新しいリソースの型定義ファイルを追加
2. `src/api/endpoints/` に新しい API エンドポイント関数を実装
3. インデックスファイルからエクスポート

## 認証について

API リクエストには自動的に Clerk 認証トークンが`Authorization: Bearer <token>`ヘッダーとして追加されます。
これにより、バックエンド API でのトークン検証と認可が可能になります。

```typescript
// client.ts内の実装（抜粋）
if ("params" in args) {
  // LoaderFunctionArgs または ActionFunctionArgs の場合に getAuth を使用
  const { getToken } = await getAuth(args);
  const token = await getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
}
```

## 開発

```bash
# 依存関係のインストール
pnpm install

# 開発モード（ビルドの監視）
pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm typecheck
```
