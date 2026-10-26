import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/brand_header.dart';
import '../widgets/labeled_field.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await ref.read(authProvider.notifier).login(_email.text.trim(), _password.text);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

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
                  Text('Welcome back',
                      style: text.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text('Log in to see your China warehouse address.',
                      style: text.bodyMedium?.copyWith(color: VenColors.onNavyMuted)),
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
                        label: 'Email address',
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        validator: (v) => (v == null || !v.contains('@')) ? 'Enter your email address.' : null,
                      ),
                      LabeledField(
                        label: 'Password',
                        controller: _password,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.password],
                        onFieldSubmitted: (_) => _submit(),
                        validator: (v) => (v == null || v.isEmpty) ? 'Enter your password.' : null,
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => context.go(Uri(
                            path: '/forgot-password',
                            queryParameters: _email.text.trim().isEmpty ? null : {'email': _email.text.trim()},
                          ).toString()),
                          child: const Text('Forgot password?'),
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
                            : const Text('Log in'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('New to VEN Shipping?', style: text.bodyMedium?.copyWith(color: VenColors.muted)),
                TextButton(onPressed: () => context.go('/register'), child: const Text('Create account')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
