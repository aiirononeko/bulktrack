import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, BarChart2Icon, DumbbellIcon } from "lucide-react";
import type { WeeklyVolumeStats } from "../types";

type VolumeStatsProps = {
  stats: WeeklyVolumeStats;
  className?: string;
};

export function VolumeStats({ stats, className }: VolumeStatsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <StatCard
        title="平均週間ボリューム"
        value={`${Math.round(stats.avgWeeklyVolume).toLocaleString()} kg`}
        icon={<BarChart2Icon className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="最大週間ボリューム"
        value={`${Math.round(stats.maxWeeklyVolume).toLocaleString()} kg`}
        icon={<ArrowUpIcon className="h-4 w-4 text-green-500" />}
      />
      <StatCard
        title="最小週間ボリューム"
        value={`${Math.round(stats.minWeeklyVolume).toLocaleString()} kg`}
        icon={<ArrowDownIcon className="h-4 w-4 text-red-500" />}
      />
      <StatCard
        title="最大推定1RM"
        value={`${Math.round(stats.maxEstOneRM).toLocaleString()} kg`}
        icon={<DumbbellIcon className="h-4 w-4 text-primary" />}
      />
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
};

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}