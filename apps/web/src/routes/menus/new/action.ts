import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import type { Route } from "./+types/route";

// 送信するメニュー項目の型 (バックエンドの MenuItemInput に合わせる)
interface MenuItemToSend {
  exercise_id: string;
  set_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_interval_seconds: number | null;
}

export async function action(args: Route.ActionArgs) {
  const { userId, getToken } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const token = await getToken();

  const env = args.context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus`;

  const formData = await args.request.formData();
  const menuName = formData.get("name") as string;
  const descriptionRaw = formData.get("description"); // まずそのまま取得
  const itemsJson = formData.get("items") as string | null;

  if (!menuName) {
    return { error: "メニュー名は必須です。" };
  }

  let items: MenuItemToSend[] = [];
  if (itemsJson) {
    try {
      items = JSON.parse(itemsJson); // JSON 文字列をパース
      // TODO: パース後のデータバリデーション (zodなど)
      if (!Array.isArray(items)) {
        throw new Error("Items data is not an array");
      }
    } catch (e) {
      console.error("Failed to parse items JSON:", e);
      return { error: "メニュー項目のデータの形式が不正です。" };
    }
  } else {
    // items が空の場合の処理 (空のメニューを許可しない場合はここでエラー)
    // return { error: "メニュー項目は少なくとも1つ必要です。" };
  }

  // description が空文字列や null の場合は null に変換
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim() !== ""
      ? descriptionRaw.trim()
      : null;

  console.log("Creating menu object:", { name: menuName, description, items }); // 送信するデータを確認

  try {
    const payload = { name: menuName, description, items }; // description をペイロードに含める
    const bodyString = JSON.stringify(payload); // 文字列化

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: bodyString, // 文字列化した body を使用
    });

    if (!response.ok) {
      let errorMessage = "メニューの作成に失敗しました。";
      try {
        const errorBody = (await response.json()) as { message?: string };
        errorMessage = errorBody.message || errorMessage;
      } catch (e) {
        /* ignore json parsing error */
      }
      console.error(`API Error (${response.status}): ${errorMessage}`);
      return { error: errorMessage };
    }

    // 成功時はメニュー一覧にリダイレクト
    console.log("Menu created successfully, redirecting to /menus");
    return redirect("/menus");
  } catch (error) {
    console.error("Error creating menu:", error);
    return { error: "メニューの作成中に予期せぬエラーが発生しました。" };
  }
}
