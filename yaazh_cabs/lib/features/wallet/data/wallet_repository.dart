import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../domain/wallet.dart';

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WalletRepository(apiClient);
});

class WalletRepository {
  final ApiClient _apiClient;

  WalletRepository(this._apiClient);

  Future<double> getWalletBalance() async {
    final response = await _apiClient.get('/driver/wallet');
    if (response is Map<String, dynamic>) {
      return double.tryParse(response['balance']?.toString() ?? '0') ?? 0.0;
    }
    return 0.0;
  }

  Future<List<WalletTransaction>> getTransactions() async {
    final response = await _apiClient.get('/driver/wallet/transactions');
    if (response is List) {
      return response
          .map((item) => WalletTransaction.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<PayoutRequest>> getPayouts() async {
    final response = await _apiClient.get('/driver/payouts');
    if (response is List) {
      return response
          .map((item) => PayoutRequest.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> requestPayout({
    required double amount,
    String method = 'upi',
  }) async {
    await _apiClient.post('/driver/payouts', data: {
      'amount': amount,
      'method': method,
    });
  }
}
