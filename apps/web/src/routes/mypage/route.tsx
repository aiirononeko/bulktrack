import { SignOutButton } from "@clerk/react-router";
import { useState } from "react";
import { useLoaderData } from "react-router";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

import { loader } from "./loader";

export default function MyPage() {
  const { user } = useLoaderData<typeof loader>();
  const [intensityMode, setIntensityMode] = useState<"rir" | "rpe">("rir");

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>

      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">登録情報</h2>
        <p className="text-gray-700">
          メールアドレス: {user.emailAddresses[0]?.emailAddress || "取得できませんでした"}
        </p>
      </div>

      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">トレーニング設定</h2>
        <RadioGroup
          value={intensityMode}
          onValueChange={(value: "rir" | "rpe") => setIntensityMode(value)}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="rir" id="rir-mode" />
            <Label htmlFor="rir-mode">RIR (Reps in Reserve) モード</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="rpe" id="rpe-mode" />
            <Label htmlFor="rpe-mode">RPE (Rating of Perceived Exertion) モード</Label>
          </div>
        </RadioGroup>
        <p className="mt-4 text-sm text-gray-600">
          現在の設定: {intensityMode === "rir" ? "RIR モード" : "RPE モード"}
          <br />
          （現在この設定は保存されません）
        </p>
      </div>

      <div className="mt-8 pt-6 border-t">
        <SignOutButton redirectUrl="/">
          <Button variant="outline">ログアウト</Button>
        </SignOutButton>
      </div>
    </div>
  );
}

export { loader };
