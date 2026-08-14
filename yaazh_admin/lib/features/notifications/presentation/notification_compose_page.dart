import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/customers/data/customer_repository.dart';
import 'package:yaazh_admin/features/notifications/data/notification_repository.dart';

class NotificationComposePage extends ConsumerStatefulWidget {
  const NotificationComposePage({super.key});

  @override
  ConsumerState<NotificationComposePage> createState() =>
      _NotificationComposePageState();
}

class _NotificationComposePageState
    extends ConsumerState<NotificationComposePage> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'all_customers';
  String _query = '';
  String? _personId;
  String? _personLabel;
  bool _sending = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  bool get _needsPerson => _audience == 'customer' || _audience == 'driver';

  String get _summary {
    if (_audience == 'all_customers') {
      return 'Every active customer will receive this.';
    }
    if (_audience == 'all_drivers') {
      return 'Every active driver will receive this.';
    }
    return _personLabel == null
        ? 'Search and pick a recipient below.'
        : 'Will send only to $_personLabel.';
  }

  Future<void> _send() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    if (_needsPerson && (_personId == null || _personId!.isEmpty)) {
      showErrorToast('Select a recipient first');
      return;
    }
    final ok = await showConfirmSheet(
      context,
      title: 'Send this notification?',
      message: '${_title.text.trim()}\n\n$_summary',
      actionLabel: 'Send now',
      icon: Icons.campaign_rounded,
      dangerColor: AppColors.primary,
    );
    if (!ok) return;

    setState(() => _sending = true);
    try {
      await ref.read(notificationRepositoryProvider).send(
            title: _title.text.trim(),
            body: _body.text.trim(),
            audience: _audience,
            customerId: _audience == 'customer' ? _personId : null,
            driverId: _audience == 'driver' ? _personId : null,
          );
      invalidateNotificationCaches(ref);
      showSuccessToast('Notification sent');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _selectAudience(String value) {
    setState(() {
      _audience = value;
      _query = '';
      _personId = null;
      _personLabel = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final customers = ref.watch(customersProvider).valueOrNull ?? const [];
    final drivers = ref.watch(driversProvider).valueOrNull ?? const [];
    final q = _query.trim().toLowerCase();

    final people = _audience == 'driver'
        ? drivers
            .where((d) => d.isActive)
            .where((d) {
              if (q.isEmpty) return true;
              return d.name.toLowerCase().contains(q) || d.phone.contains(q);
            })
            .take(40)
            .map((d) => (id: d.id, name: d.name, phone: d.phone))
            .toList()
        : customers
            .where((c) => c.isActive)
            .where((c) {
              if (q.isEmpty) return true;
              return c.name.toLowerCase().contains(q) ||
                  c.phone.contains(q) ||
                  (c.email?.toLowerCase().contains(q) ?? false);
            })
            .take(40)
            .map((c) => (id: c.id, name: c.name, phone: c.phone))
            .toList();

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Compose alert')),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              Text('Audience', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _AudienceChip(
                    label: 'All customers',
                    selected: _audience == 'all_customers',
                    onTap: () => _selectAudience('all_customers'),
                  ),
                  _AudienceChip(
                    label: 'All drivers',
                    selected: _audience == 'all_drivers',
                    onTap: () => _selectAudience('all_drivers'),
                  ),
                  _AudienceChip(
                    label: 'One customer',
                    selected: _audience == 'customer',
                    onTap: () => _selectAudience('customer'),
                  ),
                  _AudienceChip(
                    label: 'One driver',
                    selected: _audience == 'driver',
                    onTap: () => _selectAudience('driver'),
                  ),
                ],
              ),
              if (_needsPerson) ...[
                const SizedBox(height: 16),
                TextField(
                  onChanged: (v) => setState(() => _query = v),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: _audience == 'driver'
                        ? 'Search driver name or phone'
                        : 'Search customer name or phone',
                    prefixIcon: const Icon(Icons.search_rounded),
                  ),
                ),
                if (_personLabel != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppConstants.radiusField),
                    ),
                    child: Row(
                      children: [
                        Expanded(child: Text('Selected: $_personLabel')),
                        TextButton(
                          onPressed: () => setState(() {
                            _personId = null;
                            _personLabel = null;
                          }),
                          child: const Text('Clear'),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                ...people.map((p) {
                  final selected = _personId == p.id;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    selected: selected,
                    title: Text(p.name),
                    subtitle: Text(p.phone),
                    trailing: selected
                        ? Icon(Icons.check_rounded, color: theme.colorScheme.primary)
                        : const Icon(Icons.chevron_right_rounded),
                    onTap: () => setState(() {
                      _personId = p.id;
                      _personLabel = '${p.name} · ${p.phone}';
                    }),
                  );
                }),
                if (people.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      q.isEmpty
                          ? 'Type a name or phone number.'
                          : 'No matches.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
              ],
              const SizedBox(height: 16),
              YaTextField(
                label: 'Title',
                required: true,
                hint: 'e.g. Festival booking update',
                controller: _title,
                maxLength: 180,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Title is required' : null,
              ),
              const SizedBox(height: 14),
              YaTextField(
                label: 'Message',
                required: true,
                hint: 'Write the message that should appear in the app',
                controller: _body,
                minLines: 4,
                maxLines: 8,
                maxLength: 2000,
                textInputAction: TextInputAction.newline,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Message is required' : null,
              ),
              const SizedBox(height: 8),
              Text(_summary, style: theme.textTheme.bodySmall),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _sending ? null : _send,
                child: const Text('SEND NOTIFICATION'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AudienceChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _AudienceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: theme.colorScheme.primary.withValues(alpha: 0.16),
      labelStyle: TextStyle(
        color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
