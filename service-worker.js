/* Español CRM — service worker
   Стратегія: network-first. Завжди пробує взяти свіжу версію файлу з інтернету
   й одразу оновлює кеш; лише коли мережі немає (офлайн) — віддає останню
   збережену копію. Це зроблено навмисно, щоб застосунок ніколи не "застрягав"
   на старій версії, як раніше траплялось із кешем Safari.

   Кеш стосується лише статичних файлів самого застосунку (index.html, іконки,
   маніфест) — Firebase та Google API запити завжди йдуть напряму в мережу
   і сервіс-воркером не перехоплюються. */

const CACHE_NAME = 'espanol-crm-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './logo-plain.png', './logo-text.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // не блокуємо встановлення, якщо якийсь файл не вдалося одразу закешувати
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* Кешуємо тільки GET-запити до нашого власного домену (GitHub Pages).
     Все інше (Firebase, Google Calendar/Meet, Gmail тощо) — напряму в мережу. */
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
