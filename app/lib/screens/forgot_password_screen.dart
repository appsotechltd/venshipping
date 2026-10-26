import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/brand_header.dart';
import '../widgets/labeled_field.dart';

/// Step 1: enter your email and we send a 6-digit code.
/// Step 2: enter the code and a new password; the customer is then signed in.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail});

  final String? initialEmail;

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailForm = GlobalKey<FormState>();
  final _resetForm = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.initialEmail);
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  bool _codeSent = false;
  bool _busy = false;
  bool _showPassword = false;
  String? _error;
  String? _info;
  Map<String, String> _fieldErrors = const {};

  // The server ignores repeat requests within a minute, so the resend button waits too.
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _email.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _resendIn = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _sendCode() async {
    setState(() {
      _error = null;
      _fieldErrors = const {};
    });
    if (!_codeSent && !_emailForm.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final message = await ref.read(apiClientProvider).forgotPassword(_email.text.trim());
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _info = message;
      });
      _startCooldown();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.fields['email'] ?? e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    setState(() {
      _error = null;
      _fieldErrors = const {};
    });
    if (!_resetForm.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).resetPassword(
            email: _email.text.trim(),
            code: _code.text.replaceAll(RegExp(r'\s'), ''),
            password: _password.text,
          );
      // Signed in: the router moves to the dashboard.
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _fieldErrors = e.fields;
          if (e.fields.isEmpty) _error = e.message;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _spinner() => const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: VenColors.navy),
      );

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BrandHeader(
              trailing: IconButton(
                tooltip: 'Back to log in',
                color: Colors.white,
                icon: const Icon(Icons.close_rounded),
                onPressed: () => context.go('/login'),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_codeSent ? 'Check your email' : 'Forgot your password?',
                      style: text.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    _codeSent
                        ? 'Enter the 6-digit code we sent to ${_email.text.trim()} and choose a new password.'
                        : "Enter the email you registered with and we'll send you a code to reset it.",
                    style: text.bodyMedium?.copyWith(color: VenColors.onNavyMuted),
                  ),
                ],
              ),
            ),
            OverlapCard(child: _codeSent ? _resetStep(text) : _emailStep(text)),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Remembered it?', style: text.bodyMedium?.copyWith(color: VenColors.muted)),
                TextButton(onPressed: () => context.go('/login'), child: const Text('Log in')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _emailStep(TextTheme text) {
    return Form(
      key: _emailForm,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LabeledField(
            label: 'Email address',
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.email],
            onFieldSubmitted: (_) => _sendCode(),
            validator: (v) => (v == null || !v.contains('@')) ? 'Enter your email address.' : null,
          ),
          if (_error != null) ...[
            Text(_error!, style: text.bodyMedium?.copyWith(color: VenColors.error)),
            const SizedBox(height: 12),
          ],
          FilledButton(onPressed: _busy ? null : _sendCode, child: _busy ? _spinner() : const Text('Send reset code')),
        ],
      ),
    );
  }

  Widget _resetStep(TextTheme text) {
    return Form(
      key: _resetForm,
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_info != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: VenColors.limeTint,
                  borderRadius: BorderRadius.circular(10),
                  border: const Border(left: BorderSide(color: VenColors.lime, width: 4)),
                ),
                child: Text(_info!, style: text.bodySmall?.copyWith(height: 1.4)),
              ),
            Text('Reset code', style: text.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextFormField(
              controller: _code,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.oneTimeCode],
              maxLength: 7,
              textAlign: TextAlign.center,
              style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 10),
              decoration: InputDecoration(hintText: '000000', counterText: '', errorText: _fieldErrors['code']),
              validator: (v) => RegExp(r'^\d{6}$').hasMatch((v ?? '').replaceAll(RegExp(r'\s'), ''))
                  ? null
                  : 'Enter the 6-digit code from the email.',
            ),
            const SizedBox(height: 14),
            LabeledField(
              label: 'New password',
              controller: _password,
              obscureText: !_showPassword,
              autofillHints: const [AutofillHints.newPassword],
              serverError: _fieldErrors['password'],
              hint: 'At least 8 characters',
              suffix: IconButton(
                tooltip: _showPassword ? 'Hide password' : 'Show password',
                icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
              validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters.' : null,
            ),
            LabeledField(
              label: 'Confirm new password',
              controller: _confirm,
              obscureText: !_showPassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _reset(),
              validator: (v) => v != _password.text ? 'The passwords do not match.' : null,
            ),
            if (_error != null) ...[
              Text(_error!, style: text.bodyMedium?.copyWith(color: VenColors.error)),
              const SizedBox(height: 12),
            ],
            FilledButton(
              onPressed: _busy ? null : _reset,
              child: _busy ? _spinner() : const Text('Set new password'),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _busy || _resendIn > 0 ? null : _sendCode,
                  child: Text(_resendIn > 0 ? 'Resend code in ${_resendIn}s' : 'Resend code'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                            _codeSent = false;
                            _error = null;
                            _info = null;
                          }),
                  child: const Text('Change email'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
