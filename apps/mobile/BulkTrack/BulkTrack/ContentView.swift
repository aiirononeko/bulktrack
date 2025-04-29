//
//  ContentView.swift
//  BulkTrack
//
//  Created by Ryota Katada on 2025/04/29.
//

import SwiftUI

struct ContentView: View {
    @State private var healthStatus: String = "Checking health..."

    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
            Text(healthStatus)
        }
        .padding()
        .onAppear {
            fetchHealthStatus()
        }
    }

    func fetchHealthStatus() {
        guard let url = URL(string: "http://localhost:5555/health") else {
            healthStatus = "Invalid URL"
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    healthStatus = "Error: \(error.localizedDescription)"
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else {
                    healthStatus = "Error: Invalid response"
                    return
                }

                if let data = data, let status = String(data: data, encoding: .utf8) {
                    healthStatus = "Status: \(status)"
                } else {
                    healthStatus = "Error: Could not parse response"
                }
            }
        }
        task.resume()
    }
}

#Preview {
    ContentView()
}
