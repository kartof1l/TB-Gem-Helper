// content.js - TB Gem Helper v4.0 (button-пагинация, URL-проба + iframe-walker, новая панель)
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
  var NEXT_RE = /следующая\s*страница|next\s*page/i;

  var CACHE_KEY = 'tbGemCacheV3', SET_KEY = 'tbGemSettings';
  var TTL_GOOD = 90*24*3600*1000, TTL_EMPTY = 6*3600*1000, TTL_UNK = 24*3600*1000, CACHE_MAX = 8000;
  var LIMITS = { wMin:1, wMax:3, dMin:250, dMax:3000, maxRate:3.5, netMs:350, pMax:20, bgMax:600 };
  var PARAMS = ['p','page','pg','page_num','start'];

  var settings = { workers:2, delay:350, ru:false, panel:true, prefetch:true, prefetchPages:2, pageParam:null, open:false };
  var cache = {}, queue = [], bgQueue = [], active = 0, done = 0, bgDone = 0, okStreak = 0;
  var pausedUntil = 0, brake = false, userPaused = false, saveTimer = null;
  var prefetchRunning = false, prefetchPage = 0, bgSeen = {}, idleSince = 0, lastReason = '';
  var pageInfo = { current:1, total:0 }, focusGem = null, legendSig = '';

  function compact(s) { return (s||'').toLowerCase().replace(/\u0451/g,'\u0435').replace(/[^a-z0-9\u0430-\u044f]/g,''); }
  var INDEX = (function () {
    var seen = {}, list = [];
    function add(alias, canon) {
      if (!GEM_COLORS[canon]) return;
      var k = compact(alias); if (!k || seen[k]) return;
      seen[k] = 1; list.push({ k:k, n:canon });
    }
    Object.keys(GEM_COLORS).forEach(function (n) { add(n, n); });
    Object.keys(RU_ALIASES).forEach(function (ru) { add(ru, RU_ALIASES[ru]); });
    list.sort(function (a,b) { return b.k.length - a.k.length; });
    return list;
  })();
  var FUZZY = INDEX.filter(function (e) { return CYR.test(e.k) && e.k.length >= 7; })
                   .map(function (e) { return { stem:e.k.slice(0,-2), n:e.n }; });
  var RU_BY_EN = {};
  Object.keys(RU_ALIASES).forEach(function (ru) { var c = RU_ALIASES[ru]; if (GEM_COLORS[c] && !RU_BY_EN[c]) RU_BY_EN[c] = ru; });

  function hex2(n) { return ('0'+Math.max(0,Math.min(255,n|0)).toString(16)).slice(-2); }
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
  function abs(href, base) {
    if (!href || /^(#|javascript:)/i.test(String(href).trim())) return null;
    try { return new URL(href, base || location.href).href.split('#')[0]; } catch (e) { return null; }
  }
  function sig(list) { return list.map(keyOf).sort().join('|'); }

  function clamp(s) {
    var w = Math.max(LIMITS.wMin, Math.min(LIMITS.wMax, Math.round(s.workers||2)));
    var d = Math.max(LIMITS.dMin, Math.min(LIMITS.dMax, Math.round(s.delay||350)));
    var need = Math.ceil(w*1000/LIMITS.maxRate - LIMITS.netMs);
    if (d < need) d = need;
    var p = Math.max(0, Math.min(10, Math.round(s.prefetchPages == null ? 2 : s.prefetchPages)));
    return { workers:w, delay:d, ru:!!s.ru, panel:s.panel!==false, prefetch:s.prefetch!==false,
             prefetchPages:p, pageParam:s.pageParam||null, open:!!s.open };
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
      if (now - v.t > (v.n ? (v.u ? TTL_UNK : TTL_GOOD) : TTL_EMPTY)) delete cache[k];
    });
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var keys = Object.keys(cache);
      if (keys.length > CACHE_MAX) {
        keys.sort(function (a,b) { return cache[a].t - cache[b].t; });
        keys.slice(0, keys.length-CACHE_MAX).forEach(function (k) { delete cache[k]; });
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
        for (var x=0;x<3;x++) { var cut = x ? head.slice(0, head.length-x) : head; if (cut.slice(-st.length) === st) return FUZZY[f].n; }
      }
    }
    var m2 = t.match(/(?:Prismatic|Призматический)\s*:\s*([^\n]{2,40})/i);
    if (m2) { var tail = compact(m2[1]); for (var j=0;j<INDEX.length;j++) if (tail.indexOf(INDEX[j].k) === 0) return INDEX[j].n; }
    return null;
  }
  function htmlColorFor(descr, name) {
    var needle = compact(name), els = descr.querySelectorAll('font[color], [style*="color"]');
    for (var i=0;i<els.length;i++) {
      var t = compact(els[i].textContent); if (t.length < 3) continue;
      if (t.indexOf(needle)!==-1 || needle.indexOf(t)!==-1) { var c = readColor(els[i]); if (c) return c; }
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
  function currentLinks() { return findCards().filter(isTarget).map(function (el) { return el.dataset.gemUrl; }); }
  function fromCache(v) { return v && v.n ? { name:v.n, color:v.c, unknown:!!v.u } : null; }
  function applyFocus() {
    findCards().forEach(function (el) {
      var v = cache[keyOf(el.dataset.gemUrl)];
      var on = focusGem && (!v || v.n !== focusGem);
      el.classList.toggle('gem-dim', !!on);
    });
  }
  function logGem(gem, url, bg) {
    var tag = bg ? '[gems][фон] ' : '[gems] ';
    if (!gem) { console.log(tag+'без гема | '+url); return; }
    if (gem.unknown) console.warn(tag+'НЕИЗВЕСТНЫЙ "'+gem.name+'" | '+url);
    console.log(tag+'%c '+gem.name+' %c '+url,
      'background:'+gem.color+';color:'+textColor(gem.color)+';font-weight:700;padding:1px 5px;border-radius:3px','color:#888');
  }

  async function fetchDoc(url) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 15000), res;
    try { res = await fetch(url, { credentials:'same-origin', signal:ctrl.signal }); }
    finally { clearTimeout(timer); }
    if (res.status===429 || res.status===503 || res.status===403) { var e = new Error('rate limited '+res.status); e.rate = true; throw e; }
    if (!res.ok) throw new Error('HTTP '+res.status);
    return new DOMParser().parseFromString(await res.text(), 'text/html');
  }
  function descrOf(doc) { return doc.querySelector('#descr') || doc.querySelector('[class*="descr"]') || doc.body; }
  function itemLinksFromDoc(doc, base) {
    var out = [], seen = {}, nodes = doc.querySelectorAll('a.item, .market-items .item, a[href*="/item/"]');
    for (var i=0;i<nodes.length;i++) {
      var el = nodes[i], inner = el.querySelector('a[href*="/item/"]');
      var raw = (el.tagName==='A' && /\/item\//.test(el.getAttribute('href')||'')) ? el.getAttribute('href') : (inner ? inner.getAttribute('href') : null);
      var href = abs(raw, base);
      if (!href || seen[href]) continue;
      seen[href] = 1;
      var name = (el.textContent||'')+' '+decodeURIComponent(href).replace(/\+/g,' ');
      if (TARGET_RE.test(name)) { out.push(href); if (window.__deals && window.__deals.ingest) window.__deals.ingest(href, el.textContent); }
    }
    return out;
  }

  function readPageInfo(doc) {
    var cur = 0, total = 0, el = doc.querySelector('.page-counter');
    if (el) {
      var inp = el.querySelector('input');
      if (inp && inp.value) cur = parseInt(inp.value, 10) || 0;
      var nums = (el.textContent||'').match(/\d+/g);
      if (nums) {
        if (!cur) cur = parseInt(nums[0], 10) || 0;
        total = parseInt(nums[nums.length-1], 10) || 0;
      }
    }
    if (!cur) { var m = location.search.match(/[?&](?:p|page|pg|page_num)=(\d+)/i); cur = m ? +m[1] : 1; }
    return { current: cur || 1, total: total };
  }
  function nextButton(doc) {
    var b = doc.querySelector('.page-switcher-r');
    if (!b) {
      var all = doc.querySelectorAll('button, a');
      for (var i=0;i<all.length;i++) if (NEXT_RE.test((all[i].textContent||'').trim())) { b = all[i]; break; }
    }
    if (!b || b.disabled || /disabled/.test(String(b.className||''))) return null;
    return b;
  }
  function anchorNext(doc, base) {
    var here = (base||location.href).split('#')[0];
    var a = doc.querySelector('a[rel="next"]');
    if (a) { var u0 = abs(a.getAttribute('href'), base); if (u0 && u0 !== here) return u0; }
    var links = doc.querySelectorAll('a[href]');
    for (var i=0;i<links.length;i++) {
      var el = links[i], t = (el.textContent||'').trim().toLowerCase();
      var u = abs(el.getAttribute('href'), base);
      if (!u || u === here) continue;
      if (NEXT_RE.test(t) || /\bnext\b/.test(String(el.className||'').toLowerCase())) return u;
    }
    return null;
  }
  function hasPagination() { return !!(anchorNext(document, location.href) || nextButton(document) || document.querySelector('.page-counter')); }
  function candidateUrl(base, name, n) {
    try {
      var u = new URL(base);
      var per = findCards().length || 65;
      u.searchParams.set(name, String(name === 'start' ? (n-1)*per : n));
      u.hash = '';
      return u.href;
    } catch (e) { return null; }
  }

  function pump() {
    if (userPaused) return;
    while (active < effWorkers() && (queue.length || (settings.prefetch && !brake && bgQueue.length)) && Date.now() >= pausedUntil) { active++; runWorker(); }
    if ((queue.length || bgQueue.length) && Date.now() < pausedUntil) setTimeout(pump, pausedUntil-Date.now()+200);
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
        if (has(key)) { if (!isBg) { addBadge(task, fromCache(cache[key])); task.dataset.gemState='done'; } continue; }
        await sleep(effDelay()*(isBg?1.5:1) + Math.random()*200);
        var gem = null;
        try { gem = extractGem(descrOf(await fetchDoc(url))); }
        catch (err) {
          if (err.rate) {
            if (isBg) bgQueue.unshift(task); else queue.unshift(task);
            pausedUntil = Date.now()+45000; brake = true; okStreak = 0;
            console.warn('[gems] лимит ('+err.message+') - пауза 45с');
            break;
          }
          console.warn('[gems] ошибка '+err.message+' | '+url);
          if (!isBg) task.dataset.gemState = 'error';
          continue;
        }
        cache[key] = { n:gem?gem.name:null, c:gem?gem.color:null, u:gem&&gem.unknown?1:0, t:Date.now() };
        persist();
        if (isBg) bgDone++; else { done++; addBadge(task, gem); task.dataset.gemState='done'; }
        logGem(gem, url, isBg);
        okStreak++;
        if (brake && okStreak >= 25) { brake = false; console.log('[gems] тормоз снят'); }
      }
    } finally { active--; if (queue.length || bgQueue.length) pump(); paintPanel(); }
  }

  function enqueueBg(links) {
    var added = 0;
    links.forEach(function (u) { var k = keyOf(u); if (!has(k) && !bgSeen[k]) { bgSeen[k]=1; bgQueue.push(u); added++; } });
    pump();
    return added;
  }
  async function waitUser() { var g=0; while (queue.length && g<600 && settings.prefetch) { await sleep(500); g++; } }
  async function drainBg() { var g=0; while (bgQueue.length>60 && g<600 && settings.prefetch && !userPaused) { await sleep(1000); g++; } }
  function limitPages() { return settings.prefetchPages === 0 ? LIMITS.pMax : Math.min(settings.prefetchPages, LIMITS.pMax); }
  function canContinue(made) { return made < limitPages() && settings.prefetch && !userPaused && bgDone < LIMITS.bgMax; }

  async function discoverParam() {
    if (settings.pageParam) return settings.pageParam;
    var here = sig(currentLinks());
    if (!here) return null;
    for (var i=0;i<PARAMS.length;i++) {
      var name = PARAMS[i];
      var u1 = candidateUrl(location.href, name, pageInfo.current);
      var u2 = candidateUrl(location.href, name, pageInfo.current+1);
      if (!u1 || !u2) continue;
      try {
        await sleep(effDelay());
        var k1 = sig(itemLinksFromDoc(await fetchDoc(u1), u1));
        if (!k1 || k1 !== here) continue;
        await sleep(effDelay());
        var k2 = sig(itemLinksFromDoc(await fetchDoc(u2), u2));
        if (k2 && k2 !== here) {
          settings.pageParam = name; persist();
          console.log('[gems][фон] параметр страниц найден: ?'+name+'=N');
          return name;
        }
      } catch (e) { if (e.rate) { pausedUntil = Date.now()+45000; brake = true; return null; } }
    }
    console.log('[gems][фон] URL-параметр не подошёл - включаю скрытый iframe');
    return null;
  }

  async function crawlByParam(name) {
    var made = 0, page = pageInfo.current, here = sig(currentLinks());
    while (canContinue(made)) {
      page++;
      if (pageInfo.total && page > pageInfo.total) { console.log('[gems][фон] последняя страница ('+pageInfo.total+') достигнута'); break; }
      await waitUser();
      if (brake) await sleep(20000);
      await sleep(effDelay()*1.5);
      var url = candidateUrl(location.href, name, page), doc;
      try { doc = await fetchDoc(url); }
      catch (e) { if (e.rate) { pausedUntil=Date.now()+45000; brake=true; } console.warn('[gems][фон] '+e.message); break; }
      var links = itemLinksFromDoc(doc, url);
      if (!links.length) { console.log('[gems][фон] лотов больше нет - финиш'); break; }
      if (sig(links) === here) { console.warn('[gems][фон] страница повторяет текущую - стоп'); break; }
      var added = enqueueBg(links);
      made++; prefetchPage = page;
      console.log('[gems][фон] стр. '+page+(pageInfo.total?'/'+pageInfo.total:'')+' | новых лотов '+added+' | '+url);
      paintPanel();
      await drainBg();
    }
  }

  function frameLoad(fr, ms) {
    return new Promise(function (res) {
      var fin = false;
      function done(v) { if (!fin) { fin = true; res(v); } }
      fr.addEventListener('load', function () { setTimeout(function () { done(true); }, 900); }, { once:true });
      setTimeout(function () { done(false); }, ms||25000);
    });
  }
  function frameKey(fr) {
    try {
      var d = fr.contentDocument; if (!d) return null;
      var a = d.querySelector('.market-items a[href*="/item/"], a.item[href*="/item/"], a[href*="/item/"]');
      return a ? a.getAttribute('href') : null;
    } catch (e) { return null; }
  }
  async function frameChanged(fr, before) {
    var t0 = Date.now();
    while (Date.now()-t0 < 20000) {
      await sleep(300);
      var k = frameKey(fr);
      if (k && k !== before) return true;
    }
    return false;
  }
  async function crawlByIframe() {
    var fr = document.createElement('iframe');
    fr.className = 'gem-frame'; fr.setAttribute('aria-hidden','true'); fr.src = location.href;
    document.body.appendChild(fr);
    console.log('[gems][фон] скрытый iframe запущен');
    try {
      if (!await frameLoad(fr)) { console.warn('[gems][фон] iframe не загрузился'); return; }
      var guard = 0;
      while (guard < 30 && settings.prefetch && !userPaused) {
        var d0 = fr.contentDocument; if (!d0) break;
        if (readPageInfo(d0).current >= pageInfo.current) break;
        var b0 = nextButton(d0); if (!b0) break;
        var k0 = frameKey(fr); b0.click();
        if (!await frameChanged(fr, k0)) break;
        guard++;
      }
      var made = 0;
      while (canContinue(made)) {
        await waitUser();
        if (brake) await sleep(20000);
        await sleep(effDelay()*1.5);
        var d = fr.contentDocument; if (!d) break;
        var btn = nextButton(d);
        if (!btn) { console.log('[gems][фон] кнопки «дальше» нет - финиш'); break; }
        var before = frameKey(fr);
        btn.click();
        if (!await frameChanged(fr, before)) { console.warn('[gems][фон] страница в iframe не сменилась'); break; }
        var nd = fr.contentDocument, nurl = fr.contentWindow.location.href;
        var links = itemLinksFromDoc(nd, nurl);
        if (!links.length) { console.log('[gems][фон] лотов больше нет - финиш'); break; }
        var added = enqueueBg(links);
        made++; prefetchPage = readPageInfo(nd).current;
        console.log('[gems][фон] стр. '+prefetchPage+(pageInfo.total?'/'+pageInfo.total:'')+' | новых лотов '+added+' | '+nurl);
        paintPanel();
        await drainBg();
      }
    } catch (e) { console.warn('[gems][фон] iframe: '+e.message); }
    finally { fr.remove(); console.log('[gems][фон] iframe закрыт'); }
  }

  async function crawlAnchors(url) {
    var made = 0, visited = {}; visited[location.href.split('#')[0]] = 1;
    var here = sig(currentLinks());
    while (url && canContinue(made)) {
      if (visited[url]) break;
      visited[url] = 1;
      await waitUser();
      await sleep(effDelay()*1.5);
      var doc;
      try { doc = await fetchDoc(url); } catch (e) { if (e.rate) { pausedUntil=Date.now()+45000; brake=true; } break; }
      var links = itemLinksFromDoc(doc, url);
      if (!links.length || sig(links) === here) break;
      var added = enqueueBg(links);
      made++; prefetchPage++;
      console.log('[gems][фон] стр. '+prefetchPage+' | новых лотов '+added+' | '+url);
      paintPanel();
      await drainBg();
      url = anchorNext(doc, url);
    }
  }

  function blockReason() {
    if (prefetchRunning) return 'уже идёт';
    if (!settings.prefetch) return 'автопроход выключен';
    if (userPaused) return 'пауза';
    if (queue.length) return 'занят страницей ('+queue.length+')';
    if (active > 0) return 'воркеры заняты ('+active+')';
    if (bgDone >= LIMITS.bgMax) return 'лимит запросов за сессию';
    if (!hasPagination()) return 'на странице нет пагинации';
    if (!currentLinks().length) return 'на странице нет аркан ТБ';
    return null;
  }
  async function startPrefetch() {
    var why = blockReason();
    if (why) { if (why !== lastReason) { console.log('[gems][фон] не стартую: '+why); lastReason = why; } return; }
    lastReason = ''; prefetchRunning = true; paintPanel();
    console.log('[gems][фон] СТАРТ (страница '+pageInfo.current+(pageInfo.total?' из '+pageInfo.total:'')+')');
    try {
      var a = anchorNext(document, location.href);
      if (a) await crawlAnchors(a);
      else {
        var name = await discoverParam();
        if (name) await crawlByParam(name);
        else await crawlByIframe();
      }
    } catch (e) { console.warn('[gems][фон] '+e.message); }
    finally { prefetchRunning = false; idleSince = 0; paintPanel(); }
  }
  function bgNow() {
    settings.prefetch = true; persist();
    var why = blockReason();
    if (why && why !== 'автопроход выключен') return 'не могу: '+why;
    startPrefetch();
    return 'запускаю фон';
  }

  function processPage() {
    pageInfo = readPageInfo(document);
    var descr = document.querySelector('#descr');
    if (descr) { var g = extractGem(descr), pic = document.querySelector('.ip-pic'); if (g && pic) addBadge(pic, g); }
    var front = [], back = [], cached = 0, vh = window.innerHeight || 800, cards = findCards();
    cards.forEach(function (el) {
      if (el.dataset.gemState) return;
      if (!isTarget(el)) { el.dataset.gemState='skip'; return; }
      var key = keyOf(el.dataset.gemUrl);
      if (has(key)) { addBadge(el, fromCache(cache[key])); el.dataset.gemState='done'; cached++; return; }
      el.dataset.gemState = 'queued';
      if (el.getBoundingClientRect().top < vh) front.push(el); else back.push(el);
    });
    if (front.length || back.length) { queue = front.concat(queue, back); idleSince = 0; }
    if (cached || front.length || back.length)
      console.log('[gems] карточек '+cards.length+' | из кэша '+cached+' | в очередь '+(front.length+back.length)+' | ~'+rate()+' зап/с');
    pump(); applyFocus();
  }
  function refreshBadges() {
    document.querySelectorAll('.gem-badge').forEach(function (b) { b.remove(); });
    document.querySelectorAll('[data-gem-state]').forEach(function (el) { delete el.dataset.gemState; });
    queue = []; done = 0; legendSig = ''; processPage();
  }
  function report() {
    var rows = [];
    findCards().forEach(function (el) {
      var v = cache[keyOf(el.dataset.gemUrl)];
      rows.push({ gem: v ? (v.n || 'без гема') : 'не обработан', url: el.dataset.gemUrl });
    });
    console.table(rows); return rows.length+' строк';
  }
  function exportCsv() {
    var rows = [['gem','gem_ru','price','url']];
    findCards().forEach(function (el) {
      var v = cache[keyOf(el.dataset.gemUrl)];
      var m = (el.textContent||'').match(/\d[\d\s.,]*/);
      rows.push([v && v.n ? v.n : '', v && v.n && RU_BY_EN[v.n] ? RU_BY_EN[v.n] : '', m ? m[0].trim() : '', el.dataset.gemUrl]);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"'+String(c).replace(/"/g,'""')+'"'; }).join(';'); }).join('\r\n');
    var blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tb-gems-page-'+pageInfo.current+'.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    return (rows.length-1)+' строк выгружено';
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
    return 'потоков '+settings.workers+', пауза '+settings.delay+' мс, ~'+rate()+' зап/с';
  }
  function setPrefetch(on, pages) {
    if (typeof on === 'boolean') settings.prefetch = on;
    if (typeof pages === 'number') settings.prefetchPages = pages;
    settings = clamp(settings); persist(); idleSince = 0; paintPanel();
    if (settings.prefetch) pump(); else bgQueue = [];
    return 'автопроход: '+(settings.prefetch?'вкл':'выкл')+', вперёд: '+(settings.prefetchPages||'все');
  }
  function diag() {
    var d = { version:'v4.0', url:location.href, page:pageInfo, settings:settings,
      cards:findCards().length, targets:currentLinks().length, badges:document.querySelectorAll('.gem-badge').length,
      queue:queue.length, active:active, bgQueue:bgQueue.length, bgDone:bgDone, bgPage:prefetchPage,
      running:prefetchRunning, brake:brake, paused:userPaused, cache:Object.keys(cache).length,
      nextButton:!!nextButton(document), anchorNext:anchorNext(document, location.href),
      block:blockReason(), focus:focusGem };
    console.log('[gems] diag', d);
    return d;
  }

  var panel = null;
  function q(s) { return panel ? panel.querySelector(s) : null; }
  function buildLegend() {
    var box = q('#gpLegend'); if (!box) return;
    var counts = {};
    findCards().forEach(function (el) {
      var v = cache[keyOf(el.dataset.gemUrl)];
      if (v && v.n) counts[v.n] = (counts[v.n]||0)+1;
    });
    var names = Object.keys(counts).sort(function (a,b) { return counts[b]-counts[a]; }).slice(0,12);
    var s = names.map(function (n) { return n+counts[n]; }).join(',')+'|'+focusGem;
    if (s === legendSig) return;
    legendSig = s;
    box.innerHTML = '';
    if (!names.length) { box.innerHTML = '<span class="gp-empty">гемы ещё не найдены</span>'; return; }
    names.forEach(function (n) {
      var c = document.createElement('button');
      c.className = 'gp-chip' + (focusGem === n ? ' on' : '');
      c.type = 'button'; c.title = n + (RU_BY_EN[n] ? ' / '+RU_BY_EN[n] : '');
      var i = document.createElement('i'); i.style.background = GEM_COLORS[n] || '#3A3A3A';
      var t = document.createElement('span'); t.textContent = (settings.ru && RU_BY_EN[n] ? RU_BY_EN[n] : n).split(' ')[0];
      var b = document.createElement('b'); b.textContent = counts[n];
      c.appendChild(i); c.appendChild(t); c.appendChild(b);
      c.addEventListener('click', function () { focusGem = focusGem === n ? null : n; legendSig=''; applyFocus(); buildLegend(); paintPanel(); });
      box.appendChild(c);
    });
  }
  function paintPanel() {
    if (!panel) return;
    var badges = document.querySelectorAll('.gem-badge').length;
    var total = pageInfo.total || 0;
    var st = prefetchRunning ? 'фон идёт' : (blockReason() || 'готов');
    q('#gpRate').textContent = rate();
    q('#gpState').textContent = st + (brake ? ' · тормоз' : '') + (userPaused ? ' · пауза' : '');
    q('#gpState').className = 'gp-state' + (prefetchRunning ? ' live' : '');
    q('#gpWv').textContent = settings.workers;
    q('#gpDv').textContent = settings.delay;
    q('#gpPv').textContent = settings.prefetchPages || 'все';
    if (document.activeElement !== q('#gpW')) q('#gpW').value = settings.workers;
    if (document.activeElement !== q('#gpD')) q('#gpD').value = settings.delay;
    if (document.activeElement !== q('#gpP')) q('#gpP').value = settings.prefetchPages;
    q('#gpAuto').checked = settings.prefetch;
    var pct = total ? Math.min(100, Math.round((prefetchPage/total)*100)) : (badges ? Math.min(100, badges/Math.max(1,findCards().length)*100) : 0);
    q('#gpBar').style.width = pct+'%';
    q('#gpStats').innerHTML =
      '<span><b>'+badges+'</b> бейджей</span><span><b>'+queue.length+'</b> очередь</span>'+
      '<span><b>'+Object.keys(cache).length+'</b> кэш</span><span><b>'+bgDone+'</b> фон</span>'+
      '<span><b>'+pageInfo.current+(total?'/'+total:'')+'</b> страница</span><span><b>'+bgQueue.length+'</b> в фоне</span>';
    q('[data-act=pause]').textContent = userPaused ? 'Продолжить' : 'Пауза';
    q('[data-act=lang]').textContent = settings.ru ? 'RU' : 'EN';
    q('#gpPillN').textContent = badges;
    q('#gpPillS').textContent = prefetchRunning ? ('фон '+(prefetchPage||pageInfo.current)+(total?'/'+total:'')) : (focusGem ? focusGem.split(' ')[0] : 'стр. '+pageInfo.current);
    buildLegend();
  }
  function buildPanel() {
    if (!settings.panel || panel) return;
    panel = document.createElement('div');
    panel.className = 'gem-panel' + (settings.open ? ' open' : '');
    panel.innerHTML =
      '<div class="gp-card">'+
        '<div class="gp-head">'+
          '<svg class="gp-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22 8v8L12 22.4 2 16V8z" fill="none" stroke="url(#gpg)" stroke-width="1.4"/><path d="M12 5.4 18.4 9v6L12 18.6 5.6 15V9z" fill="url(#gpg)" opacity=".55"/><defs><linearGradient id="gpg" x1="0" y1="0" x2="24" y2="24"><stop offset="0" stop-color="#32ABDC"/><stop offset=".5" stop-color="#A1FF59"/><stop offset="1" stop-color="#D11FA1"/></linearGradient></defs></svg>'+
          '<div class="gp-title"><b>TB GEM HELPER</b><span>призматические самоцветы</span></div>'+
          '<button class="gp-x" type="button" title="Свернуть">&minus;</button>'+
        '</div>'+
        '<div class="gp-body">'+
          '<div class="gp-meter"><div class="gp-rate"><b id="gpRate">0</b><span>зап/с</span></div><div class="gp-state" id="gpState">готов</div></div>'+
          '<div class="gp-progress"><i id="gpBar"></i></div>'+
          '<label class="gp-field"><span>Потоки <b id="gpWv">2</b> <em>/ 3</em></span><input id="gpW" type="range" min="1" max="3" step="1"></label>'+
          '<label class="gp-field"><span>Пауза <b id="gpDv">350</b> <em>мс</em></span><input id="gpD" type="range" min="250" max="2000" step="50"></label>'+
          '<label class="gp-field"><span>Вперёд <b id="gpPv">2</b> <em>стр. (0 = все)</em></span><input id="gpP" type="range" min="0" max="10" step="1"></label>'+
          '<label class="gp-toggle"><input id="gpAuto" type="checkbox"><i></i><span>Автопроход страниц</span></label>'+
          '<div class="gp-stats" id="gpStats"></div>'+
          '<div class="gp-legendhead">Гемы на странице <em>клик — подсветить</em></div>'+
          '<div class="gp-legend" id="gpLegend"></div>'+
          '<div class="gp-actions">'+
            '<button type="button" data-act="pause">Пауза</button>'+
            '<button type="button" data-act="lang">EN</button>'+
            '<button type="button" data-act="bgnow" class="accent">Фон сейчас</button>'+
            '<button type="button" data-act="csv">CSV</button>'+
            '<button type="button" data-act="diag">Диагноз</button>'+
            '<button type="button" data-act="clear" class="danger">Сброс кэша</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<button class="gp-pill" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 8v8l-9 6-9-6V8z" fill="none" stroke="#32ABDC" stroke-width="1.6"/><path d="M12 6.5 17 9.6v4.8L12 17.5 7 14.4V9.6z" fill="#A1FF59" opacity=".7"/></svg><b id="gpPillN">0</b><span id="gpPillS">…</span></button>';
    document.body.appendChild(panel);
    function toggleOpen(v) {
      settings.open = v; panel.classList.toggle('open', v); persist(); paintPanel();
    }
    q('.gp-pill').addEventListener('click', function () { toggleOpen(true); });
    q('.gp-x').addEventListener('click', function () { toggleOpen(false); });
    q('#gpW').addEventListener('input', function () { setSpeed(+this.value, settings.delay); });
    q('#gpD').addEventListener('input', function () { setSpeed(settings.workers, +this.value); });
    q('#gpP').addEventListener('input', function () { setPrefetch(settings.prefetch, +this.value); });
    q('#gpAuto').addEventListener('change', function () { setPrefetch(this.checked); });
    panel.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'pause') { userPaused = !userPaused; idleSince = 0; if (!userPaused) pump(); paintPanel(); }
      if (act === 'lang') { settings.ru = !settings.ru; persist(); legendSig=''; refreshBadges(); }
      if (act === 'bgnow') console.log('[gems] '+bgNow());
      if (act === 'csv') console.log('[gems] '+exportCsv());
      if (act === 'diag') diag();
      if (act === 'clear') { cache = {}; bgSeen = {}; focusGem = null; legendSig=''; persist(); refreshBadges(); }
    });
    setInterval(paintPanel, 1000);
    paintPanel();
  }

  var scanTimer = null;
  var mo = new MutationObserver(function (muts) {
    for (var i=0;i<muts.length;i++) {
      var added = muts[i].addedNodes;
      for (var j=0;j<added.length;j++) {
        var n = added[j];
        if (n.nodeType === 1 && !(n.classList && (n.classList.contains('gem-badge') || n.classList.contains('gem-panel') || n.classList.contains('gem-frame')))) {
          clearTimeout(scanTimer); scanTimer = setTimeout(processPage, 300); return;
        }
      }
    }
  });

  loadAll().then(function () {
    pageInfo = readPageInfo(document);
    buildPanel(); processPage();
    mo.observe(document.body, { childList:true, subtree:true });
    setInterval(function () {
      if (!settings.prefetch || prefetchRunning || userPaused || queue.length || active > 0) { idleSince = 0; return; }
      if (!idleSince) { idleSince = Date.now(); return; }
      if (Date.now()-idleSince >= 3000) { idleSince = 0; startPrefetch(); }
    }, 1000);
    window.__gems = {
      cacheNow:function () { return cache; }, keyOf:keyOf, compact:compact, colors:GEM_COLORS, ruByEn:RU_BY_EN,
      cacheNow:function () { return cache; }, keyOf:keyOf, compact:compact, colors:GEM_COLORS, ruByEn:RU_BY_EN,
      speed:setSpeed, prefetch:setPrefetch, bgNow:bgNow, diag:diag, report:report, csv:exportCsv,
      refresh:refreshBadges, processPage:processPage, findCards:findCards, extractGem:extractGem, limits:LIMITS,
      focus:function (n) { focusGem = n || null; legendSig=''; applyFocus(); buildLegend(); return focusGem; },
      nextUrl:function () { return anchorNext(document, location.href); },
      state:function () { return { settings:settings, page:pageInfo, queue:queue.length, bg:bgQueue.length,
        bgDone:bgDone, bgPage:prefetchPage, running:prefetchRunning, block:blockReason(),
        cache:Object.keys(cache).length, rate:rate() }; },
      unknown:function () { return Object.keys(cache).filter(function (k) { return cache[k].u; }).map(function (k) { return cache[k].n; }); }
    };
    console.log('[gems] v4.0 | кэш '+Object.keys(cache).length+' | стр. '+pageInfo.current+(pageInfo.total?' из '+pageInfo.total:'')+' | '+setSpeed());
  });
})();