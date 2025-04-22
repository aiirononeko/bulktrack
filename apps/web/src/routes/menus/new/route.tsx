import { useNavigation } from "react-router";
import { MenuForm } from "../components/menu-form";
import { action } from "./action";

export { action };

export default function NewMenuRoute() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規メニュー作成</h1>
      <p className="text-sm text-muted-foreground mb-4">新しいトレーニングメニューを作成します。</p>
      <MenuForm isSubmitting={isSubmitting} />
    </div>
  );
}
