import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/customer.dart';
import '../services/api_client.dart';
import '../services/session_store.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());

class Session {
  const Session({required this.token, required this.customer, this.justRegistered = false});

  final String token;
  final Customer customer;

  /// True straight after sign-up, so the dashboard can welcome the customer.
  final bool justRegistered;

  Session copyWith({Customer? customer, bool? justRegistered}) => Session(
        token: token,
        customer: customer ?? this.customer,
        justRegistered: justRegistered ?? this.justRegistered,
      );
}

/// The signed-in customer, or null when signed out.
final authProvider = AsyncNotifierProvider<AuthNotifier, Session?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<Session?> {
  ApiClient get _api => ref.read(apiClientProvider);
  SessionStore get _store => ref.read(sessionStoreProvider);

  @override
  Future<Session?> build() async {
    final token = await _store.readToken();
    if (token == null) return null;
    final cached = await _store.readCustomer();
    if (cached != null) {
      // Show the saved session at once and refresh it in the background.
      _refresh(token);
      return Session(token: token, customer: cached);
    }
    try {
      final customer = await _api.me(token);
      await _store.saveCustomer(customer);
      return Session(token: token, customer: customer);
    } on ApiException catch (e) {
      if (e.isUnauthorized) await _store.clear();
      return null;
    }
  }

  Future<void> _refresh(String token) async {
    try {
      final customer = await _api.me(token);
      await _store.saveCustomer(customer);
      final current = state.valueOrNull;
      if (current != null && current.token == token) state = AsyncData(current.copyWith(customer: customer));
    } on ApiException catch (e) {
      if (e.isUnauthorized) await logout();
    }
  }

  /// Throws [ApiException] on failure; the form shows the message and field errors.
  Future<void> register(RegistrationRequest request) async {
    final result = await _api.register(request);
    await _store.saveSession(result.token, result.customer);
    if (result.addresses != null) await _store.saveAddresses(result.addresses!);
    state = AsyncData(Session(token: result.token, customer: result.customer, justRegistered: true));
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email, password);
    await _store.saveSession(result.token, result.customer);
    state = AsyncData(Session(token: result.token, customer: result.customer));
  }

  /// Completes "Forgot password" and signs the customer in with the new password.
  Future<void> resetPassword({required String email, required String code, required String password}) async {
    final result = await _api.resetPassword(email: email, code: code, password: password);
    await _store.saveSession(result.token, result.customer);
    state = AsyncData(Session(token: result.token, customer: result.customer));
  }

  void dismissWelcome() {
    final current = state.valueOrNull;
    if (current != null && current.justRegistered) state = AsyncData(current.copyWith(justRegistered: false));
  }

  Future<void> logout() async {
    await _store.clear();
    state = const AsyncData(null);
  }
}
