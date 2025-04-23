import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";
import type { MenuApiResponse } from "../../_index/types";
import type { Route } from "./+types/route";

// APIレスポンスの menu_items に name と description が含まれると仮定
interface MenuItemFromApi {
  exercise_id: string;
  sets: number;
  reps: number;
  exercise_name?: string; // 仮定
  exercise_description?: string; // 仮定
  // 他の exercise 関連フィールド
}

// MenuDetailApiResponse を拡張
interface MenuDetailApiResponse extends MenuApiResponse {
  description?: string;
  menu_items?: MenuItemFromApi[]; // 更新された型を使用
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    throw new Response("Menu ID is required", { status: 400 });
  }

  try {
    const response = await apiFetch(args, `/menus/${menuId}`);
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

    const menu = (await response.json()) as MenuDetailApiResponse;
    console.log("Successfully fetched menu:", menu);

    // exercises の変換時に name と description を含める
    const formattedMenu = {
      id: menu.id,
      name: menu.name,
      description: menu.description || "",
      exercises:
        menu.menu_items?.map((item) => ({
          id: item.exercise_id,
          sets: item.sets,
          reps: item.reps,
          name: item.exercise_name || "(不明な種目)", // name を追加 (APIレスポンスに依存)
          description: item.exercise_description || "", // description を追加 (APIレスポンスに依存)
        })) || [],
    };

    return { menu: formattedMenu };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);
    throw error;
  }
}
