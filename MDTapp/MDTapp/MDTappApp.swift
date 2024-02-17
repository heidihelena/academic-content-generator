
import SwiftUI

// Define brand colors
extension Color {
    static let brandPrimary = Color.blue
    static let brandSecondary = Color.gray
}

// Main App Structure
@main
struct MDTappApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationView {
                PatientInputView()
            }
        }
    }
}

// Patient Input View
struct PatientInputView: View {
    @State private var age: String = ""
    @State private var sex: String = ""
    @State private var smokingStatus: String = ""
    @State private var tumorSize: String = ""
    @State private var nodes: String = ""
    @State private var metastasis: String = ""
    @State private var showRecommendations = false

    let sexes = ["Male", "Female", "Other"]
    let smokingStatuses = ["Never", "Former", "Current"]

    var body: some View {
        VStack {
            // Logo Placeholder
            Image("epilung-logo") // Replace with actual logo image file
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: 100)

            Text("Enter Patient Data")
                .font(.title)
                .foregroundColor(.brandPrimary)
                .padding()

            Form {
                Section(header: Text("Patient Details").foregroundColor(.brandSecondary)) {
                    TextField("Age", text: $age)
                    Picker("Sex", selection: $sex) {
                        ForEach(sexes, id: \.self) {
                            Text($0)
                        }
                    }
                    Picker("Smoking Status", selection: $smokingStatus) {
                        ForEach(smokingStatuses, id: \.self) {
                            Text($0)
                        }
                    }
                    TextField("Tumor Size", text: $tumorSize)
                    TextField("Nodes", text: $nodes)
                    TextField("Metastasis", text: $metastasis)
                }
                Button("Submit") {
                    submitData()
                }.buttonStyle(BrandButtonStyle())
            }
        }
        .frame(width: 500, height: 400)
        .sheet(isPresented: $showRecommendations) {
            TreatmentRecommendationView(recommendations: ["Treatment A", "Treatment B"]) // Mock data for now
        }
    }

    func submitData() {
        // Logic to handle data submission
        // For now, we will just show the recommendations view
        showRecommendations = true
    }
}

// Custom Button Style
struct BrandButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(Color.brandPrimary)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// Treatment Recommendation View
struct TreatmentRecommendationView: View {
    var recommendations: [String]

    var body: some View {
        VStack {
            Text("Treatment Recommendations")
                .font(.title)
                .foregroundColor(.brandPrimary)
                .padding()

            List(recommendations, id: \.self) { recommendation in
                Text(recommendation)
                    .padding()
            }
        }
    }
}

struct LoginCredentials: Codable {
    let username: String
    let password: String
}

func loginUser(username: String, password: String) {
    let url = URL(string: "https://yourserver.com/login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let credentials = LoginCredentials(username: username, password: password)
    request.httpBody = try? JSONEncoder().encode(credentials)

    URLSession.shared.dataTask(with: request) { data, response, error in
        guard let data = data, error == nil else {
            print("Network error: \(error?.localizedDescription ?? "Unknown error")")
            return
        }
        // Handle the response here
    }.resume()
}
func generateSummary(with prompt: String) {
    let url = URL(string: "https://api.openai.com/v1/engines/davinci/completions")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = ["prompt": prompt, "max_tokens": 10, "stop": ["\n"]]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [])
   
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        guard let data = data else {
            print(error?.localizedDescription ?? "Unknown error")
            return
        }
        do {
            if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
               let choices = json["choices"] as? [[String: Any]],
               let firstChoice = choices.first,
               let summary = firstChoice["text"] as? String {
                print("Summary: \(summary)")
            } else {
                print("No summary provided by OpenAI")
            }
        } catch {
            print("Error parsing JSON: \(error)")
        }
    }
    task.resume()
}


