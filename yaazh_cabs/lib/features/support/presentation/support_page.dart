import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/config/remote_config.dart';
import 'package:yaazh_cabs/core/network/api_exception.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/app_surface.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/features/support/data/support_repository.dart';

class SupportPage extends ConsumerWidget {
  const SupportPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickets = ref.watch(supportTicketsProvider);
    final config = ref.watch(remoteConfigProvider).valueOrNull;
    final phone = config?.supportPhone ?? '+91 98765 43210';
    final waDigits = (config?.whatsappEnabled == true)
        ? (config?.supportWhatsapp ?? '').replaceAll(RegExp(r'\D'), '')
        : '';

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Fleet support')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppConstants.gold,
        foregroundColor: AppConstants.black,
        onPressed: () => _createTicket(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New ticket'),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: AppSurfaceCard(
                color: AppConstants.gold.withValues(alpha: 0.12),
                border: Border.all(color: AppConstants.gold.withValues(alpha: 0.35)),
                child: Row(
                  children: [
                    const Icon(Icons.phone_in_talk_rounded, color: AppConstants.navy),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        phone,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: phone));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Hotline copied: $phone')),
                        );
                      },
                      child: const Text('COPY'),
                    ),
                  ],
                ),
              ),
            ),
            if (waDigits.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: AppSurfaceCard(
                  child: Row(
                    children: [
                      const Icon(Icons.chat_rounded, color: Color(0xFF128C7E)),
                      const SizedBox(width: 12),
                      const Expanded(child: Text('WhatsApp desk')),
                      TextButton(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: waDigits));
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('WhatsApp copied: $waDigits')),
                          );
                        },
                        child: const Text('COPY'),
                      ),
                    ],
                  ),
                ),
              ),
            Expanded(
              child: tickets.when(
                loading: () => const AppLoadingView(),
                error: (e, _) => AppErrorView(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(supportTicketsProvider),
                ),
                data: (rows) {
                  if (rows.isEmpty) {
                    return AppEmptyView(
                      icon: Icons.headset_mic_outlined,
                      title: 'No tickets yet',
                      message: 'Log an issue and fleet ops will reply here.',
                      actionLabel: 'New ticket',
                      onAction: () => _createTicket(context, ref),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                    itemCount: rows.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final t = rows[i];
                      return ListTile(
                        onTap: () => context.push('/support/${t.id}'),
                        tileColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: AppConstants.lightGrey),
                        ),
                        title: Text(
                          t.subject,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Text(t.priority ?? ''),
                        trailing: StatusChip.forStatus(t.status),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _createTicket(BuildContext context, WidgetRef ref) async {
  final draft = await showModalBottomSheet<_TicketDraft>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _NewTicketSheet(),
  );
  if (draft == null || !context.mounted) return;

  try {
    final id = await ref.read(supportRepositoryProvider).create(
          subject: draft.subject,
          message: draft.message,
        );
    ref.invalidate(supportTicketsProvider);
    if (context.mounted && id.isNotEmpty) context.push('/support/$id');
  } catch (e) {
    if (!context.mounted) return;
    final message = e is ApiException ? e.message : e.toString();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _TicketDraft {
  final String subject;
  final String message;
  const _TicketDraft({required this.subject, required this.message});
}

class _NewTicketSheet extends StatefulWidget {
  const _NewTicketSheet();

  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _message = TextEditingController();

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  void _submit() {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      _TicketDraft(subject: _subject.text.trim(), message: _message.text.trim()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'New support ticket',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _subject,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(labelText: 'Subject'),
                    validator: (value) {
                      if (value == null || value.trim().length < 3) {
                        return 'Subject must be at least 3 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _message,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Issue description',
                      alignLabelWithHint: true,
                    ),
                    validator: (value) {
                      if (value == null || value.trim().length < 5) {
                        return 'Message must be at least 5 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _submit,
                    child: const Text('SEND TICKET'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
