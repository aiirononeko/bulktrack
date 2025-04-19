import { useLoaderData } from "react-router";

type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

type VolumeData = {
  week: string;
  volumes: Record<MuscleGroup, number>;
};

export function VolumeChart() {
  const { volumeData } = useLoaderData() as { volumeData: VolumeData[] };

  if (volumeData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          トレーニングを記録すると、ここにボリュームの推移が表示されます
        </p>
      </div>
    );
  }

  // 実際のチャート表示を実装
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">週間トレーニングボリューム</h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">ここにチャートが表示されます</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">部位別ボリューム</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {["chest", "back", "legs", "shoulders", "arms", "core"].map((muscle) => (
            <div key={muscle} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2 capitalize">{muscle}</h3>
              <p className="text-lg font-bold">0 kg</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
