import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { getExercises } from "~/lib/api";

import type { Route } from "./+types/route";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    // 種目一覧を取得
    const exercises = await getExercises(args);
    return { exercises };
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return { exercises: [] };
  }
}
