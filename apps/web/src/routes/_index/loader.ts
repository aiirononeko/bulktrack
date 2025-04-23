import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/route";
import { getMockWeeklyVolumes } from "./schema";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    // 将来的にはAPIから取得するが、現在はモックデータを使用
    const weeklyVolumes = getMockWeeklyVolumes();
    return { weeklyVolumes };
  } catch (error) {
    console.error("Error loading weekly volumes:", error);
    return { weeklyVolumes: [] };
  }
}
