import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { WeeklyVolume } from "../types";

/**
 * 週間ボリュームデータをCSVとしてエクスポートする
 * @param data 週間ボリュームデータ
 * @param period 期間（ファイル名に使用）
 */
export function exportWeeklyVolumesToCSV(data: WeeklyVolume[], period: string): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  try {
    // データを日付順に並べ替え
    const sortedData = [...data].sort(
      (a, b) =>
        new Date(a.weekStartDate).getTime() -
        new Date(b.weekStartDate).getTime()
    );

    // CSVヘッダー
    const headers = [
      "週開始日",
      "総挙上量(kg)",
      "推定1RM(kg)",
      "種目数",
      "セット数",
    ];

    // CSVの行を作成
    const rows = sortedData.map((item) => {
      // 日付をフォーマット
      let formattedDate;
      try {
        const date = parseISO(item.weekStartDate);
        formattedDate = format(date, "yyyy/MM/dd", { locale: ja });
      } catch (error) {
        formattedDate = item.weekStartDate;
      }

      return [
        formattedDate,
        item.totalVolume.toString(),
        item.estOneRM?.toString() || "",
        item.exerciseCount?.toString() || "",
        item.setCount?.toString() || "",
      ];
    });

    // CSVコンテンツを作成
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    // エンコードしてダウンロード
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // 現在の日付を取得してファイル名に使用
    const today = format(new Date(), "yyyyMMdd", { locale: ja });
    link.setAttribute("download", `weekly_volume_${period}_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Failed to export CSV:", error);
    alert("CSVのエクスポートに失敗しました。");
  }
}