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

  Future<void> setAdmin(String adminId) async {
    try {
      await _analytics?.setUserId(id: adminId);
      await _analytics?.setUserProperty(name: 'role', value: 'admin');
      if (Firebase.apps.isNotEmpty) {
        await FirebaseCrashlytics.instance.setUserIdentifier(adminId);
      }
    } catch (e) {
      debugPrint('Analytics setAdmin skipped: $e');
    }
  }

  Future<void> logLogin() async {
    try {
      await _analytics?.logLogin(loginMethod: 'password');
    } catch (e) {
      debugPrint('Analytics login skipped: $e');
    }
  }

  Future<void> logScreen(String name) async {
    try {
      await _analytics?.logScreenView(screenName: name);
    } catch (_) {}
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
