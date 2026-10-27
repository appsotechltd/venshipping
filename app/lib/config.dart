/// Backend base URL. Defaults to the production API.
/// To test against a backend on your computer from the Android emulator:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.venshipping.com');
