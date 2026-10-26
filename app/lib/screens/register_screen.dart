import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/brand_header.dart';
import '../widgets/labeled_field.dart';
import '../widgets/method_toggle.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _destination = TextEditingController();
  final _password = TextEditingController();
  String _method = 'air';
  bool _submitting = false;
  bool _showPassword = false;
  String? _error;
  Map<String, String> _fieldErrors = const {};

  @override
  void dispose() {
    for (final c in [_name, _email, _phone, _destination, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _fieldErrors = const {};
    });
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await ref.read(authProvider.notifier).register(RegistrationRequest(
            fullName: _name.text.trim(),
            email: _email.text.trim(),
            phone: _phone.text.trim(),
            password: _password.text,
            deliveryDestination: _destination.text.trim(),
            preferredShippingMethod: _method,
          ));
      // The router sends the customer to their dashboard once signed in.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.fields.isEmpty ? e.message : null;
        _fieldErrors = e.fields;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  static String? _required(String? v, String message) => (v == null || v.trim().isEmpty) ? message : null;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BrandHeader(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Create your account',
                      style: text.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text('Get your personal China warehouse address in under a minute.',
                      style: text.bodyMedium?.copyWith(color: VenColors.onNavyMuted, height: 1.45)),
                ],
              ),
            ),
            OverlapCard(
              child: Form(
                key: _formKey,
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      LabeledField(
                        label: 'Full name',
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        serverError: _fieldErrors['fullName'],
                        validator: (v) => _required(v, 'Enter your full name.'),
                      ),
                      LabeledField(
                        label: 'Email address',
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        serverError: _fieldErrors['email'],
                        validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email address.' : null,
                      ),
                      LabeledField(
                        label: 'Phone number',
                        controller: _phone,
                        hint: 'e.g. +233 20 123 4567',
                        keyboardType: TextInputType.phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        serverError: _fieldErrors['phone'],
                        validator: (v) => _required(v, 'Enter your phone number.'),
                      ),
                      LabeledField(
                        label: 'Delivery destination',
                        controller: _destination,
                        hint: 'e.g. Accra, Ghana',
                        textCapitalization: TextCapitalization.words,
                        serverError: _fieldErrors['deliveryDestination'],
                        validator: (v) => _required(v, 'Tell us where to deliver your goods.'),
                      ),
                      Text('How will you usually ship?',
                          style: text.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      MethodToggle(value: _method, onChanged: (m) => setState(() => _method = m)),
                      const SizedBox(height: 4),
                      Text('You get both addresses either way. This one shows first.',
                          style: text.bodySmall?.copyWith(color: VenColors.muted)),
                      const SizedBox(height: 14),
                      LabeledField(
                        label: 'Password',
                        controller: _password,
                        obscureText: !_showPassword,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.newPassword],
                        serverError: _fieldErrors['password'],
                        onFieldSubmitted: (_) => _submit(),
                        validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters.' : null,
                        suffix: IconButton(
                          tooltip: _showPassword ? 'Hide password' : 'Show password',
                          icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                          onPressed: () => setState(() => _showPassword = !_showPassword),
                        ),
                      ),
                      if (_error != null) ...[
                        Text(_error!, style: text.bodyMedium?.copyWith(color: VenColors.error)),
                        const SizedBox(height: 12),
                      ],
                      FilledButton(
                        onPressed: _submitting ? null : _submit,
                        child: _submitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2.5, color: VenColors.navy),
                              )
                            : const Text('Create account'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Already registered?', style: text.bodyMedium?.copyWith(color: VenColors.muted)),
                  TextButton(onPressed: () => context.go('/login'), child: const Text('Log in')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
