import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/customers/data/customer_repository.dart';
import 'package:yaazh_admin/features/customers/domain/customer.dart';

class CustomerDetailPage extends ConsumerStatefulWidget {
  final String customerId;

  const CustomerDetailPage({super.key, required this.customerId});

  @override
  ConsumerState<CustomerDetailPage> createState() => _CustomerDetailPageState();
}

class _CustomerDetailPageState extends ConsumerState<CustomerDetailPage> {
  String _status = 'active';
  bool _hydrated = false;
  bool _saving = false;

  void _hydrate(Customer c) {
    if (_hydrated) return;
    _status = c.appStatus;
    _hydrated = true;
  }

  Future<void> _save() async {
    hideKeyboard();
    setState(() => _saving = true);
    try {
      await ref.read(customerRepositoryProvider).update(widget.customerId, {
        'app_status': _status,
        'is_active': _status == 'active',
      });
      _hydrated = false;
      invalidateCustomerCaches(ref, id: widget.customerId);
      showSuccessToast('Customer status updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(customerDetailProvider(widget.customerId));
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Customer')),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load customer',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (c) {
            _hydrate(c);
            return RefreshIndicator(
              onRefresh: () async {
                _hydrated = false;
                invalidateCustomerCaches(ref, id: widget.customerId);
                await ref.read(customerDetailProvider(widget.customerId).future);
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: [
                  Container(
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
                        Text(c.name, style: theme.textTheme.titleMedium),
                        const SizedBox(height: 6),
                        Text(
                          [
                            'Joined ${formatDate(c.createdAt)}',
                            if (c.bookingCount != null)
                              '${c.bookingCount} booking${c.bookingCount == 1 ? '' : 's'}',
                          ].join(' · '),
                          style: theme.textTheme.bodySmall,
                        ),
                        const SizedBox(height: 10),
                        StatusChip(
                          status: c.appStatus,
                          label: c.appStatusLabel,
                          tone: CustomerMeta.color(c.appStatus),
                        ),
                      ],
                    ),
                  ),
                  if (c.phone.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri.parse('tel:${c.phone}')),
                      icon: const Icon(Icons.call_rounded),
                      label: Text('Call ${c.phone}'),
                    ),
                  ],
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Contact',
                    child: Column(
                      children: [
                        _kv('Phone', c.phone),
                        _kv('Alternate', c.alternatePhone?.isNotEmpty == true
                            ? c.alternatePhone!
                            : '—'),
                        _kv('Email', c.email?.isNotEmpty == true ? c.email! : '—'),
                        _kv('City', c.city?.isNotEmpty == true ? c.city! : '—'),
                        _kv(
                          'Address',
                          c.address?.isNotEmpty == true ? c.address! : '—',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _Panel(
                    title: 'Account',
                    child: Column(
                      children: [
                        _kv(
                          'Language',
                          c.preferredLanguage == 'ta' ? 'Tamil' : 'English',
                        ),
                        _kv(
                          'Referral',
                          c.referralCode?.isNotEmpty == true
                              ? c.referralCode!
                              : '—',
                        ),
                        _kv('Last login', formatDateTime(c.lastLoginAt)),
                        _kv('Active', c.isActive ? 'Yes' : 'No'),
                        const SizedBox(height: 8),
                        YaDropdown<String>(
                          label: 'Status',
                          value: _status,
                          items: const [
                            DropdownMenuItem(value: 'active', child: Text('Active')),
                            DropdownMenuItem(value: 'blocked', child: Text('Blocked')),
                            DropdownMenuItem(value: 'deleted', child: Text('Deleted')),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _status = v);
                          },
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _saving || _status == c.appStatus
                              ? null
                              : _save,
                          child: const Text('UPDATE STATUS'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final Widget child;

  const _Panel({required this.title, required this.child});

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
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

Widget _kv(String label, String value) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
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
