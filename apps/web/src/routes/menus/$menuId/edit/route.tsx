import { useLoaderData, useNavigation } from "react-router";

import { MenuForm } from "../../components/menu-form";

import { action } from "./action";
import { loader } from "./loader";

export default function EditMenuRoute() {
  const { menu, exercises } = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">メニュー編集</h1>
      <p className="text-sm text-muted-foreground mb-4">メニューの内容を編集します。</p>
      <MenuForm initialData={menu} exercises={exercises} isSubmitting={isSubmitting} />
    </div>
  );
}

export { loader, action };
