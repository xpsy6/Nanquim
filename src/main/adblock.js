// Bloqueador de anuncios e rastreadores.
// Combina uma lista embutida com a lista publica StevenBlack (baixada e guardada em cache),
// mais regras visuais (esconder espacos de anuncio) e um ajudante para o YouTube.
const { app, net } = require('electron');
const fs = require('fs');
const path = require('path');

const BUILTIN = `
doubleclick.net googlesyndication.com googleadservices.com adservice.google.com
pagead2.googlesyndication.com tpc.googlesyndication.com google-analytics.com
googletagservices.com ssl.google-analytics.com stats.g.doubleclick.net
adnxs.com adsrvr.org rubiconproject.com pubmatic.com openx.net casalemedia.com
criteo.com criteo.net taboola.com outbrain.com amazon-adsystem.com
scorecardresearch.com quantserve.com moatads.com hotjar.com hotjar.io
smartadserver.com popads.net popcash.net propellerads.com exoclick.com
adcolony.com applovin.com chartboost.com unityads.unity3d.com inmobi.com
mgid.com revcontent.com zergnet.com media.net contextweb.com sharethrough.com
teads.tv yieldmo.com 33across.com indexww.com lijit.com sovrn.com
spotxchange.com spotx.tv springserve.com tremorhub.com bidswitch.net
adform.net adition.com yandexadexchange.net an.yandex.ru mc.yandex.ru
ads.yahoo.com advertising.com adtech.de bluekai.com krxd.net demdex.net
everesttech.net omtrdc.net crwdcntrl.net rlcdn.com agkn.com mathtag.com
turn.com adsymptotic.com serving-sys.com sizmek.com flashtalking.com
onesignal.com pushcrew.com pushwoosh.com mouseflow.com fullstory.com
clarity.ms bat.bing.com ads.linkedin.com ads.twitter.com static.ads-twitter.com
analytics.tiktok.com ads.tiktok.com ads-api.tiktok.com adsappier.com
adskeeper.com adsterra.com highperformanceformat.com hilltopads.net
juicyads.com trafficjunky.net trafficstars.com clickadu.com galaksion.com
monetag.com onclickads.net onclickalgo.com adcash.com admaven.com
`.trim().split(/\s+/);

const LIST_URL = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts';
const COSMETIC_CSS = `
ins.adsbygoogle, .adsbygoogle, [id^="google_ads_iframe"], [id^="div-gpt-ad"],
iframe[src*="doubleclick.net"], iframe[src*="googlesyndication"],
[data-ad-slot], [data-google-query-id], .ad-slot, .ad-banner, .adBanner,
#taboola-below-article-thumbnails, .trc_related_container, .OUTBRAIN
{ display: none !important; }`;

const YT_CSS = `
ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer,
ytd-display-ad-renderer, ytd-banner-promo-renderer, ytd-statement-banner-renderer,
ytd-player-legacy-desktop-watch-ads-renderer, #player-ads, #masthead-ad,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer), .ytd-merch-shelf-renderer,
ytm-promoted-sparkles-web-renderer { display: none !important; }`;

const YT_SCRIPT = `(() => {
  if (window.__nqYt) return; window.__nqYt = true;
  setInterval(() => {
    const skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
    if (skip) skip.click();
    const player = document.querySelector('.html5-video-player.ad-showing');
    if (player) {
      const v = player.querySelector('video');
      if (v && isFinite(v.duration) && v.duration > 0) { v.muted = true; v.currentTime = v.duration; }
    }
  }, 400);
})();`;

let domains = new Set(BUILTIN);
const counts = new Map(); // webContentsId -> bloqueados na pagina atual
let totalBlocked = 0;
let getSettings = () => ({ adblock: true, adblockAllow: [] });
let onCount = () => {};

function cacheFile() { return path.join(app.getPath('userData'), 'blocklist.txt'); }

function parseHosts(text) {
  const set = new Set(BUILTIN);
  for (const line of text.split('\n')) {
    if (!line || line[0] === '#') continue;
    const m = line.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+([^\s#]+)/);
    if (m && m[1] !== 'localhost' && m[1].includes('.')) set.add(m[1].toLowerCase());
  }
  return set;
}

async function loadList() {
  const file = cacheFile();
  let stale = true;
  try {
    const st = fs.statSync(file);
    domains = parseHosts(fs.readFileSync(file, 'utf8'));
    stale = Date.now() - st.mtimeMs > 7 * 24 * 3600 * 1000;
  } catch { /* sem cache ainda */ }
  if (!stale) return;
  try {
    const res = await net.fetch(LIST_URL);
    if (!res.ok) return;
    const text = await res.text();
    if (text.length < 10000) return;
    fs.writeFileSync(file, text);
    domains = parseHosts(text);
  } catch { /* sem internet: segue com a lista embutida ou o cache */ }
}

function isBlockedHost(host) {
  host = host.toLowerCase();
  while (host.includes('.')) {
    if (domains.has(host)) return true;
    host = host.slice(host.indexOf('.') + 1);
  }
  return false;
}

function siteOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function isAllowedSite(pageUrl) {
  const s = getSettings();
  if (!s.adblock) return true;
  const site = siteOf(pageUrl);
  return !!site && s.adblockAllow.includes(site);
}

function attach(ses) {
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, cb) => {
    if (details.resourceType === 'mainFrame') return cb({});
    const wc = details.webContents;
    const pageUrl = wc && !wc.isDestroyed() ? wc.getURL() : '';
    if (isAllowedSite(pageUrl)) return cb({});
    let host = '';
    try { host = new URL(details.url).hostname; } catch { return cb({}); }
    // nunca bloqueia recursos do proprio site
    if (pageUrl && siteOf(pageUrl) && host.endsWith(siteOf(pageUrl))) return cb({});
    if (isBlockedHost(host)) {
      totalBlocked++;
      if (wc) {
        counts.set(wc.id, (counts.get(wc.id) || 0) + 1);
        onCount(wc.id);
      }
      return cb({ cancel: true });
    }
    cb({});
  });
}

function decorate(wc) {
  const url = wc.getURL();
  if (!/^https?:/.test(url) || isAllowedSite(url)) return;
  wc.insertCSS(COSMETIC_CSS).catch(() => {});
  if (/(^|\.)youtube\.com$/.test(siteOf(url)) || siteOf(url) === 'youtube.com') {
    wc.insertCSS(YT_CSS).catch(() => {});
    wc.executeJavaScript(YT_SCRIPT, false).catch(() => {});
  }
}

module.exports = {
  init(settingsGetter, countCallback) {
    getSettings = settingsGetter;
    onCount = countCallback;
    loadList();
  },
  attach,
  decorate,
  siteOf,
  isAllowedSite,
  countFor(id) { return counts.get(id) || 0; },
  resetCount(id) { counts.set(id, 0); },
  get total() { return totalBlocked; },
  get size() { return domains.size; }
};
