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

    // TODO: APIから取得したメニュー詳細を保持する状態変数
    // @State private var menuDetails: TrainingMenu? = nil

    var body: some View {
        // NavigationView ラップは不要
        VStack {
            Text("トレーニング開始")
                .font(.largeTitle)
                .padding()

            // 選択されたメニューのIDを表示 (API実装までの仮表示)
            Text("選択中のメニューID: \(menuID.uuidString)")
                .font(.body)
                .padding()

            // TODO: APIから取得したメニュー詳細を表示するUI
            // if let details = menuDetails { ... }

            Spacer()
        }
        // TODO: APIから取得したメニュー名を表示するように変更
        .navigationTitle("トレーニング") // 仮のタイトル
        /*
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    // isPresented = false
                } label: {
                    Image(systemName: "xmark")
                }
            }
        }
        */
        // .onAppear で API を呼び出す (例)
        /*
        .onAppear {
            fetchMenuDetails()
        }
        */
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

#Preview {
    NavigationView {
        TrainingView(menuID: UUID())
    }
}
