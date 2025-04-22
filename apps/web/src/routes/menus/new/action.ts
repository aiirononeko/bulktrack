import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const menuName = formData.get("name") as string; // フォームから名前を取得

  if (!menuName) {
    return { error: "メニュー名は必須です。" };
  }

  console.log("Creating menu with name:", menuName);

  const env = context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  const apiUrl = `${baseUrl}/menus`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // TODO: メニュー項目も送信する場合は body を修正
      body: JSON.stringify({ name: menuName }),
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
