import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/warehouse_provider.dart';
import '../theme.dart';
import '../widgets/brand_header.dart';

class ShippingInstructionsScreen extends ConsumerWidget {
  const ShippingInstructionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final instructions = ref.watch(shippingInstructionsProvider);
    final mark = ref.watch(authProvider).valueOrNull?.customer.shippingMark;

    return Scaffold(
      appBar: AppBar(title: const Text('Shipping instructions')),
      body: instructions.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(e.toString(), textAlign: TextAlign.center),
              TextButton(onPressed: () => ref.invalidate(shippingInstructionsProvider), child: const Text('Try again')),
            ]),
          ),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.symmetric(vertical: 20),
          children: [
            if (mark != null)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: VenColors.lime, borderRadius: BorderRadius.circular(14)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('YOUR SHIPPING MARK',
                      style: text.labelMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                  const SizedBox(height: 4),
                  SelectableText(mark, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Write this on every carton and in the recipient name.', style: text.bodySmall),
                ]),
              ),
            VenCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('How to send goods to VEN Shipping',
                      style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  for (var i = 0; i < data.steps.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        CircleAvatar(
                          radius: 13,
                          backgroundColor: VenColors.navy,
                          foregroundColor: Colors.white,
                          child: Text('${i + 1}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 3),
                            child: Text(data.steps[i], style: text.bodyMedium?.copyWith(height: 1.45)),
                          ),
                        ),
                      ]),
                    ),
                ],
              ),
            ),
            if (data.supportEmail.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Text(
                  'Need help? Contact ${data.supportEmail}'
                  '${data.supportPhone != null ? ' or ${data.supportPhone}' : ''}.',
                  style: text.bodyMedium?.copyWith(color: VenColors.muted),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
