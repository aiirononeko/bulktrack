//
//  TrainingView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

// --- ダミーのエクササイズデータ構造 ---
struct Exercise: Identifiable {
    let id = UUID()
    let title: String
    // TODO: 他のプロパティ (セット数、レップ数、重量など) を追加
}
// --------------------------------

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

    // --- ダミーのエクササイズデータ ---
    @State private var exercises: [Exercise] = [
        Exercise(title: "ベンチプレス"),
        Exercise(title: "スクワット"),
        Exercise(title: "デッドリフト"),
        Exercise(title: "ショルダープレス"),
        Exercise(title: "ラットプルダウン")
    ]
    // -----------------------------

    // --- 現在選択中のエクササイズのインデックス ---
    @State private var selectedExerciseIndex = 0
    // -------------------------------------

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

            // --- エクササイズカード表示 (ページング) ---
            TabView(selection: $selectedExerciseIndex) {
                ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                    VStack {
                        Text(exercise.title)
                            .font(.headline)
                            .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity) // TabView内で可能な限り広がるように
                    .background(.white) // カードの背景を白に変更
                    .cornerRadius(10)
                    .padding(.horizontal, 20) // 左右に少し余白を持たせる
                    .tag(index) // 各ページにインデックスをタグ付け
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic)) // ページングスタイルとドット表示
            .frame(height: 120) // TabViewの高さを調整
            // ------------------------------------

            // TODO: APIから取得したメニュー詳細を表示するUI
            // if let details = menuDetails { ... }

            Spacer()
        }
        .navigationTitle("トレーニング") // 仮のタイトル
        .toolbar { // ← toolbar モディファイアを追加
            ToolbarItem(placement: .navigationBarTrailing) { // 右端に配置
                Text(formattedElapsedTime)
                    .font(.system(size: 18, weight: .semibold, design: .monospaced)) // フォントサイズを調整
                    .foregroundColor(.black) // 必要に応じて色を設定 (ここでは黒)
            }
        }
        .onAppear {
            // 全体タイマー開始
            startTimer()
            // UIPageControlの外観を設定
            UIPageControl.appearance().currentPageIndicatorTintColor = .black
            UIPageControl.appearance().pageIndicatorTintColor = .systemGray4
        }
        .onDisappear { // 画面が消えるときにタイマーを止める
             stopTimer() // 全体タイマー
             stopIntervalTimer() // インターバルタイマー
         }
         .background(Color(uiColor: .systemGray6)) // ビュー全体の背景をグレーに
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
