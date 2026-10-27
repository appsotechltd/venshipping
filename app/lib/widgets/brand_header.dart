import 'package:flutter/material.dart';

import '../theme.dart';

/// Navy header with the white logo. [overlap] is how far the card below is pulled up into it.
class BrandHeader extends StatelessWidget {
  const BrandHeader({super.key, required this.child, this.trailing, this.overlap = 40});

  final Widget child;
  final Widget? trailing;
  final double overlap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: VenColors.navy,
      padding: EdgeInsets.fromLTRB(24, MediaQuery.paddingOf(context).top + 24, 20, 24 + overlap),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Image.asset('assets/images/logo_white.png', width: 190, semanticLabel: 'VEN International Logistics'),
              const Spacer(),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 22),
          child,
        ],
      ),
    );
  }
}

/// White rounded card that sits over the bottom of a [BrandHeader].
class OverlapCard extends StatelessWidget {
  const OverlapCard({super.key, required this.child, this.overlap = 40});

  final Widget child;
  final double overlap;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: Offset(0, -overlap),
      child: VenCard(child: child),
    );
  }
}

class VenCard extends StatelessWidget {
  const VenCard({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: padding,
      decoration: BoxDecoration(
        color: VenColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [BoxShadow(color: Color(0x1A17174A), blurRadius: 24, offset: Offset(0, 8))],
      ),
      child: child,
    );
  }
}
