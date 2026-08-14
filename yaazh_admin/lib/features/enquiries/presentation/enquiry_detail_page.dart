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
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/enquiries/data/enquiry_repository.dart';
import 'package:yaazh_admin/features/enquiries/domain/enquiry.dart';

class EnquiryDetailPage extends ConsumerStatefulWidget {
  final String enquiryId;

  const EnquiryDetailPage({super.key, required this.enquiryId});

  @override
  ConsumerState<EnquiryDetailPage> createState() => _EnquiryDetailPageState();
}

class _EnquiryDetailPageState extends ConsumerState<EnquiryDetailPage> {
  final _note = TextEditingController();
  String _status = 'new';
  bool _hydrated = false;
  bool _saving = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _hydrate(Enquiry e) {
    if (_hydrated) return;
    _status = e.status;
    _note.text = e.adminNote ?? '';
    _hydrated = true;
  }

  Future<void> _save() async {
    hideKeyboard();
    setState(() => _saving = true);
    try {
      await ref.read(enquiryRepositoryProvider).update(
            widget.enquiryId,
            status: _status,
            adminNote: _note.text.trim().isEmpty ? null : _note.text.trim(),
          );
      invalidateEnquiryCaches(ref, id: widget.enquiryId);
      showSuccessToast('Enquiry updated');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(enquiryDetailProvider(widget.enquiryId));
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Enquiry')),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load enquiry',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (e) {
            _hydrate(e);
            return ListView(
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
                      Text(
                        e.subject?.isNotEmpty == true ? e.subject! : 'No subject',
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Received ${formatDateTime(e.createdAt)}',
                        style: theme.textTheme.bodySmall,
                      ),
                      const SizedBox(height: 10),
                      StatusChip(
                        status: e.status,
                        label: EnquiryMeta.label(e.status),
                        tone: EnquiryMeta.color(e.status),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _Panel(
                  title: 'From',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _kv('Name', e.name),
                      _kv('Phone', e.phone?.isNotEmpty == true ? e.phone! : '—'),
                      _kv('Email', e.email?.isNotEmpty == true ? e.email! : '—'),
                      if (e.phone?.isNotEmpty == true)
                        TextButton.icon(
                          onPressed: () => launchUrl(Uri.parse('tel:${e.phone}')),
                          icon: const Icon(Icons.call_rounded),
                          label: const Text('Call'),
                        ),
                      if (e.email?.isNotEmpty == true)
                        TextButton.icon(
                          onPressed: () => launchUrl(Uri.parse('mailto:${e.email}')),
                          icon: const Icon(Icons.mail_rounded),
                          label: const Text('Email'),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _Panel(
                  title: 'Message',
                  child: Text(e.message, style: theme.textTheme.bodyMedium),
                ),
                const SizedBox(height: 12),
                _Panel(
                  title: 'Follow up',
                  child: Column(
                    children: [
                      YaDropdown<String>(
                        label: 'Status',
                        value: _status,
                        items: const [
                          DropdownMenuItem(value: 'new', child: Text('New')),
                          DropdownMenuItem(
                            value: 'in_progress',
                            child: Text('In progress'),
                          ),
                          DropdownMenuItem(value: 'closed', child: Text('Closed')),
                          DropdownMenuItem(value: 'spam', child: Text('Spam')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _status = v);
                        },
                      ),
                      const SizedBox(height: 12),
                      YaTextField(
                        label: 'Admin note',
                        hint: 'Internal note for the team',
                        controller: _note,
                        minLines: 3,
                        maxLines: 6,
                        textInputAction: TextInputAction.newline,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _saving ? null : _save,
                        child: const Text('SAVE'),
                      ),
                    ],
                  ),
                ),
              ],
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
