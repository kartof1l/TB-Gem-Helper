// content.js - TB Gem Helper v3.6 (fuzzy-матч, длинный кэш, фоновый автопроход страниц)
(function () {
  'use strict';

  var GEM_COLORS = {
    'Red':'#D03D33','Gold':'#CFAB31','Blue':'#0097CE','Purple':'#8232CF','Orange':'#D07733',
    'Light Green':'#B7CF33','Deep Blue':'#3D68C4','Sea Green':'#4AB78D','Verdant Green':'#51B350',
    'Deep Green':'#37864D','Bright Green':'#A1FF59','Bright Purple':'#8232ED','Placid Blue':'#94CAD0',
    'Summer Warmth':'#FFEEBC','Defensive Red':'#FF4200',"Creator's Light":'#DCF2FF','Blossom Red':'#D76092',
    'Crystalline Blue':'#1A3D85','Rubiline':'#D11FA1','Cursed Black':'#060606','Plague Grey':'#626E5B',
    "Champion's Blue":'#507DFE',"Champion's Green":'#15A515',"Champion's Purple":'#7F48C3',
    'Midas Gold':'#FFCA15','Earth Green':'#5AC355','Ember Flame':'#FFC604','Diretide Orange':'#F79D00',
    'Dredge Earth':'#BDB76B','Dungeon Doom':'#7B68EE',"Tnim S'nnam":'#BCDDB3',
    'Brusque Britches Beige':'#F0E68C','Unhallowed Ground':'#808000','Ships in the Night':'#191970',
    'Miasmatic Grey':'#C0C0C0','Pristine Platinum':'#D5E3F5','Vermillion Renewal':'#CA0123',
    "Reflection's Shade":'#FF3C28','Pyroclastic Flow':'#FF7832','Glacial Flow':'#32ABDC',
    'Plushy Shag':'#FFC1DC','Explosive Burst':'#FFAF00','Light Blue':'#32A6CF','Magenta':'#C439C6','Persian':'#2924CB'
  };
  var RU_ALIASES = {
    'Красный':'Red','Золотой':'Gold','Золото':'Gold','Синий':'Blue','Фиолетовый':'Purple','Оранжевый':'Orange',
    'Светло-зеленый':'Light Green','Глубокий синий':'Deep Blue','Сине-зеленый':'Sea Green',
    'Зеленая сосна':'Verdant Green','Глубокий зеленый':'Deep Green','Ярко-зеленый':'Bright Green',
    'Ярко-фиолетовый':'Bright Purple','Спокойный синий':'Placid Blue','Летнее тепло':'Summer Warmth',
    'Сдержанно-красный':'Defensive Red','Свет создателя':"Creator's Light",'Аленький цветочек':'Blossom Red',
    'Синий кристалл':'Crystalline Blue','Отталкивающий черный':'Cursed Black','Чумной серый':'Plague Grey',
    'Чемпионский синий':"Champion's Blue",'Чемпионский зеленый':"Champion's Green",
    'Чемпионский фиолетовый':"Champion's Purple",'Золото Мидаса':'Midas Gold',
    'Зеленая планета':'Earth Green','Тлеющее пламя':'Ember Flame',
    'Рубиновый':'Rubiline','Чистый платиновый':'Pristine Platinum','Багровое обновление':'Vermillion Renewal',
    'Тень отражения':"Reflection's Shade",'Пирокластический поток':'Pyroclastic Flow',
    'Ледниковый поток':'Glacial Flow','Плюшевый ворс':'Plushy Shag','Взрывной всплеск':'Explosive Burst',
    'Светло-синий':'Light Blue','Маджента':'Magenta','Персидский':'Persian',
    'Диретайдовый оранжевый':'Diretide Orange','Земляной драга':'Dredge Earth','Подземная погибель':'Dungeon Doom',
    "Тним С'ннам":"Tnim S'nnam",'Бежевые штаны':'Brusque Britches Beige','Нечестивая земля':'Unhallowed Ground',
    'Корабли в ночи':'Ships in the Night','Миазматический серый':'Miasmatic Grey'
  };

  var LABEL_G = /(?:Prismatic\s*Gem|Призматический\s*самоцвет)/gi;
  var LABEL_ONE = /(?:Prismatic\s*Gem|Призматический\s*самоцвет)/i;
  var LABEL_ONLY = /^\s*(?:Prismatic\s*Gem|Призматический\s*самоцвет)\s*$/i;
  var LEGACY_RE = /Legacy\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i;
  var TARGET_RE = /Fractal Horns of Inner Abysm|Prismatic\s*:|Призматический\s*:/i;
  var IMG_SEL = '.image, .img, .item-image, [style*="background-image"], img';
  var CYR = /[\u0430-\u044f]/;

  var CACHE_KEY = 'tbGemCacheV3', SET_KEY = 'tbGemSettings';
  var TTL_GOOD = 90*24*3600*1000, TTL_EMPTY = 6*3600*1000, TTL_UNK = 24*3600*1000, CACHE_MAX = 8000;
  var LIMITS = { wMin:1, wMax:3, dMin:250, dMax:3000, maxRate:3.5, netMs:350, pMax:20, bgMax:600 };

  var settings = { workers:2, delay:350, ru:false, panel:true, prefetch:true, prefetchPages:2 };
  var cache = {}, queue = [], bgQueue = [], active = 0, done = 0, bgDone = 0, okStreak = 0;
  var pausedUntil = 0, brake = false, userPaused = false, saveTimer = null;
  var prefetchRunning = false, prefetchTimer = null, prefetchPage = 0, bgSeen = {};

  function compact(s) { return (s||'').toLowerCase().replace(/\u0451/g,'\u0435').replace(/[^a-z0-9\u0430-\u044f]/g,''); }
  var INDEX = (function () {
    var seen = {}, list = [];
    function add(alias, canon) {
      if (!GEM_COLORS[canon]) { console.warn('[gems] алиас без цвета отброшен:', alias, '->', canon); return; }
      var k = compact(alias); if (!k || seen[k]) return;
      seen[k] = 1; list.push({ k:k, n:canon });
    }
    Object.keys(GEM_COLORS).forEach(function (n) { add(n, n); });
    Object.keys(RU_ALIASES).forEach(function (ru) { add(ru, RU_ALIASES[ru]); });
    list.sort(function (a,b) { return b.k.length - a.k.length; });
    return list;
  })();
  var FUZZY = INDEX.filter(function (e) { return CYR.test(e.k) && e.k.length >= 7; })
                   .map(function (e) { return { stem: e.k.slice(0, -2), n: e.n }; });
  var RU_BY_EN = {};
  Object.keys(RU_ALIASES).forEach(function (ru) { var c = RU_ALIASES[ru]; if (GEM_COLORS[c] && !RU_BY_EN[c]) RU_BY_EN[c] = ru; });

  function hex2(n) { return ('0' + Math.max(0, Math.min(255, n|0)).toString(16)).slice(-2); }
  function toHex(raw) {
    if (!raw) return null; raw = String(raw).trim();
    var m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) { var h = m[1]; if (h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return '#'+h.toUpperCase(); }
    m = raw.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    return m ? ('#'+hex2(+m[1])+hex2(+m[2])+hex2(+m[3])).toUpperCase() : null;
  }
  function readColor(el) {
    if (!el || el.nodeType !== 1) return null;
    var raw = el.getAttribute('color') || (el.style && el.style.color) || '';
    if (!raw && el.parentElement) raw = el.parentElement.getAttribute('color') || (el.parentElement.style && el.parentElement.style.color) || '';
    return toHex(raw);
  }
  function textColor(hex) {
    var h = toHex(hex) || '#333333';
    var r = parseInt(h.substr(1,2),16), g = parseInt(h.substr(3,2),16), b = parseInt(h.substr(5,2),16);
    return (r*299+g*587+b*114)/1000 > 150 ? '#111111' : '#ffffff';
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function keyOf(u) { var m = (u||'').match(/\/item\/(\d+)-(\d+)/); return m ? m[1]+'_'+m[2] : u; }
  function has(k) { return Object.prototype.hasOwnProperty.call(cache, k); }
  function abs(href, base) { try { return new URL(href, base || location.href).href.split('#')[0]; } catch (e) { return null; } }

  function clamp(s) {
    var w = Math.max(LIMITS.wMin, Math.min(LIMITS.wMax, Math.round(s.workers||2)));
    var d = Math.max(LIMITS.dMin, Math.min(LIMITS.dMax, Math.round(s.delay||350)));
    var need = Math.ceil(w*1000/LIMITS.maxRate - LIMITS.netMs);
    if (d < need) d = need;
    var p = Math.max(0, Math.min(10, Math.round(s.prefetchPages == null ? 2 : s.prefetchPages)));
    return { workers:w, delay:d, ru:!!s.ru, panel:s.panel!==false, prefetch:s.prefetch!==false, prefetchPages:p };
  }
  function effWorkers() { return brake ? 1 : settings.workers; }
  function effDelay() { return brake ? Math.min(LIMITS.dMax, settings.delay*2) : settings.delay; }
  function rate() { return (effWorkers()*1000/(effDelay()+LIMITS.netMs)).toFixed(2); }

  async function loadAll() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        var o = await chrome.storage.local.get([CACHE_KEY, SET_KEY]);
        cache = (o && o[CACHE_KEY]) || {};
        settings = clamp(Object.assign(settings, (o && o[SET_KEY]) || {}));
      } else {
        cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
        settings = clamp(Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')));
      }
    } catch (e) { cache = {}; }
    var now = Date.now();
    Object.keys(cache).forEach(function (k) {
      var v = cache[k];
      if (!v || !v.t) { delete cache[k]; return; }
      var ttl = v.n ? (v.u ? TTL_UNK : TTL_GOOD) : TTL_EMPTY;
      if (now - v.t > ttl) delete cache[k];
    });
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var keys = Object.keys(cache);
      if (keys.length > CACHE_MAX) {
        keys.sort(function (a,b) { return cache[a].t - cache[b].t; });
        keys.slice(0, keys.length - CACHE_MAX).forEach(function (k) { delete cache[k]; });
      }
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          var o = {}; o[CACHE_KEY] = cache; o[SET_KEY] = settings; chrome.storage.local.set(o);
        } else {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          localStorage.setItem(SET_KEY, JSON.stringify(settings));
        }
      } catch (e) {}
    }, 500);
  }

  function matchGem(text) {
    var t = (text||'').replace(/\s+/g,' '), m, tries = 0;
    LABEL_G.lastIndex = 0;
    while ((m = LABEL_G.exec(t)) !== null && tries < 6) {
      tries++;
      var head = compact(t.slice(Math.max(0, m.index-140), m.index));
      for (var i=0;i<INDEX.length;i++) if (head.slice(-INDEX[i].k.length) === INDEX[i].k) return INDEX[i].n;
      for (var f=0;f<FUZZY.length;f++) {
        var st = FUZZY[f].stem;
        for (var x=0;x<3;x++) {
          var cut = x ? head.slice(0, head.length-x) : head;
          if (cut.slice(-st.length) === st) return FUZZY[f].n;
        }
      }
    }
    var m2 = t.match(/(?:Prismatic|Призматический)\s*:\s*([^\n]{2,40})/i);
    if (m2) { var tail = compact(m2[1]);
      for (var j=0;j<INDEX.length;j++) if (tail.indexOf(INDEX[j].k) === 0) return INDEX[j].n; }
    return null;
  }
  function htmlColorFor(descr, name) {
    var needle = compact(name), els = descr.querySelectorAll('font[color], [style*="color"]');
    for (var i=0;i<els.length;i++) {
      var t = compact(els[i].textContent); if (t.length < 3) continue;
      if (t.indexOf(needle) !== -1 || needle.indexOf(t) !== -1) { var c = readColor(els[i]); if (c) return c; }
    }
    return null;
  }
  function nameFromDom(descr) {
    var els = descr.querySelectorAll('*'), lim = Math.min(els.length, 2000);
    for (var i=0;i<lim;i++) {
      var el = els[i]; if (el.children.length) continue;
      if (!LABEL_ONLY.test((el.textContent||'').trim())) continue;
      var prev = el.previousSibling;
      while (prev && !(prev.textContent||'').trim()) prev = prev.previousSibling;
      if (!prev) continue;
      var name = (prev.textContent||'').trim();
      if (!name || name.length > 40) continue;
      return { name:name, color:readColor(prev.nodeType===1?prev:prev.parentElement) || readColor(el) };
    }
    return null;
  }
  function tailBeforeLabel(text) {
    var t = (text||'').replace(/\s+/g,' '), m = t.match(LABEL_ONE);
    if (!m) return null;
    var win = t.slice(Math.max(0,m.index-80), m.index).split(/[.;:!?()\d]/).pop().trim();
    return (win.length>=3 && win.length<=40) ? win : null;
  }
  function extractGem(descr) {
    var text = descr.textContent || '';
    var lg = text.match(LEGACY_RE);
    if (lg) return { name:'Legacy '+lg[1]+','+lg[2]+','+lg[3], color:('#'+hex2(+lg[1])+hex2(+lg[2])+hex2(+lg[3])).toUpperCase() };
    var canon = matchGem(text);
    if (canon) return { name:canon, color:htmlColorFor(descr, canon) || GEM_COLORS[canon] };
    var dom = nameFromDom(descr);
    if (dom) {
      var k = compact(dom.name), hit = null;
      for (var i=0;i<INDEX.length;i++) if (INDEX[i].k === k) { hit = INDEX[i].n; break; }
      return { name:hit||dom.name, color:dom.color||GEM_COLORS[hit]||'#3A3A3A', unknown:!hit };
    }
    var raw = tailBeforeLabel(text);
    return raw ? { name:raw, color:'#3A3A3A', unknown:true } : null;
  }

  function imageBox(card) {
    var box = card.querySelector(IMG_SEL);
    if (box && box.tagName === 'IMG' && box.parentElement) box = box.parentElement;
    if (!box) { var p = card.parentElement; if (p && p.querySelectorAll('a[href*="/item/"]').length === 1) box = p.querySelector(IMG_SEL); }
    return box || card;
  }
  function addBadge(card, gem) {
    if (!card || !gem || !gem.name || card.querySelector('.gem-badge')) return;
    var host = imageBox(card);
    if (host.querySelector('.gem-badge')) return;
    var cs = getComputedStyle(host);
    if (cs.display === 'inline') host.style.display = 'inline-block';
    if (cs.position === 'static') host.style.position = 'relative';
    var b = document.createElement('div');
    b.className = 'gem-badge' + (gem.unknown ? ' gem-badge-unknown' : '');
    b.style.backgroundColor = gem.color || '#3A3A3A';
    b.style.color = textColor(gem.color);
    b.title = gem.name + (RU_BY_EN[gem.name] ? ' / ' + RU_BY_EN[gem.name] : '');
    b.textContent = (settings.ru && RU_BY_EN[gem.name]) ? RU_BY_EN[gem.name] : gem.name;
    host.appendChild(b);
  }
  function findCards() {
    var seen = {}, out = [], nodes = document.querySelectorAll('a.item, .market-items .item, a[href*="/item/"]');
    for (var i=0;i<nodes.length;i++) {
      var el = nodes[i];
      var a = (el.tagName==='A' && el.href && el.href.indexOf('/item/')!==-1) ? el : el.querySelector('a[href*="/item/"]');
      if (!a) continue;
      if (!(/(^|\s)item(\s|$)/.test(el.className||'') || el.querySelector(IMG_SEL))) continue;
      var href = a.href.split('#')[0];
      if (seen[href]) continue;
      seen[href] = 1; el.dataset.gemUrl = href; out.push(el);
    }
    return out;
  }
  function isTarget(el) {
    var href = decodeURIComponent(el.dataset.gemUrl||'').replace(/\+/g,' ');
    return TARGET_RE.test(el.textContent||'') || TARGET_RE.test(href);
  }
  function fromCache(v) { return v && v.n ? { name:v.n, color:v.c, unknown:!!v.u } : null; }
  function logGem(gem, url, bg) {
    var tag = bg ? '[gems][фон] ' : '[gems] ';
    if (!gem) { console.log(tag + 'без гема | ' + url); return; }
    if (gem.unknown) console.warn(tag + 'НЕИЗВЕСТНЫЙ "' + gem.name + '" | ' + url);
    console.log(tag + '%c ' + gem.name + ' %c ' + url,
      'background:'+gem.color+';color:'+textColor(gem.color)+';font-weight:700;padding:1px 5px;border-radius:3px', 'color:#888');
  }

  async function fetchDoc(url) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 15000), res;
    try { res = await fetch(url, { credentials:'same-origin', signal:ctrl.signal }); }
    finally { clearTimeout(timer); }
    if (res.status===429 || res.status===503 || res.status===403) { var e = new Error('rate limited '+res.status); e.rate = true; throw e; }
    if (!res.ok) throw new Error('HTTP '+res.status);
    return new DOMParser().parseFromString(await res.text(), 'text/html');
  }

  function itemLinksFromDoc(doc, base) {
    var out = [], seen = {}, nodes = doc.querySelectorAll('a.item, .market-items .item, a[href*="/item/"]');
    for (var i=0;i<nodes.length;i++) {
      var el = nodes[i];
      var raw = (el.tagName==='A' && /\/item\//.test(el.getAttribute('href')||'')) ? el.getAttribute('href')
                : (el.querySelector('a[href*="/item/"]') || {}).getAttribute ? el.querySelector('a[href*="/item/"]').getAttribute('href') : null;
      if (!raw) continue;
      var href = abs(raw, base); if (!href || seen[href]) continue;
      seen[href] = 1;
      var name = (el.textContent||'') + ' ' + decodeURIComponent(href).replace(/\+/g,' ');
      if (TARGET_RE.test(name)) out.push(href);
    }
    return out;
  }
  function pageNum(u) { var m = (u||'').match(/[?&](?:page|p)=(\d+)/i) || (u||'').match(/\/page\/(\d+)/i); return m ? +m[1] : null; }
  function nextPageUrl(doc, base) {
    var a = doc.querySelector('a[rel="next"]');
    if (a && a.getAttribute('href')) return abs(a.getAttribute('href'), base);
    var links = doc.querySelectorAll('a[href]'), arrow = null, cur = pageNum(base || location.href) || 1;
    for (var i=0;i<links.length;i++) {
      var el = links[i], t = (el.textContent||'').trim().toLowerCase(), href = el.getAttribute('href');
      if (!href) continue;
      var meta = ((el.getAttribute('title')||'')+' '+(el.className||'')).toLowerCase();
      if (/next\s*page|следующ|вперёд|вперед/.test(t) || /\bnext\b/.test(meta)) return abs(href, base);
      if (pageNum(abs(href, base)) === cur+1) return abs(href, base);
      if (/^(\u2192|\u00bb|\u203a|>)$/.test(t) && !arrow) arrow = abs(href, base);
    }
    return arrow;
  }

  function pump() {
    if (userPaused) return;
    while (active < effWorkers() && (queue.length || (settings.prefetch && !brake && bgQueue.length)) && Date.now() >= pausedUntil) { active++; runWorker(); }
    if ((queue.length || bgQueue.length) && Date.now() < pausedUntil) setTimeout(pump, pausedUntil - Date.now() + 200);
  }
  async function runWorker() {
    try {
      while (true) {
        if (userPaused || Date.now() < pausedUntil || active > effWorkers()) break;
        var isBg = false, task = null;
        if (queue.length) task = queue.shift();
        else if (settings.prefetch && !brake && bgQueue.length && bgDone < LIMITS.bgMax) { task = bgQueue.shift(); isBg = true; }
        else break;
        var url = isBg ? task : (task && task.isConnected ? task.dataset.gemUrl : null);
        if (!url) continue;
        var key = keyOf(url);
        if (has(key)) { if (!isBg) { addBadge(task, fromCache(cache[key])); task.dataset.gemState = 'done'; } continue; }
        await sleep(effDelay() * (isBg ? 1.5 : 1) + Math.random()*200);
        var gem = null;
        try { gem = extractGem((await fetchDoc(url)).querySelector('#descr') || document.createElement('div')); }
        catch (err) {
          if (err.rate) {
            if (isBg) bgQueue.unshift(task); else queue.unshift(task);
            pausedUntil = Date.now() + 45000; brake = true; okStreak = 0;
            console.warn('[gems] лимит (' + err.message + ') - пауза 45с, тормоз');
            break;
          }
          console.warn('[gems] ошибка ' + err.message + ' | ' + url);
          if (!isBg) task.dataset.gemState = 'error';
          continue;
        }
        cache[key] = { n:gem?gem.name:null, c:gem?gem.color:null, u:gem&&gem.unknown?1:0, t:Date.now() };
        persist();
        if (isBg) bgDone++; else { done++; addBadge(task, gem); task.dataset.gemState = 'done'; }
        logGem(gem, url, isBg);
        okStreak++;
        if (brake && okStreak >= 25) { brake = false; console.log('[gems] тормоз снят'); }
      }
    } finally {
      active--;
      if (queue.length || bgQueue.length) pump(); else maybePrefetch();
      paintPanel();
    }
  }

  function maybePrefetch() {
    if (!settings.prefetch || prefetchRunning || userPaused || queue.length || active > 0) return;
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(startPrefetch, 2500);
  }
  async function startPrefetch() {
    if (prefetchRunning || !settings.prefetch || userPaused || queue.length) return;
    var url = nextPageUrl(document, location.href);
    if (!url) { console.log('[gems][фон] следующей страницы нет - финиш'); return; }
    prefetchRunning = true;
    var limit = settings.prefetchPages === 0 ? LIMITS.pMax : Math.min(settings.prefetchPages, LIMITS.pMax);
    var visited = {}; visited[location.href.split('#')[0]] = 1;
    var firstKeyHere = (findCards()[0] || {}).dataset ? keyOf(findCards()[0].dataset.gemUrl) : null;
    try {
      while (url && prefetchPage < limit && settings.prefetch && !userPaused && bgDone < LIMITS.bgMax) {
        if (visited[url]) break;
        visited[url] = 1;
        var guard = 0;
        while (queue.length && guard < 600) { await sleep(500); guard++; }
        if (brake) await sleep(20000);
        await sleep(effDelay()*1.5);
        var doc;
        try { doc = await fetchDoc(url); }
        catch (e) { if (e.rate) { pausedUntil = Date.now()+45000; brake = true; } console.warn('[gems][фон] ' + e.message + ' | ' + url); break; }
        var links = itemLinksFromDoc(doc, url);
        if (!links.length) { console.log('[gems][фон] на странице нет нужных лотов - стоп'); break; }
        if (firstKeyHere && keyOf(links[0]) === firstKeyHere) { console.warn('[gems][фон] страница повторяется - стоп'); break; }
        var added = 0;
        links.forEach(function (u) { var k = keyOf(u); if (!has(k) && !bgSeen[k]) { bgSeen[k] = 1; bgQueue.push(u); added++; } });
        prefetchPage++;
        console.log('[gems][фон] стр. ' + prefetchPage + ' разобрана | новых лотов ' + added + ' | ' + url);
        pump();
        var w = 0;
        while (bgQueue.length > 60 && w < 600 && settings.prefetch) { await sleep(1000); w++; }
        url = nextPageUrl(doc, url);
      }
    } finally { prefetchRunning = false; paintPanel(); maybePrefetch(); }
  }

  function processPage() {
    var descr = document.querySelector('#descr');
    if (descr) { var g = extractGem(descr), pic = document.querySelector('.ip-pic'); if (g && pic) addBadge(pic, g); }
    var front = [], back = [], cached = 0, vh = window.innerHeight || 800, cards = findCards();
    cards.forEach(function (el) {
      if (el.dataset.gemState) return;
      if (!isTarget(el)) { el.dataset.gemState = 'skip'; return; }
      var key = keyOf(el.dataset.gemUrl);
      if (has(key)) { addBadge(el, fromCache(cache[key])); el.dataset.gemState = 'done'; cached++; return; }
      el.dataset.gemState = 'queued';
      if (el.getBoundingClientRect().top < vh) front.push(el); else back.push(el);
    });
    if (front.length || back.length) queue = front.concat(queue, back);
    if (cached || front.length || back.length)
      console.log('[gems] карточек ' + cards.length + ' | из кэша ' + cached + ' | в очередь ' + (front.length+back.length) + ' | ~' + rate() + ' зап/с');
    pump(); maybePrefetch();
  }
  function refreshBadges() {
    document.querySelectorAll('.gem-badge').forEach(function (b) { b.remove(); });
    document.querySelectorAll('[data-gem-state]').forEach(function (el) { delete el.dataset.gemState; });
    queue = []; done = 0; processPage();
  }
  function report() {
    var rows = [];
    findCards().forEach(function (el) {
      var v = cache[keyOf(el.dataset.gemUrl)];
      rows.push({ gem: v ? (v.n || 'без гема') : 'не обработан', url: el.dataset.gemUrl });
    });
    console.table(rows); return rows.length + ' строк';
  }
  function setSpeed(w, d) {
    if (typeof w === 'string') {
      var p = { slow:[1,900], normal:[2,350], fast:[3,550] }[w];
      if (!p) return 'пресеты: slow | normal | fast';
      w = p[0]; d = p[1];
    }
    if (typeof w === 'number') settings.workers = w;
    if (typeof d === 'number') settings.delay = d;
    settings = clamp(settings); persist(); pump(); paintPanel();
    return 'потоков ' + settings.workers + ', пауза ' + settings.delay + ' мс, ~' + rate() + ' зап/с (потолок ' + LIMITS.maxRate + ')';
  }
  function setPrefetch(on, pages) {
    if (typeof on === 'boolean') settings.prefetch = on;
    if (typeof pages === 'number') settings.prefetchPages = pages;
    settings = clamp(settings); persist(); paintPanel();
    if (settings.prefetch) { pump(); maybePrefetch(); } else { bgQueue = []; }
    return 'автопроход: ' + (settings.prefetch ? 'вкл' : 'выкл') + ', страниц вперёд: ' + (settings.prefetchPages || 'все (до ' + LIMITS.pMax + ')');
  }

  var panel = null;
  function paintPanel() {
    if (!panel) return;
    panel.querySelector('#gem-w').value = settings.workers;
    panel.querySelector('#gem-d').value = settings.delay;
    panel.querySelector('#gem-p').checked = settings.prefetch;
    panel.querySelector('#gem-pn').value = settings.prefetchPages;
    panel.querySelector('#gem-wv').textContent = settings.workers;
    panel.querySelector('#gem-dv').textContent = settings.delay;
    panel.querySelector('#gem-pnv').textContent = settings.prefetchPages || 'все';
    panel.querySelector('.rate').textContent = '~' + rate() + ' зап/с' + (brake?' (ТОРМОЗ)':'') + (userPaused?' (ПАУЗА)':'');
    panel.querySelector('.stats').textContent = 'бейджей ' + document.querySelectorAll('.gem-badge').length +
      ' | очередь ' + queue.length + ' | кэш ' + Object.keys(cache).length;
    panel.querySelector('.stats2').textContent = 'фон: стр. ' + prefetchPage + ' | в фоне ' + bgQueue.length +
      ' | скачано ' + bgDone + (prefetchRunning ? ' | идёт' : '');
    panel.querySelector('[data-act=pause]').textContent = userPaused ? 'Продолжить' : 'Пауза';
    panel.querySelector('[data-act=lang]').textContent = settings.ru ? 'RU' : 'EN';
  }
  function buildPanel() {
    if (!settings.panel || panel) return;
    panel = document.createElement('div');
    panel.className = 'gem-panel';
    panel.innerHTML =
      '<div class="gem-panel-body">' +
      '<label>Потоки: <b id="gem-wv"></b> (1-3)</label><input id="gem-w" type="range" min="1" max="3" step="1">' +
      '<label>Пауза: <b id="gem-dv"></b> мс</label><input id="gem-d" type="range" min="250" max="2000" step="50">' +
      '<label class="chk"><input id="gem-p" type="checkbox"> Автопроход страниц</label>' +
      '<label>Вперёд на: <b id="gem-pnv"></b> стр.</label><input id="gem-pn" type="range" min="0" max="10" step="1">' +
      '<div class="rate"></div><div class="stats"></div><div class="stats stats2"></div>' +
      '<div class="row"><button class="act" data-act="pause"></button><button class="act" data-act="lang"></button></div>' +
      '<div class="row"><button class="act" data-act="report">Отчёт</button><button class="act" data-act="clear">Сброс кэша</button></div>' +
      '</div><button class="gem-panel-toggle" title="TB Gem Helper">&#9881;</button>';
    document.body.appendChild(panel);
    panel.querySelector('.gem-panel-toggle').addEventListener('click', function () { panel.classList.toggle('open'); paintPanel(); });
    panel.querySelector('#gem-w').addEventListener('input', function () { setSpeed(+this.value, settings.delay); });
    panel.querySelector('#gem-d').addEventListener('input', function () { setSpeed(settings.workers, +this.value); });
    panel.querySelector('#gem-p').addEventListener('change', function () { setPrefetch(this.checked); });
    panel.querySelector('#gem-pn').addEventListener('input', function () { setPrefetch(settings.prefetch, +this.value); });
    panel.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'pause') { userPaused = !userPaused; if (!userPaused) { pump(); maybePrefetch(); } paintPanel(); }
      if (act === 'lang') { settings.ru = !settings.ru; persist(); refreshBadges(); paintPanel(); }
      if (act === 'report') report();
      if (act === 'clear') { cache = {}; bgSeen = {}; persist(); refreshBadges(); paintPanel(); }
    });
    setInterval(paintPanel, 1000); paintPanel();
  }

  var scanTimer = null;
  var mo = new MutationObserver(function (muts) {
    for (var i=0;i<muts.length;i++) {
      var added = muts[i].addedNodes;
      for (var j=0;j<added.length;j++) {
        var n = added[j];
        if (n.nodeType === 1 && !(n.classList && (n.classList.contains('gem-badge') || n.classList.contains('gem-panel')))) {
          clearTimeout(scanTimer); scanTimer = setTimeout(processPage, 300); return;
        }
      }
    }
  });

  loadAll().then(function () {
    buildPanel(); processPage();
    mo.observe(document.body, { childList:true, subtree:true });
    window.__gems = {
      speed:setSpeed, prefetch:setPrefetch, report:report, refresh:refreshBadges, processPage:processPage,
      findCards:findCards, extractGem:extractGem, limits:LIMITS,
      state:function () { return { settings:settings, queue:queue.length, bg:bgQueue.length, bgDone:bgDone,
        pages:prefetchPage, cache:Object.keys(cache).length, brake:brake, rate:rate() }; },
      unknown:function () { return Object.keys(cache).filter(function (k) { return cache[k].u; }).map(function (k) { return cache[k].n; }); },
      nextUrl:function () { return nextPageUrl(document, location.href); }
    };
    console.log('[gems] v3.6 | кэш ' + Object.keys(cache).length + ' | ' + setSpeed() + ' | ' + setPrefetch());
  });
})();