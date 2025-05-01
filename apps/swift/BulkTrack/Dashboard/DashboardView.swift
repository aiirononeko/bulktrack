//
//  Dashboard.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

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

#Preview {
    DashboardView()
}
