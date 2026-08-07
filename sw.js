/* 출퇴근 앱 서비스워커 — 화면 파일을 캐시해 즉시 실행 (stale-while-revalidate) */
var CACHE = 'att-v1';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;                    // API(POST)는 건드리지 않음
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;                // 외부 요청 제외
  // 캐시 즉시 응답 + 백그라운드로 새 버전 받아 캐시 갱신 → 다음 실행에 반영
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || fetched;
    })
  );
});
