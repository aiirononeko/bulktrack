import type { LoaderFunctionArgs } from "react-router";

import type { SelectableMenu } from "./types";

export async function loader({ context }: LoaderFunctionArgs) {
  console.log("Loader (route.tsx): Fetching menu list from API...");
  try {
    const env = context.cloudflare.env;
    const baseUrl = env?.API_URL || "http://localhost:8080";
    const apiUrl = `${baseUrl}/menus`;
    console.log(`Loader (route.tsx): Using API URL: ${apiUrl}`); // 使用するURLをログ出力

    const response = await fetch(apiUrl);

    if (!response.ok) {
      // APIエラーハンドリング
      console.error(`API error: ${response.status} ${response.statusText}`);
      // エラーレスポンスの内容もログに出す (もしあれば)
      try {
        const errorBody = await response.json();
        console.error("Error body:", errorBody);
      } catch (e) {
        // JSONパース失敗
      }
      // ここでは空のメニューリストを返すか、エラーをスローするかを選択
      // return { menus: [] };
      throw new Response("Failed to fetch menus", { status: response.status });
    }

    // JSONレスポンスをパース
    const menus = (await response.json()) as SelectableMenu[]; // 型アサーション
    console.log("Loader (route.tsx): Successfully fetched menus:", menus);

    return { menus }; // APIから取得した menus を返す
  } catch (error) {
    console.error("Loader (route.tsx): Network or other error fetching menus:", error);
    // ネットワークエラーなどの場合も同様に処理
    // return { menus: [] };
    throw new Response("Network error or other issue fetching menus", { status: 500 });
  }
}
