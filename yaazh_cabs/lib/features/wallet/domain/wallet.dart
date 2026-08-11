class WalletTransaction {
  final String id;
  final String transactionType; // credit, debit
  final String sourceType;
  final double amount;
  final double? balanceAfter;
  final DateTime? createdAt;

  WalletTransaction({
    required this.id,
    required this.transactionType,
    required this.sourceType,
    required this.amount,
    this.balanceAfter,
    this.createdAt,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id']?.toString() ?? '',
      transactionType: json['transaction_type'] ?? 'credit',
      sourceType: json['source_type'] ?? 'trip_fare',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      balanceAfter: double.tryParse(json['balance_after']?.toString() ?? ''),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}

class PayoutRequest {
  final String id;
  final double amount;
  final String method;
  final String status; // pending, processing, paid, rejected
  final DateTime? createdAt;

  PayoutRequest({
    required this.id,
    required this.amount,
    required this.method,
    required this.status,
    this.createdAt,
  });

  factory PayoutRequest.fromJson(Map<String, dynamic> json) {
    return PayoutRequest(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      method: json['method'] ?? 'upi',
      status: json['status'] ?? 'pending',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}
