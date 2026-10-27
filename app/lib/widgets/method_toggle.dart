import 'package:flutter/material.dart';

import '../theme.dart';

/// Air / Sea freight picker. [compact] is the segmented style used on the dashboard.
class MethodToggle extends StatelessWidget {
  const MethodToggle({super.key, required this.value, required this.onChanged, this.compact = false});

  final String value;
  final ValueChanged<String> onChanged;
  final bool compact;

  static const methods = {'air': 'Air freight', 'sea': 'Sea freight'};

  @override
  Widget build(BuildContext context) {
    final buttons = [
      for (final entry in methods.entries)
        Expanded(child: compact ? _segment(context, entry.key, entry.value) : _option(context, entry.key, entry.value)),
    ];
    if (!compact) {
      return Row(children: [buttons[0], const SizedBox(width: 8), buttons[1]]);
    }
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: VenColors.segment, borderRadius: BorderRadius.circular(10)),
      child: Row(children: [buttons[0], const SizedBox(width: 4), buttons[1]]),
    );
  }

  Widget _option(BuildContext context, String key, String label) {
    final selected = value == key;
    return Semantics(
      selected: selected,
      button: true,
      child: OutlinedButton(
        onPressed: () => onChanged(key),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(46),
          backgroundColor: selected ? VenColors.navy : Colors.white,
          foregroundColor: selected ? Colors.white : VenColors.navy,
          side: BorderSide(color: selected ? VenColors.navy : VenColors.border, width: selected ? 2 : 1),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: Text(label),
      ),
    );
  }

  Widget _segment(BuildContext context, String key, String label) {
    final selected = value == key;
    return Semantics(
      selected: selected,
      button: true,
      child: TextButton(
        onPressed: () => onChanged(key),
        style: TextButton.styleFrom(
          minimumSize: const Size.fromHeight(40),
          backgroundColor: selected ? VenColors.navy : Colors.transparent,
          foregroundColor: selected ? Colors.white : VenColors.muted,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: Text(label),
      ),
    );
  }
}
