//
//  TrainingView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/05/01.
//

import SwiftUI

// --- セット記録のデータ構造 ---
struct SetRecord: Identifiable {
    let id = UUID()
    var weight: String = ""
    var reps: String = ""
    var rpe: String = "" // Rate of Perceived Exertion
}

// --- 入力フィールド種別 ---
enum FieldType {
    case weight, reps, rpe
}
// -----------------------

// --- ダミーのエクササイズデータ構造 ---
struct Exercise: Identifiable {
    let id = UUID()
    let title: String
    var targetSets: Int // 目標セット数
    var records: [SetRecord] // 各セットの記録

    // イニシャライザで目標セット数分の空レコードを作成
    init(title: String, targetSets: Int) {
        self.title = title
        self.targetSets = targetSets
        // targetSetsの数だけ空のSetRecordを生成
        self.records = (0..<targetSets).map { _ in SetRecord() }
    }
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

    // --- ダミーのエクササイズデータ (更新) ---
    @State private var exercises: [Exercise] = [
        Exercise(title: "ベンチプレス", targetSets: 3),
        Exercise(title: "スクワット", targetSets: 5),
        Exercise(title: "デッドリフト", targetSets: 1),
        Exercise(title: "ショルダープレス", targetSets: 4),
        Exercise(title: "ラットプルダウン", targetSets: 3)
    ]
    // -------------------------------------

    // --- 現在選択中のエクササイズのインデックス ---
    @State private var selectedExerciseIndex = 0
    // -------------------------------------

    // --- 数値セレクター関連の状態変数 ---
    @State private var isShowingNumberSelector = false
    // 選択中のターゲット (exerciseIndex, setIndex, fieldType)
    @State private var selectedInputTarget: (Int, Int, FieldType)? = nil
    // ピッカーで編集中の一時的な値
    @State private var currentEditingValue: String = ""
    // ---------------------------------

    // --- 表示中カードの動的な高さ計算 ---
    var currentCardHeight: CGFloat {
        guard !exercises.isEmpty, selectedExerciseIndex < exercises.count else {
             return 150 // デフォルト高さ (エラーケース)
        }
        let baseHeight: CGFloat = 80 // タイトル、上下パディング等の基本高さ
        let heightPerSet: CGFloat = 45 // 1セットあたりの高さ (TextField + spacing)
        let numSets = exercises[selectedExerciseIndex].targetSets
        return baseHeight + CGFloat(numSets) * heightPerSet
    }
    // ----------------------------------

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
        ZStack {
            // --- メインコンテンツ --- (既存のVStack)
            VStack(alignment: .leading) {

                // --- インターバルタイマーUI ---
                HStack {
                    Spacer() // 中央寄せのためのSpacer
                    VStack(spacing: 10) { // <<< spacingを追加して間隔を詰める
                        Text("インターバル")
                            .font(.caption)
                        Text(formattedIntervalTime)
                            .font(.system(size: 60, weight: .bold, design: .monospaced))

                        // --- 3つの円形ボタンに変更 ---
                        HStack(spacing: 25) { // ボタン間のスペース
                            // リセットボタン
                            Button {
                                resetIntervalTimer()
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.title2)
                                    .frame(width: 60, height: 60)
                                    .background(Color.black)
                                    .foregroundColor(.white)
                                    .clipShape(Circle())
                            }

                            // +1分ボタン
                            Button {
                                intervalRemainingTime += 60
                                // targetIntervalも更新する場合はここに追加
                                // resetIntervalTimer(newInterval: targetInterval + 60)
                            } label: {
                                Image(systemName: "plus")
                                    .font(.title2)
                                    .frame(width: 60, height: 60)
                                    .background(Color.black)
                                    .foregroundColor(.white)
                                    .clipShape(Circle())
                            }

                            // 開始/停止ボタン
                            Button {
                                if isIntervalTimerRunning {
                                    stopIntervalTimer()
                                } else {
                                    startIntervalTimer()
                                }
                            } label: {
                                Image(systemName: isIntervalTimerRunning ? "pause.fill" : "play.fill")
                                    .font(.title2)
                                    .frame(width: 60, height: 60)
                                    .background(Color.black)
                                    .foregroundColor(.white)
                                    .clipShape(Circle())
                            }
                        }
                        // -------------------------
                    }
                    Spacer() // 中央寄せのためのSpacer
                }
                .padding(.vertical) // 上下にパディング
                // ---------------------------

                // --- エクササイズカード表示 (ページング) ---
                TabView(selection: $selectedExerciseIndex) {
                    ForEach(Array(exercises.enumerated()), id: \.element.id) { exerciseIndex, exercise in
                        // カード内容のVStack
                        VStack(alignment: .leading, spacing: 10) {
                            Text(exercise.title)
                                .font(.title2.bold())
                                .padding(.bottom, 5)

                            // セットごとの入力フォーム
                            ForEach(0..<exercise.targetSets, id: \.self) { setIndex in
                                HStack(spacing: 8) {
                                    Text("Set \(setIndex + 1)")
                                        .frame(width: 50, alignment: .leading)

                                    // --- TextFieldをタップ可能なTextに変更 ---
                                    Text(exercises[exerciseIndex].records[setIndex].weight.isEmpty ? "-" : exercises[exerciseIndex].records[setIndex].weight)
                                        .padding(8)
                                        .frame(maxWidth: .infinity)
                                        .background(Color.gray.opacity(0.1))
                                        .cornerRadius(5)
                                        .onTapGesture {
                                            showNumberSelector(exerciseIndex: exerciseIndex, setIndex: setIndex, fieldType: .weight)
                                        }

                                    Text(exercises[exerciseIndex].records[setIndex].reps.isEmpty ? "-" : exercises[exerciseIndex].records[setIndex].reps)
                                        .padding(8)
                                        .frame(maxWidth: .infinity)
                                        .background(Color.gray.opacity(0.1))
                                        .cornerRadius(5)
                                        .onTapGesture {
                                            showNumberSelector(exerciseIndex: exerciseIndex, setIndex: setIndex, fieldType: .reps)
                                        }

                                    Text(exercises[exerciseIndex].records[setIndex].rpe.isEmpty ? "-" : exercises[exerciseIndex].records[setIndex].rpe)
                                        .padding(8)
                                        .frame(maxWidth: .infinity)
                                        .background(Color.gray.opacity(0.1))
                                        .cornerRadius(5)
                                        .onTapGesture {
                                            showNumberSelector(exerciseIndex: exerciseIndex, setIndex: setIndex, fieldType: .rpe)
                                        }
                                    // --------------------------------------
                                }
                            }
                            Spacer() // 上に詰める
                        }
                        .padding() // カード内のパディング (左右に適用)
                        .padding(.top, 30) // タイトルの上にさらにパディングを追加
                        .padding(.bottom, 50) // カード下部にパディングを追加してドットとの間にスペースを作る
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading) // 左上揃え
                        .background(.white) // カードの背景を白に変更
                        .cornerRadius(10)
                        .padding(.horizontal, 20) // 左右に少し余白を持たせる
                        .tag(exerciseIndex) // 各ページにインデックスをタグ付け
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic)) // ページングスタイルとドット表示
                .frame(height: currentCardHeight + 60) // 計算された高さを適用
                // ------------------------------------

                Spacer() // ボタンを一番下に配置するために追加
            }
            .background(Color(uiColor: .systemGray6)) // ビュー全体の背景をグレーに
            // --------------------

            // --- 記録ボタン (画面下部固定) ---
            VStack {
                Spacer() // ボタンを押し下げる
                Button {
                    // TODO: 記録処理を実装
                    print("記録ボタンが押されました")
                } label: {
                    Text("記録する")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.black)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .padding(.horizontal) // 左右のパディング
                .padding(.bottom) // 下部のパディング (SafeAreaを考慮)
            }
            // ---------------------------

            // --- 数値セレクター表示関数 ---
            if isShowingNumberSelector {
                numberSelectorView
            }
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

    // --- 数値セレクター表示関数 ---
    func showNumberSelector(exerciseIndex: Int, setIndex: Int, fieldType: FieldType) {
        selectedInputTarget = (exerciseIndex, setIndex, fieldType)
        // 現在の値をピッカーの初期値として設定
        switch fieldType {
        case .weight:
            currentEditingValue = exercises[exerciseIndex].records[setIndex].weight
        case .reps:
            currentEditingValue = exercises[exerciseIndex].records[setIndex].reps
        case .rpe:
            currentEditingValue = exercises[exerciseIndex].records[setIndex].rpe
        }
        // 空の場合のデフォルト値 (Pickerが空文字を扱えないため)
        if currentEditingValue.isEmpty {
            switch fieldType {
            case .weight: currentEditingValue = "60"
            case .reps: currentEditingValue = "10"
            case .rpe: currentEditingValue = "8.0"
            }
        }
        withAnimation {
            isShowingNumberSelector = true
        }
    }

    // --- 数値セレクターで選択した値を保存する関数 ---
    func saveSelection() {
        guard let target = selectedInputTarget else { return }
        let (exerciseIndex, setIndex, fieldType) = target

        switch fieldType {
        case .weight:
            exercises[exerciseIndex].records[setIndex].weight = currentEditingValue
        case .reps:
            exercises[exerciseIndex].records[setIndex].reps = currentEditingValue
        case .rpe:
            exercises[exerciseIndex].records[setIndex].rpe = currentEditingValue
        }

        closeNumberSelector()
    }

    // --- 数値セレクターを閉じる関数 ---
    func closeNumberSelector() {
        withAnimation {
            isShowingNumberSelector = false
        }
        selectedInputTarget = nil // ターゲットをリセット
    }

    // --- 数値セレクターのビュー定義 ---
    @ViewBuilder
    private var numberSelectorView: some View {
        // 背景を暗くするオーバーレイ
        Color.black.opacity(0.4)
            .edgesIgnoringSafeArea(.all)
            .onTapGesture { closeNumberSelector() } // 背景タップで閉じる

        VStack(spacing: 0) {
            Spacer() // シートを下部に押しやる

            VStack(spacing: 15) {
                HStack {
                    Button("キャンセル") { closeNumberSelector() }
                    Spacer()
                    Text(selectorTitle) // "Weight", "Reps", "RPE"
                        .font(.headline)
                    Spacer()
                    Button("完了") { saveSelection() }
                        .fontWeight(.bold)
                }
                .padding([.horizontal, .top])

                Divider()

                Picker("数値を選択", selection: $currentEditingValue) {
                    ForEach(pickerRange, id: \.self) { value in
                        Text(value)
                    }
                }
                .pickerStyle(.wheel) // スライド式のピッカー
                .labelsHidden()
                // .frame(maxHeight: 200) // Pickerの高さを制限する場合

            }
            .background(Color(uiColor: .systemBackground)) // システムの背景色
            .cornerRadius(15, corners: [.topLeft, .topRight]) // 上部の角だけ丸める
        }
        .edgesIgnoringSafeArea(.bottom) // 下のセーフエリアを無視
        .transition(.move(edge: .bottom)) // 下からスライドアニメーション
    }

    // --- ピッカーのタイトル ---
    private var selectorTitle: String {
        guard let target = selectedInputTarget else { return "" }
        switch target.2 { // fieldType
        case .weight: return "重量 (kg)"
        case .reps: return "回数"
        case .rpe: return "RPE"
        }
    }

    // --- ピッカーの表示範囲 ---
    private var pickerRange: [String] {
        guard let target = selectedInputTarget else { return [] }
        switch target.2 { // fieldType
        case .weight:
            // 0.0kg から 300.0kg まで 0.5kg 刻み (例)
            return stride(from: 0.0, through: 300.0, by: 0.5).map { String(format: "%.1f", $0) }
        case .reps:
            // 0回 から 50回 まで 1回 刻み (例)
            return (0...50).map { String($0) }
        case .rpe:
            // 6.0 から 10.0 まで 0.5 刻み (例)
            return stride(from: 6.0, through: 10.0, by: 0.5).map { String(format: "%.1f", $0) }
        }
    }

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

// --- 角丸を特定箇所に適用するための拡張 ---
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape( RoundedCorner(radius: radius, corners: corners) )
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
// -----------------------------------------

#Preview {
    NavigationView {
        TrainingView(menuID: UUID())
    }
}
