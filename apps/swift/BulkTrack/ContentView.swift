//
//  ContentView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack {
                Image(systemName: "globe")
                    .imageScale(.large)
                    .foregroundStyle(.tint)
                Text("Hello, world!")
            }
            .navigationBarTitle(Text("ダッシュボード"))
            .toolbar {
                // --- ボトムバー ---
                ToolbarItemGroup(placement: .bottomBar) {
                    // ダッシュボードボタン
                    Button {
                        // TODO: ダッシュボードボタンのアクション
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "chart.bar.xaxis")
                                .font(.system(size: 16))
                            Text("ホーム")
                                .font(.caption)
                        }
                        .foregroundColor(.black)
                    }

                    Spacer()  // ボタン間のスペース

                    // メニューボタン
                    Button {
                        // TODO: メニューボタンのアクション
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "square.grid.2x2")
                                .font(.system(size: 16))
                            Text("メニュー")
                                .font(.caption)
                        }
                        .foregroundColor(.black)
                    }

                    Spacer()  // ボタン間のスペース

                    // プラスボタン
                    Button {
                        // TODO: プラスボタンのアクション
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Circle().fill(.black))
                    }

                    Spacer()  // ボタン間のスペース

                    // 履歴ボタン
                    Button {
                        // TODO: 履歴ボタンのアクション
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "clock")
                                .font(.system(size: 16))
                            Text("履歴")
                                .font(.caption)
                        }
                        .foregroundColor(.black)
                    }

                    Spacer()  // ボタン間のスペース

                    // アプリ設定ボタン
                    Button {
                        // TODO: アプリ設定ボタンのアクション
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "gearshape")
                                .font(.system(size: 16))
                            Text("アプリ設定")
                                .font(.caption)
                        }
                        .foregroundColor(.black)
                    }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
