import { ActivityIcon, TrendingUpIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { DashboardSettings, WeeklyVolume, WeeklyVolumeStats } from "../types";
import { exportWeeklyVolumesToCSV } from "../utils/export-csv";
import { ChartControls } from "./chart-controls";
import { StatusAlert } from "./status-alert";
import { VolumeStats } from "./volume-stats";
import { WeeklyVolumeChart } from "./weekly-volume-chart";

type VolumeDashboardProps = {
  weeklyVolumes: WeeklyVolume[];
  stats?: WeeklyVolumeStats | null;
  settings: DashboardSettings;
  isOffline?: boolean;
  error?: Error | null;
};

export function VolumeDashboard({
  weeklyVolumes,
  stats,
  settings,
  isOffline,
  error,
}: VolumeDashboardProps) {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = React.useState<string | undefined>(
    typeof window !== "undefined" && "localStorage" in window
      ? localStorage.getItem("weeklyVolumesLastUpdated") || undefined
      : undefined
  );

  // 再試行ハンドラー
  const handleRetry = () => {
    navigate(".", { replace: true });
  };

  // CSVエクスポートハンドラー
  const handleExportCSV = () => {
    exportWeeklyVolumesToCSV(weeklyVolumes, settings.period);
  };

  // 新規ユーザー（データなし）の場合
  if (!weeklyVolumes || weeklyVolumes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>週間トレーニングボリューム</CardTitle>
          <CardDescription>トレーニングを記録して、あなたの進捗を追跡しましょう。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <ActivityIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">トレーニング記録がありません</h3>
          <p className="text-muted-foreground mb-6">
            トレーニングを記録すると、ここに週間ボリュームのグラフが表示されます。
          </p>
        </CardContent>
      </Card>
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
    <div className="space-y-4">
      {/* オフライン/エラー通知 */}
      <StatusAlert
        isOffline={isOffline}
        error={error}
        onRetry={handleRetry}
        lastUpdated={lastUpdated}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5" />
                週間トレーニングボリューム
              </CardTitle>
              <CardDescription>
                {settings.period === "12weeks" ? "直近12週間" : "直近52週間"}
                のトレーニングボリューム推移
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* チャートコントロール */}
          <ChartControls settings={settings} onExportCSV={handleExportCSV} />

          {/* チャート/リスト表示切替 */}
          <Tabs defaultValue="chart" className="mt-4">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="chart">グラフ</TabsTrigger>
              <TabsTrigger value="list">リスト</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-4">
              <WeeklyVolumeChart data={weeklyVolumes} chartType={settings.chartType} />
            </TabsContent>
            <TabsContent value="list" className="mt-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
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
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 統計カード */}
      {stats && <VolumeStats stats={stats} className="mb-6" />}
    </div>
  );
}
