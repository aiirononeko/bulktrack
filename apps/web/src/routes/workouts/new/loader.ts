import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import type { Route } from "./+types/route";
import type { SelectableMenu } from "./types";

export async function loader(args: Route.LoaderArgs) {
  try {
    const { userId, getToken } = await getAuth(args);
    if (!userId) {
      return redirect(`/signin?redirect_url=${args.request.url}`);
    }

    const env = args.context.cloudflare.env;
    const baseUrl = env?.API_URL || "http://localhost:5555";
    const apiUrl = `${baseUrl}/menus`;
    const token = await getToken();

    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

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

    return { menus }; // APIから取得した menus を返す
  } catch (error) {
    console.error("Loader (route.tsx): Network or other error fetching menus:", error);
    // ネットワークエラーなどの場合も同様に処理
    // return { menus: [] };
    throw new Response("Network error or other issue fetching menus", { status: 500 });
  }
}
