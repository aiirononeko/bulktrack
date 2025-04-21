import type { WeeklyVolume } from "../types";

type VolumeDashboardProps = {
  weeklyVolumes: WeeklyVolume[];
};

export function VolumeDashboard({ weeklyVolumes }: VolumeDashboardProps) {
  if (!weeklyVolumes || weeklyVolumes.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
        <p className="text-muted-foreground">トレーニング記録がありません。</p>
      </div>
    );
  }

  // 週の開始日をフォーマットするヘルパー関数
  const formatWeekStartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-base font-medium">週間トレーニングボリューム</h3>
        {/* ここにグラフアイコンなどを追加可能 */}
      </div>
      <div className="p-6 pt-0">
        <ul className="space-y-3">
          {weeklyVolumes.map((week) => (
            <li
              key={week.weekStartDate}
              className="flex justify-between items-center py-2 border-b last:border-b-0"
            >
              <span className="text-sm text-muted-foreground">
                {formatWeekStartDate(week.weekStartDate)} 週
              </span>
              <span className="text-base font-semibold">
                {week.totalVolume.toLocaleString()} kg
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
