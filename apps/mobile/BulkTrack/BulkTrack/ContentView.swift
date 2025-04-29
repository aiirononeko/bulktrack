//
//  ContentView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/04/29.
//

import SwiftUI

struct ContentView: View {
    @State private var healthStatus: String = "Checking health..."

    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
            Text(healthStatus)
        }
        .padding()
        .onAppear {
            fetchHealthStatus()
        }
    }

    func fetchHealthStatus() {
        guard let url = URL(string: "http://localhost:5555/health") else {
            let errorStatus = "Invalid URL"
            self.healthStatus = errorStatus
            // Watchにもエラー情報を送る (任意)
            // WatchSessionManager.shared.sendHealthStatus(errorStatus)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                var currentStatus: String // 送信するステータスを保持する変数

                if let error = error {
                    // NWError connection refused のような詳細情報も含める
                    currentStatus = "Error: \(error.localizedDescription)"
                } else if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
                    currentStatus = "Error: Invalid response (\(httpResponse.statusCode))"
                } else if let data = data, let status = String(data: data, encoding: .utf8) {
                    currentStatus = "Status: \(status)" // 成功時のステータス
                } else {
                    currentStatus = "Error: Could not parse response"
                }

                self.healthStatus = currentStatus // 自身のViewを更新
                // 取得したステータスをWatchに送信
                WatchSessionManager.shared.sendHealthStatus(currentStatus)
            }
        }
        task.resume()
    }
}

#Preview {
    ContentView()
}
