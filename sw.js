/* Tillamook County Live — service worker (tcl-v13)
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
 *
 * tcl-v11 (2026-11-16): always open on Today at the top (Travis's
 * call): saved-view restore removed, browser scroll restoration set
 * to manual, page scrolls to top on load; theme, language, pins,
 * town pick and other saved preferences untouched. Shell stamps bump
 * to style.css?v=11 / app.js?v=11.
 *
 * tcl-v12 (2026-11-18, Travis's call): the four founding spots sit
 * together under one head in a .founding-cells grid — 2x2 on desktop,
 * single column on phones, with spots 2-4 weaving down Today on
 * phones. Shell stamps bump to style.css?v=12 / app.js?v=12.
 *
 * tcl-v13 (2026-11-20, launch day): the v11 startup rule and the
 * v12 founding grid are merged into one publish tree (the repo held
 * v11, the local tree held v12). Shell stamps bump to
 * style.css?v=13 / app.js?v=13.
 */
'use strict';

var VERSION = 'tcl-v18'; // v18 = TOWN LIST FIX (2026-11-21): Bay City and Wheeler added to TOWNS in app.js — both are incorporated Tillamook County cities that were missing from the town list (Your town picker, map town chips, finder, Leaving from, commute destinations); launch-post commenters caught Bay City. Content fix only, no design change; cache-bust app.js ?v=18 // v17 = DARK THEME, DESIGNED (2026-11-21): port of Columbia County Live item 5 (ccl-v125/v126) at Travis's call — dark grey ground in dark mode, green marble (img/founding-paint-green.jpg) everywhere the orange marble appears, drawer + get-app sheet + tab bar as designed dark surfaces with light text, menu-text readability fix (the legacy pale drawer colors were never re-stated when the panel went light), old-green chrome tints purged (.brand-mark chip, ::selection, drawer hovers, util buttons); light mode identical to v16; cache-bust ?v=17 // v16 = REDESIGN PORT (2026-11-21): the Columbia County Live v124 design blueprint ported to Tillamook (light-grey settled ground, hero card over the photo, status spots in the hero, floating tab pills, marbled paint cards at the strengthened wash, frosted glass, one dark shadow family, view slide with locked hero height, founding panel as paint backdrop + frosted cells, dark theme resolves to the light design values; cache-bust ?v=16) // v15 = COAST CARD + THREE REMOVALS + MAP LINKS (2026-11-20): new Coast Conditions card in Today's flow (Tillamook Bay bar from the Coast Guard report via NWS Portland AllBars.xml, high surf + flooding from NWS alerts ORC057+ORZ102, tsunami strip inside the card; the verbatim top tsunami card is unchanged); the Commute Verdict, After Dark, and Fishing/Crabbing/Clamming cards are removed with all their wiring; every boat ramp on the Bay & Bar card and every OHV area is now a whole-row Google Maps link; lighthouse logo + install icons replace the courthouse mark site-wide (new icon URLs, manifest ?v=2); cache-bust ?v=15 // v14 = EVENTS AS CARDS (2026-11-20): the Events calendar now matches Columbia County Live's v121 redesign; cache-bust ?v=14
var STATIC_CACHE = VERSION + '-static';
var DATA_CACHE = VERSION + '-data';
var LIB_CACHE = VERSION + '-lib';

var SHELL = [
  './',
  'index.html',
  'style.css?v=17',
  'app.js?v=17',
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
  'img/icon-lighthouse-192.png',
  'img/icon-lighthouse-512.png',
  'img/icon-lighthouse-maskable-512.png',
  'img/icons/icon-logo-lighthouse.png',
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
