import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/constants.dart';
import '../../../core/widgets/app_error_view.dart';
import '../../../core/widgets/app_loading_view.dart';
import '../../../core/widgets/app_surface.dart';
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
        title: const Text('Request payout'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Available: ₹${_balance.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Amount (₹)',
                hintText: 'Enter amount',
                prefixText: '₹ ',
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: selectedMethod,
              decoration: const InputDecoration(labelText: 'Payout method'),
              items: const [
                DropdownMenuItem(value: 'upi', child: Text('UPI Transfer')),
                DropdownMenuItem(
                  value: 'bank_transfer',
                  child: Text('Bank Transfer'),
                ),
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
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(140, 44),
            ),
            onPressed: () async {
              final amt = double.tryParse(amountController.text.trim());
              if (amt == null || amt <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid payout amount.'),
                  ),
                );
                return;
              }
              Navigator.of(ctx).pop();
              try {
                await ref
                    .read(walletRepositoryProvider)
                    .requestPayout(amount: amt, method: selectedMethod);
                _fetchWalletData();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Payout request submitted successfully!'),
                    ),
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
            child: const Text('SUBMIT'),
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
        body: AppErrorView(message: _errorMessage!, onRetry: _fetchWalletData),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Wallet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchWalletData,
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(AppConstants.paddingM),
            padding: const EdgeInsets.all(AppConstants.paddingL),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppConstants.navy, AppConstants.black],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TOTAL BALANCE',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppConstants.gold,
                  ),
                ),
                const SizedBox(height: 8),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '₹${_balance.toStringAsFixed(2)}',
                    style: theme.textTheme.displaySmall?.copyWith(
                      color: AppConstants.white,
                      fontSize: 34,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.account_balance_outlined),
                  label: const Text('REQUEST PAYOUT'),
                  onPressed: _showRequestPayoutDialog,
                ),
              ],
            ),
          ),
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Transactions'),
              Tab(text: 'Payouts'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _transactions.isEmpty
                    ? Center(
                        child: Text(
                          'No wallet transactions recorded.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppConstants.textSecondaryLight,
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppConstants.paddingM),
                        itemCount: _transactions.length,
                        separatorBuilder: (ctx, i) =>
                            const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final txn = _transactions[i];
                          final isCredit = txn.transactionType == 'credit';
                          final dateStr = txn.createdAt != null
                              ? DateFormat('dd MMM yyyy, hh:mm a')
                                  .format(txn.createdAt!)
                              : '';

                          return AppSurfaceCard(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: isCredit
                                      ? const Color(0xFFE8F6EE)
                                      : const Color(0xFFFDECEC),
                                  child: Icon(
                                    isCredit
                                        ? Icons.add_circle_outline_rounded
                                        : Icons.remove_circle_outline_rounded,
                                    color: isCredit
                                        ? AppConstants.successColor
                                        : AppConstants.errorColor,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        txn.sourceType
                                            .replaceAll('_', ' ')
                                            .toUpperCase(),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.titleSmall,
                                      ),
                                      if (dateStr.isNotEmpty)
                                        Text(
                                          dateStr,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.bodySmall,
                                        ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${isCredit ? "+" : "-"}₹${txn.amount.toStringAsFixed(2)}',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: isCredit
                                        ? AppConstants.successColor
                                        : AppConstants.errorColor,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                _payouts.isEmpty
                    ? Center(
                        child: Text(
                          'No payout requests submitted yet.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppConstants.textSecondaryLight,
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppConstants.paddingM),
                        itemCount: _payouts.length,
                        separatorBuilder: (ctx, i) =>
                            const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final po = _payouts[i];
                          final dateStr = po.createdAt != null
                              ? DateFormat('dd MMM yyyy, hh:mm a')
                                  .format(po.createdAt!)
                              : '';

                          return AppSurfaceCard(
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '₹${po.amount.toStringAsFixed(2)}',
                                        style: theme.textTheme.titleLarge,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${po.method.replaceAll('_', ' ').toUpperCase()} · $dateStr',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Flexible(child: StatusChip.forStatus(po.status)),
                              ],
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
        ),
      ),
    );
  }
}
