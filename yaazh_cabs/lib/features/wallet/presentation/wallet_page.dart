import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/constants.dart';
import '../../../core/widgets/app_error_view.dart';
import '../../../core/widgets/app_loading_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/wallet_repository.dart';
import '../domain/wallet.dart';

class WalletPage extends ConsumerStatefulWidget {
  const WalletPage({super.key});

  @override
  ConsumerState<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends ConsumerState<WalletPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  double _balance = 0.0;
  List<WalletTransaction> _transactions = [];
  List<PayoutRequest> _payouts = [];
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchWalletData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchWalletData() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(walletRepositoryProvider);
      final balance = await repo.getWalletBalance();
      final txns = await repo.getTransactions();
      final payouts = await repo.getPayouts();

      if (mounted) {
        setState(() {
          _balance = balance;
          _transactions = txns;
          _payouts = payouts;
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

  void _showRequestPayoutDialog() {
    final amountController = TextEditingController();
    String selectedMethod = 'upi';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Request Payout'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Current Available Balance: ₹${_balance.toStringAsFixed(2)}'),
            const SizedBox(height: 16),
            TextFormField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Amount (₹)',
                hintText: 'Enter amount to withdraw',
                prefixText: '₹ ',
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: selectedMethod,
              decoration: const InputDecoration(labelText: 'Payout Method'),
              items: const [
                DropdownMenuItem(value: 'upi', child: Text('UPI Transfer')),
                DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                DropdownMenuItem(value: 'cash', child: Text('Cash Handout')),
              ],
              onChanged: (val) {
                if (val != null) selectedMethod = val;
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () async {
              final amt = double.tryParse(amountController.text.trim());
              if (amt == null || amt <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter a valid payout amount.')),
                );
                return;
              }
              Navigator.of(ctx).pop();
              try {
                await ref.read(walletRepositoryProvider).requestPayout(
                      amount: amt,
                      method: selectedMethod,
                    );
                _fetchWalletData();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Payout request submitted successfully!')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to request payout: $e')),
                  );
                }
              }
            },
            child: const Text('SUBMIT REQUEST'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Fetching wallet ledger...'),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Wallet')),
        body: AppErrorView(
          message: _errorMessage!,
          onRetry: _fetchWalletData,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet & Earnings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchWalletData,
          ),
        ],
      ),
      body: Column(
        children: [
          // Balance Banner Card
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(AppConstants.paddingM),
            padding: const EdgeInsets.all(AppConstants.paddingL),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppConstants.primaryColor,
                  AppConstants.primaryLight,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'TOTAL WALLET BALANCE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '₹${_balance.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.account_balance_outlined, color: Colors.black),
                  label: const Text('REQUEST PAYOUT'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.accentColor,
                    foregroundColor: Colors.black,
                    minimumSize: const Size(double.infinity, 44),
                  ),
                  onPressed: _showRequestPayoutDialog,
                ),
              ],
            ),
          ),

          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Transactions'),
              Tab(text: 'Payout Requests'),
            ],
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Transactions List
                _transactions.isEmpty
                    ? const Center(child: Text('No wallet transactions recorded.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppConstants.paddingM),
                        itemCount: _transactions.length,
                        separatorBuilder: (ctx, i) => const Divider(),
                        itemBuilder: (ctx, i) {
                          final txn = _transactions[i];
                          final isCredit = txn.transactionType == 'credit';
                          final dateStr = txn.createdAt != null
                              ? DateFormat('dd MMM yyyy, hh:mm a').format(txn.createdAt!)
                              : '';

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isCredit
                                  ? Colors.green.shade100
                                  : Colors.red.shade100,
                              child: Icon(
                                isCredit
                                    ? Icons.add_circle_outline_rounded
                                    : Icons.remove_circle_outline_rounded,
                                color: isCredit ? Colors.green : Colors.red,
                              ),
                            ),
                            title: Text(
                              txn.sourceType.replaceAll('_', ' ').toUpperCase(),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(dateStr, style: const TextStyle(fontSize: 11)),
                            trailing: Text(
                              '${isCredit ? "+" : "-"}₹${txn.amount.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: isCredit ? Colors.green : Colors.red,
                              ),
                            ),
                          );
                        },
                      ),

                // Payouts List
                _payouts.isEmpty
                    ? const Center(child: Text('No payout requests submitted yet.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppConstants.paddingM),
                        itemCount: _payouts.length,
                        separatorBuilder: (ctx, i) => const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final po = _payouts[i];
                          final dateStr = po.createdAt != null
                              ? DateFormat('dd MMM yyyy, hh:mm a').format(po.createdAt!)
                              : '';

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(AppConstants.paddingM),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '₹${po.amount.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Method: ${po.method.toUpperCase()} • $dateStr',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                  StatusChip.forStatus(po.status),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
