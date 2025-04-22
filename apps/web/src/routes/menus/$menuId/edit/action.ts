import { redirect } from "react-router";

import { getAuth } from "@clerk/react-router/ssr.server";
import { apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/route";

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    return { error: "メニューIDが指定されていません。" };
  }

  const formData = await args.request.formData();
  const updatedName = formData.get("name") as string;

  if (!updatedName) {
    return { error: "メニュー名は必須です。" };
  }

  try {
    const response = await apiFetch(args, `/menus/${menuId}`, {
      method: "PATCH",
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
