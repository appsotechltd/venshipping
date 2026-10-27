import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/warehouse_provider.dart';
import '../theme.dart';
import '../widgets/billing_widgets.dart';
import '../widgets/brand_header.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authProvider).valueOrNull?.customer;
    if (customer == null) return const SizedBox.shrink();
    final text = Theme.of(context).textTheme;
    final support = ref.watch(shippingInstructionsProvider).valueOrNull;

    Future<void> copy(String value, String what) async {
      await Clipboard.setData(ClipboardData(text: value));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$what copied')));
      }
    }

    Future<void> confirmLogout() async {
      final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Log out?'),
          content: const Text('Your warehouse address stays saved to your account. Log in again any time.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Log out')),
          ],
        ),
      );
      if (ok == true) await ref.read(authProvider.notifier).logout();
    }

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BrandHeader(
              child: Row(children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: VenColors.lime,
                  foregroundColor: VenColors.navy,
                  child: Text(customer.initials, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(customer.fullName,
                        style: text.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text('Customer ID ${customer.customerId}',
                        style: text.bodyMedium?.copyWith(color: VenColors.onNavyMuted)),
                  ]),
                ),
              ]),
            ),
            OverlapCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SectionLabel('Your details'),
                  DetailRow('Customer ID', customer.customerId),
                  DetailRow('Shipping mark', customer.shippingMark),
                  DetailRow('Email', customer.email),
                  DetailRow('Phone', customer.phone),
                  DetailRow('Deliver to', customer.deliveryDestination),
                  DetailRow('Preferred shipping',
                      customer.preferredShippingMethod == 'sea' ? 'Sea freight' : 'Air freight',
                      divider: false),
                ],
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -24),
              child: VenCard(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(children: [
                  _MenuTile(
                    icon: Icons.copy_rounded,
                    label: 'Copy my shipping mark',
                    onTap: () => copy(customer.shippingMark, 'Shipping mark'),
                  ),
                  _MenuTile(
                    icon: Icons.menu_book_outlined,
                    label: 'Shipping instructions',
                    onTap: () => context.push('/instructions'),
                  ),
                  _MenuTile(
                    icon: Icons.receipt_long_outlined,
                    label: 'Invoices & receipts',
                    onTap: () => context.go('/billing'),
                  ),
                  if (support != null && support.supportEmail.isNotEmpty)
                    _MenuTile(
                      icon: Icons.support_agent_rounded,
                      label: 'Contact support',
                      detail: [support.supportEmail, if (support.supportPhone != null) support.supportPhone!].join('\n'),
                      onTap: () => copy(support.supportEmail, 'Support email'),
                    ),
                ]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: OutlinedButton.icon(
                onPressed: confirmLogout,
                style: OutlinedButton.styleFrom(foregroundColor: VenColors.error),
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Log out'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.onTap, this.detail});

  final IconData icon;
  final String label;
  final String? detail;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(color: VenColors.segment, borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: VenColors.navy, size: 20),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: VenColors.navy)),
      subtitle: detail == null ? null : Text(detail!, style: const TextStyle(color: VenColors.muted)),
      trailing: const Icon(Icons.chevron_right_rounded, color: VenColors.muted),
    );
  }
}
