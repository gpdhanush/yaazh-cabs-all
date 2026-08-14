import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

class SendInvoiceEmailPage extends ConsumerStatefulWidget {
  final String bookingId;

  const SendInvoiceEmailPage({super.key, required this.bookingId});

  @override
  ConsumerState<SendInvoiceEmailPage> createState() => _SendInvoiceEmailPageState();
}

class _SendInvoiceEmailPageState extends ConsumerState<SendInvoiceEmailPage> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _prefilled = false;
  bool _saving = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  bool _isEmail(String value) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value);
  }

  Future<void> _submit() async {
    hideKeyboard();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final email = _emailController.text.trim();
    setState(() => _saving = true);
    try {
      final result = await ref.read(bookingRepositoryProvider).sendInvoiceEmail(
            bookingId: widget.bookingId,
            email: email,
          );
      ref.invalidate(bookingDetailProvider(widget.bookingId));
      ref.invalidate(bookingsProvider);
      ref.invalidate(dashboardStatsProvider);
      showSuccessToast('Invoice emailed to ${result.emailTo ?? email}');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(bookingDetailProvider(widget.bookingId));
    final booking = async.valueOrNull;
    if (booking != null && !_prefilled) {
      _prefilled = true;
      final existing = booking.customerEmail?.trim() ?? '';
      if (existing.isNotEmpty) {
        _emailController.text = existing;
      }
    }

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Send invoice email')),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => Center(child: Text(err.toString())),
          data: (b) => Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Text(
                  'Enter the email address that should receive the invoice for ${b.bookingReference}.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                YaTextField(
                  label: 'Email',
                  required: true,
                  hint: 'customer@email.com',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.email],
                  prefixIcon: const Icon(Icons.mail_outline_rounded),
                  validator: (value) {
                    final email = value?.trim() ?? '';
                    if (email.isEmpty) return 'Enter an email address';
                    if (!_isEmail(email)) return 'Enter a valid email address';
                    return null;
                  },
                  onFieldSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  child: Text(_saving ? 'SENDING…' : 'SEND INVOICE EMAIL'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
