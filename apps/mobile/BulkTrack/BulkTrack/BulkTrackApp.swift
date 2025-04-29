//
//  BulkTrackApp.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/04/29.
//

import SwiftUI

@main
struct BulkTrackApp: App {
    // WatchSessionManager の共有インスタンスを取得
    private var sessionManager = WatchSessionManager.shared

    init() {
        // アプリ起動時にセッションを開始
        sessionManager.startSession()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
