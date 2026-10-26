import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/shipment.dart';
import '../theme.dart';

IconData shipmentStatusIcon(String status) => switch (status) {
      'received' => Icons.warehouse_outlined,
      'departed' => Icons.flight_takeoff_rounded,
      'in_transit' => Icons.local_shipping_outlined,
      'arrived' => Icons.place_outlined,
      'ready_for_pickup' => Icons.inventory_2_outlined,
      'delivered' => Icons.check_circle_rounded,
      'on_hold' => Icons.pause_circle_outline_rounded,
      _ => Icons.circle_outlined,
    };

IconData shipmentMethodIcon(String method) =>
    method == 'sea' ? Icons.directions_boat_filled_outlined : Icons.flight_rounded;

String formatShipmentDate(DateTime date) => DateFormat.yMMMd().format(date.toLocal());
String formatShipmentDateTime(DateTime date) => DateFormat('d MMM yyyy, HH:mm').format(date.toLocal());

/// Rounded status label: lime when delivered, red when on hold, navy tint otherwise.
class ShipmentStatusChip extends StatelessWidget {
  const ShipmentStatusChip({super.key, required this.shipment, this.onNavy = false});

  final Shipment shipment;
  final bool onNavy;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = shipment.isDelivered
        ? (VenColors.lime, VenColors.navy)
        : shipment.isOnHold
            ? (const Color(0xFFFDE7E5), VenColors.error)
            : onNavy
                ? (VenColors.navyLight, Colors.white)
                : (VenColors.segment, VenColors.navy);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(shipmentStatusIcon(shipment.status), size: 14, color: fg),
        const SizedBox(width: 5),
        Text(shipment.statusLabel,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: fg, fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

/// Six-stage tracker: received → departed → in transit → arrived → ready → delivered.
class ShipmentProgress extends StatelessWidget {
  const ShipmentProgress({super.key, required this.shipment, this.showLabels = true, this.onNavy = false});

  final Shipment shipment;
  final bool showLabels;

  /// Light labels for use on the navy header.
  final bool onNavy;

  @override
  Widget build(BuildContext context) {
    const stages = ShipmentStage.all;
    final step = shipment.progressStep.clamp(0, stages.length - 1).toInt();
    final activeColor = shipment.isOnHold ? VenColors.error : VenColors.lime;
    final text = Theme.of(context).textTheme;

    return Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < stages.length; i++) ...[
              if (i > 0)
                Expanded(
                  child: Container(
                    height: 3,
                    color: i <= step ? VenColors.lime : (onNavy ? VenColors.navyLight : VenColors.border),
                  ),
                ),
              _Dot(done: i < step || shipment.isDelivered, current: i == step && !shipment.isDelivered, color: activeColor),
            ],
          ],
        ),
        if (showLabels) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              for (var i = 0; i < stages.length; i++)
                Expanded(
                  child: Text(
                    stages[i].shortLabel,
                    textAlign: i == 0 ? TextAlign.left : (i == stages.length - 1 ? TextAlign.right : TextAlign.center),
                    style: text.labelSmall?.copyWith(
                      fontSize: 10,
                      color: onNavy
                          ? (i <= step ? Colors.white : VenColors.onNavyMuted)
                          : (i <= step ? VenColors.navy : VenColors.muted),
                      fontWeight: i == step ? FontWeight.w800 : FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.done, required this.current, required this.color});

  final bool done;
  final bool current;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final size = current ? 16.0 : 12.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: done ? VenColors.lime : (current ? color : Colors.white),
        border: Border.all(color: current ? color : (done ? VenColors.lime : VenColors.border), width: 2),
        boxShadow: current ? [BoxShadow(color: color.withAlpha(90), blurRadius: 6, spreadRadius: 2)] : null,
      ),
    );
  }
}

/// One shipment in a list. Tapping opens its tracking timeline.
class ShipmentTile extends StatelessWidget {
  const ShipmentTile({super.key, required this.shipment});

  final Shipment shipment;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final eta = shipment.estimatedArrival;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/shipments/${shipment.trackingNumber}'),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: VenColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(shipmentMethodIcon(shipment.shippingMethod), size: 18, color: VenColors.muted),
                  const SizedBox(width: 6),
                  Text(shipment.trackingNumber,
                      style: text.labelLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.4)),
                  const Spacer(),
                  ShipmentStatusChip(shipment: shipment),
                ],
              ),
              const SizedBox(height: 10),
              Text(shipment.title,
                  maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              if (shipment.measurements.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(shipment.measurements, style: text.bodySmall?.copyWith(color: VenColors.muted)),
              ],
              const SizedBox(height: 14),
              ShipmentProgress(shipment: shipment, showLabels: false),
              const SizedBox(height: 10),
              Text(
                shipment.isDelivered
                    ? 'Delivered ${formatShipmentDate(shipment.updatedAt)}'
                    : eta != null
                        ? 'Estimated arrival ${formatShipmentDate(eta)}'
                        : 'Updated ${formatShipmentDate(shipment.updatedAt)}',
                style: text.bodySmall?.copyWith(color: VenColors.muted, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
