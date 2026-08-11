import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService();
});

class AnalyticsService {
  FirebaseAnalytics? get _analytics {
    if (Firebase.apps.isEmpty) return null;
    return FirebaseAnalytics.instance;
  }

  NavigatorObserver? observer() {
    final analytics = _analytics;
    if (analytics == null) return null;
    return FirebaseAnalyticsObserver(analytics: analytics);
  }

  Future<void> setDriver(String driverId) async {
    try {
      await _analytics?.setUserId(id: driverId);
      await _analytics?.setUserProperty(name: 'role', value: 'driver');
      if (Firebase.apps.isNotEmpty) {
        await FirebaseCrashlytics.instance.setUserIdentifier(driverId);
      }
    } catch (e) {
      debugPrint('Analytics setDriver skipped: $e');
    }
  }

  Future<void> logLogin() async {
    try {
      await _analytics?.logLogin(loginMethod: 'password');
    } catch (e) {
      debugPrint('Analytics login skipped: $e');
    }
  }

  Future<void> logDutyChanged({required bool online}) async {
    try {
      await _analytics?.logEvent(
        name: 'duty_status',
        parameters: {'status': online ? 'online' : 'offline'},
      );
    } catch (e) {
      debugPrint('Analytics duty skipped: $e');
    }
  }

  Future<void> clearUser() async {
    try {
      await _analytics?.setUserId(id: null);
      if (Firebase.apps.isNotEmpty) {
        await FirebaseCrashlytics.instance.setUserIdentifier('');
      }
    } catch (_) {}
  }
}
