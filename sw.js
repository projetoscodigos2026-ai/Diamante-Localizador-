const CACHE_NAME = 'satelitediamante-v1';

// Só o "casco" do app entra no cache — é só isso que faz sentido guardar offline.
// Mapas de satélite, busca de endereço e telemetria da ISS SEMPRE precisam de
// internet no momento do uso (são dados vivos vindos de outros servidores),
// então não tentamos guardá-los aqui — isso evitaria erro de cache furado.
const ASSETS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const mesmaOrigem = url.origin === self.location.origin;

  if (!mesmaOrigem) {
    // Tudo que vem de fora (tiles de satélite, Nominatim, ISS API) passa direto
    // pela rede, sem cache — são dados que mudam e precisam estar atualizados.
    return;
  }

  // Casco do app: cache-first, com atualização em segundo plano quando possível.
  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      const buscaRede = fetch(event.request)
        .then((respostaRede) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaRede.clone()));
          return respostaRede;
        })
        .catch(() => respostaCache);
      return respostaCache || buscaRede;
    })
  );
});
