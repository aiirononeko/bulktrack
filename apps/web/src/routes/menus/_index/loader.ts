import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";

import type { Route } from "./+types/route";
import { formatMenusFromApi, validateMenuListApiResponse } from "./schema";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    // APIからメニュー一覧を取得
    const response = await apiFetch(args, "/menus");
    if (!response.ok) {
      console.error(`Failed to fetch menus: ${response.status} ${response.statusText}`);
      throw new Response("メニュー一覧の取得に失敗しました", { status: response.status });
    }

    // APIレスポンスを取得
    const rawData = await response.json();

    try {
      // APIレスポンスをZodスキーマでバリデーション
      const menuData = validateMenuListApiResponse(rawData);

      // フォーマット済みのメニュー一覧を返す
      const formattedMenus = formatMenusFromApi(menuData);
      return { menus: formattedMenus };
    } catch (validationError) {
      console.error("Validation error:", validationError);
      // バリデーションエラーが発生しても最低限のデータを返す
      return { menus: [] };
    }
  } catch (error) {
    console.error("Error fetching menus:", error);

    if (error instanceof Response) {
      throw error;
    }

    throw new Response("メニュー一覧の取得中にエラーが発生しました", { status: 500 });
  }
}
