/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDDKQ398qDLL32I6GHj9628QSW7ciuyd9E',
  authDomain: 'yaazh-customer.firebaseapp.com',
  projectId: 'yaazh-customer',
  storageBucket: 'yaazh-customer.firebasestorage.app',
  messagingSenderId: '771197506607',
  appId: '1:771197506607:web:01face11f9ee37fcf022da',
  measurementId: 'G-ZX9NKJ2WGZ',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Yaazh Admin';
  const body = payload.notification?.body || payload.data?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload.data || {},
  });
});
