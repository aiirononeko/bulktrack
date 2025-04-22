import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";
import type { MenuApiResponse } from "../../_index/type";
import type { Route } from "./+types/route";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    throw new Response("Menu ID is required", { status: 400 });
  }

  const env = args.context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus/${menuId}`;

  try {
    const response = await apiFetch(args, apiUrl);
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
