/// Backend base URL. Override at build time:
///   flutter run --dart-define=API_BASE_URL=https://api.venshipping.com
/// The default reaches a backend on your computer from the Android emulator.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000');
