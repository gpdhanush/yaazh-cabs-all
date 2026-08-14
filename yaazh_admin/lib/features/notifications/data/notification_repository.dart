import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/notifications/domain/notification_log.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.watch(apiClientProvider));
});

final notificationsProvider =
    FutureProvider.autoDispose<List<NotificationLog>>((ref) {
  return ref.watch(notificationRepositoryProvider).list();
});

class NotificationRepository {
  final ApiClient _api;

  NotificationRepository(this._api);

  Future<List<NotificationLog>> list({String? recipientType}) async {
    final data = await _api.get('/admin/notifications', queryParameters: {
      if (recipientType != null && recipientType.isNotEmpty)
        'recipient_type': recipientType,
    });
    return asMapList(data).map(NotificationLog.fromJson).toList();
  }

  Future<void> delete(String id) async {
    await _api.delete('/admin/notifications/$id');
  }

  Future<void> send({
    required String title,
    required String body,
    required String audience,
    String? customerId,
    String? driverId,
  }) async {
    await _api.post('/admin/notifications/send', data: {
      'title': title,
      'body': body,
      'audience': audience,
      'customer_id': ?customerId,
      'driver_id': ?driverId,
    });
  }
}

void invalidateNotificationCaches(WidgetRef ref) {
  ref.invalidate(notificationsProvider);
}
