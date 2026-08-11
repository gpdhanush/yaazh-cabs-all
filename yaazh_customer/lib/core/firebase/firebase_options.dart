import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Firebase web is not configured for Yaazh Customer.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'Add GoogleService-Info.plist to enable Firebase on iOS.',
        );
      default:
        throw UnsupportedError('Firebase is not configured for this platform.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDgTAbUWEfhbb-6JKPDDDnPCoHC0eg4AFA',
    appId: '1:771197506607:android:36e3e056387a937bf022da',
    messagingSenderId: '771197506607',
    projectId: 'yaazh-customer',
    storageBucket: 'yaazh-customer.firebasestorage.app',
  );
}
