import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { ChartType, WeeklyVolume } from "../types";

type WeeklyVolumeChartProps = {
  data: WeeklyVolume[];
  chartType?: ChartType;
  className?: string;
};

export function WeeklyVolumeChart({ data, chartType = "line", className }: WeeklyVolumeChartProps) {
  // データを日付順に並べ替え
  const sortedData = React.useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()
    );
  }, [data]);

  // 日付フォーマット関数
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "M/d", { locale: ja });
    } catch (error) {
      console.error("Invalid date format:", dateString);
      return dateString;
    }
  };

  // チャート設定
  const chartConfig = {
    totalVolume: {
      label: "総挙上量 (kg)",
      color: "hsl(var(--primary))",
    },
    estOneRM: {
      label: "推定1RM (kg)",
      color: "hsl(var(--secondary))",
    },
  };

  // Y軸の最大値を計算（データの最大値の約10%増し）
  const maxVolume = Math.max(...data.map((item) => item.totalVolume));
  const yAxisMax = Math.ceil((maxVolume * 1.1) / 1000) * 1000;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <ChartContainer config={chartConfig} className="w-full h-full">
          {chartType === "line" ? (
            <LineChart data={sortedData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="weekStartDate"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                width={45}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                domain={[0, yAxisMax]}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      if (typeof value === "string") {
                        return formatDate(value);
                      }
                      return String(value);
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="totalVolume"
                name="総挙上量"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
              {data.some((item) => item.estOneRM !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="estOneRM"
                  name="推定1RM"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              )}
              <ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />
            </LineChart>
          ) : (
            <BarChart data={sortedData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="weekStartDate"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                width={45}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                domain={[0, yAxisMax]}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      if (typeof value === "string") {
                        return formatDate(value);
                      }
                      return String(value);
                    }}
                  />
                }
              />
              <Bar
                dataKey="totalVolume"
                name="総挙上量"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1000}
              />
              <ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />
            </BarChart>
          )}
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
