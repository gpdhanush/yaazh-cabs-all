import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/features/support/data/support_repository.dart';

class SupportDetailPage extends ConsumerStatefulWidget {
  final String ticketId;
  const SupportDetailPage({super.key, required this.ticketId});

  @override
  ConsumerState<SupportDetailPage> createState() => _SupportDetailPageState();
}

class _SupportDetailPageState extends ConsumerState<SupportDetailPage> {
  SupportDetail? _detail;
  Object? _error;
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final detail = await ref.read(supportRepositoryProvider).get(widget.ticketId);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _send() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(supportRepositoryProvider).sendMessage(widget.ticketId, text);
      _controller.clear();
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null && _detail == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ticket')),
        body: AppErrorView(message: _error.toString(), onRetry: _load),
      );
    }
    final detail = _detail;
    if (detail == null) {
      return const Scaffold(body: AppLoadingView());
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: Text(detail.subject),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: StatusChip.forStatus(detail.status)),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: detail.messages.length,
              itemBuilder: (context, i) {
                final msg = detail.messages[i];
                final mine = msg.senderType == 'driver';
                return Align(
                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    constraints: const BoxConstraints(maxWidth: 320),
                    decoration: BoxDecoration(
                      color: mine
                          ? AppConstants.gold.withValues(alpha: 0.18)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppConstants.lightGrey),
                    ),
                    child: Text(msg.message),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(hintText: 'Write a reply'),
                    ),
                  ),
                  IconButton(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send_rounded, color: AppConstants.navy),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
