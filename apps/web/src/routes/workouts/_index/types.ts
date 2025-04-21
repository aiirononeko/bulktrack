// ワークアウトデータの型定義
export interface WorkoutApiResponse {
  id: string;
  menu_id: string;
  menu_name: string;
  started_at: string;
  note?: string;
}
