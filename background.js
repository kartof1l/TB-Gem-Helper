// background.js - Steam proxy v1.2 (headers, referrer, 5с пауза)
let nextAt = 0, blockedUntil = 0;
const GAP = 5000;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'steam') return;
  (async () => {
    if (Date.now() < blockedUntil) { sendResponse({ ok:false, error:'cooldown '+Math.round((blockedUntil-Date.now())/1000)+'s' }); return; }
    const w = Math.max(0, nextAt - Date.now());
    if (w) await new Promise(r => setTimeout(r, w));
    nextAt = Date.now() + GAP + Math.random()*1200;
    try {
      const opt = { credentials:'include', redirect:'follow' };
      if (msg.headers) opt.headers = msg.headers;
      if (msg.referrer) { opt.referrer = msg.referrer; opt.referrerPolicy = 'unsafe-url'; }
      const res = await fetch(msg.url, opt);
      const text = await res.text();
      if (res.status === 429 || res.status === 403) {
        blockedUntil = Date.now() + 300000;
        sendResponse({ ok:false, status:res.status, error:'steam '+res.status, text:text.slice(0,200) });
        return;
      }
      sendResponse({ ok:res.ok, status:res.status, text });
    } catch (e) { sendResponse({ ok:false, error:'fetch: '+(e && e.message || e) }); }
  })();
  return true;
});