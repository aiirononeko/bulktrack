import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { getExercises, getMenu } from "~/lib/api";

import type { Route } from "./+types/route";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    throw new Response("Menu ID is required", { status: 400 });
  }

  try {
    // メニュー詳細を取得
    const menu = await getMenu(args, menuId);

    // 種目一覧を取得
    const exercises = await getExercises(args);

    return { menu, exercises };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);

    // エラーに応じた適切なレスポンスを返す
    if (error instanceof Response) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("not found")) {
      throw new Response("Menu not found", { status: 404 });
    }

    throw new Response("Failed to fetch menu", { status: 500 });
  }
}
