import type { LoaderFunctionArgs } from "react-router";
import type { MenuApiResponse } from "./type"; // 型定義をインポート

// TODO: APIからメニュー一覧を取得する処理を実装する
export async function loader({ context }: LoaderFunctionArgs) {
  console.log("Fetching menus from API...");
  const env = context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`Failed to fetch menus: ${response.status} ${response.statusText}`);
      try {
        const errorBody = await response.json();
        console.error("Error details:", errorBody);
      } catch (e) {
        /* ignore json parsing error */
      }
      return { menus: [] }; // エラー時は空配列
    }

    const menus = (await response.json()) as MenuApiResponse[];
    console.log("Successfully fetched menus:", menus);

    // APIレスポンスをフロントエンドで使いやすい形式に変換
    const formattedMenus = menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      // 必要に応じて他のフィールドも追加
    }));

    return { menus: formattedMenus };
  } catch (error) {
    console.error("Error fetching menus:", error);
    return { menus: [] };
  }
}
