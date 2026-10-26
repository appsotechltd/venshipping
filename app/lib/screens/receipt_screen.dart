import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/billing.dart';
import '../providers/auth_provider.dart';
import '../providers/billing_provider.dart';
import '../services/billing_pdf.dart';
import '../theme.dart';
import '../widgets/billing_widgets.dart';
import '../widgets/brand_header.dart';
import 'invoice_screen.dart';

class ReceiptScreen extends ConsumerWidget {
  const ReceiptScreen({super.key, required this.receiptNumber});

  final String receiptNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receipt = ref.watch(receiptProvider(receiptNumber));
    return Scaffold(
      appBar: AppBar(title: Text(receiptNumber)),
      body: receipt.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => BillingMessage(
          icon: Icons.cloud_off_rounded,
          title: 'Could not load this receipt',
          body: e.toString(),
          onRetry: () => ref.invalidate(receiptProvider(receiptNumber)),
        ),
        data: (r) => _ReceiptBody(r),
      ),
    );
  }
}

class _ReceiptBody extends ConsumerWidget {
  const _ReceiptBody(this.receipt);

  final Receipt receipt;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(authProvider).valueOrNull?.customer;
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AmountPanel(
            label: 'Amount paid',
            amount: receipt.money(receipt.amountCents),
            caption: receipt.paidInFull
                ? 'Invoice ${receipt.invoiceNumber} is paid in full. Thank you!'
                : '${receipt.money(receipt.balanceAfterCents)} still due on ${receipt.invoiceNumber}',
            trailing: StatusPill(
              label: receipt.paidInFull ? 'Paid in full' : 'Part payment',
              kind: receipt.paidInFull ? 'paid' : 'part_paid',
            ),
          ),
        ),
        const SizedBox(height: 16),
        VenCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionLabel('Receipt details'),
              if (customer != null) DetailRow('Received from', '${customer.fullName}\n${customer.customerId}'),
              DetailRow('Receipt number', receipt.receiptNumber),
              DetailRow('Payment date', dateTimeFormat.format(receipt.paidAt)),
              DetailRow('Payment method', receipt.methodLabel),
              if (receipt.reference != null) DetailRow('Reference', receipt.reference!),
              DetailRow('Invoice total', receipt.money(receipt.invoiceTotalCents)),
              DetailRow('Paid to date', receipt.money(receipt.paidToDateCents)),
              DetailRow('Balance remaining', receipt.money(receipt.balanceAfterCents), strong: true, divider: false),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: OutlinedButton.icon(
            onPressed: () => context.push('/billing/invoices/${receipt.invoiceNumber}'),
            icon: const Icon(Icons.receipt_long_rounded, size: 18),
            label: Text('View invoice ${receipt.invoiceNumber}'),
          ),
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: BillingActions(
            onDownload: customer == null ? null : () => shareReceiptPdf(customer: customer, receipt: receipt),
            onEmail: (api, token) => api.emailReceipt(token, receipt.receiptNumber),
          ),
        ),
        const SizedBox(height: 8),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24),
          child: Text('We also emailed this receipt to you when the payment was recorded.',
              textAlign: TextAlign.center, style: TextStyle(color: VenColors.muted, fontSize: 12)),
        ),
      ],
    );
  }
}
