/* Tillamook County Live — service worker (tcl-v10)
 *
 * Strategy by request kind — live data is NEVER cached:
 *  - Navigations, shell code (CSS/JS), the county GeoJSON, the manifest:
 *    network-first, cache fallback — freshest code wins when there's signal,
 *    the last good copy carries you when there isn't.
 *  - data/*.json snapshots: network-first, cache fallback. What you see
 *    offline is the last real collection, still stamped with its true
 *    collection time. The snapshots are carried forward across version
 *    bumps, so an offline launch right after an update still has them.
 *  - Images and icons: the shell's own art is precached with the shell
 *    and served cache-first; every other image is stale-while-revalidate
 *    — a photo swapped at the same URL shows its last copy once, then
 *    the new one, never stuck on the old file all version long.
 *  - Versioned library CDNs (Leaflet, Google Fonts): cache-first,
 *    refreshed in the background.
 *  - Everything else cross-origin (NWS, USGS, NOAA, map tiles, radar):
 *    NOT intercepted. Offline, those feeds simply fail and their
 *    panels say so — nothing is faked, nothing pretends to be live.
 *
 * tcl-v3 (2026-11-15) ports the Columbia County Live v86 update path,
 * so this app stops running stale builds the same way its sibling did:
 * app.js registers this worker with updateViaCache 'none' and re-checks
 * with registration.update() every time the app returns to the
 * foreground; when a new worker takes over, the page offers a small
 * dismissible tap-to-refresh toast instead of silently running the old
 * build (never a forced reload). Install precaches the shell with
 * cache:'reload' — the previous version's files can't be filed under
 * this version's cache name out of the HTTP cache — and precaches the
 * versioned style.css?v=3 / app.js?v=3 URLs the page actually requests.
 * The cached index.html navigation fallback fires ONLY for the app
 * root and index.html; a failed navigation anywhere else falls back to
 * that page's own cached copy or fails honestly. The data cache is no
 * longer wiped on a version bump: its snapshots are carried forward
 * into the new version's data cache before old caches are deleted.
 * Paths are resolved relative to this worker's scope, so the same
 * file behaves on the custom domain and on a github.io subpath.
 *
 * tcl-v4 (2026-11-15): two phone fixes from Travis's review — the
 * bottom tab bar's safe-area padding is scoped to installed /
 * fullscreen display modes (in a browser tab it added ~45px of
 * empty bar under the buttons), and the Travel map's OHV markers
 * are plain dots whose name + info live in the tap popup (the
 * always-on name chips ate the map). Shell stamps bump to
 * style.css?v=4 / app.js?v=4.
 *
 * tcl-v5 (2026-11-15): the Travel map gains the ODF-designated OHV
 * trail network of the Tillamook State Forest as its own toggleable
 * layer — ohv-trails.geojson (267 named trails grouped from 709
 * source segments) joins the precache shell; tapping a trail names
 * it and highlights every segment sharing its name.
 *
 * tcl-v6 (2026-11-15): trail tap targets — the visible trail line
 * renders at 2.5px, too thin for a finger, so each trail also
 * carries an invisible 14px hit line that takes the taps.
 *
 * tcl-v7 (2026-11-15): tsunami warning card at the very top of
 * Today. Rendered only while the ORC057 alerts feed carries an
 * alert whose event is exactly "Tsunami Warning"; the card's
 * words are the alert's own. Watches/advisories keep the normal
 * banner handling. Tested locally against a clearly synthetic
 * fixture only — never against live data.
 *
 * tcl-v8 (2026-11-16): offline map download on the Travel map,
 * the same feature Columbia County Live shipped as its v94
 * (Travis approved 2026-11-16). A '⬇ Offline map' button opens a
 * full-screen MapLibre map fed by a Tillamook County PMTiles pack
 * (Protomaps/OSM z0-15 plus a low-roads overlay) that a visitor
 * downloads once (about 13.5 MB) into OPFS and uses with no
 * signal. The module css/js, the MapLibre and PMTiles vendor
 * files and the glyphs join the SHELL precache; the packs
 * themselves are NOT precached — they live in OPFS via the
 * in-app download. Live overlays stay online-only and the
 * offline view says so in EN and ES. Shell stamps bump to
 * style.css?v=8 / app.js?v=8.
 *
 * tcl-v9 (2026-11-16): the Crabbing Index card joins Outdoors,
 * below Bay Tides (Travis directed 2026-11-16; built first as
 * a preview the same day). It scores each of the next seven
 * days for crabbing from a boat in Tillamook Bay — season,
 * the slack-tide window against daylight, wind, rain, and
 * Wilson + Trask runoff — computed live in app.js from the
 * same keyless NOAA / NWS / USGS feeds the site already
 * reads, with ODFW's rules summarized on the card. No new
 * files and no new SHELL entries: the card is markup in
 * index.html, styles in style.css and logic in app.js.
 * Shell stamps bump to style.css?v=9 / app.js?v=9.
 *
 * tcl-v10 (2026-11-16): the founding sponsor spots land in the
 * repo (they existed only in the preview, as one clustered
 * block of three) — and land as FOUR spots (Travis's call:
 * Tillamook gets four founding spots; Columbia County has
 * three), spread evenly through Today's flow as individual
 * frosted cards on the house cells' .in-flow treatment: Spot 1
 * at the top under a floating "Presented by" head, Spot 2
 * after the Commute Verdict, Spot 3 after Tonight & Tomorrow,
 * Spot 4 after the County Briefing. All four open: $49/mo,
 * free 30-day pilot, founding closes January 31, 2027, claim
 * mailto per spot, EN/ES. No new files and no new SHELL
 * entries. Shell stamps bump to style.css?v=10 / app.js?v=10.
 */
'use strict';

var VERSION = 'tcl-v10';
var STATIC_CACHE = VERSION + '-static';
var DATA_CACHE = VERSION + '-data';
var LIB_CACHE = VERSION + '-lib';

var SHELL = [
  './',
  'index.html',
  'style.css?v=10',
  'app.js?v=10',
  'offline-map/offline-map.css',
  'offline-map/offline-map.js',
  'offline-map/vendor/maplibre-gl.css',
  'offline-map/vendor/maplibre-gl.js',
  'offline-map/vendor/pmtiles.js',
  'offline-map/glyphs/Noto Sans Regular/0-255.pbf',
  'offline-map/glyphs/Noto Sans Regular/256-511.pbf',
  'offline-map/glyphs/Noto Sans Regular/512-767.pbf',
  'offline-map/glyphs/Noto Sans Regular/768-1023.pbf',
  'offline-map/glyphs/Noto Sans Regular/1024-1279.pbf',
  'offline-map/glyphs/Noto Sans Regular/1280-1535.pbf',
  'offline-map/glyphs/Noto Sans Regular/1536-1791.pbf',
  'offline-map/glyphs/Noto Sans Regular/1792-2047.pbf',
  'offline-map/glyphs/Noto Sans Regular/2048-2303.pbf',
  'offline-map/glyphs/Noto Sans Regular/8192-8447.pbf',
  'offline-map/glyphs/Noto Sans Regular/8448-8703.pbf',
  'offline-map/glyphs/Noto Sans Medium/0-255.pbf',
  'offline-map/glyphs/Noto Sans Medium/256-511.pbf',
  'offline-map/glyphs/Noto Sans Medium/512-767.pbf',
  'offline-map/glyphs/Noto Sans Medium/768-1023.pbf',
  'offline-map/glyphs/Noto Sans Medium/1024-1279.pbf',
  'offline-map/glyphs/Noto Sans Medium/1280-1535.pbf',
  'offline-map/glyphs/Noto Sans Medium/1536-1791.pbf',
  'offline-map/glyphs/Noto Sans Medium/1792-2047.pbf',
  'offline-map/glyphs/Noto Sans Medium/2048-2303.pbf',
  'offline-map/glyphs/Noto Sans Medium/8192-8447.pbf',
  'offline-map/glyphs/Noto Sans Medium/8448-8703.pbf',
  'manifest.webmanifest',
  'county.geojson',
  'ohv-trails.geojson',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-512.png',
  'img/icons/icon-logo-courthouse.png',
  'img/apple-touch-icon.png'
];

/* Path of this worker's scope ('/' on the custom domain,
 * '/tillamook-county-live/' on github.io) — request paths are made
 * relative to it before being compared with the shell list or the
 * app-root navigation rule. */
var SCOPE_PATH = new URL(self.registration.scope).pathname;
function relPath(pathname) {
  if (pathname.indexOf(SCOPE_PATH) === 0) return '/' + pathname.slice(SCOPE_PATH.length);
  return pathname;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) {
        // One missing file must never block the whole install.
        return Promise.all(SHELL.map(function (u) {
          // cache:'reload' — the precache must come from the network,
          // not the HTTP cache: on a fast redeploy, the previous
          // version's files could otherwise be filed under this
          // version's cache name.
          return cache.add(new Request(u, { cache: 'reload' }))
            .catch(function () { /* shell fills in lazily too */ });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    carryDataForward()
      .then(function () { return caches.keys(); })
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (k) {
            return k.indexOf('tcl-') === 0 &&
              [STATIC_CACHE, DATA_CACHE, LIB_CACHE].indexOf(k) === -1;
          })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* The data cache holds the last real snapshots — the offline lifeline.
 * A version bump must not wipe it: before the old caches are deleted,
 * copy the newest old data cache's entries into this version's data
 * cache, without overwriting anything this version already collected. */
function carryDataForward() {
  return caches.keys().then(function (keys) {
    var old = keys.filter(function (k) {
      return /^tcl-v\d+-data$/.test(k) && k !== DATA_CACHE;
    }).sort(function (a, b) { return versionNum(b) - versionNum(a); });
    if (!old.length) return null;
    return Promise.all([caches.open(old[0]), caches.open(DATA_CACHE)])
      .then(function (pair) {
        var from = pair[0], to = pair[1];
        return from.keys().then(function (reqs) {
          return Promise.all(reqs.map(function (req) {
            return to.match(req).then(function (hit) {
              if (hit) return null;
              return from.match(req).then(function (res) {
                return res ? to.put(req, res) : null;
              });
            });
          }));
        });
      })
      .catch(function () { /* a failed carry costs freshness, never the update */ });
  });
}

function versionNum(cacheName) {
  var m = /tcl-v(\d+)/.exec(cacheName);
  return m ? parseInt(m[1], 10) : 0;
}

function networkFirst(request, cacheName, navFallback) {
  return caches.open(cacheName).then(function (cache) {
    return fetch(request).then(function (fresh) {
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    }).catch(function (err) {
      return cache.match(request).then(function (hit) {
        if (hit) return hit;
        if (navFallback) return cache.match('index.html');
        throw err;
      });
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (fresh) {
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      });
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var network = fetch(request).then(function (fresh) {
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      }).catch(function () { return hit; });
      return hit || network;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf('/data/') !== -1 && /\.json$/.test(url.pathname)) {
      event.respondWith(networkFirst(request, DATA_CACHE, false));
    } else if (/\.(?:png|jpe?g|gif|svg|webp|ico)$/.test(url.pathname)) {
      // Shell art is precached with the shell and changes only on a
      // version bump: cache-first. Every other image (background
      // photos, directory photos — anything swapped in place)
      // revalidates in the background, so a same-URL swap lands on
      // the next view instead of staying stuck for the whole version.
      if (SHELL.indexOf(relPath(url.pathname).slice(1)) !== -1) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
      } else {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
      }
    } else {
      // The cached index.html fallback is for the app itself only. A
      // failed navigation to any other page falls back to that page's
      // own cached copy, or fails honestly — never to the app shell.
      var rel = relPath(url.pathname);
      var shellNav = request.mode === 'navigate' &&
        (rel === '/' || rel === '/index.html');
      event.respondWith(networkFirst(request, STATIC_CACHE, shellNav));
    }
  } else if (url.hostname === 'unpkg.com' ||
             url.hostname === 'fonts.googleapis.com' ||
             url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, LIB_CACHE));
  }
  /* Every other cross-origin request goes straight to the network. */
});
