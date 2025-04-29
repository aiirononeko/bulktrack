import Foundation
import WatchConnectivity

class WatchSessionManager: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchSessionManager()

    private let session: WCSession? = WCSession.isSupported() ? WCSession.default : nil

    private override init() { // Make init private for singleton
        super.init()
    }

    func startSession() {
        if let session = session {
            session.delegate = self
            session.activate()
            print("WCSession activating (iOS)...")
        } else {
             print("WCSession is not supported on this device (iOS).")
        }
    }

    // iOS -> WatchOS データ送信
    func sendHealthStatus(_ status: String) {
        print("[iOS] Attempting to send health status: \(status)")
        guard let session = session, session.isPaired, session.isWatchAppInstalled else {
             print("[iOS] WCSession not ready or watch app not installed.")
             return
        }
        guard session.activationState == .activated else {
            print("[iOS] WCSession not activated yet.")
            return
        }

        let message = ["healthStatus": status]

        // isReachableをチェックする (アプリがフォアグラウンドで動作中か)
        if session.isReachable {
            print("[iOS] Watch is reachable. Sending message...")
            session.sendMessage(message, replyHandler: nil) { (error: Error?) in
                if let unwrappedError = error {
                     print("[iOS] Error sending message to watch: \(unwrappedError.localizedDescription)")
                 } else {
                     print("[iOS] Message sent successfully.")
                 }
            }
        } else {
             print("[iOS] Watch not reachable. Updating application context...")
             do {
                 try session.updateApplicationContext(message)
                 print("[iOS] Updated application context for watch: \(status)")
             } catch {
                 print("[iOS] Error updating application context for watch: \(error.localizedDescription)")
             }
        }
    }

    // --- WCSessionDelegate Methods ---
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("WCSession inactive (iOS)")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("WCSession deactivated (iOS)")
        // デアクティベートされたら再アクティベートを試みる
        self.session?.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed (iOS): \(error.localizedDescription)")
            return
        }
        print("WCSession activated (iOS) with state: \(activationState.rawValue)")
        // 必要であれば、アクティベート完了後に保留中のデータを送信するなどの処理を追加
    }

    // Watchからの応答などを受け取る場合 (今回は使わない)
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
         print("Received message from watch (iOS): \(message)")
         // 応答が必要なメッセージの場合
         // replyHandler(["response": "Acknowledged from iOS"])
    }

    // updateApplicationContext の受信 (今回は使わない)
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("Received application context from watch (iOS): \(applicationContext)")
    }
}
