import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

enum BookingReasonAction { reject, cancel }

const _cancelPresets = [
  'Customer requested cancellation',
  'Duplicate booking',
  'Driver unavailable',
  'Vehicle issue',
  'Pickup time changed',
  'Customer no-show',
  'Weather or road conditions',
];

const _rejectPresets = [
  'Duplicate booking',
  'Out of service area',
  'Invalid pickup or drop',
  'Customer not reachable',
  'Fare not agreed',
  'Spam or test booking',
];

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
  final _selected = <String>{};
  bool _saving = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  bool get _isCancel => widget.action == BookingReasonAction.cancel;

  List<String> get _presets => _isCancel ? _cancelPresets : _rejectPresets;

  String get _title => _isCancel ? 'Cancel booking' : 'Reject booking';

  String get _hint => _isCancel
      ? 'Pick a quick reason. Add a note if you need more detail.'
      : 'Pick a quick reason. Add a note if you need more detail.';

  String get _cta => _isCancel ? 'CANCEL BOOKING' : 'REJECT BOOKING';

  String? _composedReason() {
    final extra = _reasonController.text.trim();
    final parts = [..._selected, if (extra.isNotEmpty) extra];
    if (parts.isEmpty) return null;
    return parts.join('. ');
  }

  Future<void> _submit() async {
    hideKeyboard();
    final reason = _composedReason();
    if (reason == null) {
      showErrorToast('Select a reason or type one');
      return;
    }
    setState(() => _saving = true);
    try {
      final repo = ref.read(bookingRepositoryProvider);
      if (_isCancel) {
        await repo.cancel(widget.bookingId, reason: reason);
        showSuccessToast('Booking cancelled');
      } else {
        await repo.reject(widget.bookingId, reason: reason);
        showSuccessToast('Booking rejected');
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
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: Text(_title)),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            Text(_hint, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 16),
            YaField(
              label: 'Quick reasons',
              required: true,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in _presets)
                    FilterChip(
                      label: Text(item),
                      selected: _selected.contains(item),
                      onSelected: (on) {
                        setState(() {
                          if (on) {
                            _selected.add(item);
                          } else {
                            _selected.remove(item);
                          }
                        });
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            YaTextField(
              label: 'Anything else?',
              hint: 'Optional extra note',
              controller: _reasonController,
              minLines: 3,
              maxLines: 5,
              maxLength: 400,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 24),
            if (_isCancel)
              YaDangerButton(
                onPressed: _saving ? null : _submit,
                label: _saving ? 'SAVING…' : _cta,
                color: const Color(0xFFE53935),
              )
            else
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
