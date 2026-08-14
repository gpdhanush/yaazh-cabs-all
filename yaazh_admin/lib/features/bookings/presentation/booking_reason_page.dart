import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

enum BookingReasonAction { reject, cancel }

class BookingReasonPage extends ConsumerStatefulWidget {
  final String bookingId;
  final BookingReasonAction action;

  const BookingReasonPage({
    super.key,
    required this.bookingId,
    required this.action,
  });

  @override
  ConsumerState<BookingReasonPage> createState() => _BookingReasonPageState();
}

class _BookingReasonPageState extends ConsumerState<BookingReasonPage> {
  final _reasonController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  String get _title =>
      widget.action == BookingReasonAction.reject ? 'Reject booking' : 'Cancel booking';

  String get _hint => widget.action == BookingReasonAction.reject
      ? 'Why is this booking being rejected?'
      : 'Why is this booking being cancelled?';

  String get _cta =>
      widget.action == BookingReasonAction.reject ? 'REJECT BOOKING' : 'CANCEL BOOKING';

  Future<void> _submit() async {
    hideKeyboard();
    final reason = _reasonController.text.trim();
    setState(() => _saving = true);
    try {
      final repo = ref.read(bookingRepositoryProvider);
      if (widget.action == BookingReasonAction.reject) {
        await repo.reject(widget.bookingId, reason: reason.isEmpty ? 'Rejected by admin' : reason);
        showSuccessToast('Booking rejected');
      } else {
        await repo.cancel(widget.bookingId, reason: reason.isEmpty ? 'Cancelled by admin' : reason);
        showSuccessToast('Booking cancelled');
      }
      ref.invalidate(bookingDetailProvider(widget.bookingId));
      ref.invalidate(bookingsProvider);
      ref.invalidate(dashboardStatsProvider);
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: Text(_title)),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            Text(_hint, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),
            YaTextField(
              label: 'Reason',
              hint: _hint,
              controller: _reasonController,
              minLines: 4,
              maxLines: 6,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'SAVING…' : _cta),
            ),
          ],
        ),
      ),
    );
  }
}
