// APIレスポンスの型
export interface MenuApiResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  // menu_items も含める場合は追加
}

// コンポーネントで使用するメニューの型
export interface MenuSummary {
  id: string;
  name: string;
  description?: string | null;
}
