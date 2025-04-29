import Foundation
import WatchConnectivity

class WatchSessionManager: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchSessionManager()
    @Published var receivedHealthStatus: String = "Waiting..." // Viewに表示するステータス

    private let session: WCSession? = WCSession.isSupported() ? WCSession.default : nil

    private override init() {
        super.init()
    }

    func startSession() {
        if let session = session {
            session.delegate = self
            session.activate()
            print("WCSession activating (Watch)...")
        } else {
            print("WCSession is not supported on this device (Watch).")
        }
    }

    // --- WCSessionDelegate Methods --- (WatchOS側では受信処理を実装)
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed (Watch): \(error.localizedDescription)")
            return
        }
        print("WCSession activated (Watch) with state: \(activationState.rawValue)")
    }

    // iOSからsendMessageで送られたメッセージを受信
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        print("[Watch] Received message via sendMessage: \(message)")
        handleReceivedMessage(message)
    }

    // iOSからupdateApplicationContextで送られたデータを受信
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("[Watch] Received message via updateApplicationContext: \(applicationContext)")
        handleReceivedMessage(applicationContext)
    }

    private func handleReceivedMessage(_ message: [String: Any]) {
        print("[Watch] Handling received message...")
        // メインスレッドでUIを更新
        DispatchQueue.main.async {
            if let status = message["healthStatus"] as? String {
                self.receivedHealthStatus = status
                print("[Watch] Successfully updated receivedHealthStatus: \(status)")
            } else {
                print("[Watch] Received unknown message format or missing 'healthStatus' key: \(message)")
            }
        }
    }

    // iOS Appがインストールされているか、Watch Appがペアリングされているかなどのチェックに必要 (iOSのコードなので実際には呼ばれないはず)
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("WCSession inactive (iOS code in Watch target?)")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("WCSession deactivated (iOS code in Watch target?)")
        // 必要であれば再アクティベート
        // session.activate()
    }
    #endif
}
