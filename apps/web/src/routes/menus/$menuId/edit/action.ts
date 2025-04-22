import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

export async function action({ request, params, context }: ActionFunctionArgs) {
  const menuId = params.menuId;
  if (!menuId) {
    return { error: "メニューIDが指定されていません。" };
  }

  const formData = await request.formData();
  const updatedName = formData.get("name") as string; // フォームから名前を取得

  if (!updatedName) {
    return { error: "メニュー名は必須です。" };
  }

  console.log(`Updating menu ${menuId} with name:`, updatedName);

  const env = context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";
  // TODO: バックエンドのAPI設計に合わせて PATCH /menus/{id} または PUT /menus/{id} を使用
  const apiUrl = `${baseUrl}/menus/${menuId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "PATCH", // APIがPATCHをサポートしていると仮定
      headers: { "Content-Type": "application/json" },
      // TODO: メニュー項目も更新する場合は body を修正
      body: JSON.stringify({ name: updatedName }),
    });

    if (!response.ok) {
      let errorMessage = "メニューの更新に失敗しました。";
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
    console.log(`Menu ${menuId} updated successfully, redirecting to /menus`);
    return redirect("/menus");
  } catch (error) {
    console.error(`Error updating menu ${menuId}:`, error);
    return { error: "メニューの更新中に予期せぬエラーが発生しました。" };
  }
}
