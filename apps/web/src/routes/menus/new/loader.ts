import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/route";

interface Exercise {
  id: string;
  name: string;
}

export async function loader(args: Route.LoaderArgs) {
  const env = args.context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/exercises`; // 種目リスト取得 API エンドポイント (仮定)

  try {
    const { userId, getToken } = await getAuth(args);
    if (!userId) {
      return redirect(`/signin?redirect_url=${args.request.url}`);
    }

    const token = await getToken();

    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // API エラーの場合は空のリストを返すか、エラーを投げる
      console.error(`API Error (${response.status}): Failed to fetch exercises.`);
      // ここでは空リストを返すが、必要に応じてエラー処理を変更
      return { exercises: [] };
    }

    const exercises = (await response.json()) as Exercise[];
    console.log("Fetched exercises:", exercises);
    return { exercises }; // 取得した種目リストを返す
  } catch (error) {
    console.error("Error fetching exercises:", error);
    // ネットワークエラーなどの場合も空リストを返すか、エラーを投げる
    return { exercises: [] };
  }
}
