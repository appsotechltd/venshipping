import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/billing.dart';
import '../theme.dart';

final dateFormat = DateFormat('d MMM yyyy');
final dateTimeFormat = DateFormat('d MMM yyyy, HH:mm');

/// Unpaid / Part paid / Paid / Overdue / Cancelled.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.kind});

  factory StatusPill.forInvoice(Invoice invoice) =>
      StatusPill(label: invoice.overdue ? 'Overdue' : invoice.statusLabel, kind: invoice.overdue ? 'overdue' : invoice.status);

  final String label;
  final String kind;

  static const _colors = {
    'paid': (VenColors.lime, VenColors.navy),
    'part_paid': (Color(0xFFFFF1C2), Color(0xFF7A5B00)),
    'unpaid': (Color(0xFFE8E9F3), VenColors.navy),
    'overdue': (Color(0xFFFDE2E0), Color(0xFF9C2A20)),
    'void': (Color(0xFFE6E7EE), VenColors.muted),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors[kind] ?? _colors['unpaid']!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(label.toUpperCase(),
          style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
    );
  }
}

/// Navy panel with a big lime figure, used for "Amount due" and "Amount paid".
class AmountPanel extends StatelessWidget {
  const AmountPanel({super.key, required this.label, required this.amount, this.caption, this.trailing});

  final String label;
  final String amount;
  final String? caption;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      decoration: BoxDecoration(color: VenColors.navy, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(label.toUpperCase(),
                  style: text.labelMedium
                      ?.copyWith(color: VenColors.onNavyMuted, fontWeight: FontWeight.w700, letterSpacing: 1)),
            ),
            if (trailing != null) trailing!,
          ]),
          const SizedBox(height: 6),
          Text(amount, style: text.headlineMedium?.copyWith(color: VenColors.lime, fontWeight: FontWeight.w800)),
          if (caption != null) ...[
            const SizedBox(height: 4),
            Text(caption!, style: text.bodySmall?.copyWith(color: VenColors.onNavyMuted)),
          ],
        ],
      ),
    );
  }
}

/// Label on the left, value on the right; a row of a receipt or invoice summary.
class DetailRow extends StatelessWidget {
  const DetailRow(this.label, this.value, {super.key, this.strong = false, this.divider = true});

  final String label;
  final String value;
  final bool strong;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(
        border: divider ? const Border(bottom: BorderSide(color: VenColors.segment)) : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: (strong ? text.titleSmall : text.bodyMedium)?.copyWith(
                  color: strong ? VenColors.navy : VenColors.muted,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w500)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: (strong ? text.titleSmall : text.bodyMedium)?.copyWith(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(label.toUpperCase(),
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: VenColors.muted, fontWeight: FontWeight.w800, letterSpacing: 1)),
    );
  }
}

/// Centered message with an optional retry, for empty and error states.
class BillingMessage extends StatelessWidget {
  const BillingMessage({super.key, required this.icon, required this.title, this.body, this.onRetry});

  final IconData icon;
  final String title;
  final String? body;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: VenColors.limeTint,
            foregroundColor: VenColors.navy,
            child: Icon(icon, size: 28),
          ),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(body!, textAlign: TextAlign.center, style: text.bodyMedium?.copyWith(color: VenColors.muted)),
          ],
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}
