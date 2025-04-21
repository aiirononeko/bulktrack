import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const menuId = params.menuId; // ActionFunctionArgs から取得

  // ここでデータを処理、保存 (menuId も含めて)
  console.log(`Workout Data for menuId: ${menuId}`, Object.fromEntries(formData));

  // 保存後はワークアウト一覧ページなどにリダイレクト
  // 例: return redirect("/workouts");
  // 今は仮にメニュー選択に戻る
  return redirect("/workouts/new");
}
