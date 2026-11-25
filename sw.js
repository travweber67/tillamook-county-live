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

var VERSION = 'tcl-v66'; // v66 = TIDE CHART CARD (Travis-directed, 2026-11-25): a new standalone card in Outdoors directly under River Levels — the full NOAA tide curve (fetcher-built data/tide-chart.json, hourly predictions today through the next two days plus the high/low turns), station picker over the same three bays as Bay Tides (Garibaldi 9437540 hourly; Netarts 9437262 and Nehalem 9437908 are hilo-only stations, their curves drawn through NOAA's own predicted turns), next high/low boxes, a dashed now line, and a King tide tag on highs at/above the station's ~99th-percentile predicted high for 2026 (Garibaldi 10.0 ft, Netarts 8.3 ft, Nehalem 8.8 ft — this week's midday highs tag on all three). Spanish strings ride LANG_ES + TCHART_L. First landed as a duplicate v65 in 38af2c9 on a stale base that briefly reverted the v65 pilot removal; this commit restores the pilot removal verbatim and renumbers to v66. Cache-bust style ?v=50, app ?v=54, SHELL stamps match // v65 = FOUNDING PILOT REMOVED (Travis decision, 2026-11-25): the free 30-day founding pilot is dropped for new pitches - the pilot clause is removed from all four founding cells (EN index.html + ES app.js). Founding terms now: 9/mo, month to month, cancel anytime, price locked while you stay, Founding Sponsor badge, founding closes Jan 31, 2027. Offers already made keep their terms - no Stripe or trial changes. Cache-bust app ?v=53, style unchanged ?v=49, SHELL stamps match // v64 = VIDEO-AS-IMAGE GUARD (2026-11-25): the Tillamook County Pioneer king-tide story in the Newsstand feed carried an .mp4 VIDEO file as its story photo; the site renders story pictures as <img>, so the card showed a broken-image icon over a blank photo area (Travis spotted it on desktop). Fix is in the fetcher (fetcher/fetch_news.py, usable_story_img()): any feed or merged-extra story image whose path ends in a video extension (.mp4/.mov/.webm/.m4v/.avi) is rejected and the story takes the normal no-picture path (second-chance candidates / drop). The Pioneer item now sits in news-candidates.json; the incident stays covered by the TCL original with the real public-domain king tide photo (img/news/cannon-beach-king-tide.jpg). Data + sw.js only; cache-bust stamps unchanged (style ?v=49, app ?v=52) // v63 = MOVIE EVENT ART FIX (Travis-directed, 2026-11-24): "Movies in the PAC: Zootopia 2" (family movie night, Nehalem) was wearing the generic music picture img/events/ev-music.jpg (an outdoor acoustic guitar + fiddle duo in a summer park - nothing to do with a movie night). Root cause, two layers: the generic art set had NO movie image, so (a) movie-titled records in data/community-events.json were hand-assigned the music picture, and (b) the EVS_CATS fallback rule in app.js mapped movie|film to ev-music.jpg, so any movie event reaching the category chain got it too. Fix at both levels: new generic art img/events/ev-movie.jpg added to the set - a real licensed photo of a crowd watching a giant cinema screen at dusk (Kino unter Sternen open-air cinema, Augarten, Vienna, by After Image Productions via Wikimedia Commons, CC BY), independently verified PASS by a separate agent before publish per the 2026-11-24 rule; the three movie-titled records that carried ev-music.jpg (CARE Movie & Awareness Night Nov 21, Movies in the PAC: Zootopia 2 Nov 24, Movie Matinee at Pacific City Library Dec 19) now carry ev-movie.jpg with the credit in each record, and app.js gains a movie|film|cinema rule (EVS_BY_TITLE + EVS_CATS) pointing at ev-movie.jpg ahead of the music rule, so future movie events and scroller dedupe fall-through land on the movie picture; the 13 genuine music events keep ev-music.jpg. Cache-bust app ?v=52, style unchanged ?v=49, SHELL stamps match // v62 = YANKO STORY IMAGE FIX (Travis-directed, 2026-11-24): the generated illustration for the Juliet Yanko album-evening story showed the guitarist performing with her back to the audience, playing to the windows; replaced with a real licensed photo of a singer-songwriter performing live with an acoustic guitar, facing the audience (Kris Kesiak via Wikimedia Commons, CC BY), independently verified by a separate agent before publish per the 2026-11-24 standing rule; new file img/news/yanko-album-night-v2.jpg, old generated file removed, credit/origin updated in news-extra + news.json; full TCL + CCL news-image audit run the same evening - no other clear orientation/anatomy/text defects found; cache-bust style ?v=49, app ?v=51, SHELL stamps match // v61 = YMCA STORY IMAGE FIX (Travis-directed, 2026-11-24): the generated gym illustration on the Tillamook YMCA after-hours story showed a runner facing away from the treadmill console, running the wrong way on the belt; replaced with a real licensed photo (gym cardio zone with treadmills, by Nikolai Panchenko via Wikimedia Commons, CC BY-SA 4.0), independently verified by a separate agent before publish per the 2026-11-24 rule; story-only swap to new file img/news/ymca-treadmills.jpg, old generated file removed, credit + img_origin updated in data/news-extra.json and data/news.json; cache-bust style ?v=48, app ?v=50, SHELL stamps match // v60 = SCHOOLS CARD ROW FIX + STORM-WINDOW SCHOOL CHECK (Travis-directed, 2026-11-24): the NWRESD row rendered broken on desktop - renderSchools appended the district note as a .school-note flex item with flex-basis:100% in a non-wrapping flex row, which squeezed .school-main to a narrow column (name stacked word-by-word, pill overlapping). The note now renders inside .school-main as the .school-sub line, matching the static HTML fallback. School check for the flood/storm window (Tue Nov 24, ~7:20 PM PT, district sites + calendars): NO closure or delay report posted by any of the four districts - all statuses stay no_report; the three districts carry a Thanksgiving-break note (no school Wed Nov 25 - Fri Nov 27, scheduled holiday break per each district's adopted calendar / NKN ParentSquare). Cache-bust app ?v=49, style unchanged ?v=47, SHELL stamps match // v59 = NEWS LIST SEE-MORE EXPANSION + READER FIX (Travis-directed, 2026-11-24): tapping a story in the News view did nothing - .news-list{display:flex} overrides the hidden attribute, so the reader view never replaced the list and the opened story sat buried under all 28 rows. The list now expands each story IN PLACE behind a See more / See less toggle under every story, showing the full text the data carries (TCL originals show their whole story); outside stories end with a 'Read the full story at <source>' link and TCL's own carry a 'Tillamook County Live original' tag instead of a link. The Today scroller's reader path gets the same footer treatment plus a .news-list[hidden] guard so it can actually appear. Cache-bust style ?v=47, app ?v=48, SHELL stamps match // v58 = CANNON BEACH KING TIDE STORY (Travis-directed, 2026-11-24): Tillamook County Live original added to data/news-extra.json - the king tide surge that knocked a man and his dog into the surf at the Cannon Beach beach-access stairs Tuesday morning (both escaped uninjured; Cannon Beach Police bystander video + statements, corroborated by Statesman Journal/KGW); written as a coast-safety story for the storm + king tide window (NWS: Coastal Flood Advisory in effect, High Wind Watch into Wed morning; the earlier Coastal Flood Warning was cancelled by NWS this afternoon and the story says so); public-domain king tide surf photo (Bonnie Moreland via Wikimedia Commons) with credit carried; cache-bust style ?v=46, app ?v=47, SHELL stamps match // v57 = COST-SENTENCE CLEANUP (Travis approved, 2026-11-24): the trailing process-language sentence 'The source listing doesn't state a cost.' plus its two variants ('The post doesn't state a price.' / 'The source post doesn't state an admission cost.') stripped from all 30 community-event notes in data/community-events.json that carried it; notes otherwise untouched - no facts, paid flags, times or URLs changed, no note left empty; cache-bust style ?v=45, app ?v=46, SHELL stamps match //  // v56 = EVENT NOTE CLEANUP (Travis approved, 2026-11-24): two community-event listings carried internal working-note wording in public - Continuation Meeting - Tillamook (Nov 22) and First Saturday's (Dec 5) - their notes rewritten as clean public descriptions from the records' own facts (name, venue/address, start time); no other entry changed; content fix in data/community-events.json only; cache-bust style ?v=44, app ?v=45, SHELL stamps match // v55 = NUTCRACKER LISTING FIX (Travis-directed, 2026-11-24): the Oregon Coast Dance Center Nutcracker listing corrected at the organizer's word — both performances now listed (Fri Dec 11, 7:00 PM and Sat Dec 12, 2:00 PM), venue Tillamook High School – Don Whitney Auditorium added, ticket link to danceticketing.com, real description noting proceeds benefit the Oregon Food Bank, and the internal working note removed from the listing; content fix in data/community-events.json only; cache-bust style ?v=43, app ?v=44, SHELL stamps match // v54 = FB EVENTS ADD (Travis approved, 2026-11-23): five candidates from the evening Facebook events check added to data/community-events.json - Magical Manzanita Scavenger Hunt (Tue Nov 24), Tillamook Tirade Scavenger Hunt (Tue Nov 24), Yoga With Dawn at the Kiawanda Community Center (Mon Nov 30), Carols for the Community (Thu Dec 3), and Chowder & Cheer in Bay City (Sat Dec 5, billed as a free event); all paid:false, none featured; the other four listings do not state a cost. Cache-bust style ?v=42, app ?v=43, SHELL stamps match // v53 = NO PINCH-ZOOM (Travis-directed standing rule, 2026-11-23): viewport meta set to maximum-scale=1, user-scalable=no on index.html (viewport-fit=cover preserved), so the app no longer pinch-zooms on mobile - Travis's rule for all Nomad apps going forward; no design, layout or content changes; cache-bust style ?v=41, app ?v=42, SHELL stamps match // v52 = NEWS ORIGINALS (Travis-approved, 2026-11-23): the first three Tillamook County Live original stories added to data/news-extra.json — Rockaway Beach's volunteer sandbag crew (Jason Hedler's free offer and Terry Bryant of B Projects and Services bringing sandbags in) ahead of the Coastal Flood Warning, a plan-your-day king tide piece for Netarts Bay and Oceanside (Thanksgiving midday high 1:02 PM at 8.30 ft, the week's biggest Wednesday 8.38 ft), and the Pacific City holiday-dinner coupon Sarah Christine is giving away; written in-house from community-group posts and the Living Oregon Coast tide guide, each entry linked back to its source and bylined Tillamook County Live; two openly licensed photos with credits carried (FEMA public domain; Joe Mabel CC BY-SA 4.0) plus one generated generic illustration, viewed and QC-checked before publish; cache-bust style ?v=40, app ?v=41, SHELL stamps match // v51 = NEWS SCOUT BATCH 2 (Travis-approved, 2026-11-23): seven verified stories added to data/news-extra.json — king tides meet a Super El Niño (Register-Guard; public-domain king-tide photo), Tillamook Library 20 years (Herald; CC BY library photo), United Paws Cat of the Week Jumpin' Jack Flash (Pioneer; the shelter's own art), Wheeler mural call for two conex containers (Pioneer; public-domain mural photo), ex-Kimmel True Value renovation at First & Ivy (Herald), YMCA after-hours keycard access (Herald), Juliet Yänko album night at the Hoffman Center (Pioneer); three generated generic illustrations, each viewed and QC-checked before publish; cache-bust style ?v=39, app ?v=40, SHELL stamps match // v50 = FB EVENTS ADD (Travis approved, 2026-11-23): two candidates from the morning Facebook events check added to data/community-events.json - CREATE & Gather: Christmas Card Making at the Tillamook County Library (Mon Dec 1, billed as a free event) and Continuation Meeting - Tillamook at Swiss Hall (Sat Dec 20, cost not stated); both paid:false, neither featured. Cache-bust style ?v=38, app ?v=39, SHELL stamps match // v49 = GROUP-WATCH ADDS + EDITORIAL FEATURE (Travis order, 2026-11-23): three adds to data/community-events.json from the morning group watch - River Barn Holiday Open House (Sun Dec 6, free, not featured) and two Rockaway Beach sandbag-help offers dated today Nov 23 for the coastal flooding (NWS verified live at publish time: Coastal Flood Advisory in effect now to Tue 4 AM, Coastal Flood Warning Tue 4 AM to Fri Nov 27 4 AM, major flooding at high tides); Jason Hedler's free offer carries featured:true as an EDITORIAL feature at Travis's direction because of the flooding - NOT a paid Featured sale; Terry Bryant / B Projects and Services LLC listed regular with his phone, no price stated. Cache-bust style ?v=37, app ?v=38, SHELL stamps match // v48 = SEVERITY RED + BAR GRADE (Travis, 2026-11-22): (A) the bad-severity red on dark surfaces was a soft coral (#ff7a6b hero spots, #ffab9e glance values, #ffb3ab sticky pill) that read as not bright enough next to the amber warns — all now bright red #ff3333 (hero-status a.bad, sticky-pill.bad, ticker + glance-strip glance-val.bad); ok green / warn amber unchanged; light-card --danger reds untouched. (B) BAR RESTRICTED now grades bad/red in loadCoast — both the Coast Conditions row and the hero 'Bar restrictions' spot (reverses the v34 Item B warn treatment; Travis: a restricted bar is a full restriction, amber read as halfway). Cache-bust style ?v=36, app ?v=37, SHELL stamps match // v47 = SEVEN EVENTS ADD (Travis order, 2026-11-22): five free + two paid events from the FB events check added to data/community-events.json — Tillamook REALTOR and Friends Holiday Party (Dec 15), Red Cross Blood Drive in Nehalem (Dec 16), Teen Holiday Craft at Tillamook Library (Dec 18), Bay City Arts Center musical The Guy Who Didn't Like Musicals (Dec 18, paid, not featured), Meet Santa at The Little Lounge (Dec 19), Movie Matinee at Pacific City Library (Dec 19), Onward Adventures Sunday Hike Shuttle Neahkahnie (Dec 20, paid, not featured); data + sw.js only // v46 = DISCLAIMER REMOVED (Travis, 2026-11-22): the 'snapshot, not a promise' disclaimer paragraph at the foot of the Before You Go card is deleted at Travis's direction; the card's checks and verdicts are unchanged; index.html + sw.js only, no cache-bust changes // v45 = HERO STATUS SPOT GRADING (Travis, 2026-11-22): the hero status spots paint with the Coast Conditions card's grading - ok = green, warn = amber, bad = red - instead of warn and bad sharing one alarm red (a Coastal Flood Watch, restricted bar and unclear roads all read as full alarm next to the card's green Surf OK). Classes were already assigned per real status in app.js; style.css only; cache-bust style ?v=35 // v44 = HERO STATUS SPOTS FIT FIX (Travis, 2026-11-22): the three hero status spots (Weather / Roads / Bay & bar) wrap their text inside their own third (min-width:0 + white-space:normal on the spots) instead of overflowing the hero card and clipping the last spot mid-word on phones; style.css only; cache-bust style ?v=34 // v43 = PAID EVENTS ADD (Travis order, 2026-11-21): four paid events from the FB events check added to data/community-events.json - Into the Woods at TAPA (Nov 22, added only, no Featured pitch per Travis), Bouillabaisse or Risotto! at Bay City Kitchen (Nov 22), Sunday Hike Shuttle: Tillamook Head Trail (Dec 13, Onward Adventures), Paint and Sip at The Winery at Manzanita (Dec 13); all paid:true, none featured; data + sw.js only // v42 = MERCH CARDS (Travis's order, 2026-11-21): the Tillamook County Live merch slider card goes live in both spots - Today directly under the founding sponsor panel, and Events & More directly after the events calendar card - with FIVE slides (Cape Meares Lighthouse, Feeling Crabby, Pacific City Sunset and Moo With a View hoodies + the Lighthouse Dad Cap, Printify renders) linking to their Shopify product pages, Shop button to the Tillamook County Live collection; GoatCounter click events per placement (merch-card-today / merch-card-events) and the merch.js whole-card click handler, ported from Columbia County Live ccl-v150/v151. New files merch.css / merch.js + img/merch/*. Cache-bust merch.css ?v=1, merch.js ?v=1; // v41 = GROUP-WATCH EVENTS ADD (Travis approved, 2026-11-21): six Tillamook FB group finds added to data/community-events.json — Winn Alexander Unplugged (Nov 21), Upstairs Bar & Grill Thanksgiving meal (Thu Nov 26, donation only), Santa in Cloverdale (Nov 28), Ducks Unlimited Duck the Halls banquet (Dec 5, paid, not featured), free bowling + pasta dinner (Dec 11), New Year's Eve Upper Room worship night (Dec 31); all featured unset; data + sw.js only // v40 = GOATCOUNTER ANALYTICS (Travis, 2026-11-21): Tillamook GoatCounter snippet added to index.html after app.js (site code tillamookcountylive); analytics only, no cache-bust stamp changes // v39 = EVENT FORM WIRED (Travis, 2026-11-21): the Tillamook 'Submit an Event' Google Form now exists (mirrors the CCL form, plus a 'Featured at the top' question; published anyone-with-the-link, no sign-in - verified signed-out before wiring), so EVENT_FORM_URL is set and the v38 add-an-event strip is LIVE in Today between the founding panel and County Events; static href on the anchor too (the CCL pattern). Cache-bust app ?v=36, style unchanged ?v=33 // v38 = ADD-AN-EVENT STRIP (Travis, 2026-11-21): a thin strip now sits in Today between the founding panel and County Events - 'Add an event - free to list, or feature yours at the top' - built on the existing #event-submit-link / EVENT_FORM_URL wiring and hidden until EVENT_FORM_URL is set (no Tillamook event form exists yet; never a dead tap target). Cache-bust app ?v=35, style ?v=33 // v37 = ORGANIZER EVENT ADD (2026-11-21): Community Thanksgiving Dinner (Thu Nov 26, 2-4 PM, Nehalem Bay Methodist Church, free) added to data/community-events.json from the organizer's Messenger submission; data + sw.js only // v36 = NEXT EVENT TILE (Travis, 2026-11-21): the hero Next event tile built its own list from the official calendars + Facebook only, so it named a routine municipal meeting ('Community Update', Tue Nov 24) while community events were running that day. The tile now picks the soonest event from the same merged, municipal-filtered list as the Today scroller (calendars tagged kind 'muni', Facebook + hand-added community events merged in, municipal filtered out; no featured tiering), and the home-town glance pass skips municipal entries too. Cache-bust app ?v=34, style unchanged ?v=32 // v35 = EMOJI CLEANUP (Travis, 2026-11-21): the sites 'got littered with emojis' — every card heading now wears the badge icon set (img/icons, the CCL pattern) instead of a leading emoji; buttons, chips, notes, aria-labels and directory link labels lose their leading emoji; the Spanish dict mirrors the clean text. Kept deliberately: the pin buttons' pin glyph (it IS the button), status markers inside rendered rows (warning / check / could-not-check), map pins, popups and layer names, the plain-text briefing and print exports, and typographic symbols. Cache-bust app ?v=33, style ?v=32 (precache style stamp also catches up from its ?v=30 lag) // v34 = COAST CARD + SCROLLER MIX (Travis, 2026-11-21): (A) the hero weather pill names the actual NWS advisory type(s) from the alerts feed — 'Weather / Coastal Flood', both types named when two are active — instead of a generic 'Weather bad'; (B) the bar pill for RESTRICTED takes the warn treatment matching its Coast Conditions row (the bad class filled it with a solid pale-red box); bad stays reserved for BAR CLOSED; (C) the events section is renamed 'County Events' and routine municipal entries (kind 'muni', the official CivicPlus calendars) no longer ride the Today scroller — they stay on the calendar/Events view on their dates; the scroller leads with community events. Cache-bust app ?v=32, style unchanged ?v=31 // v33 = FIRST-VISIT THEME DEFAULT (Travis, 2026-11-21): port of CCL v147 — the boot script no longer falls back to the OS prefers-color-scheme; a visitor with no saved theme choice always starts in LIGHT. Saved choices and the ?theme= preview override are unchanged. (TCL carries no Community Partners wall, so no heading change here.) index.html + sw.js only, no cache-bust changes // v32 = VIEW SWAP FINISHER (Travis, 2026-11-21): tapping Events & More on his phone showed a white screen — the animated view swap and the hero swap park content at opacity:0 and rely on chained setTimeout phases to bring it back, and a stalled timer chain (page freeze / backgrounding / throttled low-battery browser) strands hero + view invisible while the fixed tab bar paints fine. cclFinishViewSwap() now completes any in-flight swap to its end state on visibilitychange / pageshow / focus, plus a 1600ms backstop on every animated swap; no-op when no swap is in flight. Cache-bust app ?v=31, style ?v=31 (unchanged) // v31 = EDGE ARROWS, FINAL GUTTER DESIGN (Travis, 2026-11-21; ported from Columbia County Live v144): the events + news scroller arrows move OUT of the card row into 54px gutters and grow into big plain glyphs (48x96, 2.9rem, no circle), so cards pass beside them and are never covered; cache-bust style ?v=31, app ?v=30 (unchanged) // v30 = NEWS RANKING IN THE RENDERING (Travis, 2026-11-21): same client-side interest-tier sort as Columbia County Live v140 - buildNewsScroller runs the fetched stories through rankNewsStories() (high-interest local first, useful everyday next, routine municipal after, crime/blotter and bad news last, at most one in the first six), newest first inside a tier; lives in app.js because data/news.json is fetcher-regenerated; cache-bust ?v=30 // v29 = EVENT KIND COLOR CODE (2026-11-21): Travis asked for the municipal vs community split to read at a glance — ONE Events calendar, color-coded in place. Filter chips (All / Community / City & County) sit at the top of the Events list with a two-dot legend under them; every entry wears a kind tag pill and a matching thin left accent stripe: STEEL BLUE for City & County (the official CivicPlus calendars, data/events.json) and WARM MARBLE ORANGE for Community (hand-added community-events.json + Facebook). Classification is by source file at merge time (kind:'muni' tagged in loadEvents; merges stamp kind:'comm'; untagged reads as community). All stays strictly chronological, and the old 16-row cap now exempts municipal entries as well as community ones, so both kinds always render on their dates; the Today scroller is unchanged. Cache-bust ?v=29, SHELL stamps ?v=29 // v28 = FEATURED EVENTS + CARD VOID FIX + HELP CAPS (2026-11-21): the $19 Featured Event mechanism ships (hand-added events in data/community-events.json may carry featured:true; the Today scroller sorts featured > free > paid across EVERY upcoming event with NO CAP, featured events wear a deep-orange Featured tag in the scroller and in the Events view, which stays chronological, tag only, no pin; ships empty, nobody has paid yet). Scroller cards lose the forced tall min-height, the bottom-pinned footer and the track stretch: each card is photo (fixed 235px) + date/title/description + venue/source directly after the text, no void band; the event description clamps at 5 lines. Community Help lists cap at 6 entries per card behind a See more / See less toggle that expands in place; collapsing smooth-scrolls back to the card top. Cache-bust ?v=28, SHELL stamps ?v=28 // v27 = SHIPS (AIS) LIVE LAYER (2026-11-21): Travis asked for ships on the Tillamook map, including ships well off the coast — the fetcher now collects live AIS positions server-side (AISStream free tier, stdlib websocket in fetcher/fetch_snapshots.py; the API key lives in fetcher.env and never ships to the site) into data/ships.json over a generous north-coast box (Columbia mouth 46.4N to Newport 44.4N, ~100 NM offshore at 126.6W), NOT clipped to the county line. The map's ship layer is on by default and listed in the layers control; markers carry name, type, speed/course, destination and report time; the legend's Ship (AIS) line stamps when positions were collected and grays when stale or when the collector reports trouble — never presented as live when it is not. The retired Columbia River ETA module is removed (its river reference tables stay for the salmon module). Cache-bust ?v=27, SHELL stamps ?v=27 // v26 = EVENT DESCRIPTIONS (2026-11-21): every hand-added community event now carries a real description in its data record (data/community-events.json notes rewritten from the hunt records' own facts - what it is, where, host/activity detail where the source states it, and the cost fact). Data-only change besides the stamps. Cache-bust ?v=26 // v25 = COMMUNITY EVENTS LAND (2026-11-21): the events hunt's approved free set plus the dated paid/cost-not-stated candidates now live in data/community-events.json (66 events, Nov 21 to Dec 19), merged by the existing community-events wiring into the Events view and the Today scroller; paid entries carry paid:true in the data (the merge passes featured/paid through) so the scroller sits them under the free events; two new generated subject pictures (img/events/ev-gamenight.jpg, img/events/ev-santa.jpg). No app.js/style.css content changes. Cache-bust ?v=25 // v24 = SCROLLER CARD BALANCE (2026-11-21): Travis's correction to v22/v23 — the cards stay BIG, but the photo no longer flex-fills the card (it was squeezing the text block and clipping titles at the bottom edge). Both scrollers' shared card family is now balanced by construction: photo capped at the top half (flex:0 0 50%), text block gets its half — date, title clamped to 2 lines (ellipsized, never clipped), description/summary, source/venue line pinned to the bottom; the events note becomes a real 3-line description (.evs-note) instead of a one-line location-style row; both card types share the 480px / 472px min-height. Cache-bust ?v=24, SHELL stamps ?v=24 // v23 = EVENTS CARDS MATCH NEWS SIZE (2026-11-21): Travis's follow-up to v22 — the "Happening in the county" events cards take the news cards' big height family (.evs-card min-height 480px, 472px at >=1280px, a hair under the measured news heights so events never tower over news); the V22 photo flex-grow fills the taller card, text complete at the bottom, no void. Also catches the SHELL precache stamps up (they had lagged at ?v=20 through v21/v22) to style.css?v=23 / app.js?v=23. Cache-bust ?v=23 // v22 = TINT PAIR + SCROLLER CARD FILL (2026-11-21): the installed PWA's Android nav strip was still GREEN on Travis's phone — the manifest had never been touched since the redesign, so it kept handing Android the old brand pair: theme_color #1e4228 (old green) / background_color #f1ecdc (old cream); both are now per-scheme arrays matching the actual grounds (light #f2f3f5 / dark #2e3036), the same fix CCL shipped as ccl-v128. Also swept: index.html light theme-color meta #f1ecdc -> #f2f3f5 (dark meta was already #2e3036), and the app.js theme-toggle paint() wrote stale values (dark '#0b120d' / light '#1e4228') -> '#2e3036' / '#f2f3f5'. Scroller cards: Travis likes the BIG news cards but not the marbled void under short stories — cards keep their big equalized footprint, the photo now flex-grows to fill the card (object-fit cover), and the news summary clamp goes 3 -> 6 lines; the events scroller cards share the same img rule, so they fill the same way. Cache-bust style.css?v=22 / app.js?v=22, manifest ?v=3 // v21 = TRIP CHECK BUTTONS REMOVED (2026-11-21): the Trip Check card's "Copy the check" and "Add this trip to my calendar" buttons removed at Travis's direction, with their handlers (goCopy/goDownloadIcs/goIcs/goSay) and the now-unused .go-actions rule; the card-note line that pointed at them trimmed. Card and verdict function otherwise unchanged. Cache-bust style.css?v=21 / app.js?v=21 // v20 = BAR STATE BRANCH FIX (2026-11-21): in loadCoast, the /no restrictions/i test now runs BEFORE /restrict/i — the plain restrict test matches the substring inside 'No Restrictions' and rendered an open bar as BAR RESTRICTED on both the Coast Conditions card and the new hero spot (caught by the v19 forced-state QC while the live USCG report said No Restrictions; the bug predates v19, in the v15 coast logic). No other behavior changes. Cache-bust style.css?v=20 / app.js?v=20 // v19 = FIVE-ITEM FIX BATCH (2026-11-21): hero bar spot live (Bar restrictions / Bar closed in red, same USCG feed as the Coast card), house-cell CTA visibility fix, marbled rail cards clear of the ticker, Local News built (Newsstand Tillamook week page via fetcher/fetch_news.py), Today events scroller with per-event pictures + desktop edge arrows; cache-bust ?v=19 // v18 = TOWN LIST FIX (2026-11-21): Bay City and Wheeler added to TOWNS in app.js; content fix only; cache-bust app.js ?v=18 // v17 = DARK THEME, DESIGNED (2026-11-21): port of Columbia County Live item 5 (ccl-v125/v126) at Travis's call — dark grey ground in dark mode, green marble (img/founding-paint-green.jpg) everywhere the orange marble appears, drawer + get-app sheet + tab bar as designed dark surfaces with light text, menu-text readability fix (the legacy pale drawer colors were never re-stated when the panel went light), old-green chrome tints purged (.brand-mark chip, ::selection, drawer hovers, util buttons); light mode identical to v16; cache-bust ?v=17 // v16 = REDESIGN PORT (2026-11-21): the Columbia County Live v124 design blueprint ported to Tillamook (light-grey settled ground, hero card over the photo, status spots in the hero, floating tab pills, marbled paint cards at the strengthened wash, frosted glass, one dark shadow family, view slide with locked hero height, founding panel as paint backdrop + frosted cells, dark theme resolves to the light design values; cache-bust ?v=16) // v15 = COAST CARD + THREE REMOVALS + MAP LINKS (2026-11-20): new Coast Conditions card in Today's flow (Tillamook Bay bar from the Coast Guard report via NWS Portland AllBars.xml, high surf + flooding from NWS alerts ORC057+ORZ102, tsunami strip inside the card; the verbatim top tsunami card is unchanged); the Commute Verdict, After Dark, and Fishing/Crabbing/Clamming cards are removed with all their wiring; every boat ramp on the Bay & Bar card and every OHV area is now a whole-row Google Maps link; lighthouse logo + install icons replace the courthouse mark site-wide (new icon URLs, manifest ?v=2); cache-bust ?v=15 // v14 = EVENTS AS CARDS (2026-11-20): the Events calendar now matches Columbia County Live's v121 redesign; cache-bust ?v=14
var STATIC_CACHE = VERSION + '-static';
var DATA_CACHE = VERSION + '-data';
var LIB_CACHE = VERSION + '-lib';

var SHELL = [
  './',
  'index.html',
  'style.css?v=50',
  'app.js?v=54',
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
