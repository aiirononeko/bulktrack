import type { LoaderFunctionArgs } from "react-router";
import type { MenuApiResponse } from "../../_index/type"; // 一覧画面の型定義を流用

// TODO: APIから特定のメニューデータを取得する処理を実装する
export async function loader({ params, context }: LoaderFunctionArgs) {
  const menuId = params.menuId;
  if (!menuId) {
    throw new Response("Menu ID is required", { status: 400 });
  }

  console.log(`Fetching menu data for ID: ${menuId}`);
  const env = context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus/${menuId}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Response("Menu not found", { status: 404 });
      }
      let errorMessage = `Failed to fetch menu ${menuId}`;
      try {
        const errorBody = (await response.json()) as { message?: string };
        errorMessage = errorBody.message || errorMessage;
      } catch (e) {
        /* ignore json parsing error */
      }
      console.error(`API Error (${response.status}): ${errorMessage}`);
      throw new Response(errorMessage, { status: response.status });
    }

    const menu = (await response.json()) as MenuApiResponse;
    console.log("Successfully fetched menu:", menu);

    // フロントエンドで使う形式に変換（必要なら）
    const formattedMenu = {
      id: menu.id,
      name: menu.name,
      // TODO: menu_items も取得・変換する
    };

    return { menu: formattedMenu };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);
    // エラーをそのままスローしてエラーバウンダリで処理
    throw error;
  }
}
