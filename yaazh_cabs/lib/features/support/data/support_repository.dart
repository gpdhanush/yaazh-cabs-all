import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';

class SupportTicket {
  final String id;
  final String subject;
  final String status;
  final String? priority;
  final DateTime? createdAt;

  const SupportTicket({
    required this.id,
    required this.subject,
    required this.status,
    this.priority,
    this.createdAt,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id']?.toString() ?? '',
      subject: json['subject']?.toString() ?? '',
      status: json['status']?.toString() ?? 'open',
      priority: json['priority']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

class SupportMessage {
  final String id;
  final String senderType;
  final String message;
  final DateTime? createdAt;

  const SupportMessage({
    required this.id,
    required this.senderType,
    required this.message,
    this.createdAt,
  });

  factory SupportMessage.fromJson(Map<String, dynamic> json) {
    return SupportMessage(
      id: json['id']?.toString() ?? '',
      senderType: json['sender_type']?.toString() ?? 'driver',
      message: json['message']?.toString() ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

class SupportDetail {
  final String id;
  final String subject;
  final String status;
  final List<SupportMessage> messages;

  const SupportDetail({
    required this.id,
    required this.subject,
    required this.status,
    required this.messages,
  });
}

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(ref.watch(apiClientProvider));
});

final supportTicketsProvider = FutureProvider<List<SupportTicket>>((ref) {
  return ref.watch(supportRepositoryProvider).list();
});

class SupportRepository {
  final ApiClient _api;
  SupportRepository(this._api);

  Future<List<SupportTicket>> list() async {
    final data = await _api.get('/driver/support');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => SupportTicket.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<String> create({required String subject, required String message}) async {
    final data = await _api.post('/driver/support', data: {
      'subject': subject,
      'message': message,
    });
    return (data as Map)['id']?.toString() ?? '';
  }

  Future<SupportDetail> get(String id) async {
    final data = await _api.get('/driver/support/$id');
    final map = Map<String, dynamic>.from(data as Map);
    final messages = (map['messages'] as List? ?? [])
        .whereType<Map>()
        .map((e) => SupportMessage.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return SupportDetail(
      id: map['id']?.toString() ?? id,
      subject: map['subject']?.toString() ?? '',
      status: map['status']?.toString() ?? 'open',
      messages: messages,
    );
  }

  Future<void> sendMessage(String id, String message) async {
    await _api.post('/driver/support/$id/messages', data: {'message': message});
  }
}
