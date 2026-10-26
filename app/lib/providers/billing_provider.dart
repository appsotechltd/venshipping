import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/billing.dart';
import 'auth_provider.dart';

String _token(Ref ref) {
  final token = ref.watch(authProvider.select((s) => s.valueOrNull?.token));
  if (token == null) throw StateError('Not signed in');
  return token;
}

/// The customer's invoices (newest first) and what they still owe.
final invoicesProvider = FutureProvider.autoDispose<InvoiceList>((ref) {
  return ref.read(apiClientProvider).invoices(_token(ref));
});

final invoiceProvider = FutureProvider.autoDispose.family<Invoice, String>((ref, number) {
  return ref.read(apiClientProvider).invoice(_token(ref), number);
});

/// Every payment receipt, newest first.
final receiptsProvider = FutureProvider.autoDispose<List<Receipt>>((ref) {
  return ref.read(apiClientProvider).receipts(_token(ref));
});

final receiptProvider = FutureProvider.autoDispose.family<Receipt, String>((ref, number) {
  return ref.read(apiClientProvider).receipt(_token(ref), number);
});
