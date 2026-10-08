importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "hybrid-eye-kdpgw",
  appId: "1:184363791886:web:bf1f7b02c3172ac9c42e5f",
  apiKey: "AIzaSyB8n7iD03XeL8i9ISywY8Vn4LPpfSZWrbo",
  authDomain: "hybrid-eye-kdpgw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixvimo-ef5ce5a4-a170-4d95-b6d1-e73c235c337a",
  storageBucket: "hybrid-eye-kdpgw.firebasestorage.app",
  messagingSenderId: "184363791886"
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
