import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_client.dart';

class AppNotification {
  final String id;
  final String title;
  final String? body;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.title,
    this.body,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      body: json['body']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.watch(apiClientProvider));
});

final notificationsProvider = FutureProvider<List<AppNotification>>((ref) {
  return ref.watch(notificationRepositoryProvider).list();
});

class NotificationRepository {
  final ApiClient _api;
  NotificationRepository(this._api);

  Future<List<AppNotification>> list() async {
    final data = await _api.get('/customer/notifications');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
