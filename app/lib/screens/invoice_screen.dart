import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/billing.dart';
import '../providers/auth_provider.dart';
import '../providers/billing_provider.dart';
import '../services/api_client.dart';
import '../services/billing_pdf.dart';
import '../theme.dart';
import '../widgets/billing_widgets.dart';
import '../widgets/brand_header.dart';

class InvoiceScreen extends ConsumerWidget {
  const InvoiceScreen({super.key, required this.invoiceNumber});

  final String invoiceNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoice = ref.watch(invoiceProvider(invoiceNumber));
    return Scaffold(
      appBar: AppBar(title: Text(invoiceNumber)),
      body: invoice.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => BillingMessage(
          icon: Icons.cloud_off_rounded,
          title: 'Could not load this invoice',
          body: e.toString(),
          onRetry: () => ref.invalidate(invoiceProvider(invoiceNumber)),
        ),
        data: (inv) => RefreshIndicator(
          onRefresh: () => ref.refresh(invoiceProvider(invoiceNumber).future),
          child: _InvoiceBody(inv),
        ),
      ),
    );
  }
}

class _InvoiceBody extends ConsumerWidget {
  const _InvoiceBody(this.invoice);

  final Invoice invoice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final customer = ref.watch(authProvider).valueOrNull?.customer;
    final instructions = invoice.billing?.paymentInstructions ?? const [];

    final String panelLabel;
    final String panelCaption;
    if (invoice.status == 'void') {
      panelLabel = 'Cancelled';
      panelCaption = 'Nothing is owed on this invoice.';
    } else if (invoice.status == 'paid') {
      panelLabel = 'Paid in full';
      panelCaption = 'Thank you for your payment.';
    } else {
      panelLabel = invoice.paidCents > 0 ? 'Left to pay' : 'Amount due';
      panelCaption = invoice.dueDate != null
          ? '${invoice.overdue ? 'Was due' : 'Due by'} ${dateFormat.format(invoice.dueDate!)}'
          : 'Issued ${dateFormat.format(invoice.issuedAt)}';
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AmountPanel(
            label: panelLabel,
            amount: invoice.money(invoice.status == 'paid' || invoice.status == 'void' ? invoice.totalCents : invoice.balanceCents),
            caption: panelCaption,
            trailing: StatusPill.forInvoice(invoice),
          ),
        ),
        const SizedBox(height: 16),
        VenCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const SectionLabel('Invoice'),
                    Text(invoice.invoiceNumber, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                    Text('Issued ${dateFormat.format(invoice.issuedAt)}', style: text.bodySmall),
                    if (invoice.dueDate != null) Text('Due ${dateFormat.format(invoice.dueDate!)}', style: text.bodySmall),
                  ]),
                ),
                if (customer != null)
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const SectionLabel('Billed to'),
                      Text(customer.fullName, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                      Text(customer.customerId, style: text.bodySmall),
                    ]),
                  ),
              ]),
              const SizedBox(height: 20),
              const SectionLabel('Charges'),
              for (final item in invoice.items)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: VenColors.segment))),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item.description, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                        Text('${item.quantityText} × ${invoice.money(item.unitPriceCents)}',
                            style: text.bodySmall?.copyWith(color: VenColors.muted)),
                      ]),
                    ),
                    Text(invoice.money(item.amountCents), style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w800)),
                  ]),
                ),
              DetailRow('Subtotal', invoice.money(invoice.subtotalCents ?? invoice.totalCents)),
              if (invoice.paidCents > 0) DetailRow('Paid', '−${invoice.money(invoice.paidCents)}'),
              DetailRow(invoice.status == 'void' ? 'Total' : 'Balance due',
                  invoice.money(invoice.status == 'void' ? invoice.totalCents : invoice.balanceCents),
                  strong: true, divider: false),
              if (invoice.notes != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: VenColors.limeTint,
                    borderRadius: BorderRadius.circular(10),
                    border: const Border(left: BorderSide(color: VenColors.lime, width: 4)),
                  ),
                  child: Text(invoice.notes!, style: text.bodyMedium),
                ),
              ],
            ],
          ),
        ),
        if (invoice.isOpen && instructions.isNotEmpty) ...[
          const SizedBox(height: 16),
          VenCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SectionLabel('How to pay'),
                for (final line in instructions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: SelectableText(line, style: text.bodyMedium?.copyWith(height: 1.4)),
                  ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: VenColors.limeTint, borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    Text('Payment reference', style: text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Text(invoice.invoiceNumber, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w800)),
                    IconButton(
                      tooltip: 'Copy reference',
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: invoice.invoiceNumber));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context)
                              .showSnackBar(const SnackBar(content: Text('Payment reference copied')));
                        }
                      },
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ],
        if (invoice.payments.isNotEmpty) ...[
          const SizedBox(height: 16),
          VenCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SectionLabel('Payments'),
                for (final p in invoice.payments)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: VenColors.navy,
                      foregroundColor: VenColors.lime,
                      child: Icon(Icons.check_rounded),
                    ),
                    title: Text(p.money(p.amountCents), style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('${dateFormat.format(p.paidAt)} · ${p.methodLabel}'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push('/billing/receipts/${p.receiptNumber}'),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: BillingActions(
            onDownload: customer == null ? null : () => shareInvoicePdf(customer: customer, invoice: invoice),
            onEmail: (api, token) => api.emailInvoice(token, invoice.invoiceNumber),
          ),
        ),
      ],
    );
  }
}

/// "Download PDF" and "Email me a copy", shared by invoices and receipts.
class BillingActions extends ConsumerStatefulWidget {
  const BillingActions({super.key, required this.onDownload, required this.onEmail});

  final Future<void> Function()? onDownload;
  final Future<String> Function(ApiClient api, String token) onEmail;

  @override
  ConsumerState<BillingActions> createState() => _BillingActionsState();
}

class _BillingActionsState extends ConsumerState<BillingActions> {
  bool _emailing = false;

  void _toast(String message) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  Future<void> _download() async {
    try {
      await widget.onDownload!();
    } catch (_) {
      if (mounted) _toast('Could not create the PDF. Please try again.');
    }
  }

  Future<void> _email() async {
    final token = ref.read(authProvider).valueOrNull?.token;
    if (token == null) return;
    setState(() => _emailing = true);
    try {
      final message = await widget.onEmail(ref.read(apiClientProvider), token);
      if (mounted) _toast(message);
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    } finally {
      if (mounted) setState(() => _emailing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: FilledButton.icon(
          onPressed: widget.onDownload == null ? null : _download,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          icon: const Icon(Icons.download_rounded, size: 18),
          label: const Text('Download PDF'),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: OutlinedButton.icon(
          onPressed: _emailing ? null : _email,
          icon: _emailing
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.mail_outline_rounded, size: 18),
          label: const Text('Email me a copy'),
        ),
      ),
    ]);
  }
}
