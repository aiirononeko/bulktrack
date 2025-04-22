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
  const itemsJson = formData.get("items") as string | null; // items を JSON 文字列として取得

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

  console.log("Creating menu:", { name: menuName, items }); // 送信するデータを確認

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: menuName, items }), // name と items を送信
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
