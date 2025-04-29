//
//  BulkTrackApp.swift
//  BulkTrack Watch App
//
//  Created by Ryota Katada on 2025/04/29.
//

import SwiftUI

@main
struct BulkTrack_Watch_AppApp: App {
    // StateObjectではなく通常のプロパティとして保持
    let sessionManager = WatchSessionManager.shared

    init() {
        // アプリ起動時にセッションを開始
        sessionManager.startSession()
    }

    var body: some Scene {
        WindowGroup {
            // ContentViewにEnvironmentObjectとして渡す
            ContentView()
                .environmentObject(sessionManager)
        }
    }
}
