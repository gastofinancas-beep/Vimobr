importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Mesmo projeto do app (firebase-applet-config.json)
const firebaseConfig = {
  projectId: "vimobr",
  appId: "1:341833153433:web:388ea1a70f18275e07b108",
  apiKey: "AIzaSyD6jYqwVEBluarineMbjPVhLg9Fd7C_H1E",
  authDomain: "vimobr.firebaseapp.com",
  storageBucket: "vimobr.firebasestorage.app",
  messagingSenderId: "341833153433"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Vimo Gastronomia';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Nova atividade nas suas avaliações!',
      icon: payload.notification?.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data || { url: '/' },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('Background messaging worker initialization fallback:', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
