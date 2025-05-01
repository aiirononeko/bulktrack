//
//  ContentView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

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
    // トレーニングビュー表示用の状態
    @State private var showingTrainingView = false
    // 選択されたメニューIDを保持する状態 (UUID?)
    @State private var selectedTrainingMenuID: UUID? = nil

    var body: some View {
        VStack(spacing: 0) {  // メインコンテンツとボトムバーを縦に配置
            // --- メインコンテンツ表示エリアを NavigationStack でラップ ---
            NavigationStack {
                ZStack {
                    // --- 現在のタブに応じてビューを表示 ---
                    switch currentView {
                    case .dashboard:
                        DashboardView()
                    case .menu:
                        MenuView()
                    case .history:
                        HistoryView()
                    case .settings:
                        SettingsView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)  // 画面全体に広がるように
                // .navigationBarHidden(true) は NavigationStack では不要な場合が多い
                // --- navigationDestination モディファイアを追加 ---
                .navigationDestination(isPresented: $showingTrainingView) {
                    // isPresented が true になったときに遷移先ビューを生成
                    trainingDestinationView()
                }
            }

            // --- カスタムボトムバー ---
            customBottomBar
        }
        .ignoresSafeArea(.keyboard)  // キーボード表示時にレイアウトが崩れるのを防ぐ
        .sheet(isPresented: $showingSelectMenu, onDismiss: {
            // シートが閉じたときに、メニューIDが選択されていたらTrainingViewを表示
            if selectedTrainingMenuID != nil {
                showingTrainingView = true
            }
        }) {
            // SelectMenuView に ID 用の binding を渡す
            SelectMenuView(
                showingSelectMenu: $showingSelectMenu,
                selectedTrainingMenuID: $selectedTrainingMenuID // IDのBindingに変更
            )
                .presentationDetents([.medium])
        }
    }

    // TrainingView を生成するヘルパー関数 (ID が nil でないことを保証)
    @ViewBuilder
    private func trainingDestinationView() -> some View {
        if let menuID = selectedTrainingMenuID {
            // TrainingView に ID のみを渡す (isPresented は不要)
            TrainingView(menuID: menuID)
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
        .background(.white)
        .padding(.horizontal)  // 左右にパディングを追加
        .padding(.top, 8)  // 上部に少しパディング
        .padding(.bottom, 8)  // 固定値に変更
        .frame(height: 60)  // 固定の高さに変更
        .overlay(
            Rectangle()
                .frame(height: 0.5)  // 線の太さ
                .foregroundColor(Color.gray.opacity(0.5)),  // 線の色
            alignment: .top  // 上端に配置
        )
    }

    // プラスボタンのビュー定義
    var plusButton: some View {
        Button {
            showingSelectMenu = true
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
                .padding(12)
                .background(Circle().fill(.black))
        }
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

#Preview {
    ContentView()
}
