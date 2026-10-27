import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/shipment.dart';
import '../services/api_client.dart';
import 'auth_provider.dart';

/// The signed-in customer's shipments, active first.
/// Served from the device cache first, then refreshed from the server.
final shipmentsProvider = StreamProvider<List<Shipment>>((ref) async* {
  final token = ref.watch(authProvider.select((s) => s.valueOrNull?.token));
  if (token == null) {
    yield const [];
    return;
  }
  final store = ref.read(sessionStoreProvider);
  final cached = await store.readShipments();
  if (cached != null) yield cached;
  try {
    final fresh = await ref.read(apiClientProvider).shipments(token);
    await store.saveShipments(fresh);
    yield fresh;
  } on ApiException {
    if (cached == null) rethrow;
  }
});

/// One shipment with its full tracking timeline.
final shipmentDetailProvider = FutureProvider.autoDispose.family<Shipment, String>((ref, trackingNumber) {
  final token = ref.watch(authProvider.select((s) => s.valueOrNull?.token));
  if (token == null) throw ApiException('Please log in.', statusCode: 401);
  return ref.read(apiClientProvider).shipment(token, trackingNumber);
});
