import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/shipments_provider.dart';
import '../theme.dart';
import 'brand_header.dart';
import 'shipment_widgets.dart';

/// Dashboard card: the customer's latest active shipments and a way into the full list.
class ShipmentsCard extends ConsumerWidget {
  const ShipmentsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final shipments = ref.watch(shipmentsProvider).valueOrNull ?? const [];
    final active = shipments.where((s) => !s.isDelivered).toList();

    return VenCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Text('Track my shipments', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(width: 8),
            if (active.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: VenColors.lime, borderRadius: BorderRadius.circular(999)),
                child: Text('${active.length} active', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w800)),
              ),
          ]),
          const SizedBox(height: 12),
          if (active.isEmpty)
            Text(
              shipments.isEmpty
                  ? 'Your goods show up here as soon as they reach our China warehouse.'
                  : 'All your shipments have been delivered.',
              style: text.bodyMedium?.copyWith(color: VenColors.muted, height: 1.4),
            )
          else
            for (final s in active.take(2))
              InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => context.push('/shipments/${s.trackingNumber}'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(
                        child: Text(s.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      ShipmentStatusChip(shipment: s),
                    ]),
                    const SizedBox(height: 10),
                    ShipmentProgress(shipment: s, showLabels: false),
                  ]),
                ),
              ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.push('/shipments'),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(shipments.isEmpty ? 'View shipments' : 'View all shipments'),
                const SizedBox(width: 6),
                const Icon(Icons.arrow_forward_rounded, size: 18),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
