import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import type { Route } from "./+types/route";
import type { MenuApiResponse } from "./type";

export async function loader(args: Route.LoaderArgs) {
  const env = args.context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus`;

  const { userId, getToken } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const token = await getToken();

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
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
