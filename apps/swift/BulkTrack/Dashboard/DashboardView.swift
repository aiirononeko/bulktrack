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

// 1ページ目: 仮のプレースホルダービュー
struct PlaceholderDashboardView: View {
    var body: some View {
        VStack {
            Image(systemName: "figure.walk.diamond.fill")
                .font(.largeTitle)
            Text("新しいダッシュボード (1ページ目)")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.bottom, 30)
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
                .foregroundStyle(.black) // 棒グラフの色を黒に
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
                    let dashboardHeight = (geometry.size.height / 2) + 30
                    TabView {
                        PlaceholderDashboardView()
                            .tag(0)
                        
                        VolumeChartView()
                            .tag(1)
                    }
                    .background(Color.white) // ダッシュボードエリアの背景は白
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
                UIPageControl.appearance().currentPageIndicatorTintColor = .black
                UIPageControl.appearance().pageIndicatorTintColor = .systemGray4
            }
        }
    }
}

#Preview {
    DashboardView()
}
