import { useLoaderData, useNavigation } from "react-router";

import { MenuForm } from "../components/menu-form";

import { action } from "./action";
import { loader } from "./loader";

export default function NewMenuRoute() {
  const { exercises } = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規メニュー作成</h1>
      <p className="text-sm text-muted-foreground mb-4">新しいトレーニングメニューを作成します。</p>
      <MenuForm isSubmitting={isSubmitting} exercises={exercises} />
    </div>
  );
}

export { action, loader };
