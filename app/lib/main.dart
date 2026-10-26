import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import 'theme.dart';

void main() {
  runApp(const ProviderScope(child: VenShippingApp()));
}

class VenShippingApp extends ConsumerWidget {
  const VenShippingApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'VEN Shipping',
      debugShowCheckedModeBanner: false,
      theme: buildVenTheme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
