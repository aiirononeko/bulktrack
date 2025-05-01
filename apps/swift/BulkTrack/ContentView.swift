//
//  ContentView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

// import UIKit // watchOSでは不要なため削除

// タブを識別するためのenum
enum Tab {
    case dashboard
    case menu
    case history
    case settings
}

struct ContentView: View {
    @State private var currentView: Tab = .dashboard
    @State private var showingSelectMenu = false

    var body: some View {
        VStack(spacing: 0) {  // メインコンテンツとボトムバーを縦に配置
            // --- メインコンテンツ表示エリア ---
            // currentView の値に応じて表示するビューを切り替え
            ZStack {  // ZStack を使うことで切り替えアニメーションなどを後で追加しやすくなる
                switch currentView {
                case .dashboard:
                    DashboardView()
                case .menu:
                    // NavigationStackでラップ
                    NavigationStack { MenuView() }
                case .history:
                    HistoryView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)  // 画面全体に広がるように
            // 背景色を薄いグレーに設定
            .background(Color(red: 0.95, green: 0.95, blue: 0.97))

            // --- カスタムボトムバー ---
            customBottomBar
                // ボトムバーの背景色を白に変更
                .background(.white)
        }
        .ignoresSafeArea(.keyboard)  // キーボード表示時にレイアウトが崩れるのを防ぐ
        .sheet(isPresented: $showingSelectMenu) {  // シート表示はVStackの外で定義
            // TODO: プラスボタンが押されたときに表示するモーダルビュー
            Text("トレーニングするメニューを選択してください")
                .presentationDetents([.medium])  // シートの高さを調整可能にする
        }
    }

    // カスタムボトムバーのビュー定義
    var customBottomBar: some View {
        HStack {
            // ホームボタン
            bottomBarButton(
                tab: .dashboard, current: $currentView, label: "ホーム", systemImage: "chart.bar.xaxis"
            )

            Spacer()

            // メニューボタン
            bottomBarButton(
                tab: .menu, current: $currentView, label: "メニュー", systemImage: "square.grid.2x2")

            Spacer()

            // プラスボタン
            plusButton

            Spacer()

            // 履歴ボタン
            bottomBarButton(tab: .history, current: $currentView, label: "履歴", systemImage: "clock")

            Spacer()

            // アプリ設定ボタン
            bottomBarButton(
                tab: .settings, current: $currentView, label: "アプリ設定", systemImage: "gearshape")
        }
        .padding(.horizontal)  // 左右にパディングを追加
        .padding(.top, 8)  // 上部に少しパディング
        .padding(.bottom, 8)  // 固定値に変更
        .frame(height: 60)  // 固定の高さに変更
        // --- 上部ボーダーラインを追加 ---
        .overlay(
            Rectangle()
                .frame(height: 0.5)  // 線の太さ
                .foregroundColor(Color.gray.opacity(0.5)),  // 線の色
            alignment: .top  // 上端に配置
        )
    }

    // フローティングではなくなったプラスボタンのビュー定義
    var plusButton: some View {
        Button {
            showingSelectMenu = true
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 18, weight: .semibold))  // 少しサイズ調整
                .foregroundColor(.white)
                .padding(12)  // 少しサイズ調整
                .background(Circle().fill(.black))
        }
        // オフセットを追加
        .offset(y: -4)
    }

    // 各ボトムバーボタンを生成するヘルパー関数
    func bottomBarButton(tab: Tab, current: Binding<Tab>, label: String, systemImage: String)
        -> some View
    {
        Button {
            current.wrappedValue = tab
        } label: {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                    .font(.system(size: 18))
                Text(label)
                    .font(.caption)
            }
            // 選択されているタブの色を変える
            .foregroundColor(current.wrappedValue == tab ? .black : .gray)
        }
        // タップ領域を広げるため (なくても良い)
        .frame(maxWidth: .infinity)
    }
}

// --- 仮のビュー定義 (最終的には別ファイルに分割推奨) ---
struct DashboardView: View {
    var body: some View {
        NavigationStack {  // 各タブのコンテンツはNavigationStackを持つことが多い
            VStack {
                Image(systemName: "chart.bar.fill")
                    .imageScale(.large)
                Text("ダッシュボード画面")
            }
            .navigationTitle("ダッシュボード")
        }
    }
}

struct HistoryView: View {
    var body: some View {
        NavigationStack {
            Text("履歴画面")
                .navigationTitle("トレーニング履歴")
        }
    }
}

struct SettingsView: View {
    var body: some View {
        NavigationStack {
            Text("アプリ設定画面")
                .navigationTitle("アプリ設定")
        }
    }
}

struct MenuView: View {  // MenuViewを定義
    var body: some View {
        Text("メニュー画面")
            .navigationTitle("メニュー")
    }
}

// Previewも更新
#Preview {
    ContentView()
}
