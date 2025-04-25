import * as React from "react";
import { useNavigate } from "react-router";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { BarChart3, LineChart, Download } from "lucide-react";
import type { DashboardSettings, ChartPeriod, ChartType } from "../types";

type ChartControlsProps = {
  settings: DashboardSettings;
  onExportCSV: () => void;
};

export function ChartControls({ settings, onExportCSV }: ChartControlsProps) {
  const navigate = useNavigate();

  // 期間変更ハンドラー
  const handlePeriodChange = (value: ChartPeriod) => {
    navigate(`/?period=${value}&chartType=${settings.chartType}`);
  };

  // チャートタイプ変更ハンドラー
  const handleChartTypeChange = (value: ChartType) => {
    navigate(`/?period=${settings.period}&chartType=${value}`);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2 w-full sm:w-auto">
        <div className="text-sm font-medium">期間</div>
        <RadioGroup
          defaultValue={settings.period}
          onValueChange={(value) => handlePeriodChange(value as ChartPeriod)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="12weeks" id="period-12weeks" />
            <Label htmlFor="period-12weeks">12週</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="52weeks" id="period-52weeks" />
            <Label htmlFor="period-52weeks">52週</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2 w-full sm:w-auto">
        <div className="text-sm font-medium">グラフタイプ</div>
        <RadioGroup
          defaultValue={settings.chartType}
          onValueChange={(value) => handleChartTypeChange(value as ChartType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="line" id="chart-line" />
            <Label htmlFor="chart-line" className="flex items-center gap-1">
              <LineChart size={16} />
              <span>折れ線</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bar" id="chart-bar" />
            <Label htmlFor="chart-bar" className="flex items-center gap-1">
              <BarChart3 size={16} />
              <span>棒グラフ</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={onExportCSV}
      >
        <Download size={16} className="mr-2" />
        CSVエクスポート
      </Button>
    </div>
  );
}