import 'package:flutter/material.dart';
import '../../../app/constants.dart';

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fleet Support & Help'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.paddingM),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Quick Call Card
            Card(
              color: AppConstants.accentColor.withOpacity(0.15),
              child: Padding(
                padding: const EdgeInsets.all(AppConstants.paddingM),
                child: Row(
                  children: [
                    const Icon(Icons.phone_in_talk_rounded,
                        color: AppConstants.primaryColor, size: 36),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Emergency Operations Hotline',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            '+91 98765 43210 (24/7 Support)',
                            style: TextStyle(fontSize: 13, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.accentColor,
                        foregroundColor: Colors.black,
                        minimumSize: const Size(60, 36),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Dialing fleet hotline...')),
                        );
                      },
                      child: const Text('CALL'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Submit Support Ticket',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            if (!_submitted) ...[
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(labelText: 'Issue Category'),
                items: const [
                  DropdownMenuItem(value: 'trip_issue', child: Text('Trip / Customer Issue')),
                  DropdownMenuItem(value: 'vehicle_breakdown', child: Text('Vehicle Maintenance / Breakdown')),
                  DropdownMenuItem(value: 'payment_wallet', child: Text('Payment / Wallet Ledger Query')),
                  DropdownMenuItem(value: 'app_bug', child: Text('App Feature / Technical Problem')),
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
                  labelText: 'Issue Description',
                  hintText: 'Describe the issue or assistance required in detail...',
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (_messageController.text.trim().isNotEmpty) {
                    setState(() => _submitted = true);
                  }
                },
                child: const Text('LOG ISSUE FOR DISPATCH'),
              ),
              const SizedBox(height: 8),
              const Text(
                'Note: Driver support tickets are not yet available on the API. Use the hotline for urgent issues; this form keeps a local note for your shift.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.green),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.check_circle_outline_rounded,
                        color: Colors.green, size: 48),
                    SizedBox(height: 12),
                    Text(
                      'Issue Noted',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Please also call the operations hotline for time-sensitive trip problems.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
