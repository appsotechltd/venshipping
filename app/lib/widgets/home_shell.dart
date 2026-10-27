import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/billing_provider.dart';
import '../theme.dart';

/// Bottom tab bar for the signed-in app: Home, Shipments, Billing, Account.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // A lime dot on Billing while anything is unpaid.
    final owes = ref.watch(invoicesProvider).valueOrNull?.outstanding.isNotEmpty ?? false;

    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        // Tapping the current tab again goes back to the top of that tab.
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping_rounded),
            label: 'Shipments',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: owes,
              backgroundColor: VenColors.lime,
              smallSize: 9,
              child: const Icon(Icons.receipt_long_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: owes,
              backgroundColor: VenColors.lime,
              smallSize: 9,
              child: const Icon(Icons.receipt_long_rounded),
            ),
            label: 'Billing',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
