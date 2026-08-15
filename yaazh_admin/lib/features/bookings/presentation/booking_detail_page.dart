import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/driver_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/ya_number_field.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

class BookingDetailPage extends ConsumerStatefulWidget {
  final String bookingId;

  const BookingDetailPage({super.key, required this.bookingId});

  @override
  ConsumerState<BookingDetailPage> createState() => _BookingDetailPageState();
}

class _BookingDetailPageState extends ConsumerState<BookingDetailPage> {
  final _amountController = TextEditingController();
  final _discountController = TextEditingController();
  String _payMethod = 'cash';
  String? _discountPrefillId;

  @override
  void dispose() {
    _amountController.dispose();
    _discountController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    ref.invalidate(bookingDetailProvider(widget.bookingId));
    ref.invalidate(bookingsProvider);
    ref.invalidate(dashboardStatsProvider);
    await ref.read(bookingDetailProvider(widget.bookingId).future);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(bookingDetailProvider(widget.bookingId));
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Booking'),
          actions: [
            IconButton(
              tooltip: 'Share',
              onPressed: async.valueOrNull == null
                  ? null
                  : () => _share(async.requireValue),
              icon: const Icon(Icons.share_rounded),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load booking',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (b) {
            if (_discountPrefillId != b.id) {
              _discountPrefillId = b.id;
              final existing = b.discountAmount;
              _discountController.text = existing > 0
                  ? (existing == existing.roundToDouble()
                        ? existing.toStringAsFixed(0)
                        : existing.toStringAsFixed(2))
                  : '';
            }
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: [
                  _HeroCard(booking: b),
                  const SizedBox(height: 12),
                  if (BookingStatus.canConfirm(b.status)) ...[
                    ElevatedButton(
                      onPressed: () => _confirm(b),
                      child: const Text('CONFIRM BOOKING'),
                    ),
                    const SizedBox(height: 8),
                    YaDangerButton(
                      onPressed: () {
                        hideKeyboard();
                        context.push('/bookings/${b.id}/reject');
                      },
                      label: 'REJECT',
                      color: const Color(0xFFE53935),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (BookingStatus.canAssign(b.status) &&
                      (b.assignedDriverId == null ||
                          b.assignedDriverId!.isEmpty)) ...[
                    ElevatedButton.icon(
                      onPressed: () {
                        hideKeyboard();
                        context.push('/bookings/${b.id}/assign');
                      },
                      icon: const Icon(Icons.assignment_ind_rounded),
                      label: const Text('ASSIGN DRIVER'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (BookingStatus.canSendInvoice(b.status)) ...[
                    Row(
                      children: [
                        Expanded(
                          child: _BrandActionButton(
                            icon: Icons.mail_outline_rounded,
                            label: 'EMAIL INVOICE',
                            color: const Color(0xFFEA4335),
                            onPressed: () {
                              hideKeyboard();
                              context.push('/bookings/${b.id}/invoice-email');
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _BrandActionButton(
                            icon: Icons.chat_rounded,
                            label: 'WHATSAPP INVOICE',
                            color: const Color(0xFF25D366),
                            onPressed: () => _sendInvoiceWhatsApp(b),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (BookingStatus.canSendFeedback(b.status)) ...[
                    OutlinedButton.icon(
                      onPressed: () => _sendFeedback(b),
                      icon: const Icon(Icons.star_rate_rounded),
                      label: const Text('SEND FEEDBACK'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  _Panel(
                    title: 'Trip',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _kv('Pickup', b.pickupLocation),
                        _kv('Drop', b.dropLocation),
                        _kv('Pickup time', formatDateTime(b.pickupAt)),
                        _kv('Trip type', b.tripType.replaceAll('_', ' ')),
                        _kv('Estimated fare', formatInr(b.estimatedTotal)),
                        _kv(
                          'Final fare',
                          b.finalTotal == null ? '—' : formatInr(b.finalTotal),
                        ),
                        _kv(
                          'Distance',
                          b.estimatedDistanceKm != null
                              ? '${b.estimatedDistanceKm} km'
                              : '—',
                        ),
                        _kv(
                          'Actual km',
                          b.tripKm != null ? '${b.tripKm} km' : '—',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Customer',
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: theme.colorScheme.primary
                              .withValues(alpha: 0.14),
                          child: Text(
                            _initials(b.customerName),
                            style: TextStyle(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                b.customerName.isNotEmpty
                                    ? b.customerName
                                    : 'Customer',
                                style: theme.textTheme.titleMedium,
                              ),
                              if (b.customerPhone.isNotEmpty)
                                Text(
                                  b.customerPhone,
                                  style: theme.textTheme.bodySmall,
                                ),
                              Text(
                                b.customerEmail?.isNotEmpty == true
                                    ? b.customerEmail!
                                    : 'No email',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        if (b.customerPhone.isNotEmpty)
                          IconButton.filled(
                            onPressed: () => launchUrl(
                              Uri.parse('tel:${b.customerPhone}'),
                            ),
                            style: IconButton.styleFrom(
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: theme.colorScheme.onPrimary,
                            ),
                            icon: const Icon(Icons.phone_rounded),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Driver',
                    child: b.driver == null
                        ? Text(
                            'No driver assigned yet.',
                            style: theme.textTheme.bodySmall,
                          )
                        : Row(
                            children: [
                              DriverAvatar(driver: b.driver, radius: 24),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      b.driver!.name,
                                      style: theme.textTheme.titleMedium,
                                    ),
                                    Text(
                                      b.driver!.phone,
                                      style: theme.textTheme.bodySmall,
                                    ),
                                    if (b.vehicle != null)
                                      Text(
                                        '${b.vehicle!.name} · ${b.vehicle!.registration ?? 'No reg.'}',
                                        style: theme.textTheme.bodySmall,
                                      ),
                                  ],
                                ),
                              ),
                              IconButton.filled(
                                onPressed: () => launchUrl(
                                  Uri.parse('tel:${b.driver!.phone}'),
                                ),
                                style: IconButton.styleFrom(
                                  backgroundColor: theme.colorScheme.primary,
                                  foregroundColor: theme.colorScheme.onPrimary,
                                ),
                                icon: const Icon(Icons.phone_rounded),
                              ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Odometer',
                    child: Row(
                      children: [
                        _odo('Start', b.startOdometerKm),
                        _odo('End', b.endOdometerKm),
                        _odo('Diff', b.tripKm),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _PaymentPanel(
                    booking: b,
                    amountController: _amountController,
                    discountController: _discountController,
                    method: _payMethod,
                    onMethod: (v) => setState(() => _payMethod = v),
                    onApplyDiscount: () => _applyDiscount(b),
                    onRecord: () => _recordPayment(b),
                    onMarkPaid: () => _markPaid(b),
                  ),
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Timeline',
                    child: b.history.isEmpty
                        ? Text(
                            'No history yet.',
                            style: theme.textTheme.bodySmall,
                          )
                        : _StatusTimeline(history: b.history),
                  ),
                  if (BookingStatus.canComplete(b.status) ||
                      (BookingStatus.canAssign(b.status) &&
                          b.assignedDriverId != null &&
                          b.assignedDriverId!.isNotEmpty)) ...[
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        if (BookingStatus.canComplete(b.status))
                          Expanded(
                            child: _BrandActionButton(
                              icon: Icons.flag_rounded,
                              label: 'COMPLETE',
                              color: const Color(0xFF166534),
                              onPressed: () => _completeRide(b),
                            ),
                          ),
                        if (BookingStatus.canComplete(b.status) &&
                            BookingStatus.canAssign(b.status) &&
                            b.assignedDriverId != null &&
                            b.assignedDriverId!.isNotEmpty)
                          const SizedBox(width: 8),
                        if (BookingStatus.canAssign(b.status) &&
                            b.assignedDriverId != null &&
                            b.assignedDriverId!.isNotEmpty)
                          Expanded(
                            child: _BrandActionButton(
                              icon: Icons.assignment_ind_rounded,
                              label: 'RE-ASSIGN',
                              color: const Color(0xFF0369A1),
                              onPressed: () {
                                hideKeyboard();
                                context.push('/bookings/${b.id}/assign');
                              },
                            ),
                          ),
                      ],
                    ),
                  ],
                  if (BookingStatus.canCancel(b.status)) ...[
                    const SizedBox(height: 12),
                    YaDangerButton(
                      onPressed: () {
                        hideKeyboard();
                        context.push('/bookings/${b.id}/cancel');
                      },
                      label: 'CANCEL BOOKING',
                      color: const Color(0xFFE53935),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _completeRide(Booking b) async {
    hideKeyboard();
    if (!b.isFullyPaid) {
      if (!mounted) return;
      final due = b.payment?.balanceDue;
      await showNoticeSheet(
        context,
        title: 'Payment pending',
        message: 'Mark this booking as fully paid, then tap Complete again.',
        actionLabel: 'Got it',
        icon: Icons.payments_rounded,
        color: AppColors.warning,
        highlightLabel: due != null && due > 0 ? 'Amount due' : null,
        highlightValue: due != null && due > 0 ? formatInr(due) : null,
      );
      return;
    }
    final ok = await showConfirmSheet(
      context,
      title: 'Complete this ride?',
      message:
          'Payment is fully recorded. The trip will be marked complete without odometer km. Estimated fare will be used as the final amount.',
      actionLabel: 'Complete ride',
      icon: Icons.flag_rounded,
      destructive: false,
    );
    if (!ok) return;
    try {
      await ref.read(bookingRepositoryProvider).completeTrip(b.id);
      await _reload();
      ref.invalidate(liveTripsProvider);
      ref.invalidate(driversProvider);
      showSuccessToast('Ride completed');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _confirm(Booking b) async {
    hideKeyboard();
    try {
      final res = await ref.read(bookingRepositoryProvider).confirm(b.id);
      await _reload();
      if (res.emailSent == true) {
        showSuccessToast('Confirmed · invoice emailed to ${res.emailTo}');
      } else {
        showSuccessToast('Booking confirmed');
      }
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _applyDiscount(Booking b) async {
    hideKeyboard();
    if (!BookingStatus.canRecordPayment(b.status)) {
      showErrorToast('Confirm the booking before applying a discount');
      return;
    }
    final discount = double.tryParse(_discountController.text.trim()) ?? 0;
    if (discount < 0) {
      showErrorToast('Discount cannot be negative');
      return;
    }
    try {
      await ref
          .read(bookingRepositoryProvider)
          .applyDiscount(bookingId: b.id, discountAmount: discount);
      await _reload();
      showSuccessToast('Discount applied');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _recordPayment(Booking b) async {
    hideKeyboard();
    if (!BookingStatus.canRecordPayment(b.status)) {
      showErrorToast('Confirm the booking before recording a payment');
      return;
    }
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      showErrorToast('Enter a valid amount');
      return;
    }
    try {
      await ref
          .read(bookingRepositoryProvider)
          .recordPayment(bookingId: b.id, amount: amount, method: _payMethod);
      _amountController.clear();
      await _reload();
      showSuccessToast('Payment recorded');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _markPaid(Booking b) async {
    hideKeyboard();
    if (!BookingStatus.canRecordPayment(b.status)) {
      showErrorToast('Confirm the booking before recording a payment');
      return;
    }
    try {
      await ref.read(bookingRepositoryProvider).markPaid(b.id);
      await _reload();
      showSuccessToast('Marked as fully paid');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _openWhatsApp(String url) async {
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok) showErrorToast('Could not open WhatsApp');
  }

  Future<void> _sendInvoiceWhatsApp(Booking b) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Send invoice?',
      message:
          'The invoice PDF link will open in WhatsApp for ${b.customerName} (${b.customerPhone}).',
      actionLabel: 'Send on WhatsApp',
      icon: Icons.picture_as_pdf_rounded,
      destructive: false,
    );
    if (!ok) return;
    try {
      final share = await ref
          .read(bookingRepositoryProvider)
          .sendInvoiceWhatsApp(b.id);
      if (share.whatsappUrl.isEmpty) {
        showErrorToast('Could not build WhatsApp message');
        return;
      }
      await _openWhatsApp(share.whatsappUrl);
      showSuccessToast('Invoice opened in WhatsApp');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _sendFeedback(Booking b) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Send feedback link?',
      message:
          'A rating page link will open in WhatsApp for ${b.customerName}. They can tap stars and pick a quick review.',
      actionLabel: 'Send on WhatsApp',
      icon: Icons.star_rate_rounded,
      destructive: false,
    );
    if (!ok) return;
    try {
      final share = await ref
          .read(bookingRepositoryProvider)
          .sendFeedbackLink(b.id);
      if (share.whatsappUrl.isEmpty) {
        showErrorToast('Could not build WhatsApp message');
        return;
      }
      await _openWhatsApp(share.whatsappUrl);
      showSuccessToast('Feedback link opened in WhatsApp');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _share(Booking b) async {
    hideKeyboard();
    final fare = b.finalTotal ?? b.estimatedTotal;
    final text = [
      'Yaazh Cabs booking ${b.bookingReference}',
      '${b.customerName} · ${b.customerPhone}',
      '${b.pickupLocation} → ${b.dropLocation}',
      'Pickup ${formatDateTime(b.pickupAt)}',
      'Status ${BookingStatus.label(b.status)} · Payment ${b.isFullyPaid ? 'Paid' : (b.payment?.paymentStatus ?? b.paymentStatus)}',
      'Fare ${formatInr(fare)}',
      if (b.driver != null) 'Driver ${b.driver!.name} · ${b.driver!.phone}',
      if (b.vehicle != null)
        'Vehicle ${b.vehicle!.name}${b.vehicle!.registration != null ? ' · ${b.vehicle!.registration}' : ''}',
    ].join('\n');
    await Share.share(text, subject: 'Yaazh booking ${b.bookingReference}');
  }
}

class _BrandActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _BrandActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });

  static const _labelStyle = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.1,
  );

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final label = Text(
      this.label,
      maxLines: 2,
      textAlign: TextAlign.center,
      overflow: TextOverflow.ellipsis,
    );
    if (isDark) {
      return OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color, width: 1.4),
          minimumSize: const Size(0, 52),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          textStyle: _labelStyle,
        ),
        icon: Icon(icon, size: 18),
        label: label,
      );
    }
    return FilledButton.icon(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        disabledBackgroundColor: color.withValues(alpha: 0.4),
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        side: BorderSide(color: color, width: 1.4),
        textStyle: _labelStyle,
      ),
      icon: Icon(icon, size: 18),
      label: label,
    );
  }
}

class _HeroCard extends StatelessWidget {
  final Booking booking;

  const _HeroCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Reference', style: theme.textTheme.bodySmall),
                Text(
                  booking.bookingReference,
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  '${booking.tripType.replaceAll('_', ' ')} · ${formatDateTime(booking.createdAt ?? booking.pickupAt)}',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          StatusChip(status: booking.status),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const _Panel({required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: theme.textTheme.titleMedium)),
              ?trailing,
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  if (parts.length >= 2) {
    return (parts.first[0] + parts.elementAt(1)[0]).toUpperCase();
  }
  if (name.trim().isNotEmpty) return name.trim()[0].toUpperCase();
  return 'C';
}

Widget _kv(String label, String value) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}

Widget _money(String label, double amount) {
  return Expanded(
    child: Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          formatInr(amount),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}

Widget _odo(String label, double? km) {
  return Expanded(
    child: Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          km != null
              ? '${km.toStringAsFixed(km == km.roundToDouble() ? 0 : 1)} km'
              : '—',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}

class _PaymentPanel extends StatelessWidget {
  final Booking booking;
  final TextEditingController amountController;
  final TextEditingController discountController;
  final String method;
  final ValueChanged<String> onMethod;
  final VoidCallback onApplyDiscount;
  final VoidCallback onRecord;
  final VoidCallback onMarkPaid;

  const _PaymentPanel({
    required this.booking,
    required this.amountController,
    required this.discountController,
    required this.method,
    required this.onMethod,
    required this.onApplyDiscount,
    required this.onRecord,
    required this.onMarkPaid,
  });

  @override
  Widget build(BuildContext context) {
    final pay = booking.payment;
    final quoted = double.tryParse(booking.estimatedTotal) ?? 0;
    final due =
        pay?.fareDue ??
        (double.tryParse(booking.finalTotal ?? booking.estimatedTotal) ??
            quoted);
    final paid = pay?.amountPaid ?? 0;
    final balance = pay?.balanceDue ?? (due - paid);
    final discount = booking.discountAmount;
    final theme = Theme.of(context);

    return _Panel(
      title: 'Payment',
      trailing: StatusChip(
        status: booking.isFullyPaid
            ? 'paid'
            : (pay?.paymentStatus ?? booking.paymentStatus),
        label: booking.isFullyPaid ? 'Customer paid' : null,
        tone: booking.isFullyPaid ? AppColors.success : AppColors.warning,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _money('Quoted', quoted),
              _money('Discount', discount),
              _money('Due', due),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _money('Paid', paid),
              _money('Balance', balance),
              const Expanded(child: SizedBox()),
            ],
          ),
          if (booking.isFullyPaid) ...[
            const SizedBox(height: 8),
            Text(
              'Customer has paid. Amount and method are not needed.',
              style: theme.textTheme.bodySmall,
            ),
          ] else if (!BookingStatus.canRecordPayment(booking.status)) ...[
            const SizedBox(height: 8),
            Text(
              'Confirm the booking before recording a payment.',
              style: theme.textTheme.bodySmall,
            ),
          ] else ...[
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: YaNumberField(
                    controller: discountController,
                    label: 'Discount amount',
                    hint: '0',
                    decimal: true,
                    maxLength: 8,
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                    textInputAction: TextInputAction.next,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onApplyDiscount,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Text('APPLY'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: YaNumberField(
                    controller: amountController,
                    label: 'Amount',
                    hint: '0',
                    decimal: true,
                    maxLength: 8,
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                    textInputAction: TextInputAction.done,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: YaDropdown<String>(
                    label: 'Method',
                    value: method,
                    items: const [
                      DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      DropdownMenuItem(value: 'upi', child: Text('UPI')),
                      DropdownMenuItem(value: 'card', child: Text('Card')),
                      DropdownMenuItem(
                        value: 'bank_transfer',
                        child: Text('Bank'),
                      ),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (v) {
                      if (v != null) onMethod(v);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: onRecord,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Text('RECORD'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: balance <= 0 ? null : onMarkPaid,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Text('FULLY PAID'),
                  ),
                ),
              ],
            ),
          ],
          if (pay != null && pay.payments.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final p in pay.payments)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(
                  '${formatInr(p.amount)} by ${p.method.toUpperCase()}',
                ),
                subtitle: Text(
                  formatDateTime(p.paidAt ?? p.createdAt),
                  style: theme.textTheme.bodySmall,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  final List<BookingHistoryItem> history;

  const _StatusTimeline({required this.history});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        for (var i = 0; i < history.length; i++)
          _StatusTimelineRow(
            item: history[i],
            isLast: i == history.length - 1,
            theme: theme,
          ),
      ],
    );
  }
}

class _StatusTimelineRow extends StatelessWidget {
  final BookingHistoryItem item;
  final bool isLast;
  final ThemeData theme;

  const _StatusTimelineRow({
    required this.item,
    required this.isLast,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final color = BookingStatus.color(item.newStatus);
    final note = item.note?.trim();
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    BookingStatus.icon(item.newStatus),
                    size: 16,
                    color: color,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 4, bottom: isLast ? 0 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    BookingStatus.label(item.newStatus),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    formatDateTime(item.changedAt),
                    style: theme.textTheme.bodySmall,
                  ),
                  if (note != null && note.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(note, style: theme.textTheme.bodySmall),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
