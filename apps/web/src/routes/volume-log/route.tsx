import { VolumeChart } from "./components/volume-chart";

export function meta() {
  return [
    { title: "ボリュームログ - BulkTrack" },
    { name: "description", content: "トレーニングボリュームの推移を確認" },
  ];
}

// データローダー
export async function loader() {
  // ここでボリュームデータを取得
  return {
    volumeData: [], // 実際のデータはAPI等から取得
  };
}

export default function VolumeLog() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ボリュームログ</h1>
      </div>

      <VolumeChart />
    </div>
  );
}
