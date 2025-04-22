// 編集フォームで使用するメニュー詳細データの型
// APIレスポンスと異なる場合があるため別途定義
export interface MenuDetail {
  id: string;
  name: string;
  items?: MenuItem[]; // メニュー項目 (任意)
}

// メニュー項目（エクササイズ）の型
export interface MenuItem {
  id?: string; // 新規作成時は未定義
  exercise: string;
  set_order: number;
  planned_reps: number;
  // 他に必要なフィールドがあれば追加
}
