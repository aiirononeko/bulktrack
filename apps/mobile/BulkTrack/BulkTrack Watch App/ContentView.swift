//
//  ContentView.swift
//  BulkTrack Watch App
//
//  Created by Ryota Katada on 2025/04/29.
//

import SwiftUI

struct ContentView: View {
    // EnvironmentObjectとしてSessionManagerを受け取る
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        VStack {
            Image(systemName: "heart.fill") // アイコン変更例
                .imageScale(.large)
                .foregroundStyle(.red) // 色変更例
            Text("Health Status:")
                .font(.headline)
            // 受信したステータスを表示
            Text(sessionManager.receivedHealthStatus)
                .lineLimit(nil) // 必要に応じて複数行表示
                .padding(.top, 2)
        }
        .padding()
    }
}

// Preview用にMockデータを提供
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        // Preview用のモックマネージャーを作成し、初期値を設定
        let mockManager = WatchSessionManager.shared
        // mockManager.receivedHealthStatus = "Status: OK (Preview)" // 必要に応じて初期値を設定

        ContentView()
            .environmentObject(mockManager)
    }
}
