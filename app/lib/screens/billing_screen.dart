import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/billing.dart';
import '../providers/billing_provider.dart';
import '../theme.dart';
import '../widgets/billing_widgets.dart';

/// Invoices and payment receipts.
class BillingScreen extends ConsumerWidget {
  const BillingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Billing'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: VenColors.onNavyMuted,
            indicatorColor: VenColors.lime,
            indicatorWeight: 3,
            labelStyle: TextStyle(fontWeight: FontWeight.w800),
            tabs: [Tab(text: 'Invoices'), Tab(text: 'Receipts')],
          ),
        ),
        body: const TabBarView(children: [_InvoicesTab(), _ReceiptsTab()]),
      ),
    );
  }
}

class _InvoicesTab extends ConsumerWidget {
  const _InvoicesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(invoicesProvider.future),
      child: invoices.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ListView(children: [
          BillingMessage(
            icon: Icons.cloud_off_rounded,
            title: 'Could not load your invoices',
            body: e.toString(),
            onRetry: () => ref.invalidate(invoicesProvider),
          ),
        ]),
        data: (data) {
          if (data.invoices.isEmpty) {
            return ListView(children: const [
              BillingMessage(
                icon: Icons.receipt_long_rounded,
                title: 'No invoices yet',
                body: 'When we invoice you for a shipment it appears here, and we email you a copy.',
              ),
            ]);
          }
          final owed = data.outstanding;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              AmountPanel(
                label: owed.isEmpty ? 'All paid up' : 'Total to pay',
                amount: owed.isEmpty ? formatMoney(0, data.invoices.first.currency) : owed.map((o) => o.formatted).join(' + '),
                caption: owed.isEmpty
                    ? 'Thank you! You have no unpaid invoices.'
                    : '${data.invoices.where((i) => i.isOpen).length} unpaid invoice(s). Tap one for payment details.',
              ),
              const SizedBox(height: 20),
              const SectionLabel('Your invoices'),
              for (final invoice in data.invoices) _InvoiceTile(invoice),
            ],
          );
        },
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  const _InvoiceTile(this.invoice);

  final Invoice invoice;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final subtitle = invoice.isOpen && invoice.dueDate != null
        ? 'Due ${dateFormat.format(invoice.dueDate!)}'
        : 'Issued ${dateFormat.format(invoice.issuedAt)}';
    return _Tile(
      onTap: () => context.push('/billing/invoices/${invoice.invoiceNumber}'),
      icon: Icons.receipt_long_rounded,
      title: invoice.invoiceNumber,
      subtitle: subtitle,
      amount: invoice.money(invoice.isOpen ? invoice.balanceCents : invoice.totalCents),
      amountCaption: invoice.isOpen && invoice.paidCents > 0 ? 'left to pay' : null,
      badge: StatusPill.forInvoice(invoice),
      text: text,
    );
  }
}

class _ReceiptsTab extends ConsumerWidget {
  const _ReceiptsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receipts = ref.watch(receiptsProvider);
    final text = Theme.of(context).textTheme;
    return RefreshIndicator(
      onRefresh: () => ref.refresh(receiptsProvider.future),
      child: receipts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ListView(children: [
          BillingMessage(
            icon: Icons.cloud_off_rounded,
            title: 'Could not load your receipts',
            body: e.toString(),
            onRetry: () => ref.invalidate(receiptsProvider),
          ),
        ]),
        data: (list) => list.isEmpty
            ? ListView(children: const [
                BillingMessage(
                  icon: Icons.verified_outlined,
                  title: 'No payments yet',
                  body: 'Every payment you make gets a receipt here, and we email it to you too.',
                ),
              ])
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  const SectionLabel('Payment receipts'),
                  for (final r in list)
                    _Tile(
                      onTap: () => context.push('/billing/receipts/${r.receiptNumber}'),
                      icon: Icons.check_circle_rounded,
                      iconColor: VenColors.lime,
                      title: r.receiptNumber,
                      subtitle: '${dateFormat.format(r.paidAt)} · ${r.methodLabel} · ${r.invoiceNumber}',
                      amount: r.money(r.amountCents),
                      text: text,
                    ),
                ],
              ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.onTap,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.text,
    this.amountCaption,
    this.badge,
    this.iconColor,
  });

  final VoidCallback onTap;
  final IconData icon;
  final Color? iconColor;
  final String title;
  final String subtitle;
  final String amount;
  final String? amountCaption;
  final Widget? badge;
  final TextTheme text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: VenColors.surface,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x99D8DAE8)),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: iconColor == null ? VenColors.segment : VenColors.navy,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: iconColor ?? VenColors.navy, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodySmall?.copyWith(color: VenColors.muted)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(amount, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                    if (amountCaption != null)
                      Text(amountCaption!, style: text.labelSmall?.copyWith(color: VenColors.muted)),
                    if (badge != null) ...[const SizedBox(height: 6), badge!],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
