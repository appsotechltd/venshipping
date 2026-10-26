import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/warehouse_address.dart';
import '../services/api_client.dart';
import 'auth_provider.dart';

/// The signed-in customer's personalised China warehouse addresses, preferred method first.
/// Served from the device cache first, then refreshed from the server.
final warehouseAddressesProvider = StreamProvider<List<WarehouseAddress>>((ref) async* {
  final token = ref.watch(authProvider.select((s) => s.valueOrNull?.token));
  if (token == null) {
    yield const [];
    return;
  }
  final store = ref.read(sessionStoreProvider);
  final cached = await store.readAddresses();
  if (cached != null && cached.isNotEmpty) yield cached;
  try {
    final fresh = await ref.read(apiClientProvider).warehouseAddresses(token);
    await store.saveAddresses(fresh);
    yield fresh;
  } on ApiException {
    if (cached == null || cached.isEmpty) rethrow;
  }
});

final shippingInstructionsProvider = FutureProvider<ShippingInstructions>((ref) {
  return ref.read(apiClientProvider).shippingInstructions();
});

/// Which method's address the dashboard is showing; null means the customer's preferred one.
final selectedMethodProvider = StateProvider<String?>((ref) => null);
