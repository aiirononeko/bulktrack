export function meta() {
  return [
    { title: "ボリュームログ - BulkTrack" },
    { name: "description", content: "トレーニングボリュームの推移を確認" },
  ];
}

export default function VolumeLog() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ボリュームログ</h1>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          トレーニングを記録すると、ここにボリュームの推移が表示されます
        </p>
      </div>
    </div>
  );
}
