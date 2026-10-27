import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/billing_provider.dart';
import '../theme.dart';
import 'brand_header.dart';

/// Dashboard entry to Billing: what the customer owes, or that they're all paid up.
class BillingCard extends ConsumerWidget {
  const BillingCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final invoices = ref.watch(invoicesProvider).valueOrNull;
    final owed = invoices?.outstanding ?? const [];
    final openCount = invoices?.invoices.where((i) => i.isOpen).length ?? 0;

    final String subtitle;
    if (invoices == null) {
      subtitle = 'Invoices and payment receipts';
    } else if (invoices.invoices.isEmpty) {
      subtitle = 'No invoices yet';
    } else if (owed.isEmpty) {
      subtitle = 'All paid up. Thank you!';
    } else {
      subtitle = '$openCount unpaid · ${owed.map((o) => o.formatted).join(' + ')} to pay';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: VenCard(
        padding: EdgeInsets.zero,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.go('/billing'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 12, 16),
            child: Row(children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: VenColors.navy, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.receipt_long_rounded, color: VenColors.lime),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Invoices & receipts', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: text.bodySmall?.copyWith(
                          color: owed.isEmpty ? VenColors.muted : VenColors.navy,
                          fontWeight: owed.isEmpty ? FontWeight.w500 : FontWeight.w700)),
                ]),
              ),
              if (owed.isNotEmpty)
                Container(
                  width: 10,
                  height: 10,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: const BoxDecoration(color: VenColors.lime, shape: BoxShape.circle),
                ),
              const Icon(Icons.chevron_right_rounded, color: VenColors.muted),
            ]),
          ),
        ),
      ),
    );
  }
}
