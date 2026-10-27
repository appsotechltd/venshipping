import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/shipment.dart';
import '../providers/shipments_provider.dart';
import '../theme.dart';
import '../widgets/brand_header.dart';
import '../widgets/shipment_widgets.dart';

class ShipmentDetailScreen extends ConsumerWidget {
  const ShipmentDetailScreen({super.key, required this.trackingNumber});

  final String trackingNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(shipmentDetailProvider(trackingNumber));
    // Show the list's copy straight away while the timeline loads.
    final listed = ref.watch(shipmentsProvider).valueOrNull ?? const <Shipment>[];
    final fromList = listed.where((s) => s.trackingNumber == trackingNumber);
    final shipment = detail.valueOrNull ?? (fromList.isEmpty ? null : fromList.first);

    return Scaffold(
      appBar: AppBar(title: Text(trackingNumber)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(shipmentsProvider);
          await ref.refresh(shipmentDetailProvider(trackingNumber).future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            if (shipment == null)
              detail.hasError
                  ? _Retry(message: detail.error.toString(), onRetry: () => ref.invalidate(shipmentDetailProvider(trackingNumber)))
                  : const Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator()))
            else ...[
              _StatusHeader(shipment: shipment),
              Transform.translate(
                offset: const Offset(0, -28),
                child: Column(children: [
                  VenCard(child: _Details(shipment: shipment)),
                  const SizedBox(height: 16),
                  VenCard(
                    child: detail.when(
                      data: (s) => _Timeline(events: s.events ?? const []),
                      loading: () => const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (e, _) => _Retry(
                        message: e.toString(),
                        onRetry: () => ref.invalidate(shipmentDetailProvider(trackingNumber)),
                      ),
                    ),
                  ),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.shipment});

  final Shipment shipment;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final eta = shipment.estimatedArrival;
    final events = shipment.events ?? const <ShipmentEvent>[];
    final latest = events.isEmpty ? null : events.first;
    return Container(
      color: VenColors.navy,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 52),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(shipmentMethodIcon(shipment.shippingMethod), size: 16, color: VenColors.onNavyMuted),
            const SizedBox(width: 6),
            Text(shipment.methodName, style: text.bodySmall?.copyWith(color: VenColors.onNavyMuted)),
          ]),
          const SizedBox(height: 8),
          Text(shipment.statusLabel,
              style: text.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(
            shipment.isDelivered
                ? 'Delivered on ${formatShipmentDate(shipment.updatedAt)}'
                : shipment.isOnHold && latest?.note != null
                    ? latest!.note!
                    : eta != null
                        ? 'Estimated arrival ${formatShipmentDate(eta)}'
                        : 'Last updated ${formatShipmentDateTime(shipment.updatedAt)}',
            style: text.bodyMedium?.copyWith(color: shipment.isOnHold ? const Color(0xFFFFB4AB) : VenColors.lime),
          ),
          const SizedBox(height: 20),
          ShipmentProgress(shipment: shipment, onNavy: true),
        ],
      ),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.shipment});

  final Shipment shipment;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final rows = <(String, String)>[
      ('Goods', shipment.title),
      if (shipment.packages != null) ('Packages', '${shipment.packages}'),
      if (shipment.weightText != null) ('Weight', shipment.weightText!),
      if (shipment.volumeText != null) ('Volume', shipment.volumeText!),
      ('Received in China', formatShipmentDate(shipment.createdAt)),
      if (shipment.supplierTracking != null) ('Supplier tracking', shipment.supplierTracking!),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Text('TRACKING NUMBER', style: text.labelMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
          const Spacer(),
          InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: shipment.trackingNumber));
              if (context.mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('Tracking number copied')));
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: VenColors.limeTint, borderRadius: BorderRadius.circular(8)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(shipment.trackingNumber, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(width: 6),
                const Icon(Icons.copy_rounded, size: 15),
              ]),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        for (final (label, value) in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 130,
                  child: Text(label, style: text.bodySmall?.copyWith(color: VenColors.muted, fontWeight: FontWeight.w600)),
                ),
                Expanded(child: Text(value, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w700))),
              ],
            ),
          ),
      ],
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.events});

  final List<ShipmentEvent> events;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('TRACKING HISTORY', style: text.labelMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
        const SizedBox(height: 16),
        for (var i = 0; i < events.length; i++)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(children: [
                  CircleAvatar(
                    radius: 15,
                    backgroundColor: i == 0
                        ? (events[i].status == 'on_hold' ? VenColors.error : VenColors.lime)
                        : VenColors.segment,
                    foregroundColor: i == 0 && events[i].status == 'on_hold' ? Colors.white : VenColors.navy,
                    child: Icon(shipmentStatusIcon(events[i].status), size: 16),
                  ),
                  if (i < events.length - 1)
                    Expanded(child: Container(width: 2, margin: const EdgeInsets.symmetric(vertical: 4), color: VenColors.border)),
                ]),
                const SizedBox(width: 14),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4, bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(events[i].statusLabel,
                            style: text.titleSmall?.copyWith(
                                fontWeight: i == 0 ? FontWeight.w800 : FontWeight.w600,
                                color: i == 0 ? VenColors.navy : VenColors.muted)),
                        const SizedBox(height: 2),
                        Text(
                          [formatShipmentDateTime(events[i].occurredAt), if (events[i].location != null) events[i].location!]
                              .join(' · '),
                          style: text.bodySmall?.copyWith(color: VenColors.muted),
                        ),
                        if (events[i].note != null) ...[
                          const SizedBox(height: 4),
                          Text(events[i].note!, style: text.bodyMedium?.copyWith(height: 1.35)),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(message, textAlign: TextAlign.center),
        TextButton(onPressed: onRetry, child: const Text('Try again')),
      ]),
    );
  }
}
