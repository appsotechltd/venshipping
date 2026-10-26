import 'package:flutter/material.dart';

/// Label above a text field, as in the Clean Navy design.
class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.textInputAction = TextInputAction.next,
    this.obscureText = false,
    this.autofillHints,
    this.validator,
    this.serverError,
    this.textCapitalization = TextCapitalization.none,
    this.suffix,
    this.onFieldSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final TextInputAction textInputAction;
  final bool obscureText;
  final Iterable<String>? autofillHints;
  final FormFieldValidator<String>? validator;
  final String? serverError;
  final TextCapitalization textCapitalization;
  final Widget? suffix;
  final ValueChanged<String>? onFieldSubmitted;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            obscureText: obscureText,
            autofillHints: autofillHints,
            textCapitalization: textCapitalization,
            validator: validator,
            onFieldSubmitted: onFieldSubmitted,
            decoration: InputDecoration(hintText: hint, errorText: serverError, suffixIcon: suffix),
          ),
        ],
      ),
    );
  }
}
