import { useLoaderData, useNavigation, useParams } from "react-router";
import { MenuForm } from "../../components/menu-form";
import type { MenuDetail } from "../../components/types"; // MenuFormと同じ型定義を使用
import { action } from "./action";
import { loader } from "./loader";

export { loader, action };

export default function EditMenuRoute() {
  const { menu } = useLoaderData() as { menu: MenuDetail };
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const params = useParams(); // menuId を取得するため

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">メニュー編集: {params.menuId}</h1>
      <p className="text-sm text-muted-foreground mb-4">メニューの内容を編集します。</p>
      <MenuForm initialData={menu} isSubmitting={isSubmitting} />
    </div>
  );
}
