import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_error_view.dart';
import 'package:yaazh_cabs/core/widgets/app_loading_view.dart';
import '../viewmodels/active_trip_viewmodel.dart';

class PaymentCollectionPage extends ConsumerStatefulWidget {
  final String bookingId;

  const PaymentCollectionPage({
    super.key,
    required this.bookingId,
  });

  @override
  ConsumerState<PaymentCollectionPage> createState() =>
      _PaymentCollectionPageState();
}

class _PaymentCollectionPageState
    extends ConsumerState<PaymentCollectionPage> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _selectedMethod = 'cash';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref
          .read(activeTripNotifierProvider.notifier)
          .loadTripDetails(widget.bookingId);
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _onRecordPayment(double balanceDue) async {
    final amountText = _amountController.text.trim();
    final amount = double.tryParse(amountText.isEmpty ? balanceDue.toString() : amountText);

    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid payment amount.')),
      );
      return;
    }

    setState(() {
      _submitting = true;
    });

    final success = await ref
        .read(activeTripNotifierProvider.notifier)
        .collectPayment(
          bookingId: widget.bookingId,
          amount: amount,
          method: _selectedMethod,
          note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        );

    if (mounted) {
      setState(() {
        _submitting = false;
      });

      if (success) {
        context.go('/summary/${widget.bookingId}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to record payment. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripState = ref.watch(activeTripNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Collection'),
      ),
      body: tripState.when(
        loading: () => const AppLoadingView(message: 'Fetching fare summary...'),
        error: (error, st) => AppErrorView(
          message: error.toString(),
          onRetry: () => ref
              .read(activeTripNotifierProvider.notifier)
              .loadTripDetails(widget.bookingId),
        ),
        data: (trip) {
          if (trip == null) {
            return const AppErrorView(message: 'Trip details not found.');
          }

          final balanceDue = trip.balanceDue > 0 ? trip.balanceDue : trip.estimatedTotal;

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppConstants.paddingM),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Fare Header Card
                  Card(
                    color: AppConstants.accentColor.withOpacity(0.15),
                    child: Padding(
                      padding: const EdgeInsets.all(AppConstants.paddingM),
                      child: Column(
                        children: [
                          const Text(
                            'BALANCE DUE FROM CUSTOMER',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '₹${balanceDue.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              color: AppConstants.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Booking Ref: ${trip.bookingCode}',
                            style: const TextStyle(fontSize: 13, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Amount Collection Input
                  TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Collected Amount (₹)',
                      hintText: balanceDue.toStringAsFixed(2),
                      prefixText: '₹ ',
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Payment Method Selector
                  const Text(
                    'Payment Method',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _MethodChip(
                        label: 'Cash',
                        icon: Icons.payments_outlined,
                        selected: _selectedMethod == 'cash',
                        onTap: () => setState(() => _selectedMethod = 'cash'),
                      ),
                      const SizedBox(width: 10),
                      _MethodChip(
                        label: 'UPI',
                        icon: Icons.qr_code_2_rounded,
                        selected: _selectedMethod == 'upi',
                        onTap: () => setState(() => _selectedMethod = 'upi'),
                      ),
                      const SizedBox(width: 10),
                      _MethodChip(
                        label: 'Card',
                        icon: Icons.credit_card_rounded,
                        selected: _selectedMethod == 'card',
                        onTap: () => setState(() => _selectedMethod = 'card'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Note input
                  TextFormField(
                    controller: _noteController,
                    decoration: const InputDecoration(
                      labelText: 'Payment Note (Optional)',
                      hintText: 'e.g. Received via GPay / Cash handed to driver',
                    ),
                  ),
                  const SizedBox(height: 32),

                  ElevatedButton(
                    onPressed: _submitting ? null : () => _onRecordPayment(balanceDue),
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text('CONFIRM PAYMENT RECEIVED'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _MethodChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppConstants.accentColor : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? AppConstants.accentColor : Colors.grey.withOpacity(0.3),
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? Colors.black : Colors.grey.shade700),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: selected ? Colors.black : Colors.grey.shade700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
