//
//  TrainingView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

struct TrainingView: View {
    // ContentView から渡されるメニューID
    let menuID: UUID

    // タイマー用の状態変数
    @State private var elapsedTime: TimeInterval = 0
    @State private var timer: Timer? = nil

    // --- インターバルタイマー用の状態変数 ---
    @State private var targetInterval: TimeInterval = 60 // 仮のインターバル時間 (60秒)
    @State private var intervalRemainingTime: TimeInterval = 60 // 残り時間
    @State private var intervalTimer: Timer? = nil
    @State private var isIntervalTimerRunning: Bool = false
    // -------------------------------------

    // TODO: APIから取得したメニュー詳細を保持する状態変数
    // @State private var menuDetails: TrainingMenu? = nil

    // 経過時間をフォーマットするコンピューテッドプロパティ
    var formattedElapsedTime: String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    // --- インターバル残り時間をフォーマット ---
    var formattedIntervalTime: String {
        let minutes = Int(intervalRemainingTime) / 60
        let seconds = Int(intervalRemainingTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    // ------------------------------------

    var body: some View {
        VStack(alignment: .leading) {

            // --- インターバルタイマーUI ---
            HStack {
                Spacer() // 中央寄せのためのSpacer
                VStack {
                    Text(formattedIntervalTime)
                        .font(.system(size: 60, weight: .bold, design: .monospaced))

                    // --- ボタンのデザイン変更 ---
                    Button {
                        if isIntervalTimerRunning {
                            stopIntervalTimer()
                        } else {
                            startIntervalTimer()
                        }
                    } label: {
                        Text(isIntervalTimerRunning ? "インターバルを停止" : "インターバルを開始")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity) // 横幅いっぱい
                            .padding()
                            .background(Color.black)
                            .foregroundColor(.white)
                            .cornerRadius(8) // 角を少し丸める
                    }
                    .padding(.horizontal) // ボタン左右に少し余白
                    // -------------------------
                }
                Spacer() // 中央寄せのためのSpacer
            }
            .padding(.vertical) // 上下にパディング
            // ---------------------------

            Text("選択中のメニューID: \(menuID.uuidString)")
                .font(.body)
                .padding(.leading) // 左寄せにするため padding を調整

            // TODO: APIから取得したメニュー詳細を表示するUI
            // if let details = menuDetails { ... }

            Spacer()
        }
        // TODO: APIから取得したメニュー名を表示するように変更
        .navigationTitle("トレーニング") // 仮のタイトル
        .toolbar { // ← toolbar モディファイアを追加
            ToolbarItem(placement: .navigationBarTrailing) { // 右端に配置
                Text(formattedElapsedTime)
                    .font(.system(size: 18, weight: .semibold, design: .monospaced)) // フォントサイズを調整
                    .foregroundColor(.black) // 必要に応じて色を設定 (ここでは黒)
            }
        }
        .onAppear {
            startTimer()
        }
        .onDisappear {
            stopTimer()
        }
    }

    // タイマーを開始する関数
    func startTimer() {
        timer?.invalidate() // 既存のタイマーがあれば停止
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            elapsedTime += 1
        }
    }

    // タイマーを停止する関数
    func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    // --- インターバルタイマー関数 ---
    func startIntervalTimer() {
        guard !isIntervalTimerRunning else { return }
        // 残り時間が0ならリセット
        if intervalRemainingTime <= 0 {
            intervalRemainingTime = targetInterval
        }
        isIntervalTimerRunning = true
        intervalTimer?.invalidate() // 念のため既存を停止
        intervalTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if intervalRemainingTime > 0 {
                intervalRemainingTime -= 1
            } else {
                stopIntervalTimer()
                // TODO: インターバル終了時の処理 (音を鳴らすなど)
                print("インターバル終了！")
            }
        }
    }

    func stopIntervalTimer() {
        isIntervalTimerRunning = false
        intervalTimer?.invalidate()
        intervalTimer = nil
    }

    func resetIntervalTimer(newInterval: TimeInterval? = nil) {
        stopIntervalTimer()
        if let newInterval = newInterval {
            targetInterval = newInterval
        }
        intervalRemainingTime = targetInterval
    }
    // ---------------------------

    /*
    // TODO: API通信を行う関数
    func fetchMenuDetails() {
        print("API呼び出し: menuID = \(menuID)")
        // ここで非同期処理を行い、結果を @State 変数にセットする
        // 例: APIService.shared.getMenuDetails(id: menuID) { result in
        //     switch result {
        //     case .success(let details):
        //         self.menuDetails = details
        //     case .failure(let error):
        //         print("APIエラー: \(error)")
        //     }
        // }
    }
    */
}

#Preview {
    NavigationView {
        TrainingView(menuID: UUID())
    }
}
