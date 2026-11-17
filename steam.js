// steam.js - Floor v1.3 (пол по ордеру маркета + Steam orderbook, тест в панели)
(function () {
  'use strict';
  var K='tbSteamV2', C='tbSteamCfgV2', GKEY='tbGemCacheV3', DKEY='tbDealStoreV3';
  var TTL=6*3600*1000, NULL_TTL=30*60*1000;
  var CFG={on:true,cashRate:0.70,steamFee:13,marketFee:5,hammer:100};
  var ST={},DEAL=null,GC={};
  var q=[],inQ={},working=false,err='',panel=null,boot=0,solo=false,recs=[],byEl=new WeakMap();
  var listDirty=true,queued=false,pop=null,popRec=null,lastMs=0,writes=0,outLines=[];

  function compact(s){return (s||'').toLowerCase().replace(/\u0451/g,'\u0435').replace(/[^a-z0-9\u0430-\u044f]/g,'');}
  function keyOf(u){var m=(u||'').match(/\/item\/(\d+)-(\d+)/);return m?m[1]+'_'+m[2]:u;}
  function money(n){return (n==null||!isFinite(n))?'—':Math.round(n).toLocaleString('ru-RU');}
  function short(n){if(n==null||!isFinite(n))return '—';return n>=1000?(Math.round(n/100)/10)+'к':String(Math.round(n));}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function ric(f){ if(window.requestIdleCallback) requestIdleCallback(f,{timeout:900}); else setTimeout(f,60); }
  function log(s){ outLines.push(s); if(outLines.length>8) outLines.shift(); console.log('[floor] '+s); showOut(); }
  function showOut(){ var b=panel&&panel.querySelector('#sfOut'); if(b) b.textContent=outLines.join('\n'); }
  function ask(url,opt){
    return new Promise(function(res){
      try{
        var m={type:'steam',url:url};
        if(opt){ m.headers=opt.headers; m.referrer=opt.referrer; }
        chrome.runtime.sendMessage(m,function(r){
          var le=chrome.runtime.lastError;
          if(le) return res({ok:false,error:'runtime: '+le.message});
          res(r||{ok:false,error:'пустой ответ воркера'});
        });
      }catch(e){ res({ok:false,error:'send: '+e.message}); }
    });
  }
  function fullName(g){
    var mg=marketGem(g);
    if(mg&&mg.name&&/^Prismatic/i.test(mg.name)) return mg.name;
    return 'Prismatic: '+g;
  }
  function altName(g){ return 'Prismatic: '+String(g).replace(/'/g,'\u2019'); }
  function listUrl(g){return 'https://steamcommunity.com/market/listings/570/'+encodeURIComponent(fullName(g))+'?l=english';}
  function obUrl(g){return 'https://steamcommunity.com/market/orderbook?q=Load&qp='+encodeURIComponent(JSON.stringify([570,fullName(g)]))+'&cc=RU&l=english&currency=5';}
  function obOpt(g){return {headers:{'accept':'application/json','x-valve-request-type':'queryAction'},referrer:listUrl(g)};}
  function ladder(a){
    var out=[]; if(!Array.isArray(a)||a.length%2) return out;
    for(var i=0;i<a.length;i+=2) out.push({p:Number(a[i])/100,q:Number(a[i+1])});
    return out;
  }
  function parseOB(txt){
    var o=JSON.parse(txt);
    var p=(o&&Object.prototype.hasOwnProperty.call(o,'success'))?o:(o&&o.data);
    if(!p||p.success!==true) throw new Error('success=false (имя не найдено?)');
    var d=p.data||p;
    var bo=Number(d.amtMaxBuyOrder)/100, ak=Number(d.amtMinSellOrder)/100;
    var bids=ladder(d.rgCompactBuyOrders), asks=ladder(d.rgCompactSellOrders);
    return {bo:(isFinite(bo)&&bo>0)?bo:null,ask:(isFinite(ak)&&ak>0)?ak:null,
      buys:Number(d.cBuyOrders)||0,sells:Number(d.cSellOrders)||0,
      depth:bids.length?bids[0].q:0,bids:bids.slice(0,5),asks:asks.slice(0,3),cur:d.eCurrency};
  }
  async function load(){
    try{
      var o=await chrome.storage.local.get([K,C,GKEY,DKEY]);
      CFG=Object.assign(CFG,(o&&o[C])||{});
      ST=(o&&o[K])||{}; GC=(o&&o[GKEY])||{}; DEAL=(o&&o[DKEY])||null;
    }catch(e){}
  }
  var saveT=null;
  function save(){clearTimeout(saveT);saveT=setTimeout(function(){try{var o={};o[K]=ST;o[C]=CFG;chrome.storage.local.set(o);}catch(e){}},800);}
  function gemOf(k){
    var a=window.__gems;
    if(a&&a.cacheNow){var c=a.cacheNow();if(c&&c[k]&&c[k].n) return c[k].n;}
    return GC[k]&&GC[k].n?GC[k].n:null;
  }
  function marketGem(g){
    if(!DEAL||!DEAL.heavy||Date.now()-DEAL.heavy.t>24*3600*1000) return null;
    return DEAL.heavy.gems[compact(g)]||null;
  }
  function baseOf(q){ return DEAL&&DEAL.base&&DEAL.base[q]?DEAL.base[q].p:null; }
  function qualityOf(h){
    var p=decodeURIComponent(String(h).split('/item/')[1]||'').replace(/\+/g,' ').replace(/\/$/,'');
    return p.split('-').slice(2).join('-').replace(/Fractal Horns of Inner Abysm/gi,'').trim();
  }
  function priceOf(el){
    var c=el.cloneNode(true), j=c.querySelectorAll('.gem-badge,.deal-tag,.steam-tag');
    for(var i=0;i<j.length;i++) if(j[i].parentNode) j[i].parentNode.removeChild(j[i]);
    var t=String(c.textContent||'').replace(/[\u00A0\u2009\u202f]/g,' ');
    var m=t.match(/(\d[\d\s.,]*\d|\d)\s*(?:\u20bd|\$|\u20ac)/)||t.match(/(\d[\d\s.,]*\d|\d)/);
    if(!m) return null;
    var s=m[1].replace(/\s/g,'');
    if(s.indexOf(',')>-1&&s.indexOf('.')>-1) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(',','.');
    var n=parseFloat(s); return (isFinite(n)&&n>=1&&n<=1e7)?n:null;
  }
  function collect(){
    var nodes=document.querySelectorAll('a.item, .market-items .item'), seen={}, out=[];
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i]; if(!el.href||el.href.indexOf('/item/')<0) continue;
      var href=el.href.split('#')[0]; if(seen[href]) continue; seen[href]=1;
      var r=byEl.get(el);
      if(!r){
        var h=el.querySelector('.image, .img, [style*="background-image"], img');
        if(h&&h.tagName==='IMG'&&h.parentElement) h=h.parentElement;
        if(!h) h=el;
        var cs=getComputedStyle(h);
        r={el:el,href:href,key:keyOf(href),q:qualityOf(href),host:h,price:priceOf(el),
           pos:cs.position==='static',disp:cs.display==='inline',done:false,cls:'',a:'',b:'',title:'',tag:null};
        byEl.set(el,r);
      }
      out.push(r);
    }
    recs=out;
  }
  function need(){
    var seen={};
    for(var i=0;i<recs.length;i++){
      var g=gemOf(recs[i].key); if(!g) continue;

      var k=compact(g); if(seen[k]||inQ[k]) continue; seen[k]=1;
      var e=ST[k], age=e?Date.now()-e.t:1e15;
      if(!e||(e.bo!=null&&age>TTL)||(e.bo==null&&age>NULL_TTL)){inQ[k]=1;q.push({k:k,name:g});}
    }
    pump();
  }
  async function fetchOne(name){
    var tries=[fullName(name)], alt=altName(name);
    if(tries.indexOf(alt)<0) tries.push(alt);
    var lastErr='';
    for(var i=0;i<tries.length;i++){
      var nm=tries[i];
      var u='https://steamcommunity.com/market/orderbook?q=Load&qp='+encodeURIComponent(JSON.stringify([570,nm]))+'&cc=RU&l=english&currency=5';
      var o={headers:{'accept':'application/json','x-valve-request-type':'queryAction'},
             referrer:'https://steamcommunity.com/market/listings/570/'+encodeURIComponent(nm)+'?l=english'};
      var r=await ask(u,o);
      if(!r.ok){ lastErr=r.error||('HTTP '+r.status); if(/429|403|cooldown/.test(lastErr)) throw new Error(lastErr); continue; }
      if(/^\s*</.test(r.text)){ lastErr='HTML вместо JSON'; continue; }
      try{ return parseOB(r.text); }catch(e){ lastErr=e.message; }
    }
    throw new Error(lastErr||'не удалось');
  }
  async function pump(){
    if(working) return; working=true;
    try{
      while(q.length){
        var job=q.shift();
        try{
          var p=await fetchOne(job.name);
          ST[job.k]={bo:p.bo,ask:p.ask,buys:p.buys,sells:p.sells,depth:p.depth,bids:p.bids,cur:p.cur,t:Date.now(),err:p.bo==null?'ордеров нет':null};
          save(); log(job.name+': ордер '+money(p.bo)+' ₽, ордеров '+p.buys+', глубина '+p.depth);
        }catch(e){
          err=e.message; ST[job.k]={bo:null,t:Date.now(),err:e.message}; save();
          log(job.name+' → '+e.message);
          if(/429|403|cooldown/.test(e.message)){ q.unshift(job); delete inQ[job.k]; paint(); await sleep(60000); break; }
        }
        delete inQ[job.k]; paint(); schedule();
      }
    }finally{working=false;paint();schedule();}
  }
  function floorOf(r){
    var g=gemOf(r.key); if(!g) return null;
    var mg=marketGem(g), se=ST[compact(g)];
    var dump=(mg&&mg.bo)?mg.bo*(1-CFG.marketFee/100)-CFG.hammer:null;
    var sFloor=null,net=null,cash=null;
    if(se&&se.bo!=null){ net=se.bo/(1+CFG.steamFee/100); cash=net*CFG.cashRate; sFloor=cash-CFG.hammer; }
    var b=baseOf(r.q), aFloor=b?b*(1-CFG.marketFee/100):null;
    var cands=[['ордер Steam на гем',sFloor],['продажа арканы',aFloor]].filter(function(x){return x[1]!=null&&x[1]>0;});
    if(!cands.length) return {gem:g,mg:mg,se:se,dump:dump};
    cands.sort(function(a,b){return b[1]-a[1];});
    return {gem:g,mg:mg,se:se,dump:dump,sFloor:sFloor,aFloor:aFloor,net:net,cash:cash,
      floor:cands[0][1],path:cands[0][0],ratio:r.price/cands[0][1]};
  }
  function apply(r){
    var f=r.f;
    var show=!!(f&&f.floor!=null&&f.ratio<=9.95);
    if(!show){ if(r.tag){r.tag.remove();r.tag=null;r.cls='';r.a='';r.title='';} return; }
    var cls,txt;
    if(f.ratio<1){ cls='steam-tag good'; txt='\u25BC'+Math.round((1-f.ratio)*100)+'%'; }
    else { cls='steam-tag'+(f.ratio<=1.3?' mid':' over'); txt='\u00D7'+f.ratio.toFixed(1); }
    var ti='Пол выхода: '+money(f.floor)+' ₽ ('+f.path+')\nЦена лота: '+money(r.price)+
      '\nОрдер Steam на гем: '+money(f.se&&f.se.bo)+' → в кэше '+money(f.cash)+
      '\nПродажа арканы как есть: '+money(f.aFloor)+
      '\nСлив в ордер маркета: '+money(f.dump)+' (занижен)'+
      '\nПродаж гема за 7д: '+((f.mg&&f.mg.pop)!=null?f.mg.pop:'?')+'\nКлик — разбор';
    if(!r.tag){
      if(!r.done){ if(r.disp) r.host.style.display='inline-block'; if(r.pos) r.host.style.position='relative'; r.done=true; }
      r.tag=document.createElement('div'); r.host.appendChild(r.tag);
      r.ta=document.createElement('b'); r.tag.appendChild(r.ta); writes++;
    }
    if(r.tb&&r.tb.parentNode){ r.tb.remove(); r.tb=null; }
    if(cls!==r.cls){r.tag.className=cls;r.cls=cls;writes++;}
    if(txt!==r.a){r.ta.textContent=txt;r.a=txt;writes++;}
    if(ti!==r.title){r.tag.title=ti;r.title=ti;writes++;}
  }
  function run(){
    if(!CFG.on){ recs.forEach(function(r){ if(r.tag){r.tag.remove();r.tag=null;r.cls='';} }); paint(); return; }
    var t0=performance.now(); writes=0;
    if(listDirty){collect();listDirty=false;}
    for(var i=0;i<recs.length;i++){ var r=recs[i]; if(r.el.isConnected) r.f=floorOf(r); }
    for(var j=0;j<recs.length;j++){ var x=recs[j]; if(x.el.isConnected) apply(x); }
    lastMs=Math.round(performance.now()-t0); paint(); need(); if(popRec) fill(popRec);
  }
  function schedule(){ if(queued) return; queued=true; ric(function(){queued=false;run();}); }
  function fill(r){
    var f=r.f||{}, rows='';
    function row(k,v,c){ rows+='<div class="dp-row'+(c?' '+c:'')+'"><span>'+k+'</span><b>'+v+'</b></div>'; }
    row('Гем',f.gem||'?'); row('Качество',r.q||'base'); row('Цена лота',money(r.price)+' ₽');
    if(f.floor==null){
      row('Пол выхода','нет данных','dp-warn');
      row('Ордер Steam на гем',money(f.se&&f.se.bo)+' ₽');
      row('База арканы',money(baseOf(r.q))+' ₽');
    } else {
      row('Пол выхода',money(f.floor)+' ₽','dp-main');
      row('Переплата','×'+f.ratio.toFixed(2)+(f.ratio<1?' — ниже пола':''),f.ratio<1?'dp-good':'dp-bad');
      row('Лучший путь',f.path);
      row('Ордер Steam на гем',money(f.se&&f.se.bo)+' ₽');
      row('После комиссии Steam',money(f.net)+' ₽');
      row('В кэше ×'+CFG.cashRate,money(f.cash)+' ₽');
      row('Продажа арканы как есть',money(f.aFloor)+' ₽');
      row('Молоток','−'+money(CFG.hammer)+' ₽');
      if(f.se){ row('Ордеров / глубина',f.se.buys+' / '+f.se.depth); }
      if(f.mg){ row('Продаж гема за 7д',f.mg.pop); row('Средняя цена гема',money(f.mg.avg)+' ₽'); }
    }
    row('Слив в ордер маркета',money(f.dump)+' ₽','dp-warn');
    row('Почему не пол','ордера маркета занижены');
    pop.querySelector('.dp-body').innerHTML=rows;
    pop.querySelector('.dp-open').href=listUrl(f.gem||'');
  }
  function open(r){
    if(!pop){
      pop=document.createElement('div'); pop.className='deal-pop steam-pop';
      pop.innerHTML='<div class="dp-head">FLOOR / ВЫХОД<button type="button" class="dp-x">×</button></div><div class="dp-body"></div>'+
        '<div class="dp-foot"><a class="dp-open" target="_blank" rel="noopener">Гем на Steam</a><span class="dp-note">лучший из трёх путей выхода</span></div>';
      document.body.appendChild(pop);
      pop.querySelector('.dp-x').addEventListener('click',function(){pop.classList.remove('on');popRec=null;});
    }
    popRec=r; fill(r);
    var b=(r.tag||r.el).getBoundingClientRect(); pop.classList.add('on');
    var h=pop.offsetHeight||320;
    pop.style.left=Math.max(8,Math.min(window.innerWidth-278,b.left-60))+'px';
    pop.style.top=((b.bottom+8+h>window.innerHeight)?Math.max(8,b.top-h-8):b.bottom+8)+'px';
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('.steam-tag'):null;
    if(t){ e.preventDefault(); e.stopPropagation();
      var c=t.closest('a.item, .market-items .item'); var r=c?byEl.get(c):null; if(r) open(r); return; }
    if(pop&&pop.classList.contains('on')&&!pop.contains(e.target)&&!(e.target.closest&&e.target.closest('.deal-tag'))){pop.classList.remove('on');popRec=null;}
  },true);
  var lastSt='';
  function paint(){
    if(!panel) return;
    var mk=0,sk=0; var seen={};
    recs.forEach(function(r){ var g=gemOf(r.key); if(!g||seen[g])return; seen[g]=1; if(marketGem(g))mk++; if(ST[compact(g)]&&ST[compact(g)].bo!=null)sk++; });
    var st=working?('качаю '+q.length):(err?('ошибка: '+err):('маркет '+mk+' · Steam '+sk));
    if(st!==lastSt){panel.querySelector('#sfStatus').textContent=st;lastSt=st;}
    var on=panel.querySelector('#sfOn'); if(on.checked!==CFG.on) on.checked=CFG.on;
    panel.querySelector('#sfCv').textContent=CFG.cashRate.toFixed(2);
    panel.querySelector('#sfHv').textContent=CFG.hammer;
    var cw=panel.querySelector('#sfC'); if(document.activeElement!==cw) cw.value=Math.round(CFG.cashRate*100);
    var hw=panel.querySelector('#sfH'); if(document.activeElement!==hw) hw.value=CFG.hammer;
  }
  function table(){
    var seen={},rows=[];
    recs.forEach(function(r){
      var g=gemOf(r.key); if(!g||seen[g]) return; seen[g]=1;
      var mg=marketGem(g), se=ST[compact(g)]||{};
      rows.push({gem:g,market_order:mg&&mg.bo?Math.round(mg.bo):null,sales7d:mg?mg.pop:null,
        steam_order:se.bo?Math.round(se.bo):null,steam_cash:se.bo?Math.round(se.bo/(1+CFG.steamFee/100)*CFG.cashRate-CFG.hammer):null,
        steam_bids:se.buys,depth:se.depth,err:se.err||''});
    });
    rows.sort(function(a,b){return (b.market_order||0)-(a.market_order||0);});
    console.table(rows); log('таблица гемов: '+rows.length+' строк'); return rows.length;
  }
  async function test(name){
    name=name||'Cursed Black';
    log('ТЕСТ '+name+'…');
    var mg=marketGem(name);
    log('ордер маркета: '+(mg?money(mg.bo)+' ₽, продаж/7д '+mg.pop:'нет (нужен Полный прайс)'));
    try{
      var p=await fetchOne(name);
      ST[compact(name)]={bo:p.bo,ask:p.ask,buys:p.buys,sells:p.sells,depth:p.depth,bids:p.bids,cur:p.cur,t:Date.now()};
      save();
      log('Steam OK: ордер '+money(p.bo)+' ₽, ask '+money(p.ask)+' ₽, ордеров '+p.buys+', глубина '+p.depth+', валюта '+p.cur);
    }catch(e){ log('Steam FAIL: '+e.message); }
    schedule();
    return 'смотри панель / консоль';
  }
  function build(){
    var body=document.querySelector('.gem-panel .gp-body');
    if(!body){ if(boot>12&&!solo){solo=true;var w=document.createElement('div');w.className='gem-panel dl-solo open';
      w.innerHTML='<div class="gp-card"><div class="gp-body"></div></div>';document.body.appendChild(w);body=w.querySelector('.gp-body');} else return false; }
    if(panel) return true;
    panel=document.createElement('div'); panel.className='dl-block';
    panel.innerHTML=
      '<div class="dl-head">FLOOR / ВЫХОД <span id="sfStatus">…</span></div>'+
      '<div class="dl-hint">Пол = лучший путь выхода: ордер маркета на гем, ордер Steam (−комиссия ×курс) или продажа арканы. Минус молоток.</div>'+
      '<label class="gp-toggle"><input id="sfOn" type="checkbox"><i></i><span>Показывать пол</span></label>'+
      '<label class="gp-field"><span>Курс Steam→кэш <b id="sfCv">0.70</b></span><input id="sfC" type="range" min="50" max="95" step="5"></label>'+
      '<label class="gp-field"><span>Молоток <b id="sfHv">100</b> <em>₽</em></span><input id="sfH" type="range" min="0" max="500" step="25"></label>'+
      '<div class="gp-actions"><button type="button" id="sfTest">Тест</button><button type="button" id="sfTable">Гемы</button></div>'+
      '<div class="gp-actions"><button type="button" id="sfRefresh">Заново</button><button type="button" id="sfClear">Очистить лог</button></div>'+
      '<pre id="sfOut" class="dl-out"></pre>';
    body.appendChild(panel);
    panel.querySelector('#sfOn').addEventListener('change',function(){CFG.on=this.checked;save();schedule();});
    panel.querySelector('#sfC').addEventListener('input',function(){CFG.cashRate=(+this.value)/100;save();schedule();});
    panel.querySelector('#sfH').addEventListener('input',function(){CFG.hammer=+this.value;save();schedule();});
    panel.querySelector('#sfTest').addEventListener('click',function(){test('Cursed Black');});
    panel.querySelector('#sfTable').addEventListener('click',table);
    panel.querySelector('#sfRefresh').addEventListener('click',function(){ST={};inQ={};q=[];err='';save();schedule();});
    panel.querySelector('#sfClear').addEventListener('click',function(){outLines=[];showOut();});
    paint(); showOut(); log('панель готова');
    return true;
  }
  window.__steam={test:test,table:table,scan:schedule,
    cfg:function(k,v){if(k){CFG[k]=v;save();schedule();}return CFG;},
    state:function(){return {cfg:CFG,steam:Object.keys(ST).length,queue:q.length,err:err,lastMs:lastMs};},
    refresh:function(){ST={};inQ={};q=[];err='';save();schedule();return 'сброшено';},
    data:function(){return ST;}};
  load().then(function(){
    var bt=setInterval(function(){boot++;if(build()||boot>40)clearInterval(bt);},500);
    var grid=document.querySelector('#applications, .market-items');
    if(grid) new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;
        for(var j=0;j<a.length;j++){var n=a[j];
          if(n.nodeType===1&&!(n.classList&&(n.classList.contains('steam-tag')||n.classList.contains('deal-tag')||n.classList.contains('gem-badge')))){listDirty=true;schedule();return;}}}
    }).observe(grid,{childList:true,subtree:true});
    new MutationObserver(function(){
      var c=document.documentElement.getAttribute('data-tb-cmd');
      if(!c) return;
      document.documentElement.removeAttribute('data-tb-cmd');
      var parts=c.split(' '), arg=parts.slice(1).join(' ');
      if(parts[0]==='test') test(arg||'Cursed Black');
      else if(parts[0]==='table') table();
      else log('неизвестная команда: '+c);
      document.documentElement.setAttribute('data-tb-out',outLines.join(' | '));
    }).observe(document.documentElement,{attributes:true,attributeFilter:['data-tb-cmd']});
    setInterval(function(){load().then(schedule);},30000);
    setInterval(schedule,15000);
    setTimeout(schedule,2500);
    log('Floor v1.3 | курс '+CFG.cashRate+' | молоток '+CFG.hammer+'₽');
  });
})();