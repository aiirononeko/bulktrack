//
//  SelectMenuView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

// ダミーデータ用の構造体
struct TrainingMenu: Identifiable {
    let id = UUID()
    let title: String
    let description: String
}

struct SelectMenuView: View {
    // ContentView から渡される Binding
    @Binding var showingSelectMenu: Bool
    // 選択されたメニューIDを受け取る Binding
    @Binding var selectedTrainingMenuID: UUID?

    // ダミーのメニューデータ
    let menus: [TrainingMenu] = [
        TrainingMenu(title: "胸の日", description: "ベンチプレス、ダンベルフライなど"),
        TrainingMenu(title: "背中の日", description: "デッドリフト、懸垂、ラットプルダウン"),
        TrainingMenu(title: "脚の日", description: "スクワット、レッグプレス、カーフレイズ"),
        TrainingMenu(title: "肩と腕の日", description: "ショルダープレス、サイドレイズ、アームカール"),
    ]

    var body: some View {
        // NavigationView は不要になるため削除
        VStack(alignment: .leading) {
            // --- タイトル ---
            Text("トレーニングメニューを選択")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal) // 左右にパディング
                .padding(.top) // 上にも少しパディング

            // --- メニューリスト ---
            List(menus) { menu in
                Button { // タップ時のアクション
                    selectedTrainingMenuID = menu.id // 選択されたメニューのIDをセット
                    showingSelectMenu = false // シートを閉じる
                } label: {
                    MenuCardView(menu: menu)
                        .contentShape(Rectangle()) // ボタンのタップ領域を広げる
                }
                .buttonStyle(.plain) // リストのデフォルトスタイルを適用
            }
            .listStyle(.plain) // リストのスタイルを調整
        }
    }
}

// メニューカードのビュー定義
struct MenuCardView: View {
    let menu: TrainingMenu

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(menu.title)
                .font(.headline)
            Text(menu.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8) // カードの上下に少しパディング
    }
}

// --- プレビュー用のラッパービュー定義 ---
private struct SelectMenuView_PreviewWrapper: View {
    @State private var showingPreview = true
    @State private var selectedPreviewMenuID: UUID? = nil

    var body: some View {
        SelectMenuView(showingSelectMenu: $showingPreview, selectedTrainingMenuID: $selectedPreviewMenuID)
    }
}

#Preview {
    // 外部で定義したラッパービューを使用
    SelectMenuView_PreviewWrapper()
} 
