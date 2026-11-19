"use strict";
/* Kids' World Season 2: study buddy, island builder, boss battles, beat-your-parent, festival events,
   read-aloud stars, achievement cards, monthly challenge, invite a friend. Loaded only on children's pages. */
const SITE='https://palatshahachetana.github.io/';
const funGet=()=>{if(kid){kid.fun=kid.fun||{};return kid.fun}const f=ls.get('ct_fun_guest')||{};return f};
function funSave(f){if(kid){kid.fun=f;saveKid()}else ls.set('ct_fun_guest',f)}
const starsLeft=()=>Math.max(0,starsEarned()-(funGet().spent||0));
function spend(n){const f=funGet();if(starsLeft()<n)return false;f.spent=(f.spent||0)+n;funSave(f);return true}
const funWho=()=>kid?kid.name:'You';
function withSeed(seed,fn){const r=Math.random;let x=seed>>>0||1;Math.random=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};try{return fn()}finally{Math.random=r}}
const FUNT=(en,mr,hi)=>LANG==='mr'?mr:LANG==='hi'?hi:en;

/* ---------- shared question player (pick / number / tiles) ---------- */
function qBody(q,st,pre){if(st.fb)return '';
  if(q.kind==='pick')return `<div class="opts">${q.opts.map(o=>`<button class="btn ${o.cls||''}" data-act="${pre}ans" data-v="${esc(o.v)}">${o.h}</button>`).join('')}</div>`;
  if(q.kind==='num')return `<div class="ans" aria-live="polite">${esc(st.input||'')||' '}</div><div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="${pre}d" data-d="${d}">${d}</button>`).join('')}<button class="btn" data-act="${pre}b" aria-label="Delete">⌫</button><button class="btn" data-act="${pre}d" data-d="0">0</button><button class="btn go" data-act="${pre}ok">OK</button></div>`;
  const left=q.tiles.map((t,i)=>i).filter(i=>(st.built||[]).indexOf(i)<0);
  return `<div class="tiles slot">${(st.built||[]).map((i,j)=>`<button class="tile" data-act="${pre}un" data-j="${j}">${esc(q.tiles[i])}</button>`).join('')||'<span class="muted small">Tap the tiles below</span>'}</div><div class="tiles">${left.map(i=>`<button class="tile" data-act="${pre}tile" data-i="${i}">${esc(q.tiles[i])}</button>`).join('')}</div><button class="btn go" data-act="${pre}chk">Check</button>`}
function qActs(pre,getSt,mark){const o={};
  o[pre+'ans']=d=>{const st=getSt();if(!st.fb)mark(d.v===st.q.a)};
  o[pre+'d']=d=>{const st=getSt();if(!st.fb&&(st.input||'').length<7){st.input=(st.input||'')+d.d;render()}};
  o[pre+'b']=()=>{const st=getSt();st.input=(st.input||'').slice(0,-1);render()};
  o[pre+'ok']=()=>{const st=getSt();if(!st.fb&&st.input)mark(String(parseInt(st.input,10))===st.q.a)};
  o[pre+'tile']=d=>{const st=getSt();(st.built=st.built||[]).push(+d.i);render()};
  o[pre+'un']=d=>{const st=getSt();st.built.splice(+d.j,1);render()};
  o[pre+'chk']=()=>{const st=getSt();if(st.built&&st.built.length)mark(st.built.map(i=>st.q.tiles[i]).join('|')===st.q.target.join('|'))};
  Object.assign(acts,o)}
function poolFrom(mods,n){const out=[];let g=0;mods=mods.filter(m=>MODS[m]&&MODS[m].ch&&MODS[m].ch.length);if(!mods.length)return out;
  while(out.length<n&&g++<300){const M=MODS[one(mods)],c=one(M.ch),qs=c.sets?one(c.sets).make():c.make(),q=one(qs);if(q.kind!=='build'&&!out.some(x=>x.ask===q.ask&&x.show===q.show&&x.a===q.a))out.push(q)}return out}

/* ---------- achievement cards (shareable image) ---------- */
let qrLoaded=null;
function loadQRlib(){return qrLoaded=qrLoaded||new Promise((res,rej)=>{if(window.qrcode)return res();const s=document.createElement('script');s.src='vendor/qrcode.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function qrCanvas(text,size){const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),c=document.createElement('canvas'),cell=Math.floor(size/(n+4));c.width=c.height=cell*(n+4);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#111';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect((k+2)*cell,(r+2)*cell,cell,cell);return c}
function achieveCanvas(a){return Promise.all([loadQRlib().catch(()=>{}),document.fonts.load('700 60px Kalam').catch(()=>{})]).then(()=>{
  const W=1080,H=1080,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2F5A44');g.addColorStop(1,'#1F3B2D');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){x.fillStyle=['#F4A300','#E2583E','#7FB8D8','#A8E6B8','#FFD27A'][i%5];x.globalAlpha=.6;x.beginPath();x.arc((i*263)%W,(i*197)%H*.55,6+(i%4)*3,0,7);x.fill()}x.globalAlpha=1;
  x.strokeStyle='#8B5E34';x.lineWidth=24;x.strokeRect(12,12,W-24,H-24);
  x.textAlign='center';x.font='220px sans-serif';x.fillText(a.emoji||'🏆',W/2,330);
  const wrap=(t,f,max)=>{x.font=f;const w=String(t).split(' '),l=[];let cur='';w.forEach(z=>{const tr=cur?cur+' '+z:z;if(x.measureText(tr).width>max&&cur){l.push(cur);cur=z}else cur=tr});if(cur)l.push(cur);return l};
  let y=430;wrap(a.title,'700 70px Kalam, "Noto Sans Devanagari", sans-serif',W-140).forEach(l=>{x.fillStyle='#fff';x.fillText(l,W/2,y);y+=84});
  y+=10;wrap(a.sub||'','600 38px "Nunito Sans", "Noto Sans Devanagari", sans-serif',W-160).forEach(l=>{x.fillStyle='#FFD27A';x.fillText(l,W/2,y);y+=50});
  x.fillStyle='rgba(0,0,0,.28)';x.fillRect(24,H-250,W-48,226);
  if(window.qrcode){const q=qrCanvas(SITE+'#challenge',190);x.drawImage(q,W-250,H-238,190,190)}
  x.textAlign='left';x.fillStyle='#fff';x.font='700 44px Kalam, sans-serif';x.fillText("Chetana's Tutoring",60,H-170);
  x.font='600 32px "Nunito Sans", sans-serif';x.fillStyle='#FFD27A';x.fillText('Can you beat this? Free challenge →',60,H-118);x.fillStyle='#EEE8DA';x.font='600 28px "Nunito Sans", sans-serif';x.fillText('palatshahachetana.github.io',60,H-70);
  return c})}
let shareCard=null;
function cardOffer(a){shareCard=a;return `<div class="achieve"><p class="small muted">${FUNT('Grown-ups: share this on WhatsApp if you like. It shows the first name only.','पालकांसाठी: हवं असल्यास WhatsApp वर शेअर करा. फक्त पहिलं नाव दिसतं.','माता-पिता के लिए: चाहें तो WhatsApp पर शेयर करें। सिर्फ़ पहला नाम दिखता है।')}</p>
  <div class="row" style="justify-content:center"><button class="btn go" data-act="achshare">${FUNT('Share the achievement','यश शेअर करा','उपलब्धि शेयर करें')}</button><button class="btn" data-act="achdown">${FUNT('Download','डाउनलोड','डाउनलोड')}</button></div></div>`}
function achFile(){return achieveCanvas(shareCard).then(c=>new Promise(r=>c.toBlob(b=>r(new File([b],'achievement.png',{type:'image/png'})),'image/png')))}
Object.assign(acts,{
  achdown(){achFile().then(f=>{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove()})},
  achshare(){achFile().then(f=>{const d={files:[f],text:shareCard.title+' – try the free challenge: '+SITE+'#challenge'};
    if(navigator.canShare&&navigator.canShare(d))navigator.share(d).catch(()=>{});else window.open('https://wa.me/?text='+encodeURIComponent(d.text),'_blank')})}});

/* ---------- 1. Study buddy ---------- */
const BUDDIES=[['tiger','🐯','Tiger'],['monkey','🐵','Monkey'],['peacock','🦚','Peacock'],['elephant','🐘','Elephant'],['owl','🦉','Owl'],['panda','🐼','Panda']];
const STAGES=[[0,'Egg'],[10,'Baby'],[50,'Little one'],[150,'Explorer'],[400,'Champion']];
const GEAR=[[10,'🎀','Bow'],[50,'👓','Glasses'],[100,'🏏','Cricket bat'],[150,'🧣','Scarf'],[250,'👳','Puneri pagdi'],[400,'👑','Crown']];
const stageOf=fed=>STAGES.filter(s=>fed>=s[0]).length-1;
function lastActive(){const s=kid?(kid.sessions||[]).slice(-1)[0]:ls.get('ct_lastday');return s||null}
function buddyMini(){const f=funGet(),b=f.buddy;if(!b)return `<a class="buddy-mini" href="#buddy"><span class="bm-e">🥚</span><span><b>${FUNT('Hatch your study buddy!','तुझा अभ्यास-मित्र जन्माला घाल!','अपना पढ़ाई-दोस्त बनाओ!')}</b><small>${FUNT('Stars feed it and it grows.','तारे खाऊन तो मोठा होतो.','सितारों से वह बड़ा होता है।')}</small></span></a>`;
  const st=stageOf(b.fed||0),e=st===0?'🥚':BUDDIES.find(x=>x[0]===b.kind)[1],sleepy=isSleepy();
  return `<a class="buddy-mini" href="#buddy"><span class="bm-e${sleepy?' sleepy':''}">${e}</span><span><b>${esc(b.name||'Buddy')}</b><small>${sleepy?FUNT('is sleepy. Play to wake them up!','झोपाळलाय. खेळून उठव!','उनींदा है। खेलकर जगाओ!'):STAGES[st][1]+' · ⭐ '+starsLeft()}</small></span></a>`}
function isSleepy(){const d=lastActive();if(!d)return false;return (Date.now()-new Date(d+'T00:00'))>3*864e5}
function buddyView(){const f=funGet(),b=f.buddy;
  if(!b)return `<section class="card stack center"><h1>${FUNT('Choose your study buddy','तुझा अभ्यास-मित्र निवड','अपना पढ़ाई-दोस्त चुनो')}</h1><p class="muted">${FUNT('It hatches from an egg and grows when you feed it stars from practice.','तो अंड्यातून बाहेर येतो आणि सरावाचे तारे खाऊन मोठा होतो.','वह अंडे से निकलता है और अभ्यास के सितारे खाकर बड़ा होता है।')}</p>
   <div class="buddy-pick">${BUDDIES.map(([k,e,n])=>`<button class="btn" data-act="bpick" data-k="${k}"><span class="bp-e">${e}</span>${n}</button>`).join('')}</div>
   <label>${FUNT('Give it a name','त्याला नाव दे','उसका नाम रखो')}<input id="bname" maxlength="14" placeholder="e.g. Bappu"></label></section>`;
  const fed=b.fed||0,st=stageOf(fed),next=STAGES[st+1],e=st===0?'🥚':BUDDIES.find(x=>x[0]===b.kind)[1],gear=GEAR.filter(g=>fed>=g[0]),wear=b.wear||[],sleepy=isSleepy();
  return `<section class="card stack center buddy"><h1>${esc(b.name)}</h1><p class="muted">${STAGES[st][1]}${next?` · ${next[0]-fed} ${FUNT('more stars to grow','तारे अजून, मोठं होण्यासाठी','सितारे और, बड़ा होने के लिए')}`:' · '+FUNT('fully grown!','पूर्ण वाढला!','पूरा बड़ा!')}</p>
  <div class="buddy-stage${sleepy?' sleepy':''}" style="--s:${1+st*.18}"><span class="bud-e">${e}</span>${wear.map(w=>`<span class="bud-g">${w}</span>`).join('')}${sleepy?'<span class="zz">💤</span>':''}</div>
  <div class="bar"><i style="width:${next?(fed-STAGES[st][0])/(next[0]-STAGES[st][0])*100:100}%"></i></div>
  <p><b>⭐ ${starsLeft()}</b> ${FUNT('stars to spend','खर्च करायला तारे','खर्च करने को सितारे')}</p>
  <div class="row" style="justify-content:center"><button class="btn go" data-act="bfeed" data-n="1" ${starsLeft()<1?'disabled':''}>${FUNT('Feed 1 star','१ तारा खाऊ घाल','1 सितारा खिलाओ')}</button><button class="btn" data-act="bfeed" data-n="5" ${starsLeft()<5?'disabled':''}>${FUNT('Feed 5','५ खाऊ घाल','5 खिलाओ')}</button></div>
  ${sleepy?`<p class="small">${FUNT('Practise today to wake your buddy up.','मित्राला उठवण्यासाठी आज सराव कर.','दोस्त को जगाने के लिए आज अभ्यास करो।')}</p>`:''}</section>
  <section class="card stack"><h2>${FUNT('Dress up','सजव','सजाओ')}</h2><div class="row">${GEAR.map(([n,g,t])=>fed>=n?`<button class="btn${wear.indexOf(g)>=0?' go':''}" data-act="bwear" data-g="${g}">${g} ${t}</button>`:`<span class="pill">🔒 ${t} · ${n}</span>`).join('')}</div></section>
  ${b.shared!==st&&st>0?cardOffer({emoji:e,title:`${funWho()}’s ${b.name} is now a ${STAGES[st][1]}!`,sub:FUNT('Grown with stars from daily practice','रोजच्या सरावातून मोठा झाला','रोज़ के अभ्यास से बड़ा हुआ')}):''}`}
Object.assign(acts,{
  bpick(d){const f=funGet();f.buddy={kind:d.k,name:(document.getElementById('bname').value||'').trim().slice(0,14)||BUDDIES.find(x=>x[0]===d.k)[2],fed:0,wear:[]};funSave(f);render()},
  bfeed(d){const n=+d.n;if(!spend(n))return;const f=funGet(),before=stageOf(f.buddy.fed||0);f.buddy.fed=(f.buddy.fed||0)+n;funSave(f);
    if(stageOf(f.buddy.fed)>before)toast('🎉 '+f.buddy.name+' grew!');render()},
  bwear(d){const f=funGet(),w=f.buddy.wear=f.buddy.wear||[],i=w.indexOf(d.g);if(i<0)w.push(d.g);else w.splice(i,1);funSave(f);render()}});

/* ---------- 2. Island builder ---------- */
const BLOCKS=[['tree','🌳','Tree',2],['flowers','🌼','Flowers',1],['house','🏠','House',5],['lake','💧','Lake',8],['school','🏫','School',10],
  ['temple','🛕','Temple',12],['metro','🚇','Metro',15],['ground','🏏','Cricket ground',20],['wada','🏰','Wada',25]];
let islS={tool:'tree'},I3=null;
function islandView(){const f=funGet(),items=f.island||[];
  return `<section class="stack"><h1>${FUNT('My island','माझं बेट','मेरा द्वीप')}</h1><p class="muted">${FUNT('Spend practice stars on buildings. Tap a square to build; tap a building to take it back.','सरावाचे तारे इमारतींवर खर्च कर. बांधण्यासाठी चौकोनावर टॅप कर; परत घेण्यासाठी इमारतीवर.','अभ्यास के सितारे इमारतों पर खर्च करो। बनाने के लिए खाने पर टैप करो; वापस लेने के लिए इमारत पर।')} <b>⭐ ${starsLeft()}</b></p></section>
  <div class="kw-stage isl-stage" id="islstage"><canvas id="islc" role="img" aria-label="Your island"></canvas><p class="kw-flat">3D could not load on this device.</p></div>
  <section class="card stack"><div class="isl-shop">${BLOCKS.map(([k,e,n,c])=>`<button class="btn${islS.tool===k?' go':''}" data-act="isltool" data-k="${k}" ${starsLeft()<c&&islS.tool!==k?'aria-disabled="true"':''}><span class="bp-e">${e}</span>${n}<small>⭐ ${c}</small></button>`).join('')}</div>
  <p class="small muted">${items.length} ${FUNT('buildings','इमारती','इमारतें')}</p></section>
  ${items.length>=5?cardOffer({emoji:'🏝️',title:`${funWho()} built an island with ${items.length} buildings!`,sub:FUNT('Every building was earned by practising','प्रत्येक इमारत सरावातून मिळवली','हर इमारत अभ्यास से कमाई')}):''}`}
function unmountIsland(){if(I3){cancelAnimationFrame(I3.raf);try{I3.ro.disconnect()}catch(e){}try{I3.r.dispose()}catch(e){}I3=null}}
function mountIsland(){const st=document.getElementById('islstage');if(!st)return;if(I3&&I3.cv===document.getElementById('islc')){I3.build();return}unmountIsland();
  loadThree().then(()=>{if(view==='island')isl3d()}).catch(()=>st.classList.add('flat'))}
function isl3d(){const T3_=THREE,cv=document.getElementById('islc'),st=document.getElementById('islstage');let r;
  try{r=new T3_.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){st.classList.add('flat');return}
  r.setPixelRatio(Math.min(devicePixelRatio||1,2));const sc=new T3_.Scene(),cam=new T3_.PerspectiveCamera(38,1,.1,100);cam.position.set(0,9,11);cam.lookAt(0,0,0);
  sc.add(new T3_.HemisphereLight(0xffffff,0x5d8fc4,.95));const dl=new T3_.DirectionalLight(0xffffff,.7);dl.position.set(5,10,6);sc.add(dl);
  const M=c=>new T3_.MeshLambertMaterial({color:c}),g=new T3_.Group();sc.add(g);const N=8,S=.62,off=-(N-1)*S/2;
  const sea=new T3_.Mesh(new T3_.CircleGeometry(30,48),M(0x5FB0E8));sea.rotation.x=-Math.PI/2;sea.position.y=-.6;sc.add(sea);
  const base=new T3_.Mesh(new T3_.CylinderGeometry(3.6,4,.8,32),M(0xF4D9A0));base.position.y=-.4;g.add(base);
  const cells=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++){const t=new T3_.Mesh(new T3_.BoxGeometry(S*.94,.06,S*.94),M((i+j)%2?0x7CC67A:0x8FD48A));t.position.set(off+i*S,.03,off+j*S);t.userData.cell=[i,j];
    if(Math.hypot(t.position.x,t.position.z)<3.3){g.add(t);cells.push(t)}}
  const obj=new T3_.Group();g.add(obj);
  function mk(k){const o=new T3_.Group(),add=(geo,c,y,x,z)=>{const m=new T3_.Mesh(geo,M(c));m.position.set(x||0,y,z||0);o.add(m);return m};
    if(k==='tree'){add(new T3_.CylinderGeometry(.05,.07,.35,6),0x8B5E34,.2);add(new T3_.SphereGeometry(.22,10,8),0x2E8B3D,.45)}
    if(k==='flowers')[[-.1,0],[.1,.05],[0,-.1]].forEach(([x,z],i)=>add(new T3_.SphereGeometry(.07,8,6),[0xE2583E,0xF4A300,0xD96BC2][i],.1,x,z));
    if(k==='house'){add(new T3_.BoxGeometry(.4,.3,.4),0xFFF1D2,.2);add(new T3_.ConeGeometry(.33,.25,4),0xC0392B,.47).rotation.y=Math.PI/4}
    if(k==='lake'){add(new T3_.CylinderGeometry(.27,.27,.05,20),0x3A8FD0,.07)}
    if(k==='school'){add(new T3_.BoxGeometry(.5,.35,.35),0xF4A300,.2);add(new T3_.BoxGeometry(.08,.2,.08),0xffffff,.45)}
    if(k==='temple'){add(new T3_.BoxGeometry(.38,.2,.38),0xFFE0B2,.12);add(new T3_.ConeGeometry(.2,.45,8),0xF57C00,.45);add(new T3_.SphereGeometry(.04,6,6),0xFFD700,.72)}
    if(k==='metro'){add(new T3_.BoxGeometry(.55,.16,.2),0xC62828,.16);add(new T3_.BoxGeometry(.6,.03,.06),0x555555,.04)}
    if(k==='ground'){add(new T3_.CylinderGeometry(.29,.29,.03,24),0x4CAF50,.05);add(new T3_.BoxGeometry(.05,.02,.2),0xE0C097,.08)}
    if(k==='wada'){add(new T3_.BoxGeometry(.5,.35,.5),0xB5651D,.2);add(new T3_.BoxGeometry(.56,.06,.56),0x8B4513,.4);add(new T3_.BoxGeometry(.12,.18,.02),0x3E2723,.12,0,.26)}
    return o}
  function build(){while(obj.children.length)obj.remove(obj.children[0]);(funGet().island||[]).forEach(it=>{const o=mk(it.t);o.position.set(off+it.x*S,.06,off+it.z*S);o.userData.item=it;obj.add(o)})}
  build();let drag=null,moved=0;const ray=new T3_.Raycaster(),pt=new T3_.Vector2();
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX};moved=0});cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;drag.x=e.clientX;moved+=Math.abs(dx);g.rotation.y+=dx*.01});
  cv.addEventListener('pointerup',e=>{const was=drag;drag=null;if(!was||moved>6)return;const b=cv.getBoundingClientRect();pt.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(pt,cam);
    const hitO=ray.intersectObjects(obj.children,true)[0];if(hitO){let o=hitO.object;while(o&&!o.userData.item)o=o.parent;if(o){const f=funGet(),c=BLOCKS.find(x=>x[0]===o.userData.item.t)[3];f.island=f.island.filter(x=>x!==o.userData.item&&!(x.x===o.userData.item.x&&x.z===o.userData.item.z));f.spent=Math.max(0,(f.spent||0)-c);funSave(f);render();return}}
    const hit=ray.intersectObjects(cells,false)[0];if(!hit)return;const[i,j]=hit.object.userData.cell,f=funGet();f.island=f.island||[];if(f.island.some(x=>x.x===i&&x.z===j))return;
    const blk=BLOCKS.find(x=>x[0]===islS.tool);if(!spend(blk[3])){toast(FUNT('Not enough stars yet. Practise to earn more!','अजून पुरेसे तारे नाहीत. सराव करून मिळव!','अभी काफ़ी सितारे नहीं। अभ्यास करके कमाओ!'),true);return}
    const f2=funGet();f2.island=(f2.island||[]).concat({t:blk[0],x:i,z:j});funSave(f2);render()});
  const size=()=>{const w=st.clientWidth,h=st.clientHeight;r.setSize(w,h,false);cam.aspect=w/h;const n=w/h<.8;cam.position.set(0,n?13:9,n?15:11);cam.lookAt(0,0,0);cam.updateProjectionMatrix()};const ro=new ResizeObserver(size);ro.observe(st);size();
  const fr=()=>{if(!I3)return;if(!drag&&!RM())g.rotation.y+=.0015;r.render(sc,cam);I3.raf=requestAnimationFrame(fr)};I3={r,ro,raf:0,cv,build};I3.raf=requestAnimationFrame(fr)}
Object.assign(acts,{isltool(d){islS.tool=d.k;render()}});

/* ---------- 3. Boss battles ---------- */
const BOSSES=[['maths','🐉','Number Mountain Dragon'],['grammar','👻','Grammar Castle Ghost'],['phonics','🐙','Letter Island Octopus'],['bhasha','👹','Akshar Village Rakshas'],['mgram','🦁','Marathi Grammar Lion'],['hgram','🐊','Hindi Grammar Crocodile']];
let boss=null;
function bossView(){if(!boss){const won=funGet().bosses||{};
  return `<section class="stack"><h1>${FUNT('Boss battles','बॉस लढाई','बॉस मुकाबला')}</h1><p class="muted">${FUNT('Every right answer is a hit. Get the boss’s energy to zero before you miss 5.','प्रत्येक बरोबर उत्तर म्हणजे एक फटका. ५ चुका होण्याआधी बॉसची ताकद शून्य कर.','हर सही जवाब एक वार है। 5 गलतियों से पहले बॉस की ताक़त शून्य करो।')}</p></section>
  <div class="grid">${BOSSES.map(([m,e,n])=>`<button class="card boss-card" data-act="bossgo" data-m="${m}"><span class="boss-e">${e}</span><b>${n}</b><small>${MODS[m].name}${won[m]?' · 🏅 '+FUNT('Beaten','हरवला','हराया')+' ×'+won[m]:''}</small></button>`).join('')}</div>`}
  const B=BOSSES.find(x=>x[0]===boss.m);
  if(boss.phase==='win')return `<section class="card stack center"><span class="boss-e big">🏆</span><h1>${FUNT('You beat the','तू हरवलंस:','तुमने हराया:')} ${B[2]}!</h1><p>${boss.right} ${FUNT('hits','फटके','वार')}, ${boss.miss} ${FUNT('misses','चुका','चूक')}. +10 ⭐</p>${cardOffer({emoji:B[1],title:`${funWho()} beat the ${B[2]}!`,sub:FUNT('A boss battle on Kids’ World','किड्स वर्ल्डमधील बॉस लढाई','किड्स वर्ल्ड का बॉस मुकाबला')})}<div class="row" style="justify-content:center"><button class="btn" data-act="bossback">${FUNT('All bosses','सर्व बॉस','सभी बॉस')}</button></div></section>`;
  if(boss.phase==='lose')return `<section class="card stack center"><span class="boss-e big">${B[1]}</span><h1>${FUNT('The boss escaped!','बॉस पळाला!','बॉस भाग गया!')}</h1><p class="muted">${FUNT('Read the chapter again, then try once more.','धडा पुन्हा वाच, मग पुन्हा प्रयत्न कर.','पाठ फिर पढ़ो, फिर कोशिश करो।')}</p><div class="row" style="justify-content:center"><button class="btn go" data-act="bossgo" data-m="${boss.m}">${FUNT('Try again','पुन्हा','फिर से')}</button><button class="btn" data-act="bossback">${FUNT('All bosses','सर्व बॉस','सभी बॉस')}</button></div></section>`;
  const q=boss.q;
  return `<section class="card stack"><div class="boss-arena"><span class="boss-e big${boss.hit?' hit':''}${boss.dodge?' dodge':''}" aria-hidden="true">${B[1]}</span><div class="grow"><b>${B[2]}</b><div class="hp" role="img" aria-label="Boss energy ${boss.hp} of 10"><i style="width:${boss.hp*10}%"></i></div><small>${'❤️'.repeat(5-boss.miss)}${'🖤'.repeat(boss.miss)}</small></div></div>
  ${q.show?`<div class="showbox">${q.show}</div>`:''}<div class="ask">${esc(q.ask)}</div>${boss.fb?`<div class="fb ${boss.fb[0]?'ok':'bad'}"><b>${boss.fb[0]?FUNT('Hit!','फटका!','वार!'):FUNT('Missed! The answer was','चुकलं! उत्तर होतं','चूक गए! जवाब था')}</b> ${boss.fb[0]?'':q.ah}</div><button class="btn go" data-act="bossnext">${FUNT('Next','पुढे','आगे')}</button>`:qBody(q,boss,'bs')}
  <button class="btn ghost" data-act="bossback">${FUNT('Run away','पळ','भागो')}</button></section>`}
function bossMark(ok){boss.fb=[ok];if(ok){boss.right++;boss.hp--;boss.hit=true}else{boss.miss++;boss.dodge=true}render();setTimeout(()=>{if(boss){boss.hit=boss.dodge=false}},500)}
qActs('bs',()=>boss,bossMark);
Object.assign(acts,{
  bossgo(d){loadMod(d.m).then(()=>{boss={m:d.m,hp:10,miss:0,right:0,input:'',built:[],fb:null,q:poolFrom([d.m],1)[0],phase:'fight'};render()})},
  bossnext(){boss.fb=null;boss.input='';boss.built=[];if(boss.hp<=0){boss.phase='win';addStars(10);const f=funGet();f.bosses=f.bosses||{};f.bosses[boss.m]=(f.bosses[boss.m]||0)+1;funSave(f)}else if(boss.miss>=5)boss.phase='lose';else boss.q=poolFrom([boss.m],1)[0];render()},
  bossback(){boss=null;render()}});

/* ---------- 4. Beat your parent ---------- */
let duel=null;
function duelView(){if(!duel)return `<section class="card stack center"><h1>${FUNT('Beat your parent!','पालकांना हरव!','माता-पिता को हराओ!')}</h1><p class="muted">${FUNT('Same 10 questions for both. Take turns on one phone. No peeking!','दोघांना तेच १० प्रश्न. एकाच फोनवर आळीपाळीने. डोकावायचं नाही!','दोनों के लिए वही 10 सवाल। एक ही फ़ोन पर बारी-बारी। झाँकना मना!')}</p>
  <div class="row" style="justify-content:center"><label>${FUNT('Child','मूल','बच्चा')}<input id="dk" maxlength="14" value="${esc(kid?kid.name:'')}"></label><label>${FUNT('Grown-up','पालक','बड़े')}<input id="dp" maxlength="14" value="${FUNT('Mummy','आई','मम्मी')}"></label></div>
  <div class="grid">${['maths','grammar','bhasha','mgram','hgram'].map(m=>`<button class="btn" data-act="duelgo" data-m="${m}">${MODS[m].name}</button>`).join('')}</div></section>`;
  const p=duel.names[duel.turn];
  if(duel.phase==='pass')return `<section class="card stack center"><span class="boss-e big">🔄</span><h1>${FUNT('Pass the phone to','फोन द्या:','फ़ोन दो:')} ${esc(p)}</h1><p class="muted">${FUNT('Question','प्रश्न','सवाल')} ${duel.i+1} / 10</p><button class="btn go big" data-act="duelready">${FUNT('I’m ready','मी तयार आहे','मैं तैयार हूँ')}</button></section>`;
  if(duel.phase==='done'){const[a,b]=duel.score,w=a===b?-1:a>b?0:1;return `<section class="card stack center"><span class="boss-e big">${w<0?'🤝':'🏆'}</span><h1>${w<0?FUNT('It’s a tie!','बरोबरी!','बराबरी!'):esc(duel.names[w])+' '+FUNT('wins!','जिंकलं!','जीता!')}</h1><p class="stat">${esc(duel.names[0])} ${a} – ${b} ${esc(duel.names[1])}</p>
   ${w===0?cardOffer({emoji:'🥇',title:`${duel.names[0]} beat ${duel.names[1]} ${a}–${b}!`,sub:FUNT('Beat-your-parent challenge','पालकांना हरवा आव्हान','माता-पिता को हराओ चुनौती')}):''}<div class="row" style="justify-content:center"><button class="btn go" data-act="duelagain">${FUNT('Rematch','पुन्हा सामना','फिर से')}</button></div></section>`}
  const q=duel.qs[duel.i];
  return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">${esc(p)}’s ${FUNT('turn','पाळी','बारी')}</h3><span class="pill">${duel.i+1} / 10</span></div><div class="row duel-score"><span>${esc(duel.names[0])}: <b>${duel.score[0]}</b></span><span>${esc(duel.names[1])}: <b>${duel.score[1]}</b></span></div>
  ${q.show?`<div class="showbox">${q.show}</div>`:''}<div class="ask">${esc(q.ask)}</div>${duel.fb?`<div class="fb ${duel.fb[0]?'ok':'bad'}"><b>${duel.fb[0]?FUNT('Right!','बरोबर!','सही!'):FUNT('Not this time.','या वेळी नाही.','इस बार नहीं।')}</b></div><button class="btn go" data-act="duelnext">${FUNT('Next','पुढे','आगे')}</button>`:qBody(q,duel,'du')}</section>`}
qActs('du',()=>Object.assign(duel,{q:duel.qs[duel.i]}),ok=>{if(ok)duel.score[duel.turn]++;duel.fb=[ok];render()});
Object.assign(acts,{
  duelgo(d){const n=[(val('dk')||FUNT('Child','मूल','बच्चा')),(val('dp')||FUNT('Grown-up','पालक','बड़े'))];loadMod(d.m).then(()=>{duel={m:d.m,names:n,qs:poolFrom([d.m],10),i:0,turn:0,score:[0,0],phase:'pass',input:'',built:[],fb:null};render()})},
  duelready(){duel.phase='play';render()},
  duelnext(){duel.fb=null;duel.input='';duel.built=[];if(duel.turn===0){duel.turn=1}else{duel.turn=0;duel.i++}duel.phase=duel.i>=10?'done':'pass';if(duel.phase==='done'&&duel.score[0]>duel.score[1])addStars(5);render()},
  duelagain(){duel=null;render()}});

/* ---------- 5. Festival events ---------- */
const EVENTS=[
 {id:'sankranti',e:'🪁',name:'Makar Sankranti kite angles',from:'01-08',to:'01-20',kind:'angles'},
 {id:'republic',e:'🇮🇳',name:'Republic Day quiz',from:'01-20',to:'01-31',kind:'india'},
 {id:'summer',e:'☀️',name:'Summer tables sprint',from:'04-10',to:'06-10',kind:'tables'},
 {id:'monsoon',e:'🌧️',name:'Monsoon rain maths',from:'06-10',to:'08-20',kind:'rain'},
 {id:'ganesh',e:'🐘',name:'Ganeshotsav modak hunt',from:'08-20',to:'09-30',kind:'modak'},
 {id:'diwali',e:'🪔',name:'Diwali rangoli symmetry',from:'10-10',to:'11-30',kind:'rangoli'},
 {id:'xmas',e:'🎄',name:'Winter calendar puzzles',from:'12-01',to:'01-07',kind:'calendar'}];
const mmdd=()=>today().slice(5);
const evActive=e=>e.from<=e.to?(mmdd()>=e.from&&mmdd()<=e.to):(mmdd()>=e.from||mmdd()<=e.to);
const fnPick=(a,opts)=>({kind:'pick',ask:a.ask,show:a.show||'',opts:shuffle(uniq(opts.map(String))).map(v=>({h:esc(v),v,cls:'txt'})),a:String(a.a),ah:`<span class="wordbig">${esc(a.a)}</span>`,hint:a.hint||''});
const fnNum=(ask,a,show)=>({kind:'num',ask,show:show||'',a:String(a),ah:`<span class="wordbig">${a}</span>`,hint:''});
const INDIA=[['National animal of India?','Tiger',['Lion','Elephant','Peacock']],['National bird of India?','Peacock',['Parrot','Eagle','Sparrow']],['National flower of India?','Lotus',['Rose','Marigold','Jasmine']],
 ['National tree of India?','Banyan',['Neem','Mango','Peepal']],['Republic Day is celebrated on…','26 January',['15 August','2 October','14 November']],['Our Constitution came into force in…','1950',['1947','1952','1930']],
 ['National anthem of India?','Jana Gana Mana',['Vande Mataram','Saare Jahan Se Achha','Jai Ho']],['National song of India?','Vande Mataram',['Jana Gana Mana','Ae Mere Watan Ke Logon','Hum Honge Kamyab']],
 ['Capital of India?','New Delhi',['Mumbai','Kolkata','Pune']],['How many colours are in the Indian flag (not counting the chakra)?','3',['2','4','5']],['How many spokes does the Ashoka Chakra have?','24',['12','16','32']],['National aquatic animal of India?','Ganges river dolphin',['Whale','Crocodile','Turtle']]];
function evQ(kind){
  if(kind==='angles'){const t=rnd(0,2);if(t===0){const a=rnd(1,35)*5;const c=a<90?'Acute':a===90?'Right':a<180?'Obtuse':'Straight';return fnPick({ask:`A kite string makes an angle of ${a}° with the ground. What kind of angle is it?`,a:c,show:'🪁'},['Acute','Right','Obtuse','Straight'])}
    if(t===1){const a=rnd(2,17)*5;return fnNum(`Two angles make a right angle. One is ${a}°. What is the other?`,90-a,'📐')}const q=rnd(1,3);return fnNum(`Your kite turns ${q} quarter turn${q>1?'s':''} clockwise. How many degrees is that?`,q*90,'🪁')}
  if(kind==='india'){const r=one(INDIA);return fnPick({ask:r[0],a:r[1],show:'🇮🇳'},[r[1]].concat(r[2]))}
  if(kind==='tables'){const a=rnd(6,9),b=rnd(6,12);return fnNum(`${a} × ${b} = ?`,a*b,'☀️')}
  if(kind==='rain'){const t=rnd(0,2),d=[rnd(10,60),rnd(10,60),rnd(10,60)];if(t===0)return fnNum(`It rained ${d[0]} mm on Monday and ${d[1]} mm on Tuesday. How much rain in all (mm)?`,d[0]+d[1],'🌧️');
    if(t===1){const a=Math.max(d[0],d[1]),b=Math.min(d[0],d[1]);return fnNum(`Lonavala got ${a} mm and Pune got ${b} mm. How much more did Lonavala get?`,a-b,'⛈️')}const s=rnd(4,20)*3;return fnNum(`${s} mm of rain fell over 3 days, the same each day. How much fell each day?`,s/3,'☔')}
  if(kind==='modak'){const t=rnd(0,2);if(t===0){const a=rnd(3,9),b=rnd(3,9);return fnNum(`Bappa has ${a} plates with ${b} modaks on each. How many modaks?`,a*b,'🥟'.repeat(Math.min(a,6)))}
    if(t===1){const n=rnd(2,6),k=n*rnd(2,8);return fnNum(`${k} modaks shared equally among ${n} friends. How many each?`,k/n,'🥟')}const a=rnd(15,60),b=rnd(5,a-5);return fnNum(`Aai made ${a} modaks. ${b} were eaten. How many are left?`,a-b,'🥟')}
  if(kind==='calendar'){const t=rnd(0,2);const ML=[['January',31],['February (not a leap year)',28],['March',31],['April',30],['June',30],['September',30],['November',30],['December',31]];
    if(t===0){const m=one(ML);return fnNum(`How many days are in ${m[0]}?`,m[1],'📅')}if(t===1){const n=one([7,14,21,28]);return fnPick({ask:`Today is Monday. What day will it be after ${n+rnd(0,6)===n?n:n} days?`,a:'Monday'},['Monday','Tuesday','Sunday','Friday'])}
    const y=one([2024,2025,2026,2027,2028,2030,2032]);return fnPick({ask:`Is ${y} a leap year?`,a:y%4===0?'Yes':'No'},['Yes','No'])}
  return fnNum('2 + 2 = ?',4)}
let ev=null;
function rangoliRound(){const n=6,h=n/2,cells=[];for(let r=0;r<n;r++)for(let c=0;c<h;c++)if(Math.random()<.4)cells.push([r,c]);if(cells.length<3)cells.push([0,0],[2,1],[4,2]);return{cells,tap:[]}}
function eventsView(){if(ev)return evPlay();const got=funGet().events||{};
  return `<section class="stack"><h1>${FUNT('Festival events','सणांचे कार्यक्रम','त्योहारों के आयोजन')}</h1><p class="muted">${FUNT('Each festival brings a special game for a few weeks. Score 8 or more to win its badge.','प्रत्येक सणाला काही आठवड्यांसाठी खास खेळ. बॅजसाठी ८ किंवा जास्त.','हर त्योहार कुछ हफ़्तों के लिए ख़ास खेल लाता है। बैज के लिए 8 या ज़्यादा।')}</p></section>
  <div class="grid">${EVENTS.map(e=>{const on=evActive(e);return `<div class="card stack ev${on?' on':''}"><span class="boss-e">${e.e}</span><b>${e.name}</b><small>${on?FUNT('On now!','आत्ता सुरू!','अभी चालू!'):FUNT('Comes back on ','पुन्हा: ','फिर से: ')+e.from.split('-').reverse().join('/')}${got[e.id]?' · 🏅':''}</small>
   <button class="btn ${on?'go':''}" data-act="evgo" data-id="${e.id}">${on?FUNT('Play','खेळ','खेलो'):FUNT('Practice round','सराव फेरी','अभ्यास राउंड')}</button></div>`}).join('')}</div>`}
function evPlay(){const E=EVENTS.find(x=>x.id===ev.id);
  if(ev.n>=10){const win=ev.right>=8&&evActive(E);return `<section class="card stack center"><span class="boss-e big">${win?'🏅':E.e}</span><h1>${ev.right} / 10</h1><p>${win?FUNT('Badge won!','बॅज मिळाला!','बैज मिला!'):evActive(E)?FUNT('Score 8 to win the badge. Try again!','बॅजसाठी ८ हवे. पुन्हा प्रयत्न कर!','बैज के लिए 8 चाहिए। फिर कोशिश करो!'):FUNT('Practice round done. The badge is available during the festival.','सराव फेरी झाली. बॅज सणाच्या काळात मिळतो.','अभ्यास राउंड पूरा। बैज त्योहार के समय मिलता है।')}</p>
   ${win?cardOffer({emoji:E.e,title:`${funWho()} won the ${E.name} badge!`,sub:`${ev.right} out of 10`}):''}<div class="row" style="justify-content:center"><button class="btn" data-act="evback">${FUNT('All events','सर्व कार्यक्रम','सभी आयोजन')}</button></div></section>`}
  const head=`<div class="row"><h3 style="margin-right:auto">${E.e} ${E.name}</h3><span class="pill">${ev.n+1} / 10</span><button class="btn ghost" data-act="evback">${FUNT('Stop','थांब','रुको')}</button></div>`;
  if(E.kind==='rangoli'){const R=ev.rg,n=6;return `<section class="card stack">${head}<div class="ask">${FUNT('Finish the rangoli: tap the right side to make it a mirror image.','रांगोळी पूर्ण कर: उजवी बाजू आरशासारखी कर.','रंगोली पूरी करो: दाईं ओर दर्पण जैसा बनाओ।')}</div>
   <div class="rangoli" role="grid">${Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>{const left=c<n/2,on=left?R.cells.some(x=>x[0]===r&&x[1]===c):R.tap.some(x=>x[0]===r&&x[1]===c);
     return `<button class="rg${left?' fixed':''}${on?' on':''}" ${left||ev.fb?'disabled':''} data-act="rgtap" data-r="${r}" data-c="${c}" aria-label="Row ${r+1} column ${c+1}${on?' coloured':''}"></button>`}).join('')).join('')}</div>
   ${ev.fb?`<div class="fb ${ev.fb[0]?'ok':'bad'}"><b>${ev.fb[0]?FUNT('Perfect mirror!','अचूक आरसा!','सही दर्पण!'):FUNT('Not quite a mirror.','अजून आरसा नाही.','अभी दर्पण नहीं।')}</b></div><button class="btn go" data-act="evnext">${FUNT('Next','पुढे','आगे')}</button>`:`<button class="btn go" data-act="rgcheck">${FUNT('Check','तपास','जाँचो')}</button>`}</section>`}
  const q=ev.q;return `<section class="card stack">${head}${q.show?`<div class="showbox">${q.show}</div>`:''}<div class="ask">${esc(q.ask)}</div>${ev.fb?`<div class="fb ${ev.fb[0]?'ok':'bad'}"><b>${ev.fb[0]?FUNT('Yes!','बरोबर!','सही!'):FUNT('The answer is','उत्तर आहे','जवाब है')}</b> ${ev.fb[0]?'':q.ah}</div><button class="btn go" data-act="evnext">${FUNT('Next','पुढे','आगे')}</button>`:qBody(q,ev,'ev')}</section>`}
qActs('ev',()=>ev,ok=>{if(ok)ev.right++;ev.fb=[ok];render()});
Object.assign(acts,{
  evgo(d){const E=EVENTS.find(x=>x.id===d.id);ev={id:d.id,n:0,right:0,fb:null,input:'',built:[]};if(E.kind==='rangoli')ev.rg=rangoliRound();else ev.q=evQ(E.kind);render()},
  evnext(){const E=EVENTS.find(x=>x.id===ev.id);ev.n++;ev.fb=null;ev.input='';ev.built=[];if(ev.n<10){if(E.kind==='rangoli')ev.rg=rangoliRound();else ev.q=evQ(E.kind)}
    else{addStars(ev.right);if(ev.right>=8&&evActive(E)){const f=funGet();f.events=f.events||{};f.events[E.id]=today();funSave(f)}}render()},
  evback(){ev=null;render()},
  rgtap(d){const t=ev.rg.tap,r=+d.r,c=+d.c,i=t.findIndex(x=>x[0]===r&&x[1]===c);if(i<0)t.push([r,c]);else t.splice(i,1);render()},
  rgcheck(){const n=6,want=ev.rg.cells.map(([r,c])=>r+','+(n-1-c)).sort().join('|'),got=ev.rg.tap.map(([r,c])=>r+','+c).sort().join('|');const ok=want===got;if(ok)ev.right++;ev.fb=[ok];render()}});

/* ---------- 6. Read-aloud stars ---------- */
const READS={en:['The cat sat on the mat.','I can see a big red bus.','My friend has a blue kite.','We play cricket in the park.','The sun is hot in May.','Please close the door.','Birds fly high in the sky.','I like to read stories at night.'],
 mr:['मी शाळेत जातो.','आई पोळी करते.','बाबा पेपर वाचतात.','आकाशात पक्षी उडतात.','माझा मित्र हुशार आहे.','पावसात मोर नाचतो.','आम्ही बागेत खेळतो.'],
 hi:['मैं स्कूल जाता हूँ।','माँ रोटी बनाती है।','पापा अख़बार पढ़ते हैं।','आसमान में पक्षी उड़ते हैं।','मेरा दोस्त होशियार है।','बारिश में मोर नाचता है।','हम बाग़ में खेलते हैं।']};
let rdS={lang:'en',i:0,heard:null,listening:false};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const normW=t=>String(t).toLowerCase().replace(/[.,!?।"'“”‘’]/g,'').split(/\s+/).filter(Boolean);
function readView(){const s=READS[rdS.lang][rdS.i%READS[rdS.lang].length],words=normW(s),heard=rdS.heard?normW(rdS.heard):null,raw=s.replace(/[।.!?]$/,'').split(/\s+/);
  const ok=heard?words.map(w=>heard.indexOf(w)>=0):null,n=ok?ok.filter(Boolean).length:0;
  return `<section class="stack"><h1>${FUNT('Read-aloud stars','मोठ्याने वाचा, तारे मिळवा','ज़ोर से पढ़ो, सितारे पाओ')}</h1><p class="muted">${FUNT('Tap the microphone and read the sentence. Each word the phone hears correctly is a star.','माइकवर टॅप करून वाक्य वाच. फोनला बरोबर ऐकू आलेला प्रत्येक शब्द म्हणजे एक तारा.','माइक दबाकर वाक्य पढ़ो। फ़ोन जो शब्द सही सुनेगा, हर शब्द एक सितारा।')}</p></section>
  <div class="tabs">${Object.entries({en:'English',mr:'मराठी',hi:'हिंदी'}).map(([k,v])=>`<button class="btn" data-act="rdlang" data-l="${k}" aria-pressed="${rdS.lang===k}">${v}</button>`).join('')}</div>
  <section class="card stack center"><div class="rd-sent${rdS.lang!=='en'?' dev':''}">${raw.map((w,i)=>`<span class="${ok?ok[i]?'rd-ok':'rd-no':''}">${esc(w)}</span>`).join(' ')}</div>
  ${SR?`<button class="btn go big rd-mic${rdS.listening?' on':''}" data-act="rdlisten">${rdS.listening?FUNT('Listening…','ऐकतोय…','सुन रहा हूँ…'):'🎤 '+FUNT('Read it','वाच','पढ़ो')}</button>`:`<p class="pill bad">${FUNT('This browser cannot listen. Try Chrome on an Android phone.','हा ब्राउझर ऐकू शकत नाही. Android वरील Chrome वापरून पाहा.','यह ब्राउज़र सुन नहीं सकता। Android पर Chrome आज़माएँ।')}</p>`}
  ${canSay?`<button class="btn" data-act="rdhear">🔊 ${FUNT('Hear it first','आधी ऐक','पहले सुनो')}</button>`:''}
  ${heard?`<p><b>${n} / ${words.length}</b> ⭐ · <span class="small muted">${FUNT('Heard:','ऐकलं:','सुना:')} “${esc(rdS.heard)}”</span></p><button class="btn" data-act="rdnext">${FUNT('Next sentence','पुढचं वाक्य','अगला वाक्य')}</button>`:''}
  <p class="small muted">${FUNT('Uses your phone browser’s own speech service. Nothing is recorded or saved by this website.','तुमच्या फोनच्या ब्राउझरची स्वतःची सेवा वापरते. ही वेबसाइट काहीही रेकॉर्ड किंवा जतन करत नाही.','आपके फ़ोन ब्राउज़र की अपनी सेवा का उपयोग करता है। यह वेबसाइट कुछ भी रिकॉर्ड या सेव नहीं करती।')}</p></section>`}
Object.assign(acts,{
  rdlang(d){rdS={lang:d.l,i:0,heard:null,listening:false};render()},
  rdnext(){rdS.i++;rdS.heard=null;render()},
  rdhear(){say(READS[rdS.lang][rdS.i%READS[rdS.lang].length],{en:'en-IN',mr:'mr-IN',hi:'hi-IN'}[rdS.lang])},
  rdlisten(){if(!SR||rdS.listening)return;const r=new SR();r.lang={en:'en-IN',mr:'mr-IN',hi:'hi-IN'}[rdS.lang];r.interimResults=false;r.maxAlternatives=1;rdS.listening=true;render();
    r.onresult=e=>{rdS.heard=e.results[0][0].transcript;const s=READS[rdS.lang][rdS.i%READS[rdS.lang].length],w=normW(s),h=normW(rdS.heard);addStars(w.filter(x=>h.indexOf(x)>=0).length)};
    r.onerror=e=>{toast(e.error==='not-allowed'?FUNT('Please allow the microphone to use this.','हे वापरण्यासाठी मायक्रोफोनला परवानगी द्या.','इसके लिए माइक्रोफ़ोन की अनुमति दें।'):FUNT('Could not hear. Try again in a quiet place.','ऐकू आलं नाही. शांत ठिकाणी पुन्हा करा.','सुनाई नहीं दिया। शांत जगह पर फिर कोशिश करें।'),true)};
    r.onend=()=>{rdS.listening=false;render()};try{r.start()}catch(e){rdS.listening=false;render()}}});

/* ---------- 8. Monthly open challenge ---------- */
let chl=null;
const monthKey=()=>today().slice(0,7);
function chlQs(level){const seed=monthKey().split('-').reduce((a,b)=>a*100+ +b,0)+(level==='senior'?7:3);
  return withSeed(seed,()=>{const mods=level==='senior'?['maths','grammar']:['maths'],chs=level==='senior'?{maths:[5,7,8,11,12,13,14],grammar:[3,5,6,7]}:{maths:[1,2,3,6,10],grammar:[]};const out=[];let g=0;
    while(out.length<10&&g++<300){const m=one(mods.filter(x=>chs[x].length)),c=chOf(m,one(chs[m]));if(!c)continue;const q=one(one(c.sets).make());if(q.kind!=='build'&&!out.some(x=>x.ask===q.ask&&x.show===q.show))out.push(q)}return out})}
function challengeView(){const best=ls.get('ct_chl_'+monthKey())||null,mname=new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  if(!chl)return `<section class="card stack center chl-hero"><span class="boss-e big">🏆</span><h1>${FUNT('Hinjawadi Maths Challenge','हिंजवडी गणित आव्हान','हिंजवडी गणित चुनौती')}</h1><p class="lead">${mname} · ${FUNT('10 questions, new every month, free for every child.','१० प्रश्न, दर महिन्याला नवीन, सर्व मुलांसाठी मोफत.','10 सवाल, हर महीने नए, हर बच्चे के लिए मुफ़्त।')}</p>
   ${best?`<p class="pill ok">${FUNT('Your best this month:','या महिन्यातील तुझा सर्वोत्तम:','इस महीने तुम्हारा सबसे अच्छा:')} ${best.s}/10 ${FUNT('in','वेळ','समय')} ${best.t}s</p>`:''}
   <div class="row" style="justify-content:center"><button class="btn go big" data-act="chlgo" data-l="junior">${FUNT('Junior (Grades 1–3)','ज्युनियर (इयत्ता १–३)','जूनियर (कक्षा 1–3)')}</button><button class="btn go big" data-act="chlgo" data-l="senior">${FUNT('Senior (Grades 4–7)','सीनियर (इयत्ता ४–७)','सीनियर (कक्षा 4–7)')}</button></div></section>`;
  if(chl.done){const t=Math.round((chl.end-chl.start)/1000);return `<section class="card stack center"><span class="boss-e big">${chl.right>=8?'🥇':chl.right>=5?'🥈':'🌟'}</span><h1>${chl.right} / 10</h1><p>${FUNT('Time','वेळ','समय')}: ${t}s</p>
   ${cardOffer({emoji:'🏆',title:`${funWho()} scored ${chl.right}/10 in the ${mname} Maths Challenge!`,sub:`${chl.level==='senior'?'Senior':'Junior'} · ${t} seconds · Can you beat it?`})}
   <section class="card stack chl-send"><h3>${FUNT('Want Chetana ma’am’s tips?','चेतना मॅडमच्या टिप्स हव्यात?','चेतना मैडम की टिप्स चाहिए?')}</h3><p class="small muted">${FUNT('Grown-ups: send the result to Chetana and she will reply on WhatsApp. Optional.','पालकांसाठी: निकाल चेतना यांना पाठवा, त्या WhatsApp वर उत्तर देतील. ऐच्छिक.','माता-पिता के लिए: नतीजा चेतना को भेजें, वे WhatsApp पर जवाब देंगी। वैकल्पिक।')}</p>
   ${chl.sent?`<p class="pill ok">${FUNT('Sent. Thank you!','पाठवलं. धन्यवाद!','भेज दिया। धन्यवाद!')}</p>`:`<form class="row" data-form="chlsend"><label>${FUNT('Child’s first name','मुलाचे पहिले नाव','बच्चे का पहला नाम')}<input id="cs-n" maxlength="20" value="${esc(kid?kid.name:'')}"></label><label>${FUNT('Parent’s WhatsApp','पालकांचा WhatsApp','माता-पिता का WhatsApp')}<input id="cs-p" type="tel" maxlength="16"></label><label class="hp" aria-hidden="true">Web<input id="cs-w" tabindex="-1"></label><button class="btn navy">${FUNT('Send','पाठवा','भेजें')}</button></form>`}</section>
   <div class="row" style="justify-content:center"><button class="btn" data-act="chlback">${FUNT('Play again','पुन्हा खेळ','फिर खेलो')}</button></div></section>`}
  const q=chl.qs[chl.i];return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">🏆 ${chl.level==='senior'?'Senior':'Junior'}</h3><span class="pill">${chl.i+1} / 10</span><span class="pill">⏱ <span id="chlt">0</span>s</span></div>
  ${q.show?`<div class="showbox">${q.show}</div>`:''}<div class="ask">${esc(q.ask)}</div>${qBody(q,chl,'ch')}</section>`}
qActs('ch',()=>Object.assign(chl,{q:chl.qs[chl.i],fb:null}),ok=>{if(ok)chl.right++;chl.i++;chl.input='';chl.built=[];
  if(chl.i>=10){chl.done=true;chl.end=Date.now();const t=Math.round((chl.end-chl.start)/1000),k='ct_chl_'+monthKey(),b=ls.get(k);if(!b||chl.right>b.s||(chl.right===b.s&&t<b.t))ls.set(k,{s:chl.right,t});addStars(chl.right)}render()});
setInterval(()=>{const el=document.getElementById('chlt');if(el&&chl&&!chl.done)el.textContent=Math.round((Date.now()-chl.start)/1000)},1000);
Object.assign(acts,{
  chlgo(d){Promise.all([loadMod('maths'),loadMod('grammar')]).then(()=>{chl={level:d.l,qs:chlQs(d.l),i:0,right:0,input:'',built:[],start:Date.now()};render();window.scrollTo(0,0)})},
  chlback(){chl=null;render()}});
Object.assign(forms,{chlsend(){const t=Math.round((chl.end-chl.start)/1000);
  S.lead({id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),parent:'(from monthly challenge)',child:val('cs-n'),grade:chl.level==='senior'?'Grades 4–7':'Grades 1–3',phone:val('cs-p'),source:'Monthly challenge',web:val('cs-w'),
    note:`${monthKey()} challenge: ${chl.right}/10 in ${t}s`}).then(()=>{chl.sent=true;render()}).catch(()=>toast(FUNT('Could not send. Try WhatsApp instead.','पाठवता आलं नाही. WhatsApp वापरा.','भेज नहीं पाए। WhatsApp आज़माएँ।'),true))}});

/* ---------- 9. Invite a friend ---------- */
function inviteView(){return `<section class="card stack center"><span class="boss-e big">👫</span><h1>${FUNT('Invite a friend','मित्राला बोलव','दोस्त को बुलाओ')}</h1><p class="muted">${FUNT('Play Kids’ World together: bosses, islands, the monthly challenge. It’s free.','किड्स वर्ल्ड एकत्र खेळा: बॉस, बेटं, मासिक आव्हान. मोफत आहे.','किड्स वर्ल्ड साथ खेलो: बॉस, द्वीप, मासिक चुनौती। मुफ़्त है।')}</p>
  ${cardOffer({emoji:'🏝️',title:`${funWho()} invites you to Kids’ World!`,sub:FUNT('Islands, boss battles and a monthly challenge','बेटं, बॉस लढाया आणि मासिक आव्हान','द्वीप, बॉस मुकाबले और मासिक चुनौती')})}
  <a class="btn" href="https://wa.me/?text=${encodeURIComponent('Come and play Kids’ World with me! Boss battles, islands and a free monthly maths challenge: '+SITE+'#world')}" target="_blank" rel="noopener">${FUNT('Send the link on WhatsApp','लिंक WhatsApp वर पाठवा','लिंक WhatsApp पर भेजें')}</a></section>`}

/* ---------- Fun zone hub (shown in Kids' World) ---------- */
function funZone(){const z=[['buddy','🐣',FUNT('Study buddy','अभ्यास-मित्र','पढ़ाई-दोस्त')],['island','🏝️',FUNT('My island','माझं बेट','मेरा द्वीप')],['boss','🐉',FUNT('Boss battles','बॉस लढाई','बॉस मुकाबला')],
  ['duel','🥊',FUNT('Beat your parent','पालकांना हरव','माता-पिता को हराओ')],['events','🎉',FUNT('Festival events','सणांचे खेळ','त्योहारों के खेल')],['read','🎤',FUNT('Read aloud','मोठ्याने वाचा','ज़ोर से पढ़ो')],
  ['challenge','🏆',FUNT('Monthly challenge','मासिक आव्हान','मासिक चुनौती')],['invite','👫',FUNT('Invite a friend','मित्राला बोलव','दोस्त को बुलाओ')]];
  const on=EVENTS.find(evActive);
  return `${buddyMini()}${on?`<a class="ev-banner" href="#events"><span>${on.e}</span><b>${on.name}</b><em>${FUNT('On now!','आत्ता सुरू!','अभी चालू!')}</em></a>`:''}<div class="funzone">${z.map(([v,e,n])=>`<a class="fz" href="#${v}"><span>${e}</span>${n}</a>`).join('')}</div>`}
window.funView=v=>v==='buddy'?buddyView():v==='island'?islandView():v==='boss'?bossView():v==='duel'?duelView():v==='events'?eventsView():v==='read'?readView():v==='challenge'?challengeView():inviteView();
window.funZone=funZone;window.buddyMini=buddyMini;window.funMount=v=>{if(v==='island')mountIsland();else unmountIsland()};
window.funReset=()=>{boss=null;duel=null;ev=null;chl=null};
window.funReady=true;
