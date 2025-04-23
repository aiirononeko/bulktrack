import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { updateMenu } from "~/lib/api";
import type { Route } from "./+types/route";
import { type FormErrors, MenuUpdateSchema } from "./schema";

export async function action(args: Route.ActionArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    return { errors: { _form: ["メニューIDが指定されていません。"] } };
  }

  // フォームデータの取得
  const formData = await args.request.formData();
  const formValues = Object.fromEntries(formData);

  // Zodを使ったバリデーション
  const result = MenuUpdateSchema.safeParse(formValues);

  if (!result.success) {
    // バリデーションエラーの場合はエラーメッセージを返す
    const errors: FormErrors = {};
    const formattedErrors = result.error.format();

    // フィールド別のエラーメッセージを抽出
    if (formattedErrors.name?._errors) errors.name = formattedErrors.name._errors;
    if (formattedErrors.description?._errors)
      errors.description = formattedErrors.description._errors;

    return { errors };
  }

  try {
    // バリデーション済みデータでメニューを更新
    await updateMenu(args, menuId, result.data);

    // 成功時はメニュー一覧にリダイレクト
    return redirect("/menus");
  } catch (error) {
    console.error(`Error updating menu ${menuId}:`, error);

    // エラーメッセージを生成
    const errorMessage =
      error instanceof Error
        ? `メニューの更新に失敗しました: ${error.message}`
        : "メニューの更新中に予期せぬエラーが発生しました。";

    return {
      errors: { _form: [errorMessage] },
    };
  }
}
