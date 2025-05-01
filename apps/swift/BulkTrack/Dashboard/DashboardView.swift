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

struct DashboardView: View {
    // ダミーデータ
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
        NavigationStack {
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // --- 上 2/3: グラフエリア ---
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
                    .frame(height: geometry.size.height * 2 / 3) // 高さを 2/3 に設定

                    // --- 下 1/3: グレーのプレースホルダー ---
                    Color(.systemGray6)
                        .frame(height: geometry.size.height / 3) // 高さを 1/3 に設定
                }
            }
            .navigationTitle("ダッシュボード")
        }
    }
}

#Preview {
    DashboardView()
}
