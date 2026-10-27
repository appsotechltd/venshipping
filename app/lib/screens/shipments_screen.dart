import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/shipment.dart';
import '../providers/shipments_provider.dart';
import '../theme.dart';
import '../widgets/shipment_widgets.dart';

class ShipmentsScreen extends ConsumerWidget {
  const ShipmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shipments = ref.watch(shipmentsProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My shipments'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: VenColors.onNavyMuted,
            indicatorColor: VenColors.lime,
            indicatorWeight: 3,
            dividerColor: Colors.transparent,
            tabs: [Tab(text: 'Active'), Tab(text: 'Delivered')],
          ),
        ),
        body: shipments.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _Centered(
            message: e.toString(),
            action: TextButton(onPressed: () => ref.invalidate(shipmentsProvider), child: const Text('Try again')),
          ),
          data: (list) => TabBarView(
            children: [
              _ShipmentList(
                shipments: list.where((s) => !s.isDelivered).toList(),
                empty: const _EmptyActive(),
              ),
              _ShipmentList(
                shipments: list.where((s) => s.isDelivered).toList(),
                empty: const _Centered(message: 'Delivered shipments will appear here.'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShipmentList extends ConsumerWidget {
  const _ShipmentList({required this.shipments, required this.empty});

  final List<Shipment> shipments;
  final Widget empty;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () => ref.refresh(shipmentsProvider.future),
      child: shipments.isEmpty
          ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: [const SizedBox(height: 60), empty])
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: shipments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => ShipmentTile(shipment: shipments[i]),
            ),
    );
  }
}

class _EmptyActive extends StatelessWidget {
  const _EmptyActive();

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 34,
            backgroundColor: VenColors.limeTint,
            child: Icon(Icons.inventory_2_outlined, size: 34, color: VenColors.navy),
          ),
          const SizedBox(height: 16),
          Text('No shipments yet', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(
            'When your goods reach our China warehouse they appear here, and you can follow them all the way to you.',
            textAlign: TextAlign.center,
            style: text.bodyMedium?.copyWith(color: VenColors.muted, height: 1.4),
          ),
          const SizedBox(height: 20),
          FilledButton(onPressed: () => context.go('/'), child: const Text('Get my warehouse address')),
        ],
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.message, this.action});

  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: VenColors.muted)),
          if (action != null) action!,
        ]),
      ),
    );
  }
}
