import type { LoaderFunctionArgs } from "react-router";

// APIから取得する Exercise の型
interface Exercise {
  id: string;
  name: string;
}

// Loader 関数
export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/exercises`; // 種目リスト取得 API エンドポイント (仮定)

  try {
    const response = await fetch(apiUrl);

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
