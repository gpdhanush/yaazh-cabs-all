import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/status_chip.dart';
import 'package:yaazh_cabs/features/documents/data/document_repository.dart';
import 'package:yaazh_cabs/features/documents/domain/driver_document.dart';

class DocumentsPage extends ConsumerStatefulWidget {
  const DocumentsPage({super.key});

  @override
  ConsumerState<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends ConsumerState<DocumentsPage> {
  List<DriverDocument> _documents = [];
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDocuments();
  }

  Future<void> _fetchDocuments() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      final docs = await ref.read(documentRepositoryProvider).getDocuments();
      if (mounted) {
        setState(() {
          _documents = docs;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _openUpload() async {
    final result = await context.push<bool>('/documents/upload');
    if (result == true) _fetchDocuments();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading documents…'),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Documents')),
        body: AppErrorView(message: _errorMessage!, onRetry: _fetchDocuments),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchDocuments,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openUpload,
        backgroundColor: AppConstants.accentColor,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.upload_file_rounded),
        label: const Text('Upload'),
      ),
      body: SafeArea(
        top: false,
        child: _documents.isEmpty
          ? AppEmptyView(
              icon: Icons.folder_shared_outlined,
              title: 'No documents yet',
              message:
                  'Upload your license, RC, and insurance so fleet can verify your profile.',
              actionLabel: 'UPLOAD DOCUMENT',
              onAction: _openUpload,
            )
          : RefreshIndicator(
              onRefresh: _fetchDocuments,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                itemCount: _documents.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (ctx, i) {
                  final doc = _documents[i];
                  final expiryStr = doc.expiryDate != null
                      ? DateFormat('dd MMM yyyy').format(doc.expiryDate!)
                      : 'No expiry';
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppConstants.lightGrey),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppConstants.accentColor
                                .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.verified_user_rounded,
                            color: AppConstants.primaryColor,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doc.documentType
                                    .replaceAll('_', ' ')
                                    .toUpperCase(),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: AppConstants.navy,
                                ),
                              ),
                              if (doc.documentNo != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'No: ${doc.documentNo}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ],
                              if ((doc.rejectionReason ?? '').trim().isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  doc.rejectionReason!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppConstants.errorColor,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 4),
                              Text(
                                'Expiry: $expiryStr',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppConstants.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Flexible(
                          child: StatusChip.forStatus(doc.verificationStatus),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
      ),
    );
  }
}
