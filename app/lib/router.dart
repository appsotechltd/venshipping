import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/account_screen.dart';
import 'screens/billing_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/invoice_screen.dart';
import 'screens/login_screen.dart';
import 'screens/receipt_screen.dart';
import 'screens/register_screen.dart';
import 'screens/shipment_detail_screen.dart';
import 'screens/shipments_screen.dart';
import 'screens/shipping_instructions_screen.dart';
import 'screens/splash_screen.dart';
import 'widgets/home_shell.dart';

const _signedOutRoutes = {'/register', '/login', '/forgot-password'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final location = state.matchedLocation;
      if (!auth.hasValue && !auth.hasError) return location == '/splash' ? null : '/splash';

      final signedIn = auth.valueOrNull != null;
      if (!signedIn) return _signedOutRoutes.contains(location) ? null : '/register';
      if (_signedOutRoutes.contains(location) || location == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, state) => ForgotPasswordScreen(initialEmail: state.uri.queryParameters['email']),
      ),
      // Full-screen pages that open over the tab bar.
      GoRoute(path: '/instructions', builder: (_, __) => const ShippingInstructionsScreen()),
      // The signed-in app: four tabs, each keeping its own back stack.
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => HomeShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/shipments',
              builder: (_, __) => const ShipmentsScreen(),
              routes: [
                GoRoute(
                  path: ':trackingNumber',
                  builder: (_, state) => ShipmentDetailScreen(trackingNumber: state.pathParameters['trackingNumber']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/billing',
              builder: (_, __) => const BillingScreen(),
              routes: [
                GoRoute(
                  path: 'invoices/:number',
                  builder: (_, state) => InvoiceScreen(invoiceNumber: state.pathParameters['number']!),
                ),
                GoRoute(
                  path: 'receipts/:number',
                  builder: (_, state) => ReceiptScreen(receiptNumber: state.pathParameters['number']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
          ]),
        ],
      ),
    ],
  );
});
