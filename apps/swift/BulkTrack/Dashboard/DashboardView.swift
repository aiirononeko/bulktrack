//
//  Dashboard.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import Charts
import SwiftUI

// データ構造
struct WorkoutData: Identifiable {
    let id = UUID()
    let startDateOfWeek: String
    let weeklyVolume: Int
}

// 1ページ目: プレースホルダービュー (カスタムプログレスリング)
struct PlaceholderDashboardView: View {
    // ダミーデータ
    let currentWeekVolume = 8000
    let previousWeekVolume = 20500
    let remainingVolume = 1500

    // 目標ボリューム (例: 先週の 101%)
    var targetVolume: Double {
        Double(previousWeekVolume) * 1.01
    }
    // 0 除算を避けるための安全な目標値
    var safeTargetVolume: Double {
        max(targetVolume, 1) // targetVolume が 0 以下にならないように
    }
    // ゲージの値 (0.0 ~ 1.0 の範囲に正規化)
    var gaugeValue: Double {
        min(Double(currentWeekVolume) / safeTargetVolume, 1.0) // 1.0 を超えないように
    }

    // --- プログレスリングの太さ ---
    let ringThickness: CGFloat = 10 // 太さを調整可能

    var body: some View {
        VStack(spacing: 0) {
            // --- タイトル ---
            Text("今週のトレーニングボリューム")
                .font(.headline)
                .padding(.top)
                .padding(.bottom)
                .padding(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            // --- 中央: カスタムプログレスリングとボリューム表示 ---
            VStack {
                ZStack {
                    // 背景のリング (グレー)
                    Circle()
                        .stroke(Color(.systemGray5), lineWidth: ringThickness)

                    // 進捗リング (黒)
                    Circle()
                        .trim(from: 0, to: gaugeValue) // 進捗に合わせてトリミング
                        .stroke(Color.primary, style: StrokeStyle(lineWidth: ringThickness, lineCap: .round)) // 太さと端の形状を指定
                        .rotationEffect(.degrees(-90)) // 12時の位置から開始するように回転

                    // 中央のテキスト (VStack で縦に並べる)
                    VStack(spacing: 2) { // spacing で数字とラベルの間隔を調整
                        Text("\(currentWeekVolume) kg")
                            .font(.title.weight(.bold))
                        Text("ボリューム") // ラベルを追加
                            .font(.caption)   // キャプションスタイル
                            .foregroundColor(.secondary) // 色を .secondary に変更
                    }
                }
                .frame(width: 160, height: 160)
                .padding(.bottom, 10)
            }
            .padding(.vertical, 25)

            // --- 先週・目標・残りの表示 (目標を中央に、幅固定) ---
            HStack(spacing: 10) {
                // 左: 先週のボリューム
                VStack {
                    Text("\(previousWeekVolume) kg")
                        .font(.title2.weight(.bold))
                    Text("先週")
                        .font(.caption)
                        .foregroundColor(.secondary) // 色を .secondary に変更
                }
                .frame(width: 120) // 幅を固定 (値は調整可能)

                // 中央: 目標ボリューム
                VStack {
                    Text("\(Int(targetVolume)) kg")
                        .font(.title2.weight(.bold))
                    Text("目標")
                        .font(.caption)
                        .foregroundColor(.secondary) // 色を .secondary に変更
                }
                .frame(width: 120) // 幅を固定

                // 右: 残りボリューム
                VStack {
                    Text("\(remainingVolume) kg")
                        .font(.title2.weight(.bold))
                    Text("残り")
                        .font(.caption)
                        .foregroundColor(.secondary) // 色を .secondary に変更
                }
                .frame(width: 120) // 幅を固定
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 30)    // 下部の余白

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// 2ページ目: 週次ボリュームグラフビュー
struct VolumeChartView: View {
    // ダミーデータ (VolumeChartView に固有のデータとする)
    let data: [WorkoutData] = [
        .init(startDateOfWeek: "4/1~", weeklyVolume: 18000),
        .init(startDateOfWeek: "4/8~", weeklyVolume: 18500),
        .init(startDateOfWeek: "4/15~", weeklyVolume: 19000),
        .init(startDateOfWeek: "4/22~", weeklyVolume: 19500),
        .init(startDateOfWeek: "4/29~", weeklyVolume: 20000),
        .init(startDateOfWeek: "5/6~", weeklyVolume: 19000),
        .init(startDateOfWeek: "5/13~", weeklyVolume: 20500),
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            Text("週ごとの総トレーニングボリューム")
                .font(.headline) // 見出しスタイル
                .padding(.top)   // 上部にパディング
                .padding(.bottom)
                .padding(.leading) // 左端にも少しパディングを追加
                .frame(maxWidth: .infinity, alignment: .leading) // 左寄せにする
                
            Chart(data) { item in
                BarMark(
                    x: .value("週", item.startDateOfWeek),
                    y: .value("トレーニングボリューム", item.weeklyVolume)
                )
                .foregroundStyle(Color.primary) // 棒グラフの色を .primary に変更
            }
            .chartYAxis { 
                let maxVolume = data.map { $0.weeklyVolume }.max() ?? 0
                let strideBy = 2500
                let yValues = stride(from: 0, through: maxVolume + strideBy, by: strideBy)
                
                AxisMarks(values: Array(yValues)) { value in
                    AxisGridLine()
                    AxisTick()
                    AxisValueLabel()
                }
            }
            .chartXAxis { 
                AxisMarks(preset: .automatic) { value in
                    AxisValueLabel()
                }
            }
            .padding(40)
            // --- グラフの下にパディングを追加 ---
            .padding(.bottom, 30)
        }
    }
}

// メインのダッシュボードビュー
struct DashboardView: View {
    var body: some View {
        NavigationStack { 
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // --- 上部: スワイプ可能ダッシュボードエリア ---
                    let dashboardHeight = (geometry.size.height / 2) + 30 + 30
                    TabView {
                        PlaceholderDashboardView()
                            .tag(0)
                        
                        VolumeChartView()
                            .tag(1)
                    }
                    .background(Color(uiColor: .systemBackground)) // ダッシュボードエリアの背景は .systemBackground
                    .frame(height: dashboardHeight) // 高さを計算値に設定
                    .tabViewStyle(.page(indexDisplayMode: .automatic))
                    
                    // --- 下部: 固定プレースホルダー ---
                    Color(.systemGray6) 
                        .frame(maxWidth: .infinity, maxHeight: .infinity) // 残りのスペースを埋める
                }
                // VStack 全体に適用するか、NavigationStack に適用
                .ignoresSafeArea(.container, edges: .bottom)
            }
            .navigationTitle("ダッシュボード")
            // --- .onAppear で UIPageControl のドット色を設定 ---
            .onAppear {
                UIPageControl.appearance().currentPageIndicatorTintColor = .label // 色を .label に変更
                UIPageControl.appearance().pageIndicatorTintColor = .systemGray4
            }
        }
    }
}

#Preview {
    DashboardView()
}
