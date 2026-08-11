import { Injectable, inject } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Messaging, deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { environment } from '../../../environments/environment';
import { AdminApiService } from '../api/admin-api.service';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly api = inject(AdminApiService);
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      const supported = await isSupported();
      if (!supported) return;

      this.app = getApps().length ? getApp() : initializeApp(environment.firebase);
      this.messaging = getMessaging(this.app);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const vapidKey = environment.firebaseVapidKey || undefined;
      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
      });
      if (token) {
        this.api.registerDevice({
          platform: 'web',
          fcm_token: token,
          app_version: environment.appVersion,
        }).subscribe({ error: () => undefined });
      }

      onMessage(this.messaging, (payload) => {
        const title = payload.notification?.title ?? payload.data?.['title'] ?? 'Yaazh Admin';
        const body = payload.notification?.body ?? payload.data?.['body'] ?? '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    } catch (err) {
      console.warn('Firebase messaging not started', err);
      this.started = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.messaging) return;
    try {
      await deleteToken(this.messaging);
    } catch {
      /* ignore */
    }
  }
}
