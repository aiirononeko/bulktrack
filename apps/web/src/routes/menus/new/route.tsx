import { useLoaderData, useNavigation } from "react-router";
import { MenuForm } from "../components/menu-form";
import { action } from "./action";
import { loader } from "./loader";

export { action, loader };

interface LoaderData {
  exercises: { id: string; name: string }[];
}

export default function NewMenuRoute() {
  const navigation = useNavigation();
  const { exercises } = useLoaderData() as LoaderData;
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規メニュー作成</h1>
      <p className="text-sm text-muted-foreground mb-4">新しいトレーニングメニューを作成します。</p>
      <MenuForm isSubmitting={isSubmitting} exercises={exercises} />
    </div>
  );
}
