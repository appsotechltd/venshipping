import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../models/customer.dart';
import '../models/warehouse_address.dart';
import '../providers/auth_provider.dart';
import '../providers/billing_provider.dart';
import '../providers/shipments_provider.dart';
import '../providers/warehouse_provider.dart';
import '../services/address_pdf.dart';
import '../theme.dart';
import '../widgets/billing_card.dart';
import '../widgets/brand_header.dart';
import '../widgets/method_toggle.dart';
import '../widgets/shipments_card.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = ref.read(authProvider).valueOrNull;
      if (session == null || !session.justRegistered || !mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        duration: const Duration(seconds: 6),
        content: Text('Welcome to VEN Shipping! Your customer ID is ${session.customer.customerId}. '
            'We have also emailed your warehouse address to ${session.customer.email}.'),
      ));
      ref.read(authProvider.notifier).dismissWelcome();
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authProvider).valueOrNull;
    if (session == null) return const SizedBox.shrink();
    final customer = session.customer;
    final addresses = ref.watch(warehouseAddressesProvider);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () {
          ref.invalidate(invoicesProvider);
          ref.invalidate(shipmentsProvider);
          return ref.refresh(warehouseAddressesProvider.future);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              BrandHeader(
                overlap: 46,
                trailing: _AccountButton(customer: customer),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Welcome, ${customer.firstName}',
                        style: text.bodyLarge?.copyWith(color: VenColors.onNavyMuted)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('CUSTOMER ID',
                            style: text.labelMedium?.copyWith(
                                color: VenColors.onNavyMuted, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration:
                              BoxDecoration(color: VenColors.lime, borderRadius: BorderRadius.circular(8)),
                          child: SelectableText(customer.customerId,
                              style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              OverlapCard(
                overlap: 46,
                child: addresses.when(
                  data: (list) => list.isEmpty
                      ? const _Message('No warehouse address is set up yet. Please contact VEN Shipping.')
                      : _AddressPanel(customer: customer, addresses: list),
                  loading: () => const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (e, _) => _Message(
                    e.toString(),
                    action: TextButton(
                      onPressed: () => ref.invalidate(warehouseAddressesProvider),
                      child: const Text('Try again'),
                    ),
                  ),
                ),
              ),
              Transform.translate(offset: const Offset(0, -30), child: const Padding(padding: EdgeInsets.only(bottom: 16), child: ShipmentsCard())),
              Transform.translate(offset: const Offset(0, -30), child: const BillingCard()),
              Transform.translate(offset: const Offset(0, -30), child: const _StepsCard()),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddressPanel extends ConsumerWidget {
  const _AddressPanel({required this.customer, required this.addresses});

  final Customer customer;
  final List<WarehouseAddress> addresses;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final selected = ref.watch(selectedMethodProvider) ?? customer.preferredShippingMethod;
    final address = addresses.firstWhere((a) => a.method == selected, orElse: () => addresses.first);
    final methods = addresses.map((a) => a.method).toSet();

    void toast(String message) =>
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

    Future<void> copy() async {
      await Clipboard.setData(ClipboardData(text: address.fullText));
      toast('${address.methodName} address copied');
    }

    Future<void> share() async {
      final box = context.findRenderObject() as RenderBox?;
      await Share.share(
        'OUR CHINA WAREHOUSE ADDRESS (${address.methodName})\n\n${address.fullText}',
        subject: 'VEN Shipping China warehouse address (${customer.customerId})',
        sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
      );
    }

    Future<void> download() async {
      var instructions = const <String>[];
      try {
        instructions = (await ref.read(shippingInstructionsProvider.future)).steps;
      } catch (_) {
        // The PDF is still useful without the instructions when offline.
      }
      try {
        await downloadAddressPdf(customer: customer, address: address, instructions: instructions);
      } catch (_) {
        toast('Could not create the PDF. Please try again.');
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('OUR CHINA WAREHOUSE ADDRESS',
            style: text.labelLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 1)),
        const SizedBox(height: 16),
        if (methods.containsAll(MethodToggle.methods.keys)) ...[
          MethodToggle(
            compact: true,
            value: address.method,
            onChanged: (m) => ref.read(selectedMethodProvider.notifier).state = m,
          ),
          const SizedBox(height: 16),
        ],
        _Field('Recipient', address.recipient, bold: true),
        _Field('Phone', address.phone),
        _Field('Address', '${address.addressLine}\n${address.cityLine}\n${address.country}'),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: VenColors.limeTint, borderRadius: BorderRadius.circular(10)),
          child: Row(
            children: [
              Text('Shipping mark', style: text.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(width: 12),
              Expanded(
                child: SelectableText(address.shippingMark,
                    textAlign: TextAlign.right, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        ),
        if (address.transitTime != null) ...[
          const SizedBox(height: 10),
          Text('${address.methodName} usually arrives in ${address.transitTime}.',
              style: text.bodySmall?.copyWith(color: VenColors.muted)),
        ],
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: copy,
              style: FilledButton.styleFrom(
                backgroundColor: VenColors.navy,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.copy_rounded, size: 18),
              label: const Text('Copy Address'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: share,
              icon: const Icon(Icons.share_outlined, size: 18),
              label: const Text('Share Address'),
            ),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: download,
              icon: const Icon(Icons.download_rounded, size: 18),
              label: const Text('Download'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => context.push('/instructions'),
              icon: const Icon(Icons.menu_book_outlined, size: 18),
              label: const Text('Instructions'),
            ),
          ),
        ]),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  const _Field(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: text.bodySmall?.copyWith(color: VenColors.muted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          SelectableText(value,
              style: text.bodyMedium
                  ?.copyWith(height: 1.45, fontWeight: bold ? FontWeight.w700 : FontWeight.w600)),
        ],
      ),
    );
  }
}

class _StepsCard extends StatelessWidget {
  const _StepsCard();

  static const _steps = [
    'Give your supplier the address above.',
    'Ask them to write your shipping mark on every carton.',
    'We receive, weigh and ship your goods to you.',
  ];

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return VenCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Start shipping in 3 steps', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (var i = 0; i < _steps.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 13,
                    backgroundColor: VenColors.lime,
                    foregroundColor: VenColors.navy,
                    child: Text('${i + 1}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(_steps[i], style: text.bodyMedium?.copyWith(height: 1.4)),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _AccountButton extends ConsumerWidget {
  const _AccountButton({required this.customer});

  final Customer customer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Semantics(
      button: true,
      label: 'Account',
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => context.go('/account'),
        child: CircleAvatar(
          radius: 22,
          backgroundColor: VenColors.navyLight,
          foregroundColor: Colors.white,
          child: Text(customer.initials, style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.message, {this.action});

  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Text(message, textAlign: TextAlign.center),
          if (action != null) action!,
        ],
      ),
    );
  }
}
