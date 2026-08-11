import 'package:flutter/material.dart';
import '../../../app/constants.dart';
import '../../../core/widgets/app_surface.dart';

class SupportPage extends StatefulWidget {
  const SupportPage({super.key});

  @override
  State<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends State<SupportPage> {
  final _messageController = TextEditingController();
  String _selectedCategory = 'trip_issue';
  bool _submitted = false;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Fleet support')),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.paddingM),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppSurfaceCard(
              color: AppConstants.gold.withValues(alpha: 0.12),
              border: Border.all(
                color: AppConstants.gold.withValues(alpha: 0.35),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.phone_in_talk_rounded,
                    color: AppConstants.navy,
                    size: 32,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Operations hotline',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '+91 98765 43210 · 24/7',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 88,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(88, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Dialing fleet hotline...'),
                          ),
                        );
                      },
                      child: const Text('CALL'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Submit a ticket', style: theme.textTheme.titleLarge),
            const SizedBox(height: 12),
            if (!_submitted) ...[
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                decoration: const InputDecoration(labelText: 'Issue category'),
                items: const [
                  DropdownMenuItem(
                    value: 'trip_issue',
                    child: Text('Trip / customer issue'),
                  ),
                  DropdownMenuItem(
                    value: 'vehicle_breakdown',
                    child: Text('Vehicle / breakdown'),
                  ),
                  DropdownMenuItem(
                    value: 'payment_wallet',
                    child: Text('Payment / wallet'),
                  ),
                  DropdownMenuItem(
                    value: 'app_bug',
                    child: Text('App / technical problem'),
                  ),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _messageController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Issue description',
                  hintText: 'Describe the issue in detail...',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (_messageController.text.trim().isNotEmpty) {
                    setState(() => _submitted = true);
                  }
                },
                child: const Text('LOG ISSUE'),
              ),
              const SizedBox(height: 10),
              Text(
                'Urgent trip problems should also go to the operations hotline.',
                style: theme.textTheme.bodySmall,
              ),
            ] else ...[
              AppSurfaceCard(
                color: const Color(0xFFE8F6EE),
                border: Border.all(
                  color: AppConstants.successColor.withValues(alpha: 0.35),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle_outline_rounded,
                      color: AppConstants.successColor,
                      size: 48,
                    ),
                    const SizedBox(height: 12),
                    Text('Issue noted', style: theme.textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      'Please also call the operations hotline for time-sensitive trip problems.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppConstants.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        ),
      ),
    );
  }
}
