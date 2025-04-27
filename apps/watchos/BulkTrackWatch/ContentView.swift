import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "figure.strengthtraining.traditional")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("BulkTrack")
                .font(.headline)
            Text("Track your workouts on the go")
                .font(.caption)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}