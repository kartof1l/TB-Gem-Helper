// valuation.js - Deal Radar v1.5 (медиана по бакетам качество+гем, снапшот рынка)
(function () {
  'use strict';
  var SKEY='tbDealStoreV3', CKEY='tbDealCfgV3', GKEY='tbGemCacheV3', LKEY='tbLotsV1';
  var GEM_TTL=12*3600*1000, NULL_TTL=2*3600*1000, HEAVY_TTL=24*3600*1000, LOTS_TTL=24*3600*1000, LOTS_MAX=6000;
  var DEFAULT="Reflection's Shade";
  var ARCANA_NAME=/Fractal Horns of Inner Abysm/gi;
  var IMG_SEL='.image, .img, .item-image, [style*="background-image"], img';
  var CFG={on:true,threshold:15,mode:'dim',socketK:0.9,fee:5,minBucket:4};
  var S={cur:null,gems:{},base:{},heavy:null}, LOTS={};
  var GC={},q=[],inQ={},working=false,paused=0,err='',panel=null,boot=0,solo=false,sig='',prog='',heavyOn=false;
  var recs=[],recByEl=new WeakMap(),listDirty=true,dirty=false,queued=false,lastMs=0,writes=0,pop=null,popRec=null;
  var buckets={},bucketT=0;

  function compact(s){return (s||'').toLowerCase().replace(/\u0451/g,'\u0435').replace(/[^a-z0-9\u0430-\u044f]/g,'');}
  function keyOf(u){var m=(u||'').match(/\/item\/(\d+)-(\d+)/);return m?m[1]+'_'+m[2]:u;}
  function num(v){var n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null;}
  function money(n){return n==null?'—':(Math.round(n*100)/100).toLocaleString('ru-RU');}
  function short(n){if(n==null)return '—';return n>=1000?(Math.round(n/100)/10)+'к':String(Math.round(n));}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function cur(){var m=String(document.body.className||'').match(/cur-(RUB|USD|EUR)/i);return m?m[1].toUpperCase():'RUB';}
  function nameOf(h){var p=decodeURIComponent(String(h).split('/item/')[1]||'').replace(/\+/g,' ').replace(/\/$/,'');return p.split('-').slice(2).join('-');}
  function prefixOf(h){return nameOf(h).replace(ARCANA_NAME,'').trim();}
  function ric(fn){ if(window.requestIdleCallback) requestIdleCallback(fn,{timeout:900}); else setTimeout(fn,60); }
  function parsePrice(text){
    var t=String(text||'').replace(/[\u00A0\u2009\u202f]/g,' ');
    var m=t.match(/(\d[\d\s.,]*\d|\d)\s*(?:\u20bd|\$|\u20ac|USD|RUB|EUR)/i)||t.match(/(\d[\d\s.,]*\d|\d)/);
    if(!m) return null;
    var s=m[1].replace(/\s/g,'');
    if(s.indexOf(',')>-1&&s.indexOf('.')>-1) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(',','.');
    var x=parseFloat(s);
    return (isFinite(x)&&x>=1&&x<=1e7)?x:null;
  }
  function readPrice(el){
    var c=el.cloneNode(true), junk=c.querySelectorAll('.gem-badge,.deal-tag');
    for(var i=0;i<junk.length;i++) if(junk[i].parentNode) junk[i].parentNode.removeChild(junk[i]);
    return parsePrice(c.textContent);
  }
  function ingest(href,text){
    var p=parsePrice(text); if(!p) return;
    var k=keyOf(href), e=LOTS[k];
    if(!e||e.p!==p||Date.now()-e.t>LOTS_TTL){LOTS[k]={p:p,q:prefixOf(href),t:Date.now()};dirty=true;bucketT=0;}
  }
  function gemOf(k){
    var api=window.__gems;
    if(api&&typeof api.cacheNow==='function'){var c=api.cacheNow();if(c&&c[k]&&c[k].n) return c[k].n;}
    return GC[k]&&GC[k].n?GC[k].n:null;
  }
  function buildBuckets(){
    if(Date.now()-bucketT<15000) return;
    bucketT=Date.now();
    var m={},now=Date.now();
    Object.keys(LOTS).forEach(function(k){
      var e=LOTS[k]; if(now-e.t>LOTS_TTL) return;
      var g=gemOf(k); if(!g) return;
      var b=(e.q||'')+'|'+g;
      (m[b]=m[b]||[]).push(e.p);
    });
    var out={};
    Object.keys(m).forEach(function(b){
      var a=m[b].sort(function(x,y){return x-y;});
      out[b]={n:a.length,min:a[0],med:a[Math.floor(a.length/2)],max:a[a.length-1]};
    });
    buckets=out;
  }
  function collect(){
    var nodes=document.querySelectorAll('a.item, .market-items .item, a[href*="/item/"]'), seen={}, out=[];
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      var a=(el.tagName==='A'&&el.href&&el.href.indexOf('/item/')!==-1)?el:el.querySelector('a[href*="/item/"]');
      if(!a) continue;
      if(!(/(^|\s)item(\s|$)/.test(el.className||'')||el.querySelector(IMG_SEL))) continue;
      var href=a.href.split('#')[0]; if(seen[href]) continue; seen[href]=1;
      var r=recByEl.get(el);
      if(!r){
        var h=el.querySelector(IMG_SEL);
        if(h&&h.tagName==='IMG'&&h.parentElement) h=h.parentElement;
        if(!h) h=el;
        var cs=getComputedStyle(h);
        r={el:el,href:href,key:keyOf(href),pre:prefixOf(href),host:h,price:readPrice(el),
           needPos:cs.position==='static',needDisp:cs.display==='inline',pos:false,
           cls:'',l1:'',l2:'',title:'',dim:null,hide:null,v:null,tag:null};
        recByEl.set(el,r);
      }
      el.dataset.gemUrl=href;
      if(r.price) ingest(href, String(r.price)+' '+cur());
      out.push(r);
    }
    recs=out;
  }
  function colorOf(r){
    var b=r.el.querySelector('.gem-badge');
    if(b){var c=getComputedStyle(b).backgroundColor;if(c&&c!=='rgba(0, 0, 0, 0)') return c;}
    return (GC[r.key]&&GC[r.key].c)||'#3A3A3A';
  }
  async function pullGems(){
    if(window.__gems&&window.__gems.cacheNow){bucketT=0;return;}
    try{var o=await chrome.storage.local.get(GKEY);GC=(o&&o[GKEY])||{};bucketT=0;schedule();}catch(e){}
  }
  var saveT=null;
  function save(){
    dirty=false;clearTimeout(saveT);
    saveT=setTimeout(function(){
      var keys=Object.keys(LOTS);
      if(keys.length>LOTS_MAX){keys.sort(function(a,b){return LOTS[a].t-LOTS[b].t;});keys.slice(0,keys.length-LOTS_MAX).forEach(function(k){delete LOTS[k];});}
      try{var o={};o[SKEY]=S;o[CKEY]=CFG;o[LKEY]=LOTS;chrome.storage.local.set(o);}catch(e){}
    },900);
  }
  async function load(){
    try{
      var o=await chrome.storage.local.get([SKEY,CKEY,LKEY]);
      CFG=Object.assign(CFG,(o&&o[CKEY])||{});
      var s=o&&o[SKEY]; if(s&&s.cur===cur()){S=s;S.gems=S.gems||{};S.base=S.base||{};}
      LOTS=(o&&o[LKEY])||{};
    }catch(e){}
  }
  async function fetchDoc(url){
    var c=new AbortController(),t=setTimeout(function(){c.abort();},20000),r;
    try{r=await fetch(url,{credentials:'same-origin',signal:c.signal});}finally{clearTimeout(t);}
    if(r.status===429||r.status===503||r.status===403){var e=new Error('rate '+r.status);e.rate=true;throw e;}
    if(!r.ok) throw new Error('HTTP '+r.status);
    return new DOMParser().parseFromString(await r.text(),'text/html');
  }
  function noteBase(pre,price){
    if(pre==null||!price) return;
    var b=S.base[pre];
    if(!b||Date.now()-b.t>GEM_TTL){S.base[pre]={p:price,t:Date.now(),n:1};dirty=true;}
    else if(price<b.p){b.p=price;b.t=Date.now();dirty=true;}
    b.n=(S.base[pre].n||1)+1;
  }
  function needGems(){
    var seen={};
    for(var i=0;i<recs.length;i++){
      var g=gemOf(recs[i].key); if(!g||g===DEFAULT) continue;
      var k=compact(g); if(seen[k]||inQ[k]) continue; seen[k]=1;
      var e=S.gems[k], age=e?Date.now()-e.t:1e15;
      if(!e||(e.p!=null&&age>GEM_TTL)||(e.p==null&&age>NULL_TTL)){inQ[k]=1;q.push({k:k,name:g});}
    }
    pump();
  }
  async function pump(){
    if(working) return; working=true;
    try{
      while(q.length){
        if(Date.now()<paused){await sleep(5000);continue;}
        var job=q.shift(), url='https://market.dota2.net/en/?search='+encodeURIComponent('Prismatic: '+job.name);
        await sleep(900+Math.random()*300);
        try{
          var doc=await fetchDoc(url), best=null, target=compact('Prismatic:'+job.name);
          var nodes=doc.querySelectorAll('a.item, .market-items .item, a[href*="/item/"]');
          for(var i=0;i<nodes.length;i++){
            var el=nodes[i];
            var a=(el.tagName==='A'&&/\/item\//.test(el.getAttribute('href')||''))?el:el.querySelector('a[href*="/item/"]');
            if(!a) continue;
            var href=decodeURIComponent(a.getAttribute('href')||'').replace(/\+/g,' ');
            if(compact(href).slice(-target.length)!==target) continue;
            var p=parsePrice(el.textContent); if(p&&(best==null||p<best)) best=p;
          }
          S.gems[job.k]={p:best,t:Date.now()}; save();
        }catch(e){
          if(e.rate){paused=Date.now()+60000;q.unshift(job);}
          else {S.gems[job.k]={p:null,t:Date.now()};save();}
        }
        delete inQ[job.k]; schedule();
      }
    }finally{working=false;schedule();}
  }
  function heavyData(){return S.heavy&&Date.now()-S.heavy.t<HEAVY_TTL?S.heavy:null;}
  function valuate(key,price,pre){
    if(!price) return {wait:'цена лота не распознана'};
    var gem=gemOf(key);
    if(!gem) return {wait:'гем ещё не определён'};
    var H=heavyData(), e=H?H.items[key]:null;
    var bb=S.base[pre], base=bb?bb.p:null, baseN=bb?bb.n:0;
    var gp=null,gsrc=null;
    if(gem!==DEFAULT){
      var hg=H?H.gems[compact(gem)]:null;
      if(hg&&hg.avg){gp=hg.avg;gsrc='средняя продаж гема';}
      else if(hg&&hg.p){gp=hg.p;gsrc='прайс гема';}
      else {var lg=S.gems[compact(gem)]; if(lg&&lg.p!=null&&Date.now()-lg.t<GEM_TTL){gp=lg.p;gsrc='текущий рынок';}}
    }
    var model=null;
    if(gem===DEFAULT){ if(base!=null) model=base; }
    else if(base!=null&&gp!=null) model=base+gp*CFG.socketK;
    var b=buckets[(pre||'')+'|'+gem];
    var useBucket=!!(b&&b.n>=CFG.minBucket);
    var hist=e&&e.avg?e.avg:null, pop=e?e.pop:0, useHist=!!(hist&&pop>=5);
    var fair=useHist?hist:(useBucket?b.med:model);
    var src=useHist?'средняя продаж лота':(useBucket?('медиана '+b.n+' таких же лотов'):'модель база+гем');
    if(!fair||fair<=0) return {wait:useBucket?'':'нет данных для оценки',gem:gem,base:base,gemPrice:gp,pre:pre,bucket:b};
    var bo=e&&e.bo?e.bo:null;
    var arb=(bo&&price*(1+CFG.fee/100)<bo)?(bo*(1-CFG.fee/100)-price):0;
    var conf=useHist?3:(useBucket?(b.n>=8?3:2):(model?1:0));
    return {fair:fair,margin:(fair-price)/fair*100,hist:hist,pop:pop,model:model,gemPrice:gp,gsrc:gsrc,bo:bo,arb:arb,
            gem:gem,base:base,baseN:baseN,pre:pre,bucket:b,conf:conf,src:src};
  }
  function dots(n){return '\u25CF'.repeat(n)+'\u25CB'.repeat(3-n);}
  function tagText(v){
    if(v.wait) return ['?',''];
    if(v.arb>0) return ['ARB','+'+short(v.arb)];
    var l1=v.margin>=0?('\u25BC '+Math.min(99,Math.round(v.margin))+'%'):(Math.abs(v.margin)>=1000?('\u25B2 x'+Math.round(1+Math.abs(v.margin)/100)):('\u25B2 '+Math.round(-v.margin)+'%'));
    return [l1, short(v.fair)];
  }
  function titleOf(v,price){
    if(v.wait) return 'Оценка недоступна: '+v.wait+'\nГем: '+(v.gem||'?');
    var s='Лот: '+money(price)+'\nОценка: '+money(v.fair)+'\nИсточник: '+v.src;
    if(v.bucket) s+='\nТаких же лотов: '+v.bucket.n+' (мин '+money(v.bucket.min)+', макс '+money(v.bucket.max)+')';
    s+='\nДостоверность: '+dots(v.conf)+'\nКлик — разбор';
    return s;
  }
  function applyTag(r){
    var v=r.v;
    if(!v){ if(r.tag){r.tag.remove();r.tag=null;r.cls='';} return; }
    var cls='deal-tag'+(v.wait?' wait':(v.arb>0?' arb':(v.margin>=CFG.threshold?' good':(v.margin>=0?' meh':' bad'))))+' c'+(v.conf||0);
    var tx=tagText(v), ti=titleOf(v,r.price);
    if(!r.tag){
      if(!r.pos){ if(r.needDisp) r.host.style.display='inline-block'; if(r.needPos) r.host.style.position='relative'; r.pos=true; }
      r.tag=document.createElement('div'); r.host.appendChild(r.tag);
      r.b=document.createElement('b'); r.u=document.createElement('u');
      r.tag.appendChild(r.b); r.tag.appendChild(r.u); writes++;
    }
    if(cls!==r.cls){r.tag.className=cls;r.cls=cls;writes++;}
    if(tx[0]!==r.l1){r.b.textContent=tx[0];r.l1=tx[0];writes++;}
    if(tx[1]!==r.l2){r.u.textContent=tx[1];r.l2=tx[1];writes++;}
    if(ti!==r.title){r.tag.title=ti;r.title=ti;writes++;}
  }
  function applyFilter(r,ok){
    var dim=CFG.mode==='dim'&&!ok, hide=CFG.mode==='hide'&&!ok;
    if(dim!==r.dim){r.el.classList.toggle('deal-dim',dim);r.dim=dim;writes++;}
    if(hide!==r.hide){r.el.classList.toggle('deal-hide',hide);r.hide=hide;writes++;}
  }
  function runScan(){
    if(!CFG.on){clearAll();return;}
    var t0=performance.now(); writes=0;
    if(listDirty){collect();listDirty=false;}
    buildBuckets();
    var deals=[],i,r;
    for(i=0;i<recs.length;i++){
      r=recs[i]; if(!r.el.isConnected) continue;
      if(gemOf(r.key)===DEFAULT&&r.price) noteBase(r.pre,r.price);
      r.v=valuate(r.key,r.price,r.pre);
      r.ok=!!(r.v&&!r.v.wait&&(r.v.margin>=CFG.threshold||r.v.arb>0));
      if(r.ok) deals.push(r);
    }
    for(i=0;i<recs.length;i++){ r=recs[i]; if(!r.el.isConnected) continue; applyTag(r); applyFilter(r,r.ok); }
    deals.sort(function(a,b){return (b.v.arb||b.v.margin)-(a.v.arb||a.v.margin);});
    renderTop(deals); paint(); needGems();
    if(dirty) save();
    lastMs=Math.round(performance.now()-t0);
    if(popRec) fillPop(popRec);
  }
  function schedule(){ if(queued) return; queued=true; ric(function(){queued=false;runScan();}); }
  function clearAll(){
    for(var i=0;i<recs.length;i++){
      var r=recs[i];
      if(r.tag){r.tag.remove();r.tag=null;r.cls='';r.l1='';r.l2='';r.title='';}
      if(r.dim){r.el.classList.remove('deal-dim');r.dim=false;}
      if(r.hide){r.el.classList.remove('deal-hide');r.hide=false;}
    }
    renderTop([]); paint();
  }
  function renderTop(deals){
    var box=panel&&panel.querySelector('#dlTop'); if(!box) return;
    var s=deals.slice(0,5).map(function(d){return d.href+Math.round(d.v.margin);}).join('|');
    if(s===sig) return; sig=s; box.innerHTML='';
    if(!deals.length){box.innerHTML='<span class="dl-empty">выгодных лотов нет</span>';return;}
    deals.slice(0,5).forEach(function(d){
      var a=document.createElement('a');a.className='dl-row';a.href=d.href;a.target='_blank';a.rel='noopener';
      var i=document.createElement('i');i.style.background=colorOf(d);
      var n=document.createElement('span');n.textContent=(d.v.pre?d.v.pre+' ':'')+d.v.gem;
      var b=document.createElement('b');b.textContent=d.v.arb>0?('+'+short(d.v.arb)):(Math.round(d.v.margin)+'%');
      var p=document.createElement('em');p.textContent=short(d.price);
      a.appendChild(i);a.appendChild(n);a.appendChild(b);a.appendChild(p);box.appendChild(a);
    });
  }
  var lastStatus='';
  function paint(){
    if(!panel) return;
    var st=heavyOn?('качаю '+prog):(err?('ошибка: '+err):('рынок '+Object.keys(LOTS).length+' · групп '+Object.keys(buckets).length+(heavyData()?' · прайс':'')));
    if(st!==lastStatus){panel.querySelector('#dlStatus').textContent=st;lastStatus=st;}
    var on=panel.querySelector('#dlOn'); if(on.checked!==CFG.on) on.checked=CFG.on;
    panel.querySelector('#dlTv').textContent=CFG.threshold;
    panel.querySelector('#dlKv').textContent=CFG.socketK.toFixed(2);
    var tw=panel.querySelector('#dlT'); if(document.activeElement!==tw&&+tw.value!==CFG.threshold) tw.value=CFG.threshold;
    var kw=panel.querySelector('#dlK'); if(document.activeElement!==kw&&+kw.value!==Math.round(CFG.socketK*100)) kw.value=Math.round(CFG.socketK*100);
    panel.querySelectorAll('.dl-modes button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-m')===CFG.mode);});
  }
  function fillPop(r){
    if(!pop) return;
    var v=r.v||{}, rows='';
    function row(k,val,cls){ rows+='<div class="dp-row'+(cls?' '+cls:'')+'"><span>'+k+'</span><b>'+val+'</b></div>'; }
    row('Гем', v.gem||'?'); row('Качество', v.pre||'base');
    row('Цена лота', money(r.price)+' ₽');
    if(v.wait){ row('Оценка','недоступна','dp-warn'); row('Причина',v.wait); }
    else{
      row('Оценка', money(v.fair)+' ₽','dp-main');
      row('Отклонение',(v.margin>=0?'дешевле на ':'дороже на ')+Math.abs(Math.round(v.margin))+'%',v.margin>=0?'dp-good':'dp-bad');
      row('Источник', v.src);
      if(v.bucket){
        row('Таких же лотов', v.bucket.n);
        row('Медиана / мин / макс', short(v.bucket.med)+' / '+short(v.bucket.min)+' / '+short(v.bucket.max));
      }
      row('База качества', money(v.base)+' ₽');
      row('Цена гема', money(v.gemPrice)+(v.gsrc?' ('+v.gsrc+')':''));
      if(v.model) row('Модель база+гем', money(v.model)+' ₽ (K='+CFG.socketK+')');
      row('Продаж лота за 7д', v.pop||0);
      row('Ордер на покупку', money(v.bo));
      row('Достоверность', dots(v.conf)+(v.conf===3?' высокая':(v.conf===2?' средняя':' низкая')));
    }
    pop.querySelector('.dp-body').innerHTML=rows;
    pop.querySelector('.dp-open').href=r.href;
  }
  function openPop(r){
    if(!pop){
      pop=document.createElement('div'); pop.className='deal-pop';
      pop.innerHTML='<div class="dp-head">РАЗБОР ЛОТА<button type="button" class="dp-x">×</button></div><div class="dp-body"></div>'+
        '<div class="dp-foot"><a class="dp-open" target="_blank" rel="noopener">Открыть лот</a><span class="dp-note">сравнение с такими же лотами</span></div>';
      document.body.appendChild(pop);
      pop.querySelector('.dp-x').addEventListener('click',function(){pop.classList.remove('on');popRec=null;});
    }
    popRec=r; fillPop(r);
    var t=r.tag||r.el, b=t.getBoundingClientRect();
    pop.classList.add('on');
    var w=270,h=pop.offsetHeight||280;
    pop.style.left=Math.max(8,Math.min(window.innerWidth-w-8,b.left-40))+'px';
    pop.style.top=((b.bottom+8+h>window.innerHeight)?Math.max(8,b.top-h-8):b.bottom+8)+'px';
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('.deal-tag'):null;
    if(t){
      e.preventDefault(); e.stopPropagation();
      var card=t.closest('a.item, .market-items .item, a[href*="/item/"]');
      var r=card?recByEl.get(card):null; if(r) openPop(r);
      return;
    }
    if(pop&&pop.classList.contains('on')&&!pop.contains(e.target)){pop.classList.remove('on');popRec=null;}
  },true);
  function entry(body){
    function f(n){var m=new RegExp('"'+n+'":"?([-\\d.]+)"?').exec(body);return m?num(m[1]):null;}
    var nm=/market_hash_name":"([^"]*)"/.exec(body);
    return {p:f('price'),avg:f('avg_price'),bo:f('buy_order'),pop:f('popularity_7d')||0,name:nm?nm[1]:''};
  }
  async function heavy(force){
    if(heavyOn) return 'уже качается';
    if(!force&&!confirm('Скачать полный прайс (~66 МБ, кэш 24 ч)? Даст реальные средние продаж гемов и ордера.')) return 'отменено';
    heavyOn=true;err='';prog='0 МБ';paint();
    try{
      var res=await fetch('https://market.dota2.net/api/v2/prices/class_instance/'+cur()+'.json',{credentials:'omit'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      var rd=res.body.getReader(),dec=new TextDecoder(),buf='',got=0,items={},gems={};
      var RE=/"(\d+_\d+)":\{([^{}]*)\}/g;
      while(true){
        var r=await rd.read(); if(r.done) break;
        got+=r.value.length; buf+=dec.decode(r.value,{stream:true});
        RE.lastIndex=0;var m,last=0;
        while((m=RE.exec(buf))!==null){
          last=RE.lastIndex;var b=m[2];
          if(b.indexOf('Fractal Horns of Inner Abysm')>=0) items[m[1]]=entry(b);
          else if(b.indexOf('Prismatic:')>=0){var e=entry(b);if(e.name) gems[compact(e.name.replace(/^Prismatic:\s*/i,''))]=e;}
        }
        buf=buf.slice(last); prog=Math.round(got/1048576)+' МБ'; paint();
      }
      S.heavy={t:Date.now(),items:items,gems:gems}; save(); bucketT=0; schedule();
      console.log('[deals] прайс: '+Object.keys(items).length+' лотов, '+Object.keys(gems).length+' гемов');
      return 'готово';
    }catch(e){err=e.message;return 'ошибка: '+e.message;}
    finally{heavyOn=false;prog='';paint();schedule();}
  }
  function audit(n){
    var rows=recs.map(function(r){var v=r.v||{};return {gem:v.gem||'?',quality:r.pre||'base',price:r.price,
      lots:v.bucket?v.bucket.n:0,fair:v.fair?Math.round(v.fair):null,margin:v.margin!=null?Math.round(v.margin)+'%':(v.wait||''),
      src:v.src||'',conf:v.conf!=null?dots(v.conf):''};});
    console.table(rows.slice(0,n||20)); return rows.length;
  }
  function bucketTable(){
    var rows=Object.keys(buckets).map(function(k){var b=buckets[k];return {group:k,lots:b.n,min:Math.round(b.min),median:Math.round(b.med),max:Math.round(b.max)};});
    rows.sort(function(a,b){return b.lots-a.lots;});
    console.table(rows); return rows.length;
  }
  function csv(){
    var rows=[['gem','quality','price','lots_in_group','median','fair','source','confidence','margin_pct','base','gem_price','K','url']];
    recs.forEach(function(r){var v=r.v||{};
      rows.push([v.gem||'',r.pre,r.price,v.bucket?v.bucket.n:'',v.bucket?Math.round(v.bucket.med):'',v.fair?Math.round(v.fair):'',
        v.src||v.wait||'',v.conf!=null?v.conf:'',v.margin!=null?Math.round(v.margin):'',v.base,v.gemPrice,CFG.socketK,r.href]);});
    var s=rows.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(';');}).join('\r\n');
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\ufeff'+s],{type:'text/csv;charset=utf-8'}));
    a.download='tb-deals.csv';document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
    return (rows.length-1)+' строк';
  }
  function findHost(){
    var b=document.querySelector('.gem-panel .gp-body'); if(b) return b;
    if(boot>12&&!solo){
      solo=true;var w=document.createElement('div');w.className='gem-panel dl-solo open';
      w.innerHTML='<div class="gp-card"><div class="gp-body"></div></div>';
      document.body.appendChild(w);return w.querySelector('.gp-body');
    }
    return null;
  }
  function build(){
    var body=findHost(); if(!body||panel) return !!panel;
    panel=document.createElement('div');panel.className='dl-block';
    panel.innerHTML=
      '<div class="dl-head">DEAL RADAR <span id="dlStatus">…</span></div>'+
      '<div class="dl-hint">Сравнение с <b>такими же лотами</b> (качество + гем).<br>\u25BC дешевле медианы · \u25B2 дороже · ? мало данных<br>Клик по бейджу — разбор с выборкой.</div>'+
      '<label class="gp-toggle"><input id="dlOn" type="checkbox"><i></i><span>Оценка сделок</span></label>'+
      '<label class="gp-field"><span>Порог маржи <b id="dlTv">15</b> <em>%</em></span><input id="dlT" type="range" min="5" max="60" step="5"></label>'+
      '<label class="gp-field"><span>Коэф. гема K <b id="dlKv">0.90</b> <em>для запасной модели</em></span><input id="dlK" type="range" min="50" max="120" step="5"></label>'+
      '<div class="dl-modes"><button type="button" data-m="off">Все</button><button type="button" data-m="dim">Гасить</button><button type="button" data-m="hide">Скрывать</button></div>'+
      '<div class="dl-top" id="dlTop"></div>'+
      '<div class="gp-actions"><button type="button" id="dlAudit">Разбор</button><button type="button" id="dlGroups">Группы</button></div>'+
      '<div class="gp-actions"><button type="button" id="dlHeavy">Полный прайс</button><button type="button" id="dlCsv">CSV+</button></div>';
    body.appendChild(panel);
    panel.querySelector('#dlOn').addEventListener('change',function(){CFG.on=this.checked;save();if(CFG.on)schedule();else clearAll();paint();});
    panel.querySelector('#dlT').addEventListener('input',function(){CFG.threshold=+this.value;save();sig='';schedule();});
    panel.querySelector('#dlK').addEventListener('input',function(){CFG.socketK=(+this.value)/100;save();sig='';schedule();});
    panel.querySelectorAll('.dl-modes button').forEach(function(b){b.addEventListener('click',function(){CFG.mode=b.getAttribute('data-m');save();sig='';schedule();});});
    panel.querySelector('#dlAudit').addEventListener('click',function(){audit(20);});
    panel.querySelector('#dlGroups').addEventListener('click',function(){bucketTable();});
    panel.querySelector('#dlHeavy').addEventListener('click',function(){heavy(false);});
    panel.querySelector('#dlCsv').addEventListener('click',function(){console.log('[deals] '+csv());});
    paint();console.log('[deals] панель '+(solo?'отдельная':'встроена'));
    return true;
  }
  window.__deals={
    ingest:ingest,scan:schedule,audit:audit,buckets:bucketTable,csv:csv,heavy:function(){return heavy(true);},
    cfg:function(k,v){if(k){CFG[k]=v;save();sig='';schedule();}return CFG;},
    perf:function(){var p={lastScanMs:lastMs,domWrites:writes,cards:recs.length,lots:Object.keys(LOTS).length,groups:Object.keys(buckets).length};console.log('[deals] perf',p);return p;},
    state:function(){return {cfg:CFG,cur:cur(),lots:Object.keys(LOTS).length,groups:Object.keys(buckets).length,base:S.base,gems:S.gems,queue:q.length,err:err};},
    diag:function(){var d={version:'v1.5',cards:recs.length,lots:Object.keys(LOTS).length,groups:Object.keys(buckets).length,
      tags:document.querySelectorAll('.deal-tag').length,waits:document.querySelectorAll('.deal-tag.wait').length,lastScanMs:lastMs,domWrites:writes,err:err};
      console.log('[deals] diag',d);return d;}
  };
  Promise.all([load(),pullGems()]).then(function(){
    var bt=setInterval(function(){boot++;if(build()||boot>40)clearInterval(bt);},500);
    var grid=document.querySelector('#applications, .market-items');
    if(grid){
      new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          var an=muts[i].addedNodes;
          for(var j=0;j<an.length;j++){
            var n=an[j];
            if(n.nodeType===1&&!(n.classList&&(n.classList.contains('deal-tag')||n.classList.contains('gem-badge')))){listDirty=true;schedule();return;}
          }
        }
      }).observe(grid,{childList:true,subtree:true});
    }
    setInterval(pullGems,20000);
    setInterval(schedule,10000);
    setTimeout(schedule,1200);
    console.log('[deals] v1.5 | '+cur()+' | лотов в снапшоте '+Object.keys(LOTS).length);
  });
})();