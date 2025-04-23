import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/route";
import type { MenuApiResponse } from "./types";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    const response = await apiFetch(args, "/menus");
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

    // APIレスポンスをフロントエンドで使いやすい形式に変換
    const formattedMenus = menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      description: menu.description,
    }));

    return { menus: formattedMenus };
  } catch (error) {
    console.error("Error fetching menus:", error);
    return { menus: [] };
  }
}
