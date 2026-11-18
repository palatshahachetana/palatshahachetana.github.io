"use strict";
/* ====== SETTINGS ======
   Leave SYNC_URL empty to keep all data on this device only.
   To share data across devices for free, paste your Google Apps Script web-app URL here (see README). */
const SYNC_URL=(window.CT_CONFIG&&window.CT_CONFIG.SYNC_URL)||'';
const WA='https://wa.me/919730195429?text='+encodeURIComponent("Hi, I'd like to book a free demo class");
const LEVELS=['Not set','1 · Sound Explorer','2 · Letter Detective','3 · Word Builder','4 · Team Reader','5 · Story Reader','6 · Young Writer'];

/* ====== helpers ====== */
const app=document.getElementById('app');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mem={};
const ls={get(k){try{const v=localStorage.getItem(k);if(v!=null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:null},
          set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const newId=p=>p+Date.now().toString(36)+Math.floor(Math.random()*1e3).toString(36);
const show=v=>String(v).replace('-','−');
const KEEP=['progress','stars','sessions','teach'];

/* ====== data store: this device, or a Google Sheet through Apps Script ====== */
const TK=['students','enquiries','batches','classes','fees'];
const blank=()=>({tpin:null,students:{},enquiries:{},batches:{},classes:{},fees:{}});
const db=()=>Object.assign(blank(),ls.get('ct_data')||{});
function tcheck(d,pin){if(!d.tpin)d.tpin=pin;if(d.tpin!==pin)throw Error('Wrong PIN')}
const Local={
  async names(){return Object.values(db().students).filter(s=>s.status!=='left').map(s=>({id:s.id,name:s.name}))},
  async login(id,pin,name){const n=String(name||'').trim().toLowerCase(),s=id?db().students[id]:Object.values(db().students).find(x=>x.status!=='left'&&x.name.trim().toLowerCase()===n&&x.pin===pin);if(!s||s.pin!==pin||s.status==='left')throw Error('Wrong PIN');return s},
  async sSave(id,pin,patch){const d=db(),s=d.students[id];if(!s||s.pin!==pin)throw Error('Wrong PIN');KEEP.forEach(k=>{if(k in patch)s[k]=patch[k]});ls.set('ct_data',d)},
  async tAll(pin){const d=db();tcheck(d,pin);ls.set('ct_data',d);const o={};TK.forEach(k=>o[k]=Object.values(d[k]));return o},
  async tPut(pin,kind,o){const d=db();tcheck(d,pin);if(TK.indexOf(kind)<0)throw Error('Bad request');if(kind==='students'&&!o.pin&&d.students[o.id])o.pin=d.students[o.id].pin;const old=d[kind][o.id];if(kind==='students'&&old)KEEP.forEach(k=>{if(k in old)o[k]=old[k]});d[kind][o.id]=o;ls.set('ct_data',d);return o},
  async tDel(pin,kind,id){const d=db();tcheck(d,pin);delete d[kind][id];ls.set('ct_data',d)},
  async lead(o){if(o.web)return;const d=db(),id='w_'+o.id;d.enquiries[id]={id,parent:o.parent||'(not given)',child:o.child||'',grade:o.grade||'',phone:o.phone||'',source:o.source,note:o.note||'',status:'New',date:today()};ls.set('ct_data',d)}
};
async function call(action,p,tries){tries=tries==null?1:tries;let r;
  const ctl=typeof AbortController!=='undefined'?new AbortController():null,t=ctl&&setTimeout(()=>ctl.abort(),20000);
  try{r=await fetch(SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},p)),signal:ctl&&ctl.signal})}
  catch(e){if(tries>0){await new Promise(z=>setTimeout(z,1500));return call(action,p,tries-1)}throw Error('offline')}
  finally{if(t)clearTimeout(t)}
  let j;try{j=await r.json()}catch(e){throw Error('offline')}
  if(!j.ok)throw Error(j.error||'Something went wrong');return j.data}
const Remote={names:async()=>[],login:(id,pin,name)=>call('login',{id,pin,name}),sSave:(id,pin,patch)=>call('sSave',{id,pin,patch}),
  tAll:pin=>call('tAll',{pin}),tPut:(pin,kind,o)=>call('tPut',{pin,kind,o}),tDel:(pin,kind,id)=>call('tDel',{pin,kind,id}),lead:o=>call('lead',{o})};
const S=SYNC_URL?Remote:Local;

/* ====== study missions ====== */
const fmtN=n=>n<0?'(−'+(-n)+')':String(n);
const word=n=>n>=0?'earn '+n:'owe '+(-n);
const ED={t:'After a quiet, whispery sound, -ed sounds like t.',d:'After a buzzing sound or a vowel, -ed sounds like d.',id:'After t or d, -ed adds a beat: id.'};
const G={
 tables:{name:'Times tables',sub:'Only 6 really hard facts',teach:'Explain to someone at home why 7 × 8 = 56.',
  items:[[6,6,'6 × 5 = 30, plus one more 6'],[6,7,'6 × 6 = 36, plus one more 6'],[6,8,'Double 6 × 4: 24, then 48'],[7,7,'7 × 5 = 35, plus 7 × 2 = 14'],[7,8,'5, 6, 7, 8: 56 = 7 × 8'],[8,8,'Double 8 × 4: 32, then 64'],
   [9,6,'10 × 6 = 60, minus 6'],[9,7,'10 × 7 = 70, minus 7'],[9,8,'10 × 8 = 80, minus 8'],[4,7,'Double 7 is 14, double again'],[4,8,'Double 8 is 16, double again'],[3,7,'Double 7 is 14, plus one more 7'],[3,8,'Double 8 is 16, plus one more 8'],[5,8,'Half of 10 × 8 = 80']]
   .map(([a,b,h])=>({id:'t'+a+'x'+b,label:a+' × '+b,q:a+' × '+b,q2:b+' × '+a,type:'pad',a:String(a*b),hint:h+' → '+a*b}))},
 owe:{name:'Earn and owe',sub:'Plus and minus numbers as money',sign:true,teach:'Play shop at home: show how earn 3 and owe 7 leaves you owing 4.',
  items:[[5,-3],[-4,6],[-2,-3],[3,-7],[8,-8],[-6,2],[-5,-4],[7,-2],[-9,4],[2,-6],[-1,-7],[-3,9]]
   .map(([a,b])=>{const s=a+b;return{id:'o'+a+'_'+b,label:fmtN(a)+' + '+fmtN(b),q:fmtN(a)+' + '+fmtN(b),type:'pad',a:String(s),
     hint:word(a).replace(/^./,c=>c.toUpperCase())+', '+word(b)+'. '+(s>0?'You have '+s+' left.':s<0?'You still owe '+(-s)+', so −'+(-s)+'.':'Nothing left: 0.')}})},
 roof:{name:'Open roof letters',sub:'Marathi and Hindi look-alikes',dev:true,teach:'Show someone the letters with an open roof and explain how you spot them.',
  items:[
   {id:'r_dha',label:'ध (dha)',q:'Which letter says "dha"?',opts:['घ','ध'],a:'ध',hint:'ध has a gap in its roof. घ has a full roof.'},
   {id:'r_gha',label:'घ (gha)',q:'Which letter says "gha"?',opts:['घ','ध'],a:'घ',hint:'घ has a full roof. ध has a gap.'},
   {id:'r_bha',label:'भ (bha)',q:'Which letter says "bha"?',opts:['म','भ'],a:'भ',hint:'भ has a gap in its roof. म has a full roof.'},
   {id:'r_ma',label:'म (ma)',q:'Which letter says "ma"?',opts:['म','भ'],a:'म',hint:'म has a full roof. भ has a gap.'},
   {id:'r_kha',label:'ख (kha)',q:'Which one is the single letter "kha"?',opts:['रव','ख'],a:'ख',hint:'ख holds hands: its two parts are joined. र and व stand apart.'},
   {id:'r_ghar',label:'घर (ghar)',q:'Which word is "ghar" (house)?',opts:['धर','घर'],a:'घर',hint:'"gha" has a full roof: घर.'},
   {id:'r_dhan',label:'धन (dhan)',q:'Which word is "dhan" (wealth)?',opts:['धन','घन'],a:'धन',hint:'"dha" has a gap in its roof: धन.'},
   {id:'r_bhat',label:'भात (bhaat)',q:'Which word is "bhaat" (rice)?',opts:['मात','भात'],a:'भात',hint:'"bha" has a gap in its roof: भात.'}
  ].map(x=>Object.assign(x,{type:'choice'}))},
 ed:{name:'One spelling, three sounds',sub:'How -ed really sounds',teach:'Do the throat test for "jumped", "played" and "wanted" with someone at home.',
  items:[['walked','t'],['jumped','t'],['washed','t'],['kicked','t'],['played','d'],['called','d'],['opened','d'],['cleaned','d'],['wanted','id'],['needed','id'],['painted','id'],['started','id']]
   .map(([w,a])=>({id:'e_'+w,label:w,q:w,type:'choice',opts:['t','d','id'],a,hint:ED[a]}))},
 magic:{name:'Magic e',sub:'One letter changes the word',teach:'Show how adding e turns cap into cape, and say what the e does.',
  items:[['You wear it on your head','cap','cape','cap'],['A superhero wears it on the back','cap','cape','cape'],['It flies in the sky on a string','kit','kite','kite'],['A box with all the things you need','kit','kite','kit'],
   ['Jump on one foot','hop','hope','hop'],['To wish for something good','hop','hope','hope'],['You take a bath in it','tub','tube','tub'],['Toothpaste comes in it','tub','tube','tube'],['A tall tree with needles','pin','pine','pine'],['It is sharp and holds paper','pin','pine','pin']]
   .map(([q,o1,o2,a])=>({id:'m_'+a,label:a,q,long:true,type:'choice',opts:[o1,o2],a,hint:'Magic e makes the vowel say its name: '+o1+' becomes '+o2+'.'}))}
};
const GK=Object.keys(G);
function stat(s,gk){const p=s.progress||{},it=G[gk].items;return{total:it.length,m:it.filter(i=>p[i.id]&&p[i.id].s>=3).length,
  weak:it.filter(i=>p[i.id]&&p[i.id].w>0&&p[i.id].s<3).map(i=>i.label),tried:it.some(i=>p[i.id])}}
function streak(s){const set=new Set(s.sessions||[]);let n=0;const d=new Date();const key=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
  if(!set.has(key(d)))d.setDate(d.getDate()-1);while(set.has(key(d))){n++;d.setDate(d.getDate()-1)}return n}
function tricky(s){let out=[];GK.forEach(k=>out=out.concat(stat(s,k).weak));(s.mistakes||[]).filter(m=>!m.fixed).forEach(m=>out.push(m.text));return out}

/* ====== state ====== */
let view='home',msg='';
let kid=null,kidPin='',names=null,pick=null,buf='',sess=null,triedAuto=false,saveNote='';
let tpin='',tdata=null,tview='today',tsel=null,armed=null;

/* ====== views ====== */
function home(){return `
<section class="hero hasme"><img class="me" src="img/chetana.jpg" alt="Chetana, the teacher" width="420" height="525"><div><p class="eyebrow">Grades 1 to 10 · Sparklet, Megapolis, Hinjawadi and online</p><h1>Make learning fun, keep it strategic</h1>
<p>Chetana is a computer science engineer who chose teaching. She plans every child's term like a project and teaches each idea until the child can explain it back.</p>
<div class="row"><a class="btn go" href="#book">Book a free demo class</a><a class="btn" href="#check">Free 10-minute check</a></div></div></section>
<a class="ckban" href="#check"><span aria-hidden="true">🧭</span><span><b>Where does your child stand?</b><span>Take the free 10-minute starting check. Instant results: strengths and what to work on next.</span></span><em>Start</em></a>
<section class="grid facts">
<div class="card fact"><b>Grades 1–10</b><span>State, CBSE and ICSE</span></div>
<div class="card fact"><b>Languages</b><span>English, Marathi, Hindi</span></div>
<div class="card fact"><b>Maths &amp; Science</b><span>Concepts, tricks, practice</span></div>
<div class="card fact"><b>Small batches</b><span>In person or live online</span></div></section>
<section class="stack"><div class="row"><h2 style="margin-right:auto">Programmes</h2><a class="btn ghost" href="#programmes">All programmes</a></div>
<div class="grid">${PROGS.slice(0,3).map(progCard).join('')}</div></section>
<section class="stack"><h2>How she teaches</h2><div class="grid">
<div class="card step"><b>Concept</b>Each idea is explained from your child's own school book, simply.</div>
<div class="card step"><b>Practice</b>Oral and written practice in class, then self-study missions at home.</div>
<div class="card step"><b>Mastery</b>We move on only when your child can explain it back.</div></div>
<div class="grid">
<div class="card step"><b>Map</b>Syllabus and school test dates become one term roadmap.</div>
<div class="card step"><b>Chunk</b>Big chapters become small weekly goals.</div>
<div class="card step"><b>Play</b>Games, stories and challenges keep it fun.</div>
<div class="card step"><b>Review</b>Each child's own tricky spots are revised before every test.</div></div></section>
<a class="kwban" href="#world"><span class="kwban-isl" aria-hidden="true">🏝️</span><span><b>Enter Kids’ World</b><span>Spin the island map, pick a character, and play your way through every subject.</span></span></a>
<section class="card stack"><h2>Free learning library</h2><p>Try the same material Chetana uses in class. Every chapter has a concept to read and practice that checks itself.</p>
<div class="grid">
<a class="card lib" href="#phonics"><b>English reading and writing</b><span>7 phonics chapters for Grades 1–2, with games</span></a>
<a class="card lib" href="#grammar"><b>English grammar</b><span>9 chapters for Grade 3 and up, 50 questions each</span></a>
<a class="card lib" href="#maths"><b>Maths</b><span>14 chapters for Grade 3 and up, 50 questions each</span></a>
<a class="card lib" href="#bhasha"><b>Marathi &amp; Hindi</b><span>10 chapters: every letter, barakhadi, joint letters</span></a>
<a class="card lib" href="#kids"><b>Quick missions</b><span>Tables, earn and owe, Marathi letters, -ed, magic e</span></a></div></section>
${contactBlock()}`}
const PROGS=[
 {t:'School tuition',g:'Grades 1–10',d:'All subjects up to Grade 8, and English, Marathi and Hindi for Grades 9 and 10. Taught from your child’s own textbook and planned around school test dates.',p:['Term roadmap from the school syllabus','Revision before every unit test','Monthly progress report on WhatsApp']},
 {t:'Struggling readers',g:'Grades 1–2',d:'A 6-level phonics programme for children who find reading and writing hard, from hearing sounds to writing full sentences.',p:['10-minute starting check','Level badges parents can see','Reading speed measured every month']},
 {t:'Marathi and Hindi made easy',g:'Grades 1–10',d:'For children from non-Marathi families and anyone who fears the second or third language. Reading, writing, grammar and speaking.',p:['Look-alike letters fixed with simple tricks','Oral and written practice every class','Board-exam language preparation for Grades 9–10']},
 {t:'Maths mastery',g:'Grade 3 and up',d:'From addition to fractions, with the tricks that make numbers easy: tables to 20, speed tricks, LCM and HCF, and fraction operations.',p:['Concept first, then tricks','Real-life word problems','Self-study practice between classes']},
 {t:'Exam sprint',g:'January–February',d:'A short revision batch before final exams, built from each child’s own mistake bank so time goes where it is needed.',p:['Timed mock papers in school format','Personal revision sheet per child','Pre-exam note to parents']},
 {t:'Summer bridge',g:'April–May',d:'Get ready for the next grade: close the gaps from this year and preview next year’s first chapters.',p:['Gap check at the start','Reading and tables boost','Preview of next year’s book']}];
function progCard(x){return `<div class="card stack prog"><span class="pill">${x.g}</span><h3>${x.t}</h3><p>${x.d}</p><ul>${x.p.map(i=>`<li>${i}</li>`).join('')}</ul></div>`}
function programmes(){return `<section class="stack"><h1>Programmes</h1><p class="muted lead">Small batches at Sparklet, Megapolis, Hinjawadi, or live online. Simple monthly fees with no long-term lock-in. Ask on WhatsApp for timings and fees.</p></section>
<section class="grid">${PROGS.map(progCard).join('')}</section>
<section class="card stack"><h2>What every family gets</h2><div class="grid">
<div><b>Free demo class</b><p class="muted small">See the method before you decide.</p></div>
<div><b>Starting check</b><p class="muted small">In week one, so we know where your child stands.</p></div>
<div><b>Progress you can see</b><p class="muted small">Monthly report, stuck-alerts and a pre-exam note.</p></div>
<div><b>Practice at home</b><p class="muted small">The learning library, free for every student.</p></div></div></section>
${contactBlock()}`}
function about(){return `<section class="aboutme"><img class="me" src="img/chetana.jpg" alt="Chetana" width="420" height="525"><div class="stack"><h1>About Chetana</h1><p class="lead">An engineer who chose teaching, because she loves it.</p><p class="sig">“Every child can learn anything when the idea is explained the right way.”</p></div></section>
<section class="grid">
<div class="card step"><b>Engineer by training</b>Computer Science engineering graduate.</div>
<div class="card step"><b>Start-up experience</b>Worked with start-ups before turning to teaching.</div>
<div class="card step"><b>Teaching since the USA</b>Began teaching while living in the USA.</div>
<div class="card step"><b>Senior-grade teaching</b>Has taught Information Technology to Grade 11 and 12 students.</div></section>
<section class="quote"><span>Her special gift</span><p>From “I’m scared of Marathi” to “Can we read one more page?”</p><small>She turns a child’s fear of English, Marathi or Hindi into real love for the language, and is just as strong in Maths and Science.</small></section>
<section class="card stack"><h2>Why parents choose her</h2><ul class="ticks"><li>She plans each term like a project, so nothing is left to the last week.</li><li>She teaches from your child’s own book, whatever the school.</li><li>She uses technology where it helps: self-study practice, tracking and clear reports.</li><li>Small batches, so every child is heard.</li></ul></section>
${contactBlock()}`}
function learn(){return `<a class="kwban" href="#world"><span class="kwban-isl" aria-hidden="true">🏝️</span><span><b>Enter Kids’ World</b><span>The fun way in: a 3D island map for children.</span></span></a>
<section class="stack"><h1>Learning library</h1><p class="muted lead">Free for every student. Pick your name in Quick missions to save stars and progress, so Chetana can see what you have practised.</p></section>
<section class="grid">
<a class="card lib big" href="#phonics"><span class="pill">Grades 1–2</span><b>English reading and writing</b><span>7 chapters, from hearing sounds to writing sentences. Pictures, letter tiles and animations.</span></a>
<a class="card lib big" href="#grammar"><span class="pill">Grade 3 and up</span><b>English grammar</b><span>9 chapters: nouns, pronouns, tenses, adjectives and adverbs, articles, prepositions, agreement, punctuation, conjunctions. 50 questions each.</span></a>
<a class="card lib big" href="#maths"><span class="pill">Grade 3 and up</span><b>Maths</b><span>14 chapters with a concept page and 50 practice questions each, including real-life problems.</span></a>
<a class="card lib big" href="#bhasha"><span class="pill">Beginners, Grade 1 up</span><b>Marathi &amp; Hindi</b><span>10 chapters on the Devanagari script: every vowel and consonant, look-alikes, the full barakhadi, nasal marks, joint letters, words and numbers.</span></a>
<a class="card lib big" href="#kids"><span class="pill">All ages</span><b>Quick missions</b><span>10-question games: times tables, earn and owe, Marathi letters, -ed sounds, magic e.</span></a></section>
<section class="card stack"><h2>For teachers</h2><p class="muted">Each library has a Teacher guide tab with the big idea, how to teach it, and the mistakes to watch for.</p></section>`}
function contactBlock(){return `<section class="contact"><div><h2>Book a free demo class</h2><p>Sparklet, Megapolis, Hinjawadi, Pune · Live online classes too</p><p class="small">WhatsApp: wa.me/919730195429</p></div><div class="row"><a class="btn go" href="#book">Book a free demo</a><a class="btn" href="${WA}">Message on WhatsApp</a></div></section>`}

function pad(title,sub,needOk){return `<section class="card stack center"><h2>${esc(title)}</h2>${sub?`<p class="muted">${esc(sub)}</p>`:''}
<div class="dots" aria-label="${buf.length} digits entered">${'●'.repeat(buf.length)||' '}</div>
${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}
<div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="pd" data-d="${d}">${d}</button>`).join('')}
<button class="btn" data-act="pb" aria-label="Delete">⌫</button><button class="btn" data-act="pd" data-d="0">0</button>
${needOk?`<button class="btn go" data-act="po">OK</button>`:`<button class="btn" data-act="pcancel">Back</button>`}</div></section>`}

function kids(){
  if(sess)return game();
  if(kid)return kidHome();
  if(pick)return pad('Hi '+pick.name+'!','Enter your 4-digit PIN',false);
  if(!triedAuto){triedAuto=true;const sv=ls.get('ct_kid');if(sv){S.login(sv.id,sv.pin).then(s=>{kid=s;kidPin=sv.pin;render()}).catch(()=>{ls.set('ct_kid',null);render()});return `<p class="muted">Loading…</p>`}}
  return `<section class="stack"><h1>Kids' Zone</h1><p class="muted">Type your first name, then your secret PIN.</p>
  ${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}
  <form class="card stack" data-form="kidname"><label>My first name<input id="kn" required maxlength="20" autocomplete="off" autocapitalize="words" style="font-size:24px"></label>
  <button class="btn go big">Next</button><p class="small muted">Don’t have a PIN yet? Ask Chetana ma’am.</p></form></section>`}

function kidHome(){const st=streak(kid),tr=tricky(kid);return `
<section class="stack"><h1>Hi ${esc(kid.name)}!</h1>
<div class="grid"><div class="card center"><div class="stat">★ ${kid.stars||0}</div><div class="muted small">stars earned</div></div>
<div class="card center"><div class="stat">${st}</div><div class="muted small">day${st===1?'':'s'} in a row</div></div>
<div class="card center"><div class="stat">${kid.teach||0}</div><div class="muted small">teach-back missions</div></div></div>
${kid.note?`<div class="card"><b>From Chetana ma'am:</b> ${esc(kid.note)}</div>`:''}</section>
<section class="stack"><h2>Today's missions</h2><div class="grid">
${GK.map(k=>{const s=stat(kid,k);return `<div class="card stack"><h3>${G[k].name}</h3><p class="muted small">${G[k].sub}</p>
<div class="bar" role="img" aria-label="${s.m} of ${s.total} mastered"><i style="width:${s.m/s.total*100}%"></i></div><p class="small muted">${s.m} of ${s.total} mastered</p>
<button class="btn go" data-act="play" data-g="${k}">Play</button></div>`}).join('')}</div></section>
${tr.length?`<section class="card stack"><h2>My tricky ones</h2><p class="muted small">These come back more often until you beat them 3 times in a row.</p>
<div class="chips">${tr.map(t=>`<span class="pill bad dev">${esc(t)}</span>`).join('')}</div></section>`:''}
<div class="row"><button class="btn ghost" data-act="notme">Not ${esc(kid.name)}? Switch student</button></div>`}

function game(){const g=G[sess.g];
  if(sess.phase==='done')return `<section class="card stack center"><h1>Mission done!</h1>
  <div class="stat">★ ${sess.right} of ${sess.q.length}</div><p class="muted">${saveNote}</p>
  <div class="card stack"><h3>Teach-back mission</h3><p>${g.teach}</p>
  ${sess.taught?`<p class="pill ok">Well taught!</p>`:`<button class="btn navy" data-act="teach">I taught it to someone</button>`}</div>
  <div class="row" style="justify-content:center"><button class="btn go" data-act="play" data-g="${sess.g}">Play again</button><button class="btn" data-act="quit">Back to missions</button></div></section>`;
  const e=sess.q[sess.i],it=e.it;
  let body='';
  if(sess.phase==='ok')body=`<div class="fb ok" role="status"><b>Correct!</b>${show(it.a)}</div>`;
  else if(sess.phase==='bad')body=`<div class="fb bad" role="alert"><b>Not yet. The answer is <span class="${g.dev?'dev':''}">${show(it.a)}</span></b>${esc(it.hint)}</div>
   <button class="btn go" data-act="next">Got it</button>`;
  else if(it.type==='choice')body=`<div class="opts">${it.opts.map(o=>`<button class="btn ${g.dev?'dev':''}" data-act="ans" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  else body=`<div class="ans" aria-live="polite">${show(sess.input)||' '}</div>
   <div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="gp" data-d="${d}">${d}</button>`).join('')}
   <button class="btn" data-act="${g.sign?'gs':'gb'}" aria-label="${g.sign?'Plus or minus':'Delete'}">${g.sign?'±':'⌫'}</button><button class="btn" data-act="gp" data-d="0">0</button><button class="btn go" data-act="go">OK</button></div>
   ${g.sign?`<div class="center"><button class="btn ghost" data-act="gb">Delete</button></div>`:''}`;
  return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">${g.name}</h3><span class="pill">${sess.i+1} of ${sess.q.length}</span><button class="btn ghost" data-act="quit">Stop</button></div>
  <div class="bar"><i style="width:${sess.i/sess.q.length*100}%"></i></div>
  <div class="q ${it.long?'long':''}">${esc(e.text)}${it.type==='pad'?' = ?':''}</div>
  ${sess.g==='ed'&&sess.phase==='ask'?'<p class="center muted">How does the ending sound?</p>':''}
  ${body}</section>`}

/* ====== actions ====== */
function buildQueue(gk){const items=G[gk].items,p=kid.progress||{};const w=it=>{const x=p[it.id];return !x?3:(x.w>0&&x.s<3)?5:x.s>=3?1:2};
  const q=[];let last=null;for(let n=0;n<10;n++){const pool=items.filter(it=>it!==last);let r=Math.random()*pool.reduce((a,it)=>a+w(it),0),c=pool[0];
    for(const it of pool){r-=w(it);if(r<=0){c=it;break}}q.push({it:c,text:c.q2&&Math.random()<.5?c.q2:c.q});last=c}return q}
function saveKid(){saveNote='Saving…';const patch={progress:kid.progress,stars:kid.stars,sessions:kid.sessions,teach:kid.teach},who={id:kid.id,pin:kidPin};
  return S.sSave(who.id,who.pin,patch).then(()=>{saveNote='Progress saved.';ls.set('ct_pend',null)})
  .catch(e=>{if(/Wrong PIN|Too many/.test(e.message)){saveNote='Could not save: please sign in again.'}else{ls.set('ct_pend',{id:who.id,pin:who.pin,patch});saveNote='No internet right now. Your stars are kept on this device and will be saved automatically later.'}}).then(render)}
function flushPending(){const p=ls.get('ct_pend');if(!p||!SYNC_URL)return;S.sSave(p.id,p.pin,p.patch).then(()=>{ls.set('ct_pend',null)}).catch(()=>{})}
window.addEventListener('online',flushPending);setTimeout(flushPending,3000);
function answer(v){const it=sess.q[sess.i].it;kid.progress=kid.progress||{};const p=kid.progress[it.id]=kid.progress[it.id]||{r:0,w:0,s:0};
  if(v===it.a){p.r++;p.s++;sess.right++;kid.stars=(kid.stars||0)+1;sess.phase='ok';render();setTimeout(()=>{if(sess&&sess.phase==='ok')next()},700)}
  else{p.w++;p.s=0;sess.phase='bad';render()}}
function next(){sess.i++;sess.input='';if(sess.i>=sess.q.length){sess.phase='done';const d=today();kid.sessions=(kid.sessions||[]).filter(x=>x!==d).concat(d).slice(-90);saveKid()}else sess.phase='ask';render()}
function toast(t,bad){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
  el.textContent=t;el.className=bad?'show bad':'show';clearTimeout(el._t);el._t=setTimeout(()=>{el.className=''},6000)}
function tfail(e){const m=e.message==='Wrong PIN'?'Wrong PIN. Try again.':/Too many/.test(e.message)?e.message:e.message==='offline'?'No internet connection. Nothing was lost: check the connection and tap Save again.':'Could not save: '+e.message;
  if(!tdata){msg=m;render()}else toast(m,true)}
function putStudent(s){return S.tPut(tpin,'students',s).then(r=>{if(SYNC_URL&&r)s=r;const i=tdata.students.findIndex(x=>x.id===s.id);if(i<0)tdata.students.push(s);else tdata.students[i]=s;names=null;msg='';render()}).catch(tfail)}
const val=id=>document.getElementById(id).value.trim();

const acts={
  pick(d){pick=names.find(n=>n.id===d.id);buf='';msg='';render()},
  pcancel(){pick=null;buf='';msg='';render()},
  pd(d){if(buf.length>=(view==='kids'?4:8))return;buf+=d.d;msg='';
    if(view==='kids'&&buf.length===4){const p=buf,id=pick.id||'';buf='';render();S.login(id,p,pick.name).then(s=>{kid=s;kidPin=p;pick=null;ls.set('ct_kid',{id:s.id,pin:p});render()}).catch(e=>{pick=null;msg=e.message==='Wrong PIN'?'That name and PIN don\u2019t match. Check with Chetana ma\u2019am.':/Too many/.test(e.message)?e.message:'Could not log in. Check the internet.';render()});return}
    render()},
  pb(){buf=buf.slice(0,-1);render()},
  po(){const need=!SYNC_URL&&!db().tpin?6:4;if(buf.length<need){msg='Enter at least '+need+' digits.';render();return}const p=buf;buf='';S.tAll(p).then(d=>{tpin=p;tdata=d;msg='';render()}).catch(tfail)},
  notme(){kid=null;kidPin='';names=null;ls.set('ct_kid',null);render()},
  play(d){sess={g:d.g,q:buildQueue(d.g),i:0,right:0,input:'',phase:'ask'};saveNote='';render()},
  quit(){sess=null;render()},
  ans(d){if(sess.phase==='ask')answer(d.v)},
  gp(d){if(sess.phase!=='ask')return;if(sess.input.replace('-','').length<3)sess.input+=d.d;render()},
  gb(){sess.input=sess.input.slice(0,-1);render()},
  gs(){sess.input=sess.input[0]==='-'?sess.input.slice(1):'-'+sess.input;render()},
  go(){if(sess.phase!=='ask'||!/\d/.test(sess.input))return;answer(String(parseInt(sess.input,10)))},
  next(){next()},
  teach(){kid.teach=(kid.teach||0)+1;sess.taught=true;saveKid()},
  tlock(){tpin='';tdata=null;tsel=null;msg='';render()},
  ttab(d){tview=d.t;tsel=null;armed=null;msg='';render()},
  tsel(d){tsel=d.id;armed=null;render();window.scrollTo(0,0)},
  tback(){tsel=null;armed=null;render()},
  sample(){const mk=(name,grade)=>({id:newId('s'),name,grade,pin:'1234',level:0,note:'',mistakes:[]});
    putStudent(mk('Aarav','4')).then(()=>putStudent(mk('Siya','2')))},
  tdelstudent(){if(armed!=='s'){armed='s';render();return}const id=tsel;S.tDel(tpin,'students',id).then(()=>{tdata.students=tdata.students.filter(x=>x.id!==id);tsel=null;armed=null;names=null;render()}).catch(tfail)},
  mfix(d){const s=tdata.students.find(x=>x.id===tsel),m=s.mistakes.find(x=>x.id===d.id);m.fixed=!m.fixed;putStudent(s)},
  copyrep(){const t=document.getElementById('rep');const done=()=>{document.getElementById('copied').hidden=false};
    try{navigator.clipboard.writeText(t.value).then(done).catch(()=>{t.select()})}catch(e){t.select()}},
  edel(d){if(armed!==d.id){armed=d.id;render();return}S.tDel(tpin,'enquiries',d.id).then(()=>{tdata.enquiries=tdata.enquiries.filter(x=>x.id!==d.id);armed=null;render()}).catch(tfail)}
};
const forms={
  addstudent(){const pin=val('as-pin');if(!/^\d{4}$/.test(pin)){msg='The PIN must be 4 digits.';render();return}
    putStudent({id:newId('s'),name:val('as-name'),grade:val('as-grade'),pin,level:0,note:'',mistakes:[]})},
  savestudent(){const s=tdata.students.find(x=>x.id===tsel),pin=val('es-pin');if(!/^\d{4}$/.test(pin)){msg='The PIN must be 4 digits.';render();return}
    Object.assign(s,{name:val('es-name'),grade:val('es-grade'),pin,level:+val('es-level'),note:val('es-note')});putStudent(s)},
  addmistake(){const s=tdata.students.find(x=>x.id===tsel);s.mistakes=(s.mistakes||[]).concat({id:newId('m'),text:val('am-text'),fixed:false});putStudent(s)},
  addenq(){const e={id:newId('e'),parent:val('ae-parent'),grade:val('ae-grade'),source:val('ae-source'),note:val('ae-note'),status:'New',date:today()};
    S.tPut(tpin,'enquiries',e).then(()=>{tdata.enquiries.push(e);msg='';render()}).catch(tfail)}
};
/* ====== phonics: chapter-wise self study ====== */
let ptab='kids',ps=null;
const canSay='speechSynthesis' in window;
function say(t,lang){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.85;u.lang=lang||'en-IN';speechSynthesis.speak(u)}catch(e){}}
const E={cat:'🐱',sun:'☀️',dog:'🐶',pig:'🐷',hat:'🎩',bed:'🛏️',bus:'🚌',fox:'🦊',box:'📦',hen:'🐔',pen:'🖊️',bat:'🦇',van:'🚐',bug:'🐛',nut:'🥜',leg:'🦵',log:'🪵',map:'🗺️',bag:'👜',
 carrot:'🥕',sock:'🧦',monkey:'🐵',duck:'🦆',apple:'🍎',ball:'⚽',tree:'🌳',lion:'🦁',goat:'🐐',bee:'🐝',boat:'⛵',moon:'🌙',snake:'🐍',bike:'🚲',cake:'🎂',banana:'🍌',tiger:'🐯',umbrella:'☂️',
 nose:'👃',octopus:'🐙',egg:'🥚',ring:'💍',watch:'⌚',zebra:'🦓',yoyo:'🪀',key:'🔑',fish:'🐟',ship:'🚢',chick:'🐥',sheep:'🐑',rain:'🌧️',snail:'🐌',train:'🚆',soap:'🧼',
 kite:'🪁',pine:'🌲',note:'🎵',plane:'✈️',globe:'🌍',cap:'🧢',rat:'🐀'};
const pic=w=>`<span class="pic" role="img" aria-label="${w}">${E[w]}</span>`;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sample=(a,n)=>shuffle(a).slice(0,n);
const blendHtml=w=>`<span class="blend" aria-hidden="true">${w.split('').map(c=>`<span>${c}</span>`).join('')}</span>`;
function pickPics(show,ask,pre,words,a,hint,win){const o=shuffle(words);return{kind:'pick',show,ask,say:pre+' '+o.join(', ')+'?',opts:o.map(w=>({h:pic(w),v:w,cls:'big'})),a,ah:pic(a),hint,win}}
function pickText(show,ask,sayT,words,a,hint,win){return{kind:'pick',show,ask,say:sayT,opts:shuffle(words).map(w=>({h:esc(w),v:String(w),cls:'txt'})),a:String(a),ah:esc(a),hint,win}}
function build(show,ask,sayT,tiles,target,hint,win){return{kind:'build',show,ask,say:sayT,tiles,target,ah:esc(target.join(target[0].length>1||target.length>4?' ':'')),hint,win}}

const FIRST=[['cat','carrot','sun','dog'],['sun','sock','pig','moon'],['moon','monkey','fish','hat'],['dog','duck','cat','apple'],['bee','ball','tree','lion'],['fish','fox','pig','sun'],['hat','hen','bus','goat'],['pig','pen','sock','bee']];
const RHYME=[['cat','hat','dog','sun'],['pen','hen','pig','bus'],['fox','box','cat','bee'],['bee','tree','hat','fish'],['goat','boat','dog','moon'],['cake','snake','bike','apple']];
const CLAP=[['banana',3,'ba-na-na'],['tiger',2,'ti-ger'],['cat',1,'cat'],['umbrella',3,'um-brel-la'],['monkey',2,'mon-key'],['sun',1,'sun']];
const LET=[['s','sun'],['a','apple'],['t','tiger'],['p','pig'],['n','nose'],['m','moon'],['d','dog'],['g','goat'],['o','octopus'],['c','cat'],['e','egg'],['u','umbrella'],['r','ring'],['h','hat'],['b','bee'],['f','fish'],['l','lion'],['v','van'],['w','watch'],['z','zebra'],['y','yoyo'],['k','key']];
const CVC=['cat','dog','pig','sun','hat','bed','bus','fox','box','hen','pen','bat','van','bug','nut','leg','log','map','bag'];
const TEAMS=[['ship','sh'],['fish','sh'],['chick','ch'],['duck','ck'],['sock','ck'],['tree','ee'],['bee','ee'],['sheep','ee'],['rain','ai'],['snail','ai'],['train','ai'],['boat','oa'],['goat','oa'],['soap','oa']];
const TEAMSET=['sh','ch','th','ck','ee','ai','oa'];
const MAGIC=[['kite','kit'],['pine','pin'],['note','not'],['plane','plan'],['globe','glob'],['cap','cape'],['hat','hate'],['rat','rate']];
const TRICKY=[['___ dog is big.','The','To','No'],['I ___ to the park.','go','he','me'],['He ___ sad.','was','you','the'],['Are ___ happy?','you','was','my'],['This is ___ bag.','my','they','are'],['Dad ___ no.','said','have','like'],['I ___ a pet.','have','said','so'],['We ___ jam.','like','was','they'],['___ are my friends.','They','Said','Was'],['___ is my mum.','She','We','Me']];
const PA='Sam has a red kite. He runs up the hill with it. The wind is strong. The kite goes up and up. Then it gets stuck in a tree. Sam is sad.';
const PB='Meera and her dad go to the shop on a hot day. They want to get milk and bread. On the way, Meera sees a little dog by the gate. It looks thirsty. Dad gets a cup of water for the dog. The dog drinks it all and wags its tail. Meera smiles all the way home.';
const STORY=[[PA,'Who has the kite?','Sam','Meera','Dad'],[PA,'Where does Sam run?','Up the hill','To the shop','To the gate'],[PA,'What happens to the kite?','It gets stuck in a tree','It falls in the mud','It goes to the shop'],[PA,'How does Sam feel at the end?','Sad','Happy','Sleepy'],
 [PB,'Who goes to the shop?','Meera and her dad','Sam','The dog'],[PB,'What do they want to get?','Milk and bread','A kite','Water'],[PB,'What does Dad give the dog?','A cup of water','Bread','Milk'],[PB,'Why does Meera smile?','They helped the dog','She got a kite','It rained']];
const SENT=['The cat runs.','I like my dog.','The sun is hot.','We go to the park.','She has a red hat.','The big dog ran to the gate.'];
const RIGHT=[['The cat runs.','the cat runs.','The cat runs'],['I like my dog.','i like my dog.','I like my dog']];
const teamWord=(w,t)=>esc(w).replace(t,`<b class="team">${t}</b>`);

const PH=[
 {n:1,title:'Hear the sounds',level:'Sound Explorer',
  learn:`<span class="pic wiggle">🐱</span><div class="wordbig pulse"><span>c</span> <span>a</span> <span>t</span></div><p>Words are made of little sounds. Say <b>cat</b> slowly like a robot: three sounds! In this chapter you only need your ears.</p>`,
  make:()=>shuffle([...sample(FIRST,3).map(([w,c,x,y])=>pickPics(pic(w),'Which one starts with the same sound?',w+'. Which one starts with the same sound:',[c,x,y],c,`${w} and ${c} start with the same sound.`)),
   ...sample(RHYME,3).map(([w,c,x,y])=>pickPics(pic(w),'Which one rhymes with it?',w+'. Which one rhymes with '+w+':',[c,x,y],c,`${w} and ${c} sound the same at the end.`)),
   ...sample(CLAP,2).map(([w,n,s])=>pickText(pic(w),'Clap the word. How many claps?','Clap the beats in '+w+'. How many claps?',[1,2,3],n,s+': '+n+(n===1?' clap.':' claps.')))])},
 {n:2,title:'Letters and their sounds',level:'Letter Detective',
  learn:`<div class="letter wiggle">s</div><span class="pic">☀️</span><p>Every letter makes a sound. <b>s</b> says "sss" like the start of <b>sun</b>. Look at the letter, say its sound, and find the picture.</p>`,
  make:()=>sample(LET,8).map(([l,w])=>{const others=LET.filter(o=>o[0]!==l&&!('ck'.includes(o[0])&&'ck'.includes(l))).map(o=>o[1]);
    return pickPics(`<span class="letter">${l}</span>`,'Which picture starts with this sound?','Which one starts with this sound:',[w,...sample(others,2)],w,`${l} is the first sound in ${w==='yoyo'?'yo-yo':w}.`)})},
 {n:3,title:'Build little words',level:'Word Builder',
  learn:`${blendHtml('cat')}<span class="pic">🐱</span><p>Say each sound, then slide them together: <b>c</b>, <b>a</b>, <b>t</b> makes <b>cat</b>. You will read words and build them with letter tiles.</p>`,
  make:()=>{const ws=sample(CVC,8);return shuffle([...ws.slice(0,4).map(w=>pickPics(`<span class="wordbig">${w}</span>`,'Read the word. Tap its picture.','',[w,...sample(CVC.filter(x=>x!==w),2)],w,w.split('').join(' - ')+' makes '+w+'.',blendHtml(w)+pic(w))),
   ...ws.slice(4).map(w=>{const extra=sample('abdegmnoprstu'.split('').filter(c=>!w.includes(c)),1);return build(pic(w),'Build the word with the tiles.',w,shuffle([...w.split(''),...extra]),w.split(''),w.split('').join(' - ')+' makes '+w+'.',blendHtml(w)+pic(w))})])}},
 {n:4,title:'Letter teams and magic e',level:'Team Reader',
  learn:`<div class="wordbig"><b class="team">sh</b>ip <span class="pic">🚢</span></div><p>Some letters hold hands and make one sound, like <b>sh</b>.</p>
   <div class="magic" aria-hidden="true"><span>k</span><span class="v">i</span><span>t</span><span>e</span><span class="star">★</span></div><p>The <b>magic e</b> is quiet. It jumps back and makes the vowel say its name: kit becomes <b>kite</b> 🪁.</p>`,
  make:()=>{const t=sample(TEAMS,5);return shuffle([...t.slice(0,3).map(([w,tm])=>pickPics(`<span class="wordbig">${teamWord(w,tm)}</span>`,'Read the word. Tap its picture.','',[w,...sample(TEAMS.map(x=>x[0]).filter(x=>x!==w),2)],w,`${tm} makes one sound in ${w}.`)),
   ...t.slice(3).map(([w,tm])=>pickText(pic(w)+`<span class="wordbig">${esc(w).replace(tm,'__')}</span>`,'Which letter team is missing?',w,[tm,...sample(TEAMSET.filter(x=>x!==tm),2)],tm,`${w} has the team ${tm}.`)),
   ...sample(MAGIC,3).map(([w,o])=>{const sh=w.length<o.length?w:o,lg=w.length<o.length?o:w;return pickText(pic(w),'Which word matches the picture?','',[w,o],w,`Magic e makes the vowel say its name: ${sh} becomes ${lg}.`)})])}},
 {n:5,title:'Tricky words',level:'Heart words',
  learn:`<div class="wordbig">s<span class="heart">ai</span>d</div><p>Some words break the rules, so we learn them by heart. In <b>said</b>, the heart part is <b>ai</b>. Pick the tricky word that fits each sentence.</p>`,
  make:()=>sample(TRICKY,8).map(([s,c,x,y])=>pickText(`<span class="sent">${esc(s)}</span>`,'Which word fits?',s.replace('___','blank')+' Which word fits?',[c,x,y],c,s.replace('___',c)))},
 {n:6,title:'Read a story',level:'Story Reader',
  learn:`<span class="pic wiggle">📖</span><p>Read the whole story first, slowly. Then answer: <b>Who? Where? What happened? How did they feel?</b> You can look back at the story any time.</p>`,
  make:()=>STORY.map(([p,q,c,x,y])=>pickText(`<div class="passage">${esc(p)}</div>`,q,'',[c,x,y],c,'Look back at the story to check.'))},
 {n:7,title:'Write a sentence',level:'Young Writer',
  learn:`<div class="sent"><b class="team">T</b>he cat runs<b class="team">.</b></div><p>A sentence starts with a <b>capital letter</b>, has <b>spaces</b> between words, and ends with a <b>full stop</b>. Tap the words in the right order.</p>`,
  make:()=>shuffle([...SENT.map(s=>{const w=s.split(' ');return build('','Tap the words in order to make a sentence.','',shuffle(w),w,'Start with the capital letter and end with the full stop: '+s)}),
   ...RIGHT.map(([c,x,y])=>pickText('','Which sentence is written correctly?','',[c,x,y],c,'A sentence starts with a capital letter and ends with a full stop.'))])}
];
/* ====== phonics: teacher guide ====== */
const GUIDE=[
['How to use this guide and the 6 levels',`<p>A child who struggles with reading is almost always missing one earlier step. Find that step, fix it, and move up one level at a time.</p>
<h4>Three rules</h4><ul><li>Sounds before letters, letters before words, words before sentences.</li><li>Short and often: 20 focused minutes, 4 to 5 days a week.</li><li>Every lesson ends on something the child can do.</li></ul>
<h4>The levels</h4><ol><li><b>Sound Explorer:</b> hears first, last and middle sounds (1 to 2 weeks)</li><li><b>Letter Detective:</b> says every letter sound quickly (2 to 3 weeks)</li><li><b>Word Builder:</b> reads and writes 3-letter words (3 to 4 weeks)</li><li><b>Team Reader:</b> letter teams and magic e (3 to 4 weeks)</li><li><b>Story Reader:</b> reads a passage smoothly and answers questions (3 to 4 weeks)</li><li><b>Young Writer:</b> writes 3 to 5 correct sentences (ongoing)</li></ol>`],
['Finding where a child is stuck (10-minute check)',`<p>Run it as a game. Stop a step after 3 misses in a row. The first step the child cannot pass is the level to start from.</p>
<ol><li>Say the first sound of sun, map, dog (spoken only). Pass: 3 of 3. Else Level 1.</li><li>Clap the parts of ba-na-na, pen-cil. Pass: 2 of 2. Else Level 1.</li><li>Say the sound of 10 mixed letter cards. Pass: 9 of 10. Else Level 2.</li><li>Read cat, pig, sun, bed, hop. Pass: 4 of 5. Else Level 3.</li><li>Read ship, chin, tree, rain, cake. Pass: 4 of 5. Else Level 4.</li><li>Read a 3-sentence passage, answer 2 questions. Else Level 5.</li><li>Write one sentence about their family. Else Level 6.</li></ol>
<p>Note what you see: guessing from the first letter, b/d reversals, losing the place, freezing on new words.</p>`],
['Level 1: Hearing sounds (Kids\u2019 chapter 1)',`<p>No letters at this level, only ears and voice.</p>
<h4>Model lesson (20 min)</h4><ol><li>Rhyme the child knows; pause for them to fill the rhyming word (2 min)</li><li>Thumbs up if two words rhyme (3 min)</li><li>First sounds with real objects; sort into two sound groups (5 min)</li><li>Robot talk: "Get me a c-u-p" (5 min)</li><li>Child becomes the robot (3 min)</li><li>Finish on a win (2 min)</li></ol>
<h4>If the child is stuck</h4><ul><li>Says a letter name: "That is its name. What noise does it make in cup?"</li><li>Cannot blend: start with 2 sounds (m-e), then 3.</li><li>Loses interest: jump once for each sound.</li></ul>
<h4>Games</h4><p>I spy a sound, sound treasure bag, syllable stomp, rhyme ping-pong, sound swap (hardest).</p>
<h4>Move up when</h4><p>Says first and last sound of simple words and blends 3 robot sounds, 8 times out of 10.</p><h4>Home tip</h4><p>Play "I spy a sound" for 5 minutes in the car. Sounds, not letter names.</p>`],
['Level 2: Letters and their sounds (Kids\u2019 chapter 2)',`<p>Goal: see a letter, say its sound in under 2 seconds. Teach in groups, not a to z.</p>
<h4>Groups</h4><ol><li>s, a, t, p, i, n</li><li>m, d, g, o, c, k</li><li>e, u, r, h, b, f</li><li>l, j, v, w, x, y, z, qu</li></ol>
<h4>Lesson for one letter (20 min)</h4><ol><li>Review known letters (3)</li><li>Hear it in words (3)</li><li>See it; child draws a picture hook in the letter (3)</li><li>Feel it: salt tray, table, air (4)</li><li>Write it three times, circle the best (4)</li><li>Use it in first words (3)</li></ol>
<h4>If the child is stuck</h4><ul><li>Name instead of sound: "Names are for spelling. When we read, we use the sound."</li><li>Mixes e and i: compare mouth shapes in a mirror (egg, itch).</li><li>Forgets a letter: put it back in the warm-up for a week.</li></ul>
<h4>Move up when</h4><p>All 26 sounds, mixed order, under a minute.</p><h4>Home tip</h4><p>This week's letters on the fridge; say the sounds each time it opens.</p>`],
['Level 3: Blending 3-letter words (Kids\u2019 chapter 3)',`<p>Blending is for reading; breaking a word into sounds is for spelling. Teach both together.</p>
<h4>The slide method</h4><ol><li>Point and say each sound: c, a, t.</li><li>Say them faster, sliding the finger.</li><li>Sweep under the whole word: cat.</li></ol>
<h4>Model lesson (20 min)</h4><p>Robot warm-up, model the slide, 6 words with the same vowel, sound boxes with counters, silly or real words.</p>
<h4>If the child is stuck</h4><ul><li>Cannot join sounds: stretch them like a train with no gaps; start with m, s, f, n.</li><li>Guesses from the first letter: uncover one letter at a time.</li><li>Reverses the word: green dot under the first letter.</li><li>Frustrated: drop to 2-sound words for a few minutes.</li></ul>
<h4>Word lists</h4><p>a: cat, mat, sat, pan, tap, bag, jam, van · i: pin, sit, big, lip, dig, win · o: dog, hot, pot, top, log, box · u: sun, cup, bus, fun, rug, mud · e: bed, pen, ten, net, leg, red · made-up: zop, vit, keb</p>
<h4>Move up when</h4><p>Reads 20 mixed words (5 made-up) with 18 correct and writes 5 dictated words.</p>`],
['Level 4: Letter teams and magic e (Kids\u2019 chapter 4)',`<p>Teach each team as one sound card, one or two a week: sh, ch, th, ck, ee, ai, ay, oa.</p>
<h4>Hooks</h4><ul><li>sh: finger on lips</li><li>ch: a train</li><li>th: tongue peeps out</li><li>ck: only after a short vowel</li><li>ai inside a word, ay at the end</li></ul>
<h4>Lesson for one team</h4><p>Review, introduce the team as hand-holders, circle the team in 6 words before reading, read, then dictate 4 words (the team goes in one sound box).</p>
<h4>Magic e</h4><p>The e is silent, jumps back over one letter, and makes the vowel say its name: cap/cape, kit/kite, hop/hope, cub/cube. Use a separate e card or a "wand".</p>
<h4>If the child is stuck</h4><ul><li>Reads the team as two sounds: "Circle the hand-holders first."</li><li>Reads the e aloud: "The magic e is shy. It only helps."</li></ul>
<h4>Move up when</h4><p>Reads 20 mixed team and magic e words, 17 correct, and can explain the magic e.</p>`],
['Tricky words (Kids\u2019 chapter 5)',`<p>Learned by heart, four a week, alongside Levels 3 to 5.</p>
<h4>First 20</h4><p>Week 1: the, to, I, no · Week 2: go, he, she, we · Week 3: me, be, was, you · Week 4: they, all, are, my · Week 5: said, have, like, so</p>
<h4>Heart word method</h4><ol><li>Sound out the parts that follow the rules.</li><li>Draw a heart over the tricky part (ai in said).</li><li>Trace, cover, write from memory, read in a sentence.</li></ol>
<h4>If the child is stuck</h4><ul><li>was/saw: green dot on the first letter, read side by side.</li><li>Knows it in lessons, not in stories: put it in this week's passage several times.</li></ul>
<h4>Games</h4><p>Tricky word bingo, snap, beat the timer, word wall with stars.</p>`],
['Level 5: Reading smoothly and understanding (Kids\u2019 chapter 6)',`<h4>Smooth reading</h4><ul><li>Echo reading with expression</li><li>The same passage on three days</li><li>Phrase scoops under word groups</li><li>Finger, then bookmark, then eyes only</li></ul>
<h4>5-finger questions</h4><p>Who? Where? What happened first? What happened in the end? How did they feel, and why?</p>
<h4>Measuring</h4><p>Once a fortnight, time 1 minute on a new passage and count correct words. Working targets: start 20 to 30, middle 30 to 45, ready for Level 6 at 45 to 60. Steady growth matters most.</p>
<h4>If the child is stuck</h4><ul><li>Flat, word by word: "Read it like you are telling me a story."</li><li>Reads well but cannot answer: ask after every two sentences.</li></ul>
<h4>Move up when</h4><p>Reads a new 50-word passage with 3 or fewer errors and answers 4 of 5 questions.</p>`],
['Handwriting and b/d mix-ups',`<h4>Letter families by starting stroke</h4><ul><li>Curly-c: c, a, d, g, o, q, e, s</li><li>Tall stick: l, t, i, j, k</li><li>Bounce-up: r, n, m, h, b, p</li><li>Zig-zag: v, w, x, y, z</li></ul>
<h4>Fixing b and d</h4><ul><li>d starts like a c, then the tall stick.</li><li>b starts with the tall stick, then the bump.</li><li>The bed trick: two fists, thumbs up, make b-e-d.</li></ul>
<h4>Daily slot (7 min)</h4><p>Hands warm-up, sky writing, big then small, three tries and circle the best, use the letter in a word.</p>
<p>Reversals are common up to about age 7. If they stay strong after that, mention it to the parents.</p>`],
['Level 6: Spelling and sentences (Kids\u2019 chapter 7)',`<h4>Spelling: say, tap, write, check</h4><p>Say the word, tap a finger for each sound, write a letter or team for each tap, read back what was written.</p>
<h4>Sentence ladder</h4><ol><li>Who + does what: The cat runs.</li><li>Add where: The cat runs to the tree.</li><li>Add a describing word: The big cat runs to the tree.</li><li>Add why or when.</li></ol>
<h4>Checklist on the desk</h4><p>Capital letter, finger spaces, full stop, read it back.</p>
<h4>If the child is stuck</h4><ul><li>"I don't know what to write": talk about a picture first; say it before writing it.</li><li>Words run together: a lolly stick as a space bar.</li><li>Upset by spelling mistakes: "Write what you hear. We fix spellings together after."</li></ul>`],
['Lesson shape, 12-week track and showing progress',`<h4>Every 30-minute lesson</h4><ol><li>Warm-up from a mastered level (3 min)</li><li>Review yesterday (2 min)</li><li>Teach one new thing (10 min)</li><li>Practise: oral, then written (10 min)</li><li>End on a win and one home task (5 min)</li></ol>
<h4>Typical 12 weeks for a struggling Grade 1 child</h4><p>Weeks 1 to 2: Level 1 · Weeks 3 to 5: Level 2 · Weeks 6 to 8: Level 3 · Weeks 9 to 10: Level 4 · Weeks 11 to 12: Level 5 and first sentences.</p>
<h4>For parents</h4><p>Starting check in week 1, a message at each level passed, a monthly report, and a 1-minute reading recording every 4 weeks compared with week 1. Set the child's reading level in the Teacher console so it appears in the parent report.</p>`]
];
/* ====== maths: chapter-wise self study ====== */
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const one=a=>a[Math.floor(Math.random()*a.length)];
const nf=n=>Number(n).toLocaleString('en-IN');
const ex=t=>`<span class="wordbig">${t}</span>`;
const colsum=rows=>`<div class="colsum">${rows.map(r=>`<div>${r}</div>`).join('')}<div class="rule"></div></div>`;
const numQ=(show,ask,a,hint)=>({kind:'num',show,ask,say:'',a:String(a),ah:ex(nf(a)),hint});
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fS=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):n+'/'+d};
const fV=s=>{const p=String(s).split('/');return p.length>1?p[0]/p[1]:+p[0]};
const fH=s=>{s=String(s);if(s.indexOf('/')<0)return ex(s);const p=s.split('/');return `<span class="frac" role="img" aria-label="${p[0]} over ${p[1]}"><span>${p[0]}</span><span>${p[1]}</span></span>`};
const fbar=(n,d)=>`<div class="fbar" role="img" aria-label="${n} of ${d} equal parts shaded">${Array.from({length:d},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`;
const fx=(...p)=>`<div class="fexpr">${p.join('')}</div>`;
const simp=(n,d)=>fS(n,d)!==n+'/'+d?`, which is ${fS(n,d)}`:'';
function fracQ(show,ask,correct,wrongs,hint,nopt){nopt=nopt||3;const w=[];wrongs.forEach(x=>{x=String(x);if(isFinite(fV(x))&&fV(x)>0&&Math.abs(fV(x)-fV(correct))>1e-9&&w.indexOf(x)<0)w.push(x)});
  const p=String(correct).split('/'),cn=+p[0],cd=+(p[1]||1);for(let k=1;w.length<nopt-1;k++){const x=(cn+k)+'/'+(cd+k+1);if(w.indexOf(x)<0&&Math.abs(fV(x)-fV(correct))>1e-9)w.push(x)}
  return{kind:'pick',show,ask,say:'',opts:shuffle([String(correct),...w.slice(0,nopt-1)]).map(v=>({h:fH(v),v,cls:'txt'})),a:String(correct),ah:fH(correct),hint}}

function qAdd(a,b){const s=a+b;let h;if(a<10&&b<10){const big=Math.max(a,b),sm=Math.min(a,b);h=s>10?`Make ten: ${big} + ${10-big} = 10, then ${sm-(10-big)} more makes ${s}.`:`Start at ${big} and count on ${sm}: ${s}.`}
  else h=`Tens: ${a-a%10} + ${b-b%10} = ${a-a%10+b-b%10}. Ones: ${a%10} + ${b%10} = ${a%10+b%10}. Together: ${s}.`;
  return numQ(ex(`${a} + ${b}`),'Add.',s,h)}
function qSub(a,b){const nt=Math.ceil(b/10)*10,r=a-b;const h=(nt>=a||nt===b)?`Count up from ${b} to ${a}: ${r} steps.`:`Count up: ${b} to ${nt} is ${nt-b}, then ${nt} to ${a} is ${a-nt}. ${nt-b} + ${a-nt} = ${r}.`;
  return numQ(ex(`${a} \u2212 ${b}`),'Subtract.',r,h)}
const subR=(lo,hi,blo,bhi)=>{const a=rnd(lo,hi);return qSub(a,rnd(blo,Math.min(bhi,a-1)))};
function qAdd3(big){let p,q,r;if(big){p=rnd(11,48);if(p%10===0)p+=3;q=(10-p%10)+10*rnd(0,2);r=rnd(5,30)}else{p=rnd(1,9);q=10-p;r=rnd(2,9)}
  return numQ(ex(shuffle([p,q,r]).join(' + ')),'Add all three. Look for friends first.',p+q+r,`${p} and ${q} are friends: ${p} + ${q} = ${p+q}. Then add ${r}: ${p+q+r}.`)}
function qSub3(){const b=rnd(3,19),c=rnd(2,15),r=rnd(4,40),a=b+c+r;return numQ(ex(`${a} \u2212 ${b} \u2212 ${c}`),'Subtract both numbers.',r,`Add what you take away first: ${b} + ${c} = ${b+c}. Then ${a} \u2212 ${b+c} = ${r}.`)}
function qMix3(){const a=rnd(20,60),b=rnd(5,30),c=rnd(3,20);return numQ(ex(`${a} + ${b} \u2212 ${c}`),'Work from left to right.',a+b-c,`First ${a} + ${b} = ${a+b}. Then ${a+b} \u2212 ${c} = ${a+b-c}.`)}
const r1k=n=>Math.round(n/1000)*1000;
function qBigAdd(lo,hi){const a=rnd(lo,hi),b=rnd(lo,hi);return numQ(colsum([nf(a),'+ '+nf(b)]),'Add. Start from the ones.',a+b,`Line up the places, start from the ones, and carry when a column passes 9. Check with an estimate: ${nf(r1k(a))} + ${nf(r1k(b))} = ${nf(r1k(a)+r1k(b))}.`)}
function qBigSub(lo,hi){const a=rnd(lo,hi),b=rnd(1100,a-500);return numQ(colsum([nf(a),'\u2212 '+nf(b)]),'Subtract. Start from the ones.',a-b,`Line up the places, start from the ones, and borrow from the next place when the top digit is smaller. Check with an estimate: ${nf(r1k(a))} \u2212 ${nf(r1k(b))} = ${nf(r1k(a)-r1k(b))}.`)}
const HARD={'6x6':'6 \u00d7 5 = 30, plus one more 6','6x7':'6 \u00d7 6 = 36, plus one more 6','6x8':'Double 6 \u00d7 4: 24, then 48','7x7':'7 \u00d7 5 = 35, plus 7 \u00d7 2 = 14','7x8':'5, 6, 7, 8: 56 = 7 \u00d7 8','8x8':'Double 8 \u00d7 4: 32, then 64'};
function tHint(a,b){const lo=Math.min(a,b),hi=Math.max(a,b),p=a*b;
  if(lo===1)return `Anything times 1 stays the same: ${p}.`;if(hi===10)return `Times 10: put a zero after ${lo}: ${p}.`;
  if(lo===2)return `Double ${hi}: ${p}.`;if(lo===5||hi===5){const o=lo===5?hi:lo;return `${o} \u00d7 10 = ${o*10}, and half of that is ${p}.`}
  if(hi===9)return `${lo} \u00d7 10 = ${lo*10}, minus one ${lo}: ${p}.`;
  if(lo===4)return `Double ${hi} is ${hi*2}, double again: ${p}.`;if(lo===3)return `Double ${hi} is ${hi*2}, plus one more ${hi}: ${p}.`;
  return HARD[lo+'x'+hi]+`. Answer: ${p}.`}
function qT(a,b){if(Math.random()<.5)[a,b]=[b,a];return numQ(ex(`${a} \u00d7 ${b}`),'Multiply.',a*b,tHint(a,b))}
function qTMiss(a,b){return numQ(ex(`${a} \u00d7 ? = ${a*b}`),'Find the missing number.',b,tHint(a,b))}
function qMul(a,b){if(a<10)return qT(a,b);const parts=[a-a%100,a%100-a%10,a%10].filter(x=>x>0);
  return numQ(ex(`${nf(a)} \u00d7 ${b}`),'Multiply. Split the big number.',a*b,`Split ${a}: ${parts.map(x=>`${x} \u00d7 ${b} = ${nf(x*b)}`).join(', ')}. Add them: ${nf(a*b)}.`)}
function qMul2(){const a=rnd(12,39),b=rnd(11,29),t=b-b%10,o=b%10;return numQ(ex(`${a} \u00d7 ${b}`),'Multiply. Split the second number.',a*b,o?`Split ${b}: ${a} \u00d7 ${t} = ${a*t}, and ${a} \u00d7 ${o} = ${a*o}. Add them: ${a*b}.`:`${a} \u00d7 ${t/10} = ${a*t/10}, then \u00d7 10: ${a*b}.`)}
function qDiv(b,q){const a=b*q;return numQ(ex(`${a} \u00f7 ${b}`),'Divide.',q,q<=10?`Think of the table: ${b} \u00d7 ${q} = ${a}, so ${a} \u00f7 ${b} = ${q}.`:`Split ${a}: ${b*10} \u00f7 ${b} = 10, and ${a-b*10} \u00f7 ${b} = ${q-10}. Together: ${q}.`)}
function qRem(){const b=rnd(3,9),q=rnd(2,9),r=rnd(1,b-1),a=b*q+r,c=`${q} remainder ${r}`;
  return pickText(ex(`${a} \u00f7 ${b}`),'Divide. What is left over?','',[c,`${q+1} remainder ${r}`,`${q} remainder ${r===1?2:r-1}`],c,`${b} \u00d7 ${q} = ${b*q}. Then ${a} \u2212 ${b*q} = ${r} left over.`)}
function qDivBig(){const b=rnd(3,9),q=rnd(105,1249),a=b*q;return numQ(ex(`${nf(a)} \u00f7 ${b}`),'Divide place by place from the left.',q,`Divide the biggest place first and carry what is left to the next place. Check by multiplying back: ${nf(q)} \u00d7 ${b} = ${nf(a)}.`)}
const ds=n=>String(n).split('').reduce((s,c)=>s+ +c,0);
const TRICKS=[
  ()=>{const n=rnd(13,480);return numQ(ex(`${n} \u00d7 10`),'Use a trick.',n*10,`Times 10: put one zero after ${n}: ${nf(n*10)}.`)},
  ()=>{const n=rnd(7,96);return numQ(ex(`${n} \u00d7 100`),'Use a trick.',n*100,`Times 100: put two zeros after ${n}: ${nf(n*100)}.`)},
  ()=>{const n=2*rnd(6,44);return numQ(ex(`${n} \u00d7 5`),'Use a trick.',n*5,`Half of ${n} is ${n/2}, then \u00d7 10: ${n*5}.`)},
  ()=>{const n=rnd(12,39);return numQ(ex(`${n} \u00d7 9`),'Use a trick.',n*9,`${n} \u00d7 10 = ${n*10}, then take away one ${n}: ${n*9}.`)},
  ()=>{const a=rnd(1,8),b=rnd(1,9-a),n=a*10+b;return numQ(ex(`${n} \u00d7 11`),'Use a trick.',n*11,`Split the digits ${a} and ${b}, and put their sum ${a+b} in the middle: ${n*11}.`)},
  ()=>{const n=4*rnd(2,12);return numQ(ex(`${n} \u00d7 25`),'Use a trick.',n*25,`A quarter of ${n} is ${n/4}, then \u00d7 100: ${nf(n*25)}.`)},
  ()=>{const n=rnd(13,48);return numQ(ex(`${n} \u00d7 4`),'Use a trick.',n*4,`Double ${n} is ${n*2}, double again: ${n*4}.`)},
  ()=>{const a=2*rnd(3,12),b=one([15,25,35,45]);return numQ(ex(`${a} \u00d7 ${b}`),'Use a trick.',a*b,`Halve ${a} and double ${b}: ${a/2} \u00d7 ${b*2} = ${nf(a*b)}.`)},
  ()=>{const n=5*rnd(13,98);return numQ(ex(`${n} \u00f7 5`),'Use a trick.',n/5,`Double ${n} to get ${n*2}, then \u00f7 10: ${n/5}.`)},
  ()=>{const c=3*rnd(34,300);const w=[];while(w.length<2){const x=rnd(100,900);if(x%3&&w.indexOf(x)<0)w.push(x)}
    return pickText('','Which number can be divided by 3 with nothing left over?','',[c,...w],c,`Add the digits of ${c}: ${String(c).split('').join(' + ')} = ${ds(c)}. ${ds(c)} is in the 3 times table, so ${c} works.`)}
];
function qT20(a,b){const p=a*b;let h;if(a===20)h=`Double ${b} is ${2*b}, then \u00d7 10: ${p}.`;else if(a===11)h=`11 \u00d7 ${b}: write ${b} twice: ${p}.`;else if(a===15)h=`10 \u00d7 ${b} = ${10*b}, plus half of that (${5*b}): ${p}.`;
  else h=`Split ${a} into 10 and ${a-10}: ${10*b} + ${(a-10)*b} = ${p}.`;return numQ(ex(`${a} \u00d7 ${b}`),'Multiply.',p,h)}
const factors=n=>{const f=[];for(let i=1;i<=n;i++)if(n%i===0)f.push(i);return f};
function pairLH(){const g=rnd(2,6);let m,n;do{m=rnd(1,5);n=rnd(2,6)}while(m>=n||gcd(m,n)!==1);return[g*m,g*n,g,g*m*n]}
function qHCF(){const[a,b,g]=pairLH();return numQ(ex(`${a} and ${b}`),'What is the HCF, the biggest factor they share?',g,`Factors of ${a}: ${factors(a).join(', ')}. Factors of ${b}: ${factors(b).join(', ')}. The biggest one in both lists is ${g}.`)}
function qLCM(){const[a,b,,L]=pairLH(),mu=x=>Array.from({length:L/x},(_,i)=>x*(i+1)).join(', ');return numQ(ex(`${a} and ${b}`),'What is the LCM, the first multiple they share?',L,`Multiples of ${a}: ${mu(a)}. Multiples of ${b}: ${mu(b)}. The first one in both lists is ${L}.`)}
function qFactor(){const N=one([12,18,20,24,30,36]),c=one(factors(N).filter(x=>x>1&&x<N)),w=[];while(w.length<2){const x=rnd(2,N-1);if(N%x&&w.indexOf(x)<0)w.push(x)}
  return pickText('',`Which number is a factor of ${N}?`,'',[c,...w],c,`${c} \u00d7 ${N/c} = ${N}, so ${c} is a factor of ${N}.`)}
function qMultiple(){const k=rnd(3,9),c=k*rnd(3,9);return pickText('',`Which number is a multiple of ${k}?`,'',[c,c+1,c-1],c,`${k} \u00d7 ${c/k} = ${c}, so ${c} is a multiple of ${k}.`)}
const BASES=[[1,2],[1,3],[2,3],[1,4],[3,4],[2,5]];
function qShaded(){const d=rnd(3,8),n=rnd(1,d-1);return fracQ(fbar(n,d),'What fraction is shaded?',`${n}/${d}`,[`${d}/${n}`,`${d-n}/${d}`,`${n}/${d+1}`,`${n+1}/${d}`],`${n} parts are shaded out of ${d} equal parts: ${n}/${d}.`)}
function qNumDen(top){const d=rnd(3,9),n=rnd(1,d-1);return numQ(fH(`${n}/${d}`),top?'What is the numerator?':'What is the denominator?',top?n:d,top?`The numerator is the top number. It tells how many parts we have: ${n}.`:`The denominator is the bottom number. It tells how many equal parts make the whole: ${d}.`)}
function qCmpD(){const d=rnd(4,9),a=rnd(1,d-2),b=rnd(a+1,d-1);return fracQ(fbar(a,d)+fbar(b,d),'Which fraction is bigger?',`${b}/${d}`,[`${a}/${d}`],`The bottom numbers are the same, so the bigger top number wins: ${b}/${d}.`,2)}
function qCmpN(){const n=rnd(1,2),d1=rnd(3,5),d2=rnd(d1+1,8);return fracQ(fbar(n,d1)+fbar(n,d2),'Which fraction is bigger?',`${n}/${d1}`,[`${n}/${d2}`],`The top numbers are the same. Fewer parts means bigger pieces, so ${n}/${d1} is bigger.`,2)}
function qEquiv(){const[n,d]=one(BASES),k=rnd(2,4);return fracQ(fH(`${n}/${d}`),'Which fraction is equal to this one?',`${n*k}/${d*k}`,[`${n*k}/${d*k+1}`,`${n+k}/${d+k}`,`${n*k+1}/${d*k}`],`Multiply the top and the bottom by ${k}: ${n*k}/${d*k}.`)}
function qSimplify(){const[n,d]=one(BASES),k=rnd(2,4);return fracQ(fH(`${n*k}/${d*k}`),'Write it in its simplest form.',`${n}/${d}`,[`${n}/${d+1}`,`${n+1}/${d+1}`,`${n*k}/${d}`],`Divide the top and the bottom by ${k}: ${n}/${d}.`)}
const op=s=>ex(s);
function qFAddSame(){const d=rnd(4,10),a=rnd(1,d-2),b=rnd(1,d-a-1);return fracQ(fx(fH(`${a}/${d}`),op('+'),fH(`${b}/${d}`)),'Add the fractions.',fS(a+b,d),[`${a+b}/${2*d}`,fS(a+b+1,d),`${a+b}/${d+1}`],`The bottom numbers are the same, so just add the tops: ${a} + ${b} = ${a+b}. That makes ${a+b}/${d}${simp(a+b,d)}.`)}
function qFSubSame(){const d=rnd(4,10),a=rnd(2,d-1),b=rnd(1,a-1);return fracQ(fx(fH(`${a}/${d}`),op('\u2212'),fH(`${b}/${d}`)),'Subtract the fractions.',fS(a-b,d),[fS(a+b,d),fS(a-b+1,d),`${a-b}/${d+1}`],`The bottom numbers are the same, so just subtract the tops: ${a} \u2212 ${b} = ${a-b}. That makes ${a-b}/${d}${simp(a-b,d)}.`)}
function qFAddUnlike(){const[d1,d2]=one([[2,3],[2,4],[2,5],[3,4],[3,6],[4,8],[2,6],[5,10],[3,5],[2,8]]);let n1=1,n2=1;for(let t=0;t<20;t++){const a=rnd(1,d1-1),b=rnd(1,d2-1);if(a/d1+b/d2<1){n1=a;n2=b;break}}
  const L=d1*d2/gcd(d1,d2),x=n1*L/d1,y=n2*L/d2;return fracQ(fx(fH(`${n1}/${d1}`),op('+'),fH(`${n2}/${d2}`)),'Add the fractions.',fS(x+y,L),[`${n1+n2}/${d1+d2}`,fS(x+y+1,L),`${n1+n2}/${L}`],`Make the bottom numbers the same (${L}): ${n1}/${d1} = ${x}/${L} and ${n2}/${d2} = ${y}/${L}. Add the tops: ${x+y}/${L}${simp(x+y,L)}.`)}
const sf=()=>{const d=rnd(2,6);return[rnd(1,d-1),d]};
function qFMul(){const[n1,d1]=sf(),[n2,d2]=sf();return fracQ(fx(fH(`${n1}/${d1}`),op('\u00d7'),fH(`${n2}/${d2}`)),'Multiply the fractions.',fS(n1*n2,d1*d2),[fS(n1*d2,d1*n2),fS(n1+n2,d1+d2),fS(n1*n2+1,d1*d2)],`Top \u00d7 top and bottom \u00d7 bottom: ${n1} \u00d7 ${n2} = ${n1*n2} and ${d1} \u00d7 ${d2} = ${d1*d2}. That makes ${n1*n2}/${d1*d2}${simp(n1*n2,d1*d2)}.`)}
function qFDiv(){const[n1,d1]=sf(),[n2,d2]=sf();return fracQ(fx(fH(`${n1}/${d1}`),op('\u00f7'),fH(`${n2}/${d2}`)),'Divide the fractions.',fS(n1*d2,d1*n2),[fS(n1*n2,d1*d2),fS(n1*d2+1,d1*n2),fS(d1*n2,n1*d2)],`Flip the second fraction and multiply: ${n1}/${d1} \u00d7 ${d2}/${n2} = ${n1*d2}/${d1*n2}${simp(n1*d2,d1*n2)}.`)}
function qFOf(){const[n,d]=cop(),N=d*rnd(2,9);return numQ(fx(fH(`${n}/${d}`),op(`of ${N}`)),'Find the amount.',N/d*n,`${N} \u00f7 ${d} = ${N/d}, then \u00d7 ${n} = ${N/d*n}.`)}

const chips=a=>`<div class="chips" style="justify-content:center">${a.map(x=>`<span class="pill">${x}</span>`).join('')}</div>`;
const NAMES=['Aarav','Siya','Riya','Kabir','Meera','Arjun','Ananya','Rohan'];
const st=(t,a,h,ask)=>numQ(`<div class="passage">${t}</div>`,ask||'Type the answer.',a,h);
const fill=(t,o)=>{const nm=one(NAMES);return t.replace(/\{(\w+)\}/g,(m,k)=>k==='n'?nm:(typeof o[k]==='number'?nf(o[k]):o[k]))};
const ten=f=>Array.from({length:10},(_,i)=>f(i));
const cyc=(T,f)=>{const o=shuffle(T).concat(shuffle(T),shuffle(T),shuffle(T),shuffle(T));return ten(i=>f(o[i]))};
const sets5=(g,s)=>[{name:'Level 1: warm-up numbers',make:()=>ten(()=>g(1))},{name:'Level 2: bigger numbers',make:()=>ten(()=>g(2))},{name:'Level 3: challenge numbers',make:()=>ten(()=>g(3))},{name:'Real-life problems',make:()=>s(1)},{name:'Real-life problems: challenge',make:()=>s(2)}];
function placeHint(a,b){const P=[['Thousands',1000,1e9],['Hundreds',100,1000],['Tens',10,100],['Ones',1,10]],out=[];
  P.forEach(([n,u,m])=>{const x=Math.floor(a%m/u)*u,y=Math.floor(b%m/u)*u;if(x||y)out.push(`${n}: ${nf(x)} + ${nf(y)} = ${nf(x+y)}`)});return out.join('. ')+`. Together: ${nf(a+b)}.`}
function countUp(b,a){let x=b;const s=[];[10,100,1000,10000].forEach(u=>{const nx=Math.ceil(x/u)*u;if(nx>x&&nx<=a){s.push([nx,nx-x]);x=nx}});if(a>x)s.push([a,a-x]);
  return s.length<2?`${nf(a)} \u2212 ${nf(b)} = ${nf(a-b)}.`:`Count up from ${nf(b)}: `+s.map(v=>`to ${nf(v[0])} is ${nf(v[1])}`).join(', ')+`. Add the jumps: ${nf(a-b)}.`}
const qA=(a,b)=>numQ(ex(`${nf(a)} + ${nf(b)}`),'Add.',a+b,placeHint(a,b));
const qS=(a,b)=>numQ(ex(`${nf(a)} \u2212 ${nf(b)}`),'Subtract.',a-b,countUp(b,a));
function trip(lv){let p,q,r;if(lv===1){if(Math.random()<.5){p=rnd(1,9);q=10-p;r=rnd(2,9)}else{p=rnd(11,48);if(p%10===0)p+=3;q=10-p%10;r=rnd(5,20)}}
  else if(lv===2){p=rnd(11,78);if(p%10===0)p+=4;q=(10-p%10)+10*rnd(1,3);r=rnd(12,45)}
  else{p=rnd(125,475);if(p%100===0)p+=35;q=100-p%100+100*rnd(0,2);if(q<20)q+=100;r=rnd(35,260)}return[p,q,r]}
const friends=(p,q,r)=>`${nf(p)} and ${nf(q)} are friends: ${nf(p)} + ${nf(q)} = ${nf(p+q)}. Then add ${nf(r)}: ${nf(p+q+r)}.`;
const sub3=(a,b,c)=>numQ(ex(`${nf(a)} \u2212 ${nf(b)} \u2212 ${nf(c)}`),'Subtract both numbers.',a-b-c,`Add what you take away first: ${nf(b)} + ${nf(c)} = ${nf(b+c)}. Then ${nf(a)} \u2212 ${nf(b+c)} = ${nf(a-b-c)}.`);
const mixPM=(a,b,c)=>numQ(ex(`${nf(a)} + ${nf(b)} \u2212 ${nf(c)}`),'Work from left to right.',a+b-c,`First ${nf(a)} + ${nf(b)} = ${nf(a+b)}. Then ${nf(a+b)} \u2212 ${nf(c)} = ${nf(a+b-c)}.`);
const mixMP=(a,b,c)=>numQ(ex(`${nf(a)} \u2212 ${nf(b)} + ${nf(c)}`),'Work from left to right.',a-b+c,`First ${nf(a)} \u2212 ${nf(b)} = ${nf(a-b)}. Then ${nf(a-b)} + ${nf(c)} = ${nf(a-b+c)}.`);
function sub3n(lv){if(lv===1){const b=rnd(3,19),c=rnd(2,15);return[b+c+rnd(4,40),b,c]}const b=lv===2?rnd(15,60):rnd(115,460),c=lv===2?(10-b%10)%10+10*rnd(1,3):(100-b%100)%100+10*rnd(2,9);return[b+c+rnd(25,lv===2?300:900),b,c]}
const bigA=(a,b)=>numQ(colsum([nf(a),'+ '+nf(b)]),'Add. Start from the ones.',a+b,`Line up the places, start from the ones, and carry when a column passes 9. Check with an estimate: ${nf(r1k(a))} + ${nf(r1k(b))} = ${nf(r1k(a)+r1k(b))}.`);
const bigS=(a,b)=>numQ(colsum([nf(a),'\u2212 '+nf(b)]),'Subtract. Start from the ones.',a-b,`Line up the places, start from the ones, and borrow from the next place when the top digit is smaller. ${countUp(b,a)}`);
function qDivC(b,q,ask){const a=b*q,t=Math.floor(q/10)*10;return numQ(ex(`${nf(a)} \u00f7 ${b}`),ask||'Divide.',q,q<=10||t===q?`Think of the table: ${b} \u00d7 ${nf(q)} = ${nf(a)}.`:`Take out a big chunk: ${b} \u00d7 ${nf(t)} = ${nf(b*t)}. That leaves ${a-b*t}, and ${a-b*t} \u00f7 ${b} = ${q-t}. Together: ${nf(t)} + ${q-t} = ${nf(q)}.`)}
function qRemN(){const b=rnd(3,9),q=rnd(4,12),r=rnd(1,b-1),a=b*q+r;return numQ(ex(`${a} \u00f7 ${b}`),'What is the remainder?',r,`${b} \u00d7 ${q} = ${b*q} is the closest below ${a}. ${a} \u2212 ${b*q} = ${r} left over.`)}
function qMulAB(a,b){const t=b-b%10,o=b%10;return numQ(ex(`${nf(a)} \u00d7 ${b}`),'Multiply. Split the second number.',a*b,o?`Split ${b}: ${nf(a)} \u00d7 ${t} = ${nf(a*t)}, and ${nf(a)} \u00d7 ${o} = ${nf(a*o)}. Add them: ${nf(a*b)}.`:`${nf(a)} \u00d7 ${t/10} = ${nf(a*t/10)}, then \u00d7 10: ${nf(a*b)}.`)}
const qTens=()=>{const a=10*rnd(2,9),b=10*rnd(2,9);return numQ(ex(`${a} \u00d7 ${b}`),'Multiply.',a*b,`${a/10} \u00d7 ${b/10} = ${a*b/100}, then put the two zeros back: ${nf(a*b)}.`)};
const tr=(e,a,h)=>numQ(ex(e),'Use a trick.',a,h);
const divPick=(k,rule)=>{const c=k*rnd(34,110),w=[];while(w.length<2){const x=rnd(100,990);if(x%k&&w.indexOf(x)<0)w.push(x)}return pickText('',`Which number can be divided by ${k} with nothing left over?`,'',[c,...w],c,rule(c))};
const TR={
  x10:()=>{const n=rnd(13,480);return tr(`${n} \u00d7 10`,n*10,`Times 10: put one zero after ${n}: ${nf(n*10)}.`)},
  x100:()=>{const n=rnd(7,96);return tr(`${n} \u00d7 100`,n*100,`Times 100: put two zeros after ${n}: ${nf(n*100)}.`)},
  x5:()=>{const n=2*rnd(6,44);return tr(`${n} \u00d7 5`,n*5,`Half of ${n} is ${n/2}, then \u00d7 10: ${n*5}.`)},
  x4:()=>{const n=rnd(13,48);return tr(`${n} \u00d7 4`,n*4,`Double ${n} is ${n*2}, double again: ${n*4}.`)},
  d5:()=>{const n=5*rnd(13,98);return tr(`${n} \u00f7 5`,n/5,`Double ${n} to get ${n*2}, then \u00f7 10: ${n/5}.`)},
  x20:()=>{const n=rnd(12,45);return tr(`${n} \u00d7 20`,n*20,`Double ${n} is ${n*2}, then \u00d7 10: ${n*20}.`)},
  x9:()=>{const n=rnd(12,39);return tr(`${n} \u00d7 9`,n*9,`${n} \u00d7 10 = ${n*10}, then take away one ${n}: ${n*9}.`)},
  x11:()=>{const a=rnd(1,8),b=rnd(1,9-a),n=a*10+b;return tr(`${n} \u00d7 11`,n*11,`Split the digits ${a} and ${b}, and put their sum ${a+b} in the middle: ${n*11}.`)},
  x25:()=>{const n=4*rnd(2,12);return tr(`${n} \u00d7 25`,n*25,`A quarter of ${n} is ${n/4}, then \u00d7 100: ${nf(n*25)}.`)},
  hd:()=>{const a=2*rnd(3,12),b=one([15,25,35,45]);return tr(`${a} \u00d7 ${b}`,a*b,`Halve ${a} and double ${b}: ${a/2} \u00d7 ${b*2} = ${nf(a*b)}.`)},
  x50:()=>{const n=2*rnd(7,48);return tr(`${n} \u00d7 50`,n*50,`Half of ${n} is ${n/2}, then \u00d7 100: ${nf(n*50)}.`)},
  x99:()=>{const n=rnd(3,25);return tr(`${n} \u00d7 99`,n*99,`${n} \u00d7 100 = ${nf(n*100)}, then take away one ${n}: ${nf(n*99)}.`)},
  x15:()=>{const n=2*rnd(6,24);return tr(`${n} \u00d7 15`,n*15,`${n} \u00d7 10 = ${n*10}, plus half of that (${n*5}): ${n*15}.`)},
  x11c:()=>{const a=rnd(2,9),b=rnd(10-a,9),n=a*10+b;return tr(`${n} \u00d7 11`,n*11,`The digits ${a} and ${b} add to ${a+b}. Write ${b} at the end, ${(a+b)%10} in the middle, and carry 1 to make ${a+1} at the front: ${n*11}.`)},
  d25:()=>{const n=25*rnd(3,36);return tr(`${n} \u00f7 25`,n/25,`Multiply by 4 to get ${nf(n*4)}, then \u00f7 100: ${n/25}.`)},
  div3:()=>divPick(3,c=>`Add the digits of ${c}: ${String(c).split('').join(' + ')} = ${ds(c)}. ${ds(c)} is in the 3 times table, so ${c} works.`),
  div9:()=>divPick(9,c=>`Add the digits of ${c}: ${String(c).split('').join(' + ')} = ${ds(c)}. ${ds(c)} is in the 9 times table, so ${c} works.`)
};
const pickTR=k=>TR[one(k)]();
const qSq=a=>numQ(ex(`${a} \u00d7 ${a}`),'Multiply.',a*a,a<10?tHint(a,a):`Split ${a} into 10 and ${a-10}: ${10*a} + ${(a-10)*a} = ${a*a}.`);
function qT20(a,b){const p=a*b;let h;if(a===20)h=`Double ${b} is ${2*b}, then \u00d7 10: ${p}.`;else if(a===11&&b<10)h=`11 \u00d7 ${b}: write ${b} twice: ${p}.`;else if(a===15)h=`10 \u00d7 ${b} = ${10*b}, plus half of that (${5*b}): ${p}.`;
  else h=`Split ${a} into 10 and ${a-10}: ${10*b} + ${(a-10)*b} = ${p}.`;return numQ(ex(`${a} \u00d7 ${b}`),'Multiply.',p,h)}
const mu=(x,L)=>Array.from({length:L/x},(_,i)=>x*(i+1)).join(', ');
function pairLH(big){const g=big?rnd(4,12):rnd(2,6);let m,n;do{m=rnd(1,big?6:5);n=rnd(2,big?7:6)}while(m>=n||gcd(m,n)!==1);return[g*m,g*n,g,g*m*n]}
const hcfHint=(a,b,g)=>`Factors of ${a}: ${factors(a).join(', ')}. Factors of ${b}: ${factors(b).join(', ')}. The biggest one in both lists is ${g}.`;
const lcmHint=(a,b,L)=>`Multiples of ${a}: ${mu(a,L)}. Multiples of ${b}: ${mu(b,L)}. The first one in both lists is ${L}.`;
function qHCF(big){const[a,b,g]=pairLH(big);return numQ(ex(`${a} and ${b}`),'What is the HCF, the biggest factor they share?',g,hcfHint(a,b,g))}
function qLCM(big){const[a,b,,L]=pairLH(big);return numQ(ex(`${a} and ${b}`),'What is the LCM, the first multiple they share?',L,lcmHint(a,b,L))}
function qLCM3(){const t=one([[2,3,4],[2,3,5],[3,4,6],[2,5,10],[4,6,8],[3,5,6],[2,4,5],[6,8,12]]),L=t.reduce((l,x)=>l*x/gcd(l,x),1),mx=Math.max(...t);
  return numQ(ex(t.join(', ')),'What is the LCM of all three?',L,`Go through the multiples of ${mx}: ${mu(mx,L)}. The first one that all three numbers divide is ${L}.`)}
function qCountF(){const N=one([8,10,12,15,16,18,20,24]);return numQ(ex(String(N)),'How many factors does this number have?',factors(N).length,`The factors of ${N} are ${factors(N).join(', ')}. That is ${factors(N).length} factors.`)}
function qPrime(){const p=one([7,11,13,17,19,23,29,31]),w=sample([9,15,21,25,27,33,35,39],2);return pickText('','Which number is prime (only 1 and itself divide it)?','',[p,...w],p,`${p} has no factors except 1 and ${p}. The others break up: ${w.map(x=>x+' = '+factors(x)[1]+' \u00d7 '+x/factors(x)[1]).join(', ')}.`)}
function qMissNum(){const[n,d]=one(BASES),k=rnd(2,5);return numQ(fx(fH(`${n}/${d}`),op('='),fH(`?/${d*k}`)),'Find the missing top number.',n*k,`The bottom was multiplied by ${k} (${d} \u00d7 ${k} = ${d*k}), so multiply the top by ${k} too: ${n} \u00d7 ${k} = ${n*k}.`)}
function qCmpU(){let a,b,c,d;do{[a,b]=sf();[c,d]=sf()}while(b===d||a*d===c*b);const L=b*d/gcd(b,d),x=a*L/b,y=c*L/d,big=x>y?`${a}/${b}`:`${c}/${d}`;
  return fracQ(fx(fH(`${a}/${b}`),op('or'),fH(`${c}/${d}`)),'Which fraction is bigger?',big,[x>y?`${c}/${d}`:`${a}/${b}`],`Give both the same bottom number (${L}): ${a}/${b} = ${x}/${L} and ${c}/${d} = ${y}/${L}. So ${big} is bigger.`,2)}
function qSimpBig(){const[n,d]=one(BASES),k=rnd(4,6);return fracQ(fH(`${n*k}/${d*k}`),'Write it in its simplest form.',`${n}/${d}`,[`${n}/${d+1}`,`${n+1}/${d+1}`,`${n*2}/${d}`],`Divide the top and the bottom by ${k}: ${n}/${d}.`)}
function qWholes(){const d=rnd(2,6),w=rnd(1,4),r=rnd(1,d-1),n=w*d+r;return numQ(fH(`${n}/${d}`),'How many wholes are inside this fraction?',w,`${d}/${d} makes one whole. ${n} \u00f7 ${d} = ${w} remainder ${r}, so there are ${w} wholes and ${r}/${d} more.`)}
function qFSubUnlike(){const[d1,d2]=one([[2,3],[2,4],[2,5],[3,4],[3,6],[4,8],[2,6],[5,10],[3,5],[2,8]]);let n1=1,n2=1;for(let t=0;t<20;t++){const a=rnd(1,d1-1),b=rnd(1,d2-1);if(a/d1>b/d2){n1=a;n2=b;break}}
  const L=d1*d2/gcd(d1,d2),x=n1*L/d1,y=n2*L/d2;return fracQ(fx(fH(`${n1}/${d1}`),op('\u2212'),fH(`${n2}/${d2}`)),'Subtract the fractions.',fS(x-y,L),[`${Math.abs(n1-n2)||1}/${Math.abs(d1-d2)||1}`,fS(x-y+1,L),`${x-y}/${L+1}`],`Make the bottom numbers the same (${L}): ${n1}/${d1} = ${x}/${L} and ${n2}/${d2} = ${y}/${L}. Subtract the tops: ${x-y}/${L}${simp(x-y,L)}.`)}
function qOneMinus(){const d=rnd(3,10),n=rnd(1,d-1);return fracQ(fx(op('1 \u2212'),fH(`${n}/${d}`)),'Subtract from one whole.',fS(d-n,d),[`${n}/${d}`,fS(d-n+1,d),`${d-n}/${d+1}`],`One whole is ${d}/${d}. ${d}/${d} \u2212 ${n}/${d} = ${d-n}/${d}${simp(d-n,d)}.`)}
const fst=(t,correct,wrongs,hint,nopt)=>fracQ(`<div class="passage">${t}</div>`,'Choose the answer.',correct,wrongs,hint,nopt);
const cop=()=>{let d,k;do{d=rnd(3,10);k=rnd(1,d-1)}while(gcd(k,d)!==1);return[k,d]};

/* real-life problem banks */
const S1=['{n} has {a} stickers and gets {b} more. How many stickers does {n} have now?','A school has {a} boys and {b} girls. How many children are there in all?','A fruit seller sold {a} mangoes on Saturday and {b} on Sunday. How many mangoes were sold?','{n} read {a} pages last month and {b} pages this month. How many pages in all?','A bus travelled {a} km in the morning and {b} km in the evening. How far did it travel?','A school bag costs \u20b9{a} and a water bottle costs \u20b9{b}. What do both cost together?','A library has {a} story books and {b} science books. How many books is that?','{n} scored {a} runs in the first match and {b} runs in the second. How many runs in total?'];
const S2=['{n} had \u20b9{a} and spent \u20b9{b}. How much money is left?','A water tank holds {a} litres. {b} litres are used. How many litres are left?','A book has {a} pages. {n} has read {b} pages. How many pages are left to read?','{a} people came to a fair. {b} have gone home. How many are still at the fair?','A shop had {a} kites and sold {b}. How many kites are left?','{n} scored {a} runs and a friend scored {b} runs. How many more runs did {n} score?','A train journey is {a} km long. The train has covered {b} km. How many km are left?','A farmer picked {a} mangoes. {b} were sold. How many mangoes are left?'];
const S3=['{n} bought a pencil box for \u20b9{a}, a notebook for \u20b9{b} and a pen for \u20b9{c}. What was the total cost?','A class collected {a}, {b} and {c} bottle caps in three weeks. How many caps in all?','In three overs a team scored {a}, {b} and {c} runs. How many runs altogether?','{n} walked {a} m to the park, {b} m to the shop and {c} m back home. How far did {n} walk?','Three baskets hold {a}, {b} and {c} mangoes. How many mangoes altogether?','A library received {a} story books, {b} science books and {c} comics. How many books arrived?','{n} saved \u20b9{a} in January, \u20b9{b} in February and \u20b9{c} in March. How much was saved?'];
const S4=[['s','{n} had \u20b9{a}. {n} spent \u20b9{b} on lunch and \u20b9{c} on a bus ticket. How much is left?'],['s','A shop had {a} eggs. It sold {b} in the morning and {c} in the afternoon. How many eggs are left?'],['s','A bus had {a} passengers. {b} got off at the first stop and {c} at the second. How many are still on the bus?'],['s','A roll has {a} cm of ribbon. Pieces of {b} cm and {c} cm are cut off. How much ribbon is left?'],['s','{n} has {a} pages to read. {n} reads {b} on Monday and {c} on Tuesday. How many pages are left?'],['p','A train had {a} passengers. {b} more got on and then {c} got off. How many passengers are on the train now?'],['p','{n} had \u20b9{a}, got \u20b9{b} as a gift and then spent \u20b9{c}. How much does {n} have now?']];
const S5=[['+','A town has {a} men and {b} women. How many adults live in the town?'],['+','A factory made {a} toys in May and {b} toys in June. How many toys in the two months?'],['+','{a} people watched a match on Saturday and {b} on Sunday. How many people watched in all?'],['+','A farmer harvested {a} kg of rice and {b} kg of wheat. How many kg of grain is that?'],['-','A town has {a} people. {b} of them are children. How many are adults?'],['-','A scooter costs \u20b9{a} and a cycle costs \u20b9{b}. How much more does the scooter cost?'],['-','A library has {a} books. {b} are out on loan. How many books are in the library now?'],['-','A stadium has {a} seats. {b} tickets are sold. How many seats are still empty?']];
const S6=['One box holds {b} pencils. How many pencils are in {a} boxes?','A ticket costs \u20b9{b}. What do {a} tickets cost?','A hall has {a} rows with {b} chairs in each row. How many chairs are there?','{n} saves \u20b9{b} every week. How much does {n} save in {a} weeks?','A car travels {b} km in one hour. How far does it go in {a} hours?','Each packet has {b} biscuits. How many biscuits are in {a} packets?','A gardener plants {b} saplings in each of {a} rows. How many saplings is that?','One carton holds {b} mangoes. How many mangoes are in {a} cartons?'];
const S7=['{a} sweets are shared equally among {b} children. How many sweets does each child get?','{a} books are packed with {b} books in each box. How many boxes are filled?','\u20b9{a} is shared equally by {b} friends. How much does each friend get?','A rope {a} m long is cut into {b} equal pieces. How long is each piece?','{a} students sit in rows of {b}. How many rows are there?','A farmer plants {a} saplings in {b} equal rows. How many saplings are in each row?','{a} laddoos are packed equally into {b} boxes. How many laddoos go in each box?'];
const S7R=['{a} mangoes are packed {b} to a bag. How many mangoes are left over?','{a} children get into autos that seat {b} each. How many children are in the last auto, which is not full?','{a} marbles are shared equally among {b} friends. How many marbles are left over?'];
const THINGS10=[['spider',8,'legs'],['week',7,'days'],['autorickshaw',3,'wheels'],['hand',5,'fingers'],['egg tray',6,'eggs'],['cricket over',6,'balls'],['car',4,'wheels'],['kabaddi team',7,'players'],['insect',6,'legs'],['tricycle',3,'wheels']];
const THINGS20=[['cricket team',11,'players'],['dozen',12,'eggs'],['gift box',13,'chocolates'],['fortnight',14,'days'],['crayon pack',15,'crayons'],['tray',16,'laddoos'],['rack',17,'books'],['minibus',18,'seats'],['packet',19,'balloons'],['classroom',20,'desks']];
const thing=(T,lo,hi,lv,hint)=>cyc(T,([t,per,u])=>{const n=rnd(lo,hi),p=n*per;return lv===1||Math.random()<.5?st(`One ${t} has ${per} ${u}. How many ${u} do ${n} ${t}s have?`,p,hint(per,n)):st(`There are ${p} ${u} in all. One ${t} has ${per} ${u}. How many ${t}s are there?`,n,`Use the ${per} times table backwards: ${per} \u00d7 ${n} = ${p}, so there are ${n}.`)});
const S9=[[()=>{const n=2*rnd(6,30);return st(`A pen costs \u20b95. What do ${n} pens cost?`,n*5,`\u00d7 5: half of ${n} is ${n/2}, then \u00d7 10: ${n*5}.`)},()=>{const n=rnd(12,60);return st(`A carton holds 100 pencils. How many pencils are in ${n} cartons?`,n*100,`\u00d7 100: put two zeros after ${n}: ${nf(n*100)}.`)},()=>{const n=5*rnd(13,60);return st(`\u20b9${n} is shared equally by 5 friends. How much does each get?`,n/5,`\u00f7 5: double ${n} to get ${n*2}, then \u00f7 10: ${n/5}.`)},()=>{const n=rnd(13,45);return st(`A car has 4 wheels. How many wheels do ${n} cars have?`,n*4,`\u00d7 4: double ${n} is ${n*2}, double again: ${n*4}.`)},()=>{const n=rnd(12,45);return st(`A class has 20 children. How many children are in ${n} such classes?`,n*20,`\u00d7 20: double ${n} is ${n*2}, then \u00d7 10: ${n*20}.`)},()=>{const n=rnd(14,96);return st(`A pencil costs \u20b910. What do ${n} pencils cost?`,n*10,`\u00d7 10: put one zero after ${n}: ${n*10}.`)}],
 [()=>{const n=rnd(12,39);return st(`One ticket costs \u20b99. What do ${n} tickets cost?`,n*9,`\u00d7 9: ${n} \u00d7 10 = ${n*10}, minus one ${n}: ${n*9}.`)},()=>{const n=4*rnd(2,12);return st(`A box holds 25 mangoes. How many mangoes are in ${n} boxes?`,n*25,`\u00d7 25: a quarter of ${n} is ${n/4}, then \u00d7 100: ${nf(n*25)}.`)},()=>{const n=rnd(3,25);return st(`A toy costs \u20b999. What do ${n} toys cost?`,n*99,`\u00d7 99: ${n} \u00d7 100 = ${nf(n*100)}, minus one ${n}: ${nf(n*99)}.`)},()=>{const n=2*rnd(6,24);return st(`A chair costs \u20b915. What do ${n} chairs cost?`,n*15,`\u00d7 15: ${n} \u00d7 10 = ${n*10}, plus half of that (${n*5}): ${n*15}.`)},()=>{const n=2*rnd(7,48);return st(`A notebook has 50 pages. How many pages are in ${n} notebooks?`,n*50,`\u00d7 50: half of ${n} is ${n/2}, then \u00d7 100: ${nf(n*50)}.`)},()=>{const a=rnd(1,8),b=rnd(1,9-a),n=a*10+b;return st(`Each of the 11 players in a team scored ${n} runs. How many runs did the team score?`,n*11,`\u00d7 11: split ${a} and ${b}, put their sum ${a+b} in the middle: ${n*11}.`)},()=>{const n=25*rnd(3,36);return st(`\u20b9${n} is changed into \u20b925 coupons. How many coupons is that?`,n/25,`\u00f7 25: multiply by 4 to get ${nf(n*4)}, then \u00f7 100: ${n/25}.`)}]];
const S12=[(a,b,g,L)=>st(`One bell rings every ${a} minutes and another every ${b} minutes. They ring together now. After how many minutes will they next ring together?`,L,'Ringing together again needs a shared multiple, so find the LCM. '+lcmHint(a,b,L)),
 (a,b,g,L)=>st(`${one(NAMES)} waters one plant every ${a} days and another every ${b} days. Both are watered today. After how many days will both be watered on the same day again?`,L,'The same day again means a shared multiple, so find the LCM. '+lcmHint(a,b,L)),
 (a,b,g,L)=>st(`Plates come in packs of ${a} and cups in packs of ${b}. What is the smallest number of plates you can buy so that you can have exactly the same number of cups?`,L,'The same number of each means a shared multiple, so find the LCM. '+lcmHint(a,b,L)),
 (a,b,g,L)=>st(`A teacher has ${a} pencils and ${b} erasers. She makes identical kits and uses everything. What is the largest number of kits she can make?`,g,'The largest equal sharing of both means the HCF. '+hcfHint(a,b,g)),
 (a,b,g,L)=>st(`Two ribbons are ${a} cm and ${b} cm long. Both are cut into pieces of the same length, as long as possible, with nothing left over. How long is each piece in cm?`,g,'The longest piece that fits both exactly is the HCF. '+hcfHint(a,b,g)),
 (a,b,g,L)=>st(`${a} boys and ${b} girls stand in rows. Every row has the same number of children, and boys and girls stand in separate rows. What is the largest number in each row?`,g,'The largest row size that divides both is the HCF. '+hcfHint(a,b,g))];
const fof=(lv)=>{let n=1,d=rnd(2,6);if(lv!==1)do{d=rnd(3,8);n=rnd(2,d-1)}while(gcd(n,d)!==1);return[n,d,d*rnd(4,12)]};
const S13=[lv=>{const[k,d]=cop();return fst(`A pizza is cut into ${d} equal slices. ${one(NAMES)} eats ${k} of them. What fraction of the pizza is eaten?`,`${k}/${d}`,[`${d}/${k}`,`${d-k}/${d}`,`${k}/${d+1}`],`${k} slices out of ${d} equal slices is ${k}/${d}.`)},
 lv=>{const[k,d]=cop();return fst(`${k} of the ${d} balloons at a party are red. What fraction of the balloons are not red?`,`${d-k}/${d}`,[`${k}/${d}`,`${d}/${d-k}`,`${d-k}/${d+1}`],`${d} \u2212 ${k} = ${d-k} balloons are not red, out of ${d}: ${d-k}/${d}.`)},
 lv=>{const d1=rnd(2,5),d2=rnd(d1+1,9);return fst(`${one(NAMES)} gets 1/${d1} of a cake and a friend gets 1/${d2} of the same cake. Which piece is bigger?`,`1/${d1}`,[`1/${d2}`],`Fewer parts means bigger pieces, so 1/${d1} is bigger than 1/${d2}.`,2)},
 lv=>{const[n,d,N]=fof(lv);return st(`There are ${N} mangoes in a basket. ${n}/${d} of them are ripe. How many mangoes are ripe?`,N/d*n,`${N} \u00f7 ${d} = ${N/d}${n>1?`, then \u00d7 ${n} = ${N/d*n}`:''}.`)},
 lv=>{const[n,d,N]=fof(lv);return st(`A class has ${N} children. ${n}/${d} of them come to school by bus. How many children come by bus?`,N/d*n,`${N} \u00f7 ${d} = ${N/d}${n>1?`, then \u00d7 ${n} = ${N/d*n}`:''}.`)},
 lv=>{const[n,d,N]=fof(lv);return st(`${one(NAMES)} has \u20b9${N} and spends ${n}/${d} of it. How many rupees are spent?`,N/d*n,`${N} \u00f7 ${d} = ${N/d}${n>1?`, then \u00d7 ${n} = ${N/d*n}`:''}.`)},
 lv=>{const[n,d]=one(BASES),k=rnd(2,4);return fst(`${one(NAMES)} colours ${n*k} out of ${d*k} equal squares. What is this fraction in its simplest form?`,`${n}/${d}`,[`${n}/${d+1}`,`${n+1}/${d+1}`,`${n*k}/${d}`],`${n*k}/${d*k}: divide the top and the bottom by ${k} to get ${n}/${d}.`)}];
const S14=[lv=>{const d=rnd(4,10),a=rnd(1,d-2),b=rnd(1,d-a-1);return fst(`${one(NAMES)} eats ${a}/${d} of a pizza and a friend eats ${b}/${d}. What fraction of the pizza do they eat altogether?`,fS(a+b,d),[`${a+b}/${2*d}`,fS(a+b+1,d),`${a+b}/${d+1}`],`Same bottom number, so add the tops: ${a} + ${b} = ${a+b}, giving ${a+b}/${d}${simp(a+b,d)}.`)},
 lv=>{const d=rnd(4,10),a=rnd(2,d-1),b=rnd(1,a-1);return fst(`A bottle is ${a}/${d} full of juice. ${one(NAMES)} drinks ${b}/${d} of the bottle. What fraction of the bottle is left?`,fS(a-b,d),[fS(a+b,d),fS(a-b+1,d),`${a-b}/${d+1}`],`Same bottom number, so subtract the tops: ${a} \u2212 ${b} = ${a-b}, giving ${a-b}/${d}${simp(a-b,d)}.`)},
 lv=>{const[d1,d2]=one([[2,4],[2,3],[3,6],[4,8],[2,6],[2,8],[3,4],[2,5]]),L=d1*d2/gcd(d1,d2),x=L/d1,y=L/d2;return fst(`${one(NAMES)} walks 1/${d1} km to school and then 1/${d2} km to the shop. How many km is that in all?`,fS(x+y,L),[`2/${d1+d2}`,fS(x+y+1,L),`2/${L}`],`Make the bottoms the same (${L}): 1/${d1} = ${x}/${L} and 1/${d2} = ${y}/${L}. Add the tops: ${x+y}/${L}${simp(x+y,L)}.`)},
 lv=>{const[n,d,N]=fof(2);return st(`A class has ${N} children. ${n}/${d} of them walk to school. How many children walk to school?`,N/d*n,`${N} \u00f7 ${d} = ${N/d}, then \u00d7 ${n} = ${N/d*n}.`)},
 lv=>{const[n,d]=cop();return fst(`${one(NAMES)} has read ${n}/${d} of a book. What fraction of the book is still left to read?`,fS(d-n,d),[`${n}/${d}`,fS(d-n+1,d),`${d-n}/${d+1}`],`The whole book is ${d}/${d}. ${d}/${d} \u2212 ${n}/${d} = ${d-n}/${d}${simp(d-n,d)}.`)},
 lv=>{if(lv===1){const d=rnd(2,6),W=rnd(2,6);return st(`A ribbon is ${W} m long. How many pieces of 1/${d} m can be cut from it?`,W*d,`Each metre gives ${d} pieces. ${W} \u00d7 ${d} = ${W*d} pieces.`)}const[n1,d1]=sf(),[n2,d2]=sf();return fst(`${one(NAMES)} has ${n1}/${d1} of a cake and gives away ${n2}/${d2} of that piece. What fraction of the whole cake is given away?`,fS(n1*n2,d1*d2),[fS(n1+n2,d1+d2),fS(n1*d2,d1*n2),fS(n1*n2+1,d1*d2)],`"Of" means multiply: ${n1}/${d1} \u00d7 ${n2}/${d2} = ${n1*n2}/${d1*d2}${simp(n1*n2,d1*d2)}.`)},
 lv=>{const[d1,d2]=one([[2,4],[2,3],[3,6],[4,8],[2,6],[2,8],[3,4],[2,5]]),L=d1*d2/gcd(d1,d2),x=L/d1,y=L/d2;return fst(`A jug holds 1/${d1} litre of milk. 1/${d2} litre is poured out. How much milk is left, in litres?`,fS(x-y,L),[`1/${d2-d1}`,fS(x-y+1,L),`${x-y}/${L+1}`],`Make the bottoms the same (${L}): 1/${d1} = ${x}/${L} and 1/${d2} = ${y}/${L}. Subtract the tops: ${x-y}/${L}${simp(x-y,L)}.`)}];
const eg=(t,b)=>`<div class="eg"><b>${t}</b><br>${b}</div>`;
const MA=[
 {n:1,title:'Addition',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Adding means putting amounts together. Big numbers are added <b>place by place</b>: ones with ones, tens with tens, hundreds with hundreds. When a place adds up to 10 or more, the extra ten moves to the next place. This is called <b>carrying</b>.</p>
  <h4>Step by step</h4><ol><li>Break each number into hundreds, tens and ones.</li><li>Add each place.</li><li>Put the parts together.</li></ol>
  ${eg('Example 1: 47 + 38','Tens: 40 + 30 = 70. Ones: 7 + 8 = 15. Together: 70 + 15 = <b>85</b>.')}${eg('Example 2: 356 + 278','Hundreds: 300 + 200 = 500. Tens: 50 + 70 = 120. Ones: 6 + 8 = 14. Together: 500 + 120 + 14 = <b>634</b>.')}${eg('Example 3: make a round number','198 + 46: take 2 from 46 to make 198 into 200. Then 200 + 44 = <b>244</b>.')}
  <h4>Watch out</h4><p>Do not forget the carried ten. A quick estimate helps: 356 + 278 is about 350 + 300 = 650, so 634 makes sense.</p>`,
  sets:sets5(lv=>lv===1?qA(rnd(23,68),rnd(14,58)):lv===2?qA(rnd(125,689),rnd(24,289)):Math.random()<.5?qA(rnd(356,899),rnd(245,899)):qA(rnd(1250,4899),rnd(365,989)),
   lv=>cyc(S1,t=>{const a=lv===1?rnd(23,89):rnd(245,1899),b=lv===1?rnd(14,78):rnd(135,950);return st(fill(t,{a,b}),a+b,`Put the two amounts together, so add: ${nf(a)} + ${nf(b)} = ${nf(a+b)}.`)}))},
 {n:2,title:'Subtraction',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Subtracting finds what is left, or the <b>gap</b> between two numbers. A reliable way is to <b>count up</b> from the smaller number to the bigger one in easy jumps.</p>
  <h4>Step by step</h4><ol><li>Start at the smaller number.</li><li>Jump to the next ten, then the next hundred.</li><li>Jump to the bigger number. Add the jumps.</li></ol>
  ${eg('Example 1: 82 \u2212 47','47 to 50 is 3. 50 to 82 is 32. 3 + 32 = <b>35</b>.')}${eg('Example 2: 500 \u2212 237','237 to 240 is 3. 240 to 300 is 60. 300 to 500 is 200. 3 + 60 + 200 = <b>263</b>.')}${eg('Example 3: in columns, 634 \u2212 278','Ones: 4 is less than 8, so borrow a ten: 14 \u2212 8 = 6. Tens: 2 is less than 7, so borrow a hundred: 12 \u2212 7 = 5. Hundreds: 5 \u2212 2 = 3. Answer <b>356</b>.')}
  <h4>Watch out</h4><p>In columns, never just take the smaller digit from the bigger one. Check by adding back: 356 + 278 = 634.</p>`,
  sets:sets5(lv=>{if(lv===1){const a=rnd(41,98);return qS(a,rnd(13,a-9))}if(lv===2){const a=rnd(210,950);return qS(a,rnd(34,a-50))}if(Math.random()<.5){const a=one([300,400,500,600,700,800,1000]);return qS(a,rnd(123,a-45))}return qS(rnd(1200,5000),rnd(345,989))},
   lv=>cyc(S2,t=>{const a=lv===1?rnd(45,98):rnd(320,2400),b=lv===1?rnd(12,a-8):rnd(115,a-60);return st(fill(t,{a,b}),a-b,`Find what is left or the gap, so subtract: ${nf(a)} \u2212 ${nf(b)} = ${nf(a-b)}.`)}))},
 {n:3,title:'Adding three numbers',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Numbers can be added in <b>any order</b>. So look for two numbers that make a round number (10, 50, 100) and add those first. These pairs are called <b>friends</b>.</p>${chips(['1 + 9','2 + 8','3 + 7','4 + 6','5 + 5','25 + 75','40 + 60'])}
  <h4>Step by step</h4><ol><li>Look at the ones digits. Find two that add to 10.</li><li>Add that pair first.</li><li>Add the third number.</li></ol>
  ${eg('Example 1: 7 + 6 + 3','7 and 3 are friends: 10. Then 10 + 6 = <b>16</b>.')}${eg('Example 2: 27 + 15 + 13','27 and 13 are friends: 40. Then 40 + 15 = <b>55</b>.')}${eg('Example 3: 175 + 48 + 25','175 and 25 are friends: 200. Then 200 + 48 = <b>248</b>.')}
  <h4>Watch out</h4><p>If there are no friends, just add two numbers, then add the third to that total.</p>`,
  sets:sets5(lv=>{const[p,q,r]=trip(lv);return numQ(ex(shuffle([p,q,r]).map(nf).join(' + ')),'Add all three. Look for friends first.',p+q+r,friends(p,q,r))},
   lv=>cyc(S3,t=>{const[p,q,r]=trip(lv===1?2:3),[a,b,c]=shuffle([p,q,r]);return st(fill(t,{a,b,c}),p+q+r,'Add all three amounts. '+friends(p,q,r))}))},
 {n:4,title:'Subtracting three numbers',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Taking away two numbers one after the other is the same as taking away their <b>total</b>. So add the two numbers you are taking away, then subtract once.</p>
  <h4>Step by step</h4><ol><li>Add the two numbers being taken away.</li><li>Subtract that total from the first number.</li><li>If there is a plus and a minus, work from left to right.</li></ol>
  ${eg('Example 1: 50 \u2212 12 \u2212 8','12 + 8 = 20. Then 50 \u2212 20 = <b>30</b>.')}${eg('Example 2: 400 \u2212 135 \u2212 65','135 + 65 = 200. Then 400 \u2212 200 = <b>200</b>.')}${eg('Example 3: 60 + 25 \u2212 30','Left to right: 60 + 25 = 85. Then 85 \u2212 30 = <b>55</b>.')}
  <h4>Watch out</h4><p>In 50 \u2212 12 \u2212 8, do not work out 12 \u2212 8 first. Think of a story: you had 50, spent 12, then spent 8 more.</p>`,
  sets:sets5(lv=>{if(lv===3&&Math.random()<.5){const a=rnd(150,600),b=rnd(40,140),c=rnd(30,180);return Math.random()<.5?mixPM(a,b,c):mixMP(a,b,c)}const[a,b,c]=sub3n(lv);return sub3(a,b,c)},
   lv=>cyc(S4,([k,t])=>{if(k==='s'){const[a,b,c]=sub3n(lv===1?1:2);return st(fill(t,{a,b,c}),a-b-c,`Two amounts are taken away. Add them first: ${nf(b)} + ${nf(c)} = ${nf(b+c)}. Then ${nf(a)} \u2212 ${nf(b+c)} = ${nf(a-b-c)}.`)}
     const a=lv===1?rnd(20,60):rnd(150,600),b=lv===1?rnd(5,30):rnd(40,180),c=lv===1?rnd(3,20):rnd(30,160);return st(fill(t,{a,b,c}),a+b-c,`First add: ${nf(a)} + ${nf(b)} = ${nf(a+b)}. Then subtract: ${nf(a+b)} \u2212 ${nf(c)} = ${nf(a+b-c)}.`)}))},
 {n:5,title:'Big numbers: add and subtract',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Four and five digit numbers work exactly like small ones. Write them in <b>columns</b> so that ones sit under ones, tens under tens, and so on. Then work from the right, one column at a time.</p>
  <div style="text-align:center">${colsum(['4,275','+ 3,168'])}<div class="wordbig">7,443</div></div>
  <h4>Step by step</h4><ol><li>Estimate first by rounding to the nearest thousand.</li><li>Line up the places.</li><li>Start from the ones. Carry when a column passes 9. Borrow when the top digit is smaller.</li><li>Compare with your estimate.</li></ol>
  ${eg('Example 1: 4,275 + 3,168','Ones: 5 + 8 = 13, write 3 carry 1. Tens: 7 + 6 + 1 = 14, write 4 carry 1. Hundreds: 2 + 1 + 1 = 4. Thousands: 4 + 3 = 7. Answer <b>7,443</b>.')}${eg('Example 2: 50,000 \u2212 23,476','Count up: 23,476 to 23,480 is 4, to 23,500 is 20, to 24,000 is 500, to 50,000 is 26,000. Total <b>26,524</b>.')}
  <h4>Watch out</h4><p>Numbers of different lengths must still line up from the right. Borrowing across zeros is where most mistakes happen, so count up instead.</p>`,
  sets:sets5(lv=>{if(lv===1){if(Math.random()<.5)return bigA(rnd(1200,4999),rnd(1100,4999));const a=rnd(4000,9999);return bigS(a,rnd(1100,a-500))}if(lv===2){if(Math.random()<.5)return bigA(rnd(11000,49999),rnd(11000,49999));const a=rnd(30000,99999);return bigS(a,rnd(11000,a-2500))}
     if(Math.random()<.5){const a=one([20000,30000,40000,50000,60000,80000,100000]);return bigS(a,rnd(3456,a-1234))}return bigA(rnd(45000,99999),rnd(8500,9999))},
   lv=>cyc(S5,([k,t])=>{const a=lv===1?rnd(3200,9800):rnd(21000,98000),b=lv===1?rnd(1150,a-700):rnd(11500,a-3500);return k==='+'?st(fill(t,{a,b}),a+b,`Add the two amounts: ${nf(a)} + ${nf(b)} = ${nf(a+b)}.`):st(fill(t,{a,b}),a-b,`Find the difference, so subtract: ${nf(a)} \u2212 ${nf(b)} = ${nf(a-b)}.`)}))},
 {n:6,title:'Multiplication',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Multiplying is a fast way to add <b>equal groups</b>. 4 groups of 6 is 6 + 6 + 6 + 6 = 4 \u00d7 6 = 24.</p><div style="text-align:center"><div class="dotgrid" role="img" aria-label="3 rows of 4 dots">${'<i></i>'.repeat(12)}</div><p>3 rows of 4 = 12</p></div>
  <h4>Step by step for bigger numbers</h4><ol><li>Split the big number into tens and ones.</li><li>Multiply each part.</li><li>Add the parts.</li></ol>
  ${eg('Example 1: 23 \u00d7 4','20 \u00d7 4 = 80. 3 \u00d7 4 = 12. 80 + 12 = <b>92</b>.')}${eg('Example 2: 347 \u00d7 6','300 \u00d7 6 = 1,800. 40 \u00d7 6 = 240. 7 \u00d7 6 = 42. Add: <b>2,082</b>.')}${eg('Example 3: 30 \u00d7 40','3 \u00d7 4 = 12, then put the two zeros back: <b>1,200</b>.')}
  <h4>Watch out</h4><p>The order does not matter: 4 \u00d7 23 is the same as 23 \u00d7 4. In a story, look for "each", "every" or "rows of". They usually mean multiply.</p>`,
  sets:sets5(lv=>lv===1?(Math.random()<.5?qT(rnd(2,9),rnd(3,9)):qMul(rnd(11,24),rnd(2,4))):lv===2?qMul(rnd(23,89),rnd(3,9)):(Math.random()<.6?qMul(rnd(112,489),rnd(3,9)):qTens()),
   lv=>cyc(S6,t=>{const a=lv===1?rnd(3,9):rnd(6,9),b=lv===1?rnd(6,24):rnd(35,240);return st(fill(t,{a,b}),a*b,`These are equal groups, so multiply: ${a} \u00d7 ${nf(b)} = ${nf(a*b)}.`)}))},
 {n:7,title:'Division',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Dividing means <b>sharing equally</b> or making <b>equal groups</b>. It is the times table backwards: because 7 \u00d7 8 = 56, we know 56 \u00f7 7 = 8.</p><div style="text-align:center" class="emo">🍪🍪🍪🍪 | 🍪🍪🍪🍪 | 🍪🍪🍪🍪</div>
  <h4>Step by step for bigger numbers</h4><ol><li>Take out a big easy chunk (10 or 20 groups).</li><li>Divide what is left.</li><li>Add the two answers. Anything left over is the <b>remainder</b>.</li></ol>
  ${eg('Example 1: 56 \u00f7 7','7 \u00d7 8 = 56, so the answer is <b>8</b>.')}${eg('Example 2: 96 \u00f7 4','4 \u00d7 20 = 80. That leaves 16, and 16 \u00f7 4 = 4. 20 + 4 = <b>24</b>.')}${eg('Example 3: 47 \u00f7 5','5 \u00d7 9 = 45 is the closest. 47 \u2212 45 = 2 left over. Answer <b>9 remainder 2</b>.')}
  <h4>Watch out</h4><p>The remainder must be smaller than the number you divide by. If it is not, you can make one more group. Check by multiplying back.</p>`,
  sets:sets5(lv=>lv===1?qDivC(rnd(2,9),rnd(2,10)):lv===2?(Math.random()<.6?qDivC(rnd(3,8),rnd(11,29)):qRemN()):qDivC(rnd(3,9),rnd(31,160)),
   lv=>cyc(S7.concat(lv===2?S7R:[]),t=>{const b=rnd(3,9),q=lv===1?rnd(3,12):rnd(12,75);if(S7R.indexOf(t)>=0){const r=rnd(1,b-1),a=b*q+r;return st(fill(t,{a,b}),r,`${b} \u00d7 ${q} = ${nf(b*q)} is the closest below ${nf(a)}. ${nf(a)} \u2212 ${nf(b*q)} = ${r} left over.`)}
     return st(fill(t,{a:b*q,b}),q,`This is equal sharing, so divide: ${nf(b*q)} \u00f7 ${b} = ${q}. Check: ${b} \u00d7 ${q} = ${nf(b*q)}.`)}))},
 {n:8,title:'Big numbers: multiply and divide',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>Big multiplications are several small ones added together. Big divisions are done in <b>chunks</b>. In both, splitting by place value does the work.</p>
  ${eg('Example 1: 46 \u00d7 23','Split 23 into 20 and 3. 46 \u00d7 20 = 920. 46 \u00d7 3 = 138. 920 + 138 = <b>1,058</b>.')}${eg('Example 2: 1,284 \u00f7 4','4 \u00d7 300 = 1,200. That leaves 84. 4 \u00d7 20 = 80. That leaves 4, and 4 \u00f7 4 = 1. 300 + 20 + 1 = <b>321</b>.')}${eg('Example 3: 414 \u00f7 18','18 \u00d7 20 = 360. That leaves 54, and 54 \u00f7 18 = 3. 20 + 3 = <b>23</b>.')}
  <h4>Step by step</h4><ol><li>Estimate first: 46 \u00d7 23 is about 50 \u00d7 20 = 1,000.</li><li>Split, work out each part, then add.</li><li>Check a division by multiplying back.</li></ol>
  <h4>Watch out</h4><p>When multiplying by the tens digit, remember the zero: 46 \u00d7 20 is 920, not 92. In division, a place with nothing in it still needs a zero: 612 \u00f7 6 = 102.</p>`,
  sets:sets5(lv=>lv===1?(Math.random()<.5?qMul(rnd(112,489),rnd(3,9)):qDivC(rnd(3,9),rnd(105,320))):lv===2?one([()=>qMulAB(rnd(12,39),rnd(11,29)),()=>qMul(rnd(1203,4890),rnd(3,7)),()=>qDivBig()])():(Math.random()<.5?qMulAB(rnd(112,345),rnd(12,29)):qDivC(rnd(11,25),rnd(12,96))),
   lv=>cyc(S6.map(t=>['m',t]).concat(S7.map(t=>['d',t])),([k,t])=>{if(k==='m'){const a=lv===1?rnd(4,9):rnd(12,28),b=lv===1?rnd(112,480):rnd(24,96);return st(fill(t,{a,b}),a*b,`Equal groups, so multiply: ${a} \u00d7 ${nf(b)} = ${nf(a*b)}.`)}
     const b=lv===1?rnd(3,9):rnd(11,24),q=lv===1?rnd(105,420):rnd(15,96);return st(fill(t,{a:b*q,b}),q,`Equal sharing, so divide: ${nf(b*q)} \u00f7 ${b} = ${nf(q)}. Check: ${b} \u00d7 ${nf(q)} = ${nf(b*q)}.`)}))},
 {n:9,title:'Speed tricks',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A trick turns one hard sum into two easy ones. Every trick works because of how numbers are built, so always ask <b>why</b> it works.</p>
  ${chips(['\u00d7 10, \u00d7 100: add zeros','\u00d7 5: halve, then \u00d7 10','\u00d7 4: double, double','\u00d7 9: \u00d7 10, minus one lot','\u00d7 11: split, sum in the middle','\u00d7 25: quarter, then \u00d7 100','\u00d7 50: halve, then \u00d7 100','\u00d7 99: \u00d7 100, minus one lot','\u00d7 15: \u00d7 10, plus half','\u00f7 5: double, then \u00f7 10','\u00f7 25: \u00d7 4, then \u00f7 100'])}
  ${eg('Example 1: 36 \u00d7 5','5 is half of 10. Half of 36 is 18, then \u00d7 10 = <b>180</b>.')}${eg('Example 2: 23 \u00d7 9','23 \u00d7 10 = 230. Take away one 23: <b>207</b>.')}${eg('Example 3: 45 \u00d7 11','Split 4 and 5. Their sum is 9. Put it in the middle: <b>495</b>. If the sum is 10 or more, carry 1: 78 \u00d7 11 = 858.')}${eg('Example 4: 16 \u00d7 25','A quarter of 16 is 4, then \u00d7 100 = <b>400</b>.')}
  <h4>Divisibility checks</h4><p>A number divides by 3 if its digits add to a number in the 3 times table. It divides by 9 if its digits add to a number in the 9 times table.</p>`,
  sets:sets5(lv=>pickTR(lv===1?['x10','x100','x5','x4','d5','x20']:lv===2?['x9','x11','x25','hd','x50']:['x99','x15','x11c','d25','div3','div9']),
   lv=>cyc(S9[lv-1],f=>f()))},
 {n:10,title:'Tables up to 10',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>You do not need to memorise 100 facts. Learn the tables in a <b>smart order</b>, each with its own shortcut. And 3 \u00d7 7 is the same as 7 \u00d7 3, so every fact counts twice.</p>
  ${chips(['\u00d7 1 and \u00d7 10: free','\u00d7 2: double','\u00d7 5: half of \u00d7 10','\u00d7 9: \u00d7 10 minus one lot','\u00d7 4: double, double','\u00d7 3: double plus one more'])}<p>After these, only <b>6 hard facts</b> are left:</p>${chips(['6 \u00d7 6 = 36','6 \u00d7 7 = 42','6 \u00d7 8 = 48','7 \u00d7 7 = 49','7 \u00d7 8 = 56','8 \u00d7 8 = 64'])}
  ${eg('Example 1: 9 \u00d7 7','10 \u00d7 7 = 70. Take away one 7: <b>63</b>.')}${eg('Example 2: 4 \u00d7 8','Double 8 is 16. Double again: <b>32</b>.')}${eg('Example 3: 7 \u00d7 8','Remember 5, 6, 7, 8: 56 = 7 \u00d7 8. Answer <b>56</b>.')}
  <h4>How to keep them in mind</h4><ol><li>One hard fact a day on the fridge.</li><li>A 2-minute mixed quiz every day. Try to beat your own time.</li><li>Say the fact both ways: 6 \u00d7 8 = 48 and 48 \u00f7 6 = 8.</li></ol>`,
  sets:sets5(lv=>{if(lv===1)return qT(one([2,3,4,5,10]),rnd(2,10));if(lv===2){if(Math.random()<.5){const[a,b]=one([[6,6],[6,7],[6,8],[7,7],[7,8],[8,8]]);return qT(a,b)}return qT(rnd(6,9),rnd(3,9))}
     const a=rnd(3,9),b=rnd(3,9);return one([()=>qTMiss(a,b),()=>numQ(ex(`${a*b} \u00f7 ${a}`),'Divide.',b,`Use the ${a} times table backwards: ${a} \u00d7 ${b} = ${a*b}.`),()=>qSq(rnd(4,9))])()},
   lv=>thing(THINGS10,lv===1?3:6,lv===1?9:10,lv,(per,n)=>'Equal groups, so multiply. '+tHint(per,n)))},
 {n:11,title:'Tables 11 to 20',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>Every table from 11 to 19 is a table you already know plus the 10 times table. <b>Split the number into 10 and the rest.</b></p>
  ${eg('Example 1: 13 \u00d7 7','10 \u00d7 7 = 70. 3 \u00d7 7 = 21. 70 + 21 = <b>91</b>.')}${eg('Example 2: 18 \u00d7 6','10 \u00d7 6 = 60. 8 \u00d7 6 = 48. 60 + 48 = <b>108</b>.')}${eg('Example 3: 15 \u00d7 8','10 \u00d7 8 = 80. Half of 80 is 40. 80 + 40 = <b>120</b>.')}
  <h4>Shortcuts</h4>${chips(['\u00d7 11: write the digit twice (11 \u00d7 6 = 66)','\u00d7 12: \u00d7 10 plus double','\u00d7 15: \u00d7 10 plus half of it','\u00d7 19: \u00d7 20 minus one lot','\u00d7 20: double, then \u00d7 10'])}
  <h4>Squares worth knowing</h4>${chips(['11 \u00d7 11 = 121','12 \u00d7 12 = 144','13 \u00d7 13 = 169','14 \u00d7 14 = 196','15 \u00d7 15 = 225','16 \u00d7 16 = 256','20 \u00d7 20 = 400'])}
  <h4>How to keep them in mind</h4><p>Learn one table a week. Write it once, then cover it and rebuild it using the split trick. Rebuilding is stronger than chanting.</p>`,
  sets:sets5(lv=>{if(lv===1)return qT20(one([11,12,15,20]),rnd(2,9));if(lv===2)return qT20(one([13,14,16,17,18,19]),rnd(2,9));const a=rnd(11,20),b=rnd(6,12);
     return one([()=>qT20(a,b),()=>numQ(ex(`${a} \u00d7 ? = ${a*b}`),'Find the missing number.',b,`Try the split: ${a} \u00d7 ${b} = ${10*b} + ${(a-10)*b} = ${a*b}.`),()=>qSq(rnd(11,20))])()},
   lv=>thing(THINGS20,lv===1?2:6,lv===1?5:12,lv,(per,n)=>`Equal groups, so multiply. Split ${per} into 10 and ${per-10}: ${10*n} + ${(per-10)*n} = ${per*n}.`))},
 {n:12,title:'LCM and HCF',level:'Grade 5 and up',
  learn:`<h4>The idea</h4><p><b>Factors</b> are numbers that divide another number exactly. <b>Multiples</b> are the numbers in its times table.</p>
  <p><b>HCF</b> (highest common factor) is the biggest factor two numbers share. <b>LCM</b> (lowest common multiple) is the first multiple two numbers share.</p>
  ${eg('Example 1: HCF of 12 and 18','Factors of 12: 1, 2, 3, 4, 6, 12. Factors of 18: 1, 2, 3, 6, 9, 18. The biggest in both lists is <b>6</b>.')}${eg('Example 2: LCM of 4 and 6','Multiples of 4: 4, 8, 12. Multiples of 6: 6, 12. The first in both lists is <b>12</b>.')}${eg('Example 3: a quick check','HCF \u00d7 LCM = the two numbers multiplied. For 4 and 6: 2 \u00d7 12 = 24 and 4 \u00d7 6 = 24.')}
  <h4>Step by step</h4><ol><li>List factors in pairs so you miss none: 1 \u00d7 12, 2 \u00d7 6, 3 \u00d7 4.</li><li>For LCM, list multiples of the bigger number and stop at the first one the smaller number divides.</li></ol>
  <h4>Which one does a story need?</h4><p>"Largest equal groups" or "longest equal pieces" means <b>HCF</b>. "Together again" or "the same number of each" means <b>LCM</b>.</p>`,
  sets:sets5(lv=>lv===1?one([qFactor,qMultiple,qCountF,qPrime])():lv===2?(Math.random()<.5?qHCF():qLCM()):one([()=>qHCF(1),()=>qLCM(1),qLCM3])(),
   lv=>cyc(S12,f=>{const[a,b,g,L]=pairLH(lv===2);return f(a,b,g,L)}))},
 {n:13,title:'Fractions: the basics',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A fraction is some <b>equal parts of one whole</b>.</p><div style="text-align:center">${fbar(3,4)}${fx(fH('3/4'))}</div>
  <p>The <b>denominator</b> (bottom number) tells how many equal parts make the whole: 4. The <b>numerator</b> (top number) tells how many parts we have: 3.</p>
  ${eg('Example 1: comparing','With the same bottom number, the bigger top wins: 5/8 is more than 3/8. With the same top number, the smaller bottom wins: 1/3 is more than 1/5, because fewer parts means bigger pieces.')}${eg('Example 2: equal fractions','Multiply the top and the bottom by the same number: 1/2 = 2/4 = 4/8. They look different but are the same amount.')}${eg('Example 3: simplest form','Divide the top and the bottom by the same number: 6/8, divide both by 2, gives <b>3/4</b>.')}${eg('Example 4: a fraction of a number','3/4 of 20: divide by the bottom, 20 \u00f7 4 = 5, then multiply by the top, 5 \u00d7 3 = <b>15</b>.')}
  <h4>Watch out</h4><p>1/8 is <b>smaller</b> than 1/4, even though 8 is bigger than 4. A pizza shared by 8 people gives smaller slices.</p>`,
  sets:sets5(lv=>lv===1?one([qShaded,()=>qNumDen(1),()=>qNumDen(0),qCmpD])():lv===2?one([qEquiv,qSimplify,qCmpN,qMissNum])():one([qCmpU,qSimpBig,qFOf,qWholes])(),
   lv=>cyc(S13,f=>f(lv)))},
 {n:14,title:'Fractions: add, subtract, multiply, divide',level:'Grade 5 and up',
  learn:`<h4>The idea</h4><p>You can only add or subtract pieces of the <b>same size</b>. So the bottom numbers must match first. Multiplying and dividing follow their own short rules.</p>
  ${chips(['Add or subtract: same bottoms, then work on the tops','Multiply: top \u00d7 top, bottom \u00d7 bottom','Divide: flip the second fraction, then multiply','Always simplify at the end'])}
  <div style="text-align:center">${fx(fH('1/2'),op('+'),fH('1/4'),op('='),fH('2/4'),op('+'),fH('1/4'),op('='),fH('3/4'))}</div>
  ${eg('Example 1: 2/7 + 3/7','Same bottom, add the tops: <b>5/7</b>.')}${eg('Example 2: 1/2 + 1/3','The LCM of 2 and 3 is 6. 1/2 = 3/6 and 1/3 = 2/6. 3/6 + 2/6 = <b>5/6</b>.')}${eg('Example 3: 2/3 \u00d7 3/4','2 \u00d7 3 = 6 and 3 \u00d7 4 = 12, so 6/12, which simplifies to <b>1/2</b>.')}${eg('Example 4: 1/2 \u00f7 1/4','Flip the second and multiply: 1/2 \u00d7 4/1 = 4/2 = <b>2</b>. It asks: how many quarters fit in a half?')}
  <h4>Watch out</h4><p>Never add the bottom numbers: 1/2 + 1/3 is not 2/5. When dividing, flip only the second fraction.</p>`,
  sets:sets5(lv=>lv===1?one([qFAddSame,qFSubSame])():lv===2?one([qFAddUnlike,qFSubUnlike])():one([qFMul,qFDiv,qFOf,qOneMinus])(),
   lv=>cyc(S14,f=>f(lv)))}
];
const MGUIDE=[
['How to use the maths chapters',`<p>Each chapter has one big idea and one or two tricks. Children learn the idea with objects or pictures first, then practise in Kids' self study until they earn the badge (6 of 8), then explain the trick back to you.</p>
<h4>Three rules</h4><ul><li>Understanding before speed. A trick is taught only after the child can show why it works.</li><li>Always estimate before a big calculation and check after.</li><li>Mistakes go into the child's mistake bank and come back before the next test.</li></ul>
<h4>Order</h4><p>Chapters 1 to 4 suit Grades 1 to 3, chapters 5 to 11 suit Grades 3 to 6, and chapters 12 to 14 suit Grades 5 to 7. A child who struggles in a later chapter usually has a gap in tables (chapter 10).</p>`],
['1 and 2: Addition and subtraction',`<h4>Big idea</h4><p>Numbers can be broken apart and put back together. Ten is the anchor.</p>
<h4>Teach it</h4><ul><li>Friends of ten with fingers or counters until instant.</li><li>Make ten: 8 + 5 becomes 8 + 2 + 3.</li><li>Two-digit sums: tens with tens, ones with ones, then combine.</li><li>Subtraction as the gap: count up on a number line (the frog).</li></ul>
<h4>Watch for</h4><ul><li>Counting everything from 1 on fingers: teach counting on from the bigger number.</li><li>In 42 − 17, subtracting the smaller digit from the bigger in each column (answer 35). Use counting up or show borrowing with tens rods.</li></ul>
<h4>Move up when</h4><p>Friends of ten are instant and two-digit sums are right 8 times out of 10.</p>`],
['3 and 4: Three numbers',`<h4>Big idea</h4><p>Addition can be done in any order, so choose the easy pair first. Taking away two numbers is the same as taking away their total.</p>
<h4>Teach it</h4><ul><li>Circle the friends that make 10 or a round number before adding.</li><li>For a − b − c, add b and c first, then subtract once.</li><li>For mixed plus and minus, go left to right.</li></ul>
<h4>Watch for</h4><ul><li>Changing the order in subtraction (20 − 5 is not 5 − 20).</li><li>In 50 − 12 − 8, doing 12 − 8 first. Say it as a story: "I had 50, spent 12, then spent 8."</li></ul>`],
['5: Big-number addition and subtraction',`<h4>Big idea</h4><p>Place value: the same steps as small numbers, repeated column by column.</p>
<h4>Teach it</h4><ul><li>Write on squared paper, one digit per box, places lined up.</li><li>Start from the ones. Say "carry" and "borrow" aloud and write the small digit.</li><li>Estimate first by rounding to thousands; compare after.</li></ul>
<h4>Watch for</h4><ul><li>Misaligned columns when numbers have different lengths.</li><li>Borrowing across zeros (5,003 − 1,247): practise this case on its own.</li><li>Forgetting the carried 1.</li></ul>`],
['6 and 7: Multiplication and division',`<h4>Big idea</h4><p>Multiplication is equal groups; division is sharing or grouping. They undo each other.</p>
<h4>Teach it</h4><ul><li>Build arrays with counters: 3 rows of 4.</li><li>Split a two-digit number: 23 × 4 = 20 × 4 + 3 × 4.</li><li>Division as "how many groups?" and as the table backwards: 7 × ? = 56.</li><li>Remainders with real sharing: 17 sweets, 5 children.</li></ul>
<h4>Watch for</h4><ul><li>Weak tables slowing everything: go to chapter 10.</li><li>A remainder bigger than the divisor: "Can you make one more group?"</li></ul>`],
['8: Big-number multiplication and division',`<h4>Teach it</h4><ul><li>Split by place and add the parts before teaching the short written method.</li><li>Two-digit × two-digit: split the second number into tens and ones (area model on squared paper).</li><li>Long division place by place, carrying the leftover. Always multiply back to check.</li></ul>
<h4>Watch for</h4><ul><li>Forgetting the zero when multiplying by the tens digit.</li><li>Skipping a zero in the quotient (612 ÷ 6 = 102, not 12).</li></ul>`],
['9: Speed tricks',`<p>Teach one trick a week, and always show why it works.</p>
<ul><li>× 10, × 100: digits move one or two places.</li><li>× 5: halve, then × 10. ÷ 5: double, then ÷ 10.</li><li>× 9: × 10, minus one lot.</li><li>× 4: double, double. × 8: double three times.</li><li>× 25: quarter, then × 100.</li><li>× 11 (two digits): split the digits, put their sum in the middle. If the sum is 10 or more, carry 1.</li><li>Halve and double: 16 × 25 = 8 × 50 = 4 × 100.</li><li>Divisible by 3: digit sum is in the 3 times table. By 9: digit sum in the 9 times table. By 4: last two digits divide by 4.</li></ul>`],
['10 and 11: Tables to 20',`<h4>Smart order</h4><p>× 1, × 10, × 2, × 5, × 9, × 4, × 3. Each has a shortcut. Then only six hard facts remain: 6×6, 6×7, 6×8, 7×7, 7×8, 8×8. One fact a day on the fridge.</p>
<h4>Teach it</h4><ul><li>Turn-around facts: 3 × 7 = 7 × 3, so half the table is already known.</li><li>Missing-number questions (7 × ? = 56) build division at the same time.</li><li>Daily 2-minute mixed quiz; record the child's time and beat it.</li></ul>
<h4>Tables 11 to 20</h4><ul><li>Split into 10 and the rest: 13 × 7 = 70 + 21.</li><li>× 11: write the digit twice (up to 9). × 12: × 10 plus double.</li><li>× 15: × 10 plus half of that. × 20: double, then × 10.</li><li>Squares worth knowing: 11² = 121, 12² = 144, 13² = 169, 14² = 196, 15² = 225.</li></ul>`],
['12: LCM and HCF',`<h4>Big idea</h4><p>Factors go into a number; multiples come out of it. HCF is the biggest shared factor; LCM is the first shared multiple.</p>
<h4>Teach it</h4><ul><li>List factors in pairs (1 × 12, 2 × 6, 3 × 4) so none are missed.</li><li>List multiples of both numbers and circle the first match.</li><li>Later: prime factor trees. HCF takes shared primes; LCM takes all primes at their highest count.</li><li>Check: HCF × LCM = product of the two numbers.</li></ul>
<h4>Watch for</h4><ul><li>Mixing up the two words. Hook: HCF is small (a factor), LCM is large (a multiple).</li><li>Story clues: "largest equal groups" means HCF; "next time together" means LCM.</li></ul>`],
['13: Fractions, the basics',`<h4>Big idea</h4><p>A fraction is equal parts of one whole. The denominator names the size of the parts; the numerator counts them.</p>
<h4>Teach it</h4><ul><li>Fold paper strips into halves, quarters, eighths. Shade and name.</li><li>Compare with strips side by side: same bottom, bigger top wins; same top, smaller bottom wins.</li><li>Equivalent fractions by folding again: 1/2 becomes 2/4.</li><li>Simplify by dividing top and bottom by the same number.</li></ul>
<h4>Watch for</h4><ul><li>"1/8 is bigger than 1/4 because 8 is bigger." Use pizza slices: more people, smaller slices.</li><li>Unequal parts counted as fractions.</li></ul>`],
['14: Operations on fractions',`<h4>Rules, with the reason</h4><ul><li><b>Add or subtract:</b> pieces must be the same size, so make the bottoms the same (use the LCM), then work on the tops.</li><li><b>Multiply:</b> "of". Half of a quarter is an eighth: top × top, bottom × bottom.</li><li><b>Divide:</b> "how many fit?". Flip the second fraction and multiply.</li><li><b>Fraction of a number:</b> divide by the bottom, multiply by the top.</li><li>Simplify at the end.</li></ul>
<h4>Watch for</h4><ul><li>Adding tops and bottoms (1/2 + 1/3 = 2/5). Show with strips that 2/5 is less than 1/2.</li><li>Flipping the first fraction instead of the second.</li><li>Forgetting to simplify.</li></ul>
<h4>Move up when</h4><p>The child can add unlike fractions and explain why the bottoms must match.</p>`]
];
/* ====== chapter modules: shared engine ====== */
const MODS={phonics:{name:'Phonics',title:'Phonics: reading and writing',key:'ph',ch:PH,guide:GUIDE,gnote:'A quick reference for teaching reading and writing in Grades 1 and 2. The Kids\u2019 self study chapters follow the same levels. The full guide with printable worksheets is in the Reading &amp; Writing Made Easy document.'},
 maths:{name:'Maths',title:'Maths: from adding to fractions',key:'ma',ch:MA,guide:MGUIDE,gnote:'A quick reference for each maths chapter: the big idea, how to teach it, the tricks, and the mistakes to watch for. The Kids\u2019 self study chapters follow the same order.'}};
let cm='phonics';
const passN=len=>Math.ceil(len*.7);
const myProg=()=>kid?(kid.progress||{}):(ls.get('ct_ph')||{});
function chState(prog,m,c){const k=MODS[m].key+c.n;if(c.sets){const rs=c.sets.map((s,i)=>prog[k+'_'+i]),p=rs.filter(r=>r&&r.b>=7).length;return{played:rs.some(Boolean),done:p===c.sets.length,text:p+' of '+c.sets.length+' sets passed',short:p+'/'+c.sets.length+' sets'}}
  const r=prog[k];return{played:!!r,done:!!r&&r.b>=6,text:r?'Best '+r.b+' of 8':'',short:r?r.b+'/8':''}}
const modDone=(s,m)=>MODS[m].ch.filter(c=>chState(s.progress||{},m,c).done).length;
function modPage(){const m=MODS[cm];
  if(!triedAuto){triedAuto=true;const sv=ls.get('ct_kid');if(sv)S.login(sv.id,sv.pin).then(s=>{kid=s;kidPin=sv.pin;render()}).catch(()=>{})}
  const head=`<section class="stack"><h1>${m.title}</h1>
  <div class="tabs"><button class="btn" data-act="ptab" data-t="kids" aria-pressed="${ptab==='kids'}">Kids' self study</button><button class="btn" data-act="ptab" data-t="teacher" aria-pressed="${ptab==='teacher'}">Teacher guide</button></div></section>`;
  return head+(ptab==='teacher'?modGuide():ps?phPlay():phMap())}
function modGuide(){const m=MODS[cm];return `<p class="muted">${m.gnote}</p><section class="stack">${m.guide.map(([t,h],i)=>`<details class="card"${i===0?' open':''}><summary>${t}</summary>${h}</details>`).join('')}</section>`}
function phMap(){const m=MODS[cm],sets=!!m.ch[0].sets;return `<p class="muted">${kid?`Stars are saved for <b>${esc(kid.name)}</b>.`:`You are playing as a guest. Pick your name in <a href="#kids">Kids' Zone</a> first to save your stars.`} ${sets?'Each chapter has a concept to read and 5 practice sets of 10 questions. Pass all 5 sets (7 or more out of 10) to earn the chapter badge.':'Score 6 or more out of 8 to earn a chapter badge.'}</p>
  <section class="stack">${m.ch.map(c=>{const s=chState(myProg(),cm,c);return `<div class="card row"><div class="badge-n ${s.done?'done':''}" aria-hidden="true">${s.done?'\u2605':c.n}</div>
  <div style="flex:1;min-width:150px"><h3>Chapter ${c.n}: ${c.title}</h3><p class="muted small">${c.level} \u00b7 ${s.played?s.text+(s.done?' \u00b7 Badge earned':''):'Not started yet'}</p></div>
  <button class="btn go" data-act="phstart" data-n="${c.n}">${s.played?'Continue':'Start'}</button></div>`}).join('')}</section>`}
function phPlay(){const m=MODS[cm],c=m.ch[ps.ch-1];
  if(ps.phase==='learn'&&c.sets){const pr=myProg();return `<section class="card stack"><div class="row"><h2 style="margin-right:auto">Chapter ${c.n}: ${c.title}</h2><button class="btn ghost" data-act="phstop">All chapters</button></div>
   <div class="concept">${c.learn}</div></section>
   <section class="card stack"><h2>Practice: ${c.sets.length*10} questions in ${c.sets.length} sets</h2><p class="muted small">The questions change every time, so you can repeat a set as often as you like. 7 or more out of 10 passes a set.</p>
   ${c.sets.map((s,i)=>{const r=pr[m.key+c.n+'_'+i],ok=r&&r.b>=7;return `<div class="item"><div class="grow"><b>${s.name}</b><div class="small muted">10 questions \u00b7 ${r?'Best '+r.b+' of 10':'Not tried yet'}</div></div>${ok?'<span class="pill ok">Passed</span>':''}<button class="btn go" data-act="phset" data-s="${i}">${r?'Play again':'Start'}</button></div>`}).join('')}</section>`}
  if(ps.phase==='learn')return `<section class="card stack"><div class="row"><h2 style="margin-right:auto">Chapter ${c.n}: ${c.title}</h2><button class="btn ghost" data-act="phstop">Back</button></div>
   <div class="learn">${c.learn}</div><button class="btn go" data-act="phgo">Start playing</button></section>`;
  if(ps.phase==='done'&&c.sets){const ok=ps.right>=passN(ps.q.length),all=chState(myProg(),cm,c).done;return `<section class="card stack center"><h1>${all&&ok?'Chapter badge earned!':ok?'Set passed!':'Good try!'}</h1>
   <div class="stars" role="img" aria-label="${ps.right} of ${ps.q.length} correct">${'<span>\u2605</span>'.repeat(ps.right)}</div><div class="stat">${ps.right} of ${ps.q.length}</div>
   <p class="muted">${ok?'':'Score 7 or more to pass this set. Read the concept again, then retry. '}${esc(saveNote)}</p>
   <div class="row" style="justify-content:center">${ok&&ps.set<c.sets.length-1?`<button class="btn go" data-act="phset" data-s="${ps.set+1}">Next set</button>`:''}<button class="btn ${ok?'':'go'}" data-act="phset" data-s="${ps.set}">Play this set again</button><button class="btn" data-act="phstart" data-n="${c.n}">Back to chapter</button></div></section>`}
  if(ps.phase==='done'){const badge=ps.right>=6;return `<section class="card stack center"><h1>${badge?'Chapter badge earned!':'Good try!'}</h1>
   <div class="stars" role="img" aria-label="${ps.right} of ${ps.q.length} correct">${'<span>\u2605</span>'.repeat(ps.right)}</div><div class="stat">${ps.right} of ${ps.q.length}</div>
   <p class="muted">${badge?'':'Score 6 or more to earn the badge. '}${esc(saveNote)}</p>
   <div class="row" style="justify-content:center"><button class="btn go" data-act="phstart" data-n="${c.n}">Play again</button>${c.n<m.ch.length?`<button class="btn navy" data-act="phstart" data-n="${c.n+1}">Next chapter</button>`:''}<button class="btn" data-act="phstop">All chapters</button></div></section>`}
  const a=ps.q[ps.i];let body;
  if(ps.phase==='ok')body=`<div class="fb ok" role="status"><div class="win">${a.win||a.ah}</div><b>Yes!</b></div>`;
  else if(ps.phase==='bad')body=`<div class="fb bad" role="alert"><b>Not yet. The answer is:</b><div>${a.ah}</div><p>${esc(a.hint)}</p></div><button class="btn go" data-act="phnext">Got it</button>`;
  else if(a.kind==='pick')body=`<div class="opts">${a.opts.map(o=>`<button class="btn ${o.cls}" data-act="phans" data-v="${esc(o.v)}">${o.h}</button>`).join('')}</div>`;
  else if(a.kind==='num')body=`<div class="ans" aria-live="polite">${esc(ps.input)||'\u00a0'}</div>
   <div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="phd" data-d="${d}">${d}</button>`).join('')}
   <button class="btn" data-act="phb" aria-label="Delete">\u232b</button><button class="btn" data-act="phd" data-d="0">0</button><button class="btn go" data-act="phok">OK</button></div>`;
  else{const left=a.tiles.map((t,i)=>i).filter(i=>ps.built.indexOf(i)<0);
   body=`<div class="tiles slot" aria-label="Your answer">${ps.built.map((i,j)=>`<button class="tile" data-act="phun" data-j="${j}">${esc(a.tiles[i])}</button>`).join('')||'<span class="muted small">Tap the tiles below</span>'}</div>
   <div class="tiles">${left.map(i=>`<button class="tile" data-act="phtile" data-i="${i}">${esc(a.tiles[i])}</button>`).join('')}</div>
   <button class="btn go" data-act="phcheck">Check</button>`}
  return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">${c.title}${c.sets?': '+c.sets[ps.set].name:''}</h3><span class="pill">${ps.i+1} of ${ps.q.length}</span><button class="btn ghost" data-act="phstop">Stop</button></div>
  <div class="bar"><i style="width:${ps.i/ps.q.length*100}%"></i></div>
  ${a.show?`<div class="showbox">${a.show}</div>`:''}
  <div class="ask">${esc(a.ask)} ${canSay&&a.say&&ps.phase==='ask'?`<button class="btn" data-act="phsay" aria-label="Hear it">Hear it</button>`:''}</div>
  ${body}</section>`}
function phMark(ok){if(ok){ps.right++;ps.phase='ok';render();const cur=ps;setTimeout(()=>{if(ps===cur&&ps.phase==='ok')phNext()},1300)}else{ps.phase='bad';render()}}
function phNext(){ps.i++;ps.built=[];ps.input='';if(ps.i>=ps.q.length){ps.phase='done';phSave()}else ps.phase='ask';render()}
function phSave(){const k=MODS[cm].key+ps.ch+(ps.set!=null?'_'+ps.set:''),up=o=>({b:Math.max((o||{}).b||0,ps.right),n:((o||{}).n||0)+1});
  if(kid){kid.progress=kid.progress||{};kid.progress[k]=up(kid.progress[k]);kid.stars=(kid.stars||0)+ps.right;const d=today();kid.sessions=(kid.sessions||[]).filter(x=>x!==d).concat(d).slice(-90);saveKid()}
  else{const g=ls.get('ct_ph')||{};g[k]=up(g[k]);ls.set('ct_ph',g);saveNote='Pick your name in Kids\u2019 Zone to save stars to your name.'}}
Object.assign(acts,{
  ptab(d){ptab=d.t;ps=null;render()},
  phstart(d){ps={mod:cm,ch:+d.n,phase:'learn'};saveNote='';render();window.scrollTo(0,0)},
  phset(d){const c=MODS[cm].ch[ps.ch-1];ps={mod:cm,ch:ps.ch,set:+d.s,q:c.sets[+d.s].make(),i:0,right:0,built:[],input:'',phase:'ask'};saveNote='';render();window.scrollTo(0,0)},
  phgo(){ps.q=MODS[cm].ch[ps.ch-1].make();ps.i=0;ps.right=0;ps.built=[];ps.input='';ps.phase='ask';render()},
  phsay(){const q=ps.q[ps.i];say(q.say,q.lang)},
  phans(d){if(ps.phase==='ask')phMark(d.v===ps.q[ps.i].a)},
  phtile(d){if(ps.phase==='ask'){ps.built.push(+d.i);render()}},
  phun(d){if(ps.phase==='ask'){ps.built.splice(+d.j,1);render()}},
  phcheck(){const a=ps.q[ps.i];if(ps.phase!=='ask'||!ps.built.length)return;phMark(ps.built.map(i=>a.tiles[i]).join('|')===a.target.join('|'))},
  phd(d){if(ps.phase==='ask'&&ps.input.length<7){ps.input+=d.d;render()}},
  phb(){ps.input=ps.input.slice(0,-1);render()},
  phok(){if(ps.phase==='ask'&&ps.input)phMark(String(parseInt(ps.input,10))===ps.q[ps.i].a)},
  phnext(){phNext()},
  phstop(){if(ps&&ps.set!=null&&ps.phase!=='learn'){ps={mod:cm,ch:ps.ch,phase:'learn'}}else ps=null;render()}
});

const FAQ=[
 ['About classes',[
  ['Which grades and boards do you teach?','Grades 1 to 10, for State, CBSE and ICSE boards. All subjects up to Grade 8, and English, Marathi and Hindi for Grades 9 and 10.'],
  ['Which schools do your students come from?','Children come from many schools around Hinjawadi. Chetana teaches from each child’s own school textbook and plans revision around that school’s test dates.'],
  ['How big are the batches?','Small batches of about 6 to 8 children, grouped by school, grade and subject where possible. One-to-one classes are available on request.'],
  ['Where are the classes?','In person at Sparklet, Megapolis, Hinjawadi, Pune, or live online on Google Meet.'],
  ['How long is each class?','Classes run for about an hour: a quick recap, the new concept, then oral and written practice.']]],
 ['Teaching and progress',[
  ['How is this different from other tuition?','Each term is planned like a project: the syllabus and school test dates become a roadmap, chapters are broken into weekly goals, and each child’s own mistakes are revised before every test. Children move on only when they can explain an idea back.'],
  ['How will I know my child is improving?','You get a starting check in the first week, a quick message if your child is stuck on a topic, a note before each school test, and a monthly progress report on WhatsApp.'],
  ['My child is weak in Marathi or Hindi and we don’t speak it at home. Can you help?','Yes. This is one of Chetana’s specialities. She starts from the letters and builds up to reading, writing and speaking, so you don’t need to teach it at home.'],
  ['What is the learning library?','Free practice on this website: English reading for Grades 1–2, Maths for Grade 3 and up, and quick missions. Students pick their name and PIN so Chetana can see what they have practised.']]],
 ['Online classes',[
  ['What do we need for online classes?','A laptop, tablet or phone with a camera, a steady internet connection and a quiet corner. Homework is sent as a photo on WhatsApp.'],
  ['Are online classes recorded?','Only with your written permission, and only so Chetana can make class notes and track progress. Recordings are kept briefly and are never shared.']]],
 ['Fees and joining',[
  ['How do fees work?','Simple monthly fees, paid at the start of each month. Ask on WhatsApp for the fee for your child’s grade and subjects.'],
  ['Is there a long-term commitment?','No. You can stop with one month’s notice, and there is no advance payment for more than a month.'],
  ['What happens if my child misses a class?','Chetana shares a short recap or arranges an online catch-up. Fees are not refunded for missed classes.'],
  ['How do we start?','Book a free demo class. Chetana will meet your child, do a short starting check, and suggest the right batch.']]]];
function faq(){return `<section class="stack"><h1>Questions parents ask</h1><p class="muted lead">Can’t find your answer? Ask on WhatsApp or book a free demo.</p></section>
${FAQ.map(([g,qs])=>`<section class="stack"><h2>${g}</h2>${qs.map(([q,a])=>`<details class="card qa"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`).join('')}
${contactBlock()}`}
const SUBJ=['English','Marathi','Hindi','Maths','Science','All subjects','Reading help (Grades 1–2)'];
let booked=null;
function book(){if(booked)return `<section class="card stack"><h1>Almost done</h1><p>Tap the button to send these details to Chetana on WhatsApp. She will reply to fix a demo time.</p>
<pre class="msg">${esc(booked)}</pre>
<div class="row"><a class="btn go" href="https://wa.me/919730195429?text=${encodeURIComponent(booked)}">Send on WhatsApp</a><button class="btn" data-act="bcopy">Copy text</button><span id="bcopied" class="pill ok" hidden>Copied</span></div>
${bookSaved==='ok'?'<p class="pill ok">Saved in Chetana\u2019s enquiry list. Sending it on WhatsApp too gets the quickest reply.</p>':bookSaved==='no'?'<p class="pill bad">Could not save it online, so please send it on WhatsApp.</p>':''}
<p class="small muted">WhatsApp not opening? Copy the text and send it to 97301 95429.</p><button class="btn ghost" data-act="bedit">Change details</button></section>`;
 return `<section class="stack"><h1>Book a free demo class</h1><p class="muted lead">Fill in a few details. They go to Chetana on WhatsApp and into her private enquiry list, so she can follow up. Nothing else is done with them (see <a href="#privacy">Privacy</a>).</p></section>
<form class="card stack" data-form="book" novalidate>
${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}
<div class="row"><label>Parent’s name<input id="bk-parent" required maxlength="40" autocomplete="name"></label><label>Child’s first name<input id="bk-child" maxlength="20"></label></div>
<div class="row"><label>Grade<select id="bk-grade"><option value="">Choose</option>${[1,2,3,4,5,6,7,8,9,10].map(g=>`<option>${g}</option>`).join('')}</select></label>
<label>Board<select id="bk-board"><option>State</option><option>CBSE</option><option>ICSE</option><option>Not sure</option></select></label>
<label>School<input id="bk-school" maxlength="40"></label></div>
<fieldset class="ck"><legend>Subjects</legend>${SUBJ.map((x,i)=>`<label class="chk"><input type="checkbox" id="bk-s${i}" value="${x}"> ${x}</label>`).join('')}</fieldset>
<fieldset class="ck"><legend>Class mode</legend><label class="chk"><input type="radio" name="bk-mode" value="In person at Sparklet" checked> In person at Sparklet</label><label class="chk"><input type="radio" name="bk-mode" value="Online"> Online</label><label class="chk"><input type="radio" name="bk-mode" value="Either"> Either</label></fieldset>
<div class="row"><label>Best time for the demo<select id="bk-time"><option>Weekday evening</option><option>Saturday</option><option>Sunday</option><option>Any time</option></select></label></div>
<div class="row"><label>Your WhatsApp number (optional)<input id="bk-phone" type="tel" inputmode="tel" maxlength="16" autocomplete="tel"></label></div>
<label class="hp" aria-hidden="true">Website<input id="bk-web" tabindex="-1" autocomplete="off"></label>
<label>Anything Chetana should know?<textarea id="bk-note" rows="3" maxlength="300" placeholder="e.g. struggles with Marathi reading, unit test next month"></textarea></label>
<div class="row"><button class="btn go">Continue</button></div></form>`}
Object.assign(forms,{book(){const v=id=>document.getElementById(id).value.trim(),parent=v('bk-parent'),grade=v('bk-grade');
  if(!parent||!grade){msg='Please add your name and your child’s grade.';render();return}
  const subj=SUBJ.filter((x,i)=>document.getElementById('bk-s'+i).checked),mode=document.querySelector('input[name="bk-mode"]:checked').value;
  const L=['Hi Chetana, I would like to book a free demo class.','Parent: '+parent];
  if(v('bk-child'))L.push('Child: '+v('bk-child'));L.push('Grade: '+grade+' ('+v('bk-board')+')');if(v('bk-school'))L.push('School: '+v('bk-school'));
  L.push('Subjects: '+(subj.join(', ')||'Not sure yet'));L.push('Mode: '+mode);L.push('Best time: '+v('bk-time'));if(v('bk-note'))L.push('Note: '+v('bk-note'));
  const lead={id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),parent,child:v('bk-child'),grade,phone:v('bk-phone'),source:'Website',web:v('bk-web'),
    note:[v('bk-board'),v('bk-school'),'Subjects: '+(subj.join(', ')||'not sure'),mode,'Best time: '+v('bk-time'),v('bk-note')].filter(Boolean).join(' · ')};
  booked=L.join('\n');msg='';bookSaved='';render();window.scrollTo(0,0);
  S.lead(lead).then(()=>{bookSaved='ok';render()}).catch(()=>{bookSaved='no';render()})}});
let bookSaved='';
Object.assign(acts,{bedit(){booked=null;render()},bcopy(){const done=()=>{document.getElementById('bcopied').hidden=false};try{navigator.clipboard.writeText(booked).then(done).catch(()=>{})}catch(e){}}});

/* ====== Marathi & Hindi (Devanagari) module ====== */
const dv=(t,sz)=>`<span class="dev" style="font-size:${sz||44}px;line-height:1.3">${esc(t)}</span>`;
function devQ(show,ask,correct,wrongs,hint,sayT){return{kind:'pick',show,ask,say:sayT||'',lang:'hi-IN',opts:shuffle([correct,...wrongs]).map(v=>({h:esc(v),v,cls:'dev big'})),a:correct,ah:dv(correct,56),hint}}
const VOW=[['अ','a'],['आ','aa'],['इ','i'],['ई','ee'],['उ','u'],['ऊ','oo'],['ए','e'],['ऐ','ai'],['ओ','o'],['औ','au'],['ऋ','ri'],['अं','am'],['अः','ah']];
const CON=[['क','ka'],['ख','kha'],['ग','ga'],['घ','gha'],['च','cha'],['छ','chha'],['ज','ja'],['झ','jha'],['ट','Ta (hard t)'],['ड','Da (hard d)'],['त','ta (soft t)'],['थ','tha'],['द','da (soft d)'],['ध','dha'],['न','na'],['प','pa'],['फ','pha'],['ब','ba'],['भ','bha'],['म','ma'],['य','ya'],['र','ra'],['ल','la'],['व','va'],['श','sha'],['स','sa'],['ह','ha'],['ठ','Tha (hard)'],['ढ','Dha (hard)'],['ण','Na (hard)'],['ष','Sha (curled)'],['क्ष','ksha'],['त्र','tra'],['ज्ञ','dnya / gya']];
const CONF={'ट':'त','त':'ट','ड':'द','द':'ड','ठ':'थ','थ':'ठ','ढ':'ध','ध':'ढ','ण':'न','न':'ण','ष':'श','श':'ष'};
const W=[['घर','🏠','house',['घ','र']],['मोर','🦚','peacock',['मो','र']],['बस','🚌','bus',['ब','स']],['गाय','🐄','cow',['गा','य']],['पतंग','🪁','kite',['प','तं','ग']],['फूल','🌸','flower',['फू','ल']],['कान','👂','ear',['का','न']],['नाक','👃','nose',['ना','क']],['तारा','⭐','star',['ता','रा']],['ढोल','🥁','drum',['ढो','ल']],['पान','🍃','leaf',['पा','न']],['मगर','🐊','crocodile',['म','ग','र']]];
const wpic=w=>`<span class="pic" role="img" aria-label="${w[2]}">${w[1]}</span>`;
const firstOf=w=>w[3][0][0];
const MAT=[['','a'],['ा','aa'],['ि','i'],['ी','ee'],['ु','u'],['ू','oo'],['े','e'],['ै','ai'],['ो','o'],['ौ','au'],['ं','am'],['ः','ah']];
const MC=[['क','k'],['ग','g'],['ज','j'],['त','t'],['न','n'],['प','p'],['ब','b'],['म','m'],['ल','l'],['स','s']];
const ROOF=[['घ','gha','ध','dha','घ has a full roof. ध has a gap in its roof on the left.'],['ध','dha','घ','gha','ध has a gap in its roof. घ has a full roof.'],
 ['म','ma','भ','bha','म has a full roof. भ has a gap in its roof on the left.'],['भ','bha','म','ma','भ has a gap in its roof. म has a full roof.'],
 ['ख','kha','रव','ra + va','ख is one letter: its two parts are joined. र and व stand apart.'],['ब','ba','व','va','ब has a small line across the inside. व is empty inside.'],
 ['व','va','ब','ba','व is empty inside. ब has a small line across the inside.'],['प','pa','ष','sha','प is plain. ष has a line across it.']];
const DG='०१२३४५६७८९';const toDev=n=>String(n).split('').map(d=>DG[+d]).join('');
const W2=[['गुलाब','🌹','rose',['गु','ला','ब']],['तबला','🪘','tabla',['त','ब','ला']],['दूध','🥛','milk',['दू','ध']],['गाजर','🥕','carrot',['गा','ज','र']],['घोडा','🐎','horse',['घो','डा']],['जिराफ','🦒','giraffe',['जि','रा','फ']],['कप','☕','cup',['क','प']],['पेन','🖊️','pen',['पे','न']]];
const WA2=W.concat(W2),WS=WA2.filter(w=>w[3].length===2),WL=WA2.filter(w=>w[3].length===3);
const LOOK={'घर':'धर','मोर':'भोर','बस':'वस','पान':'षान','मगर':'भगर','घोडा':'धोडा','गुलाब':'गुलाव','तबला':'तवला','दूध':'दूघ'};
const FAM=[['Throat','कखगघ'],['Palate','चछजझ'],['Tongue curled back (hard)','टठडढण'],['Tongue on teeth (soft)','तथदधन'],['Lips','पफबभम']];
const romOf=l=>(CON.find(c=>c[0]===l)||VOW.find(v=>v[0]===l)||[])[1];
const txtQ=(show,ask,correct,wrongs,hint,sayT)=>({kind:'pick',show,ask,say:sayT||'',lang:'hi-IN',opts:shuffle([correct,...wrongs]).map(v=>({h:esc(v),v,cls:'txt'})),a:correct,ah:`<span class="wordbig">${esc(correct)}</span>`,hint});
const vSound=pool=>{const[l,r]=one(pool);return devQ('',`Which letter says "${r}"?`,l,sample(pool.filter(v=>v[0]!==l),2).map(v=>v[0]),`${l} says "${r}".`,l)};
const vName=pool=>{const[l,r]=one(pool);return txtQ(dv(l,96),'How do you say this letter?',r,sample(pool.filter(v=>v[0]!==l),2).map(v=>v[1]),`${l} says "${r}".`,l)};
const VPAIR=[['अ','आ'],['इ','ई'],['उ','ऊ'],['ए','ऐ'],['ओ','औ']];
const cSound=pool=>{const[l,r]=one(pool);return devQ('',`Which letter says "${r}"?`,l,sample(CON.filter(c=>c[0]!==l&&CONF[l]!==c[0]),2).map(c=>c[0]),`${l} says "${r}".`,l)};
const cName=()=>{const[l,r]=one(CON);return txtQ(dv(l,96),'How do you say this letter?',r,sample(CON.filter(c=>c[0]!==l&&CONF[l]!==c[0]),2).map(c=>c[1]),`${l} says "${r}".`,l)};
const cFam=()=>{const f=one(FAM),l=one(f[1].split(''));return txtQ(dv(l,96),'Where in the mouth is this letter made?',f[0],sample(FAM.filter(x=>x!==f).map(x=>x[0]),2),`${l} belongs to the ${f[0].toLowerCase()} family: ${f[1].split('').join(' ')}.`,l)};
const cFirst=()=>{const w=one(WA2),f=w[3][0][0];return devQ(wpic(w)+dv(w[0],32),'Which letter does this word start with?',f,sample(CON.map(c=>c[0]).filter(c=>c!==f&&CONF[f]!==c),2),`${w[0]} (${w[2]}) starts with ${f}.`,w[0])};
const rSound=pool=>{const[a,ar,b,br,h]=one(pool);return devQ('',`Which letter says "${ar}"?`,a,[b],h,a)};
const rName=()=>{const[a,ar,b,br,h]=one(ROOF.filter(r=>r[2].length===1));return txtQ(dv(a,96),'How do you say this letter?',ar,[br],h,a)};
const rWord=()=>{const k=one(Object.keys(LOOK)),w=WA2.find(x=>x[0]===k);return devQ(wpic(w),`Which word is "${w[2]}"?`,k,[LOOK[k]],`${k} is spelled with ${w[3].join(' + ')}. Check the roof and the inside of each letter.`,k)};
const mWhich=(cons,mats)=>{const[c,cr]=one(cons),m=sample(mats,3);return devQ('',`Which one says "${cr+m[0][1]}"?`,c+m[0][0],m.slice(1).map(x=>c+x[0]),`${c} + ${m[0][0]||'(no sign)'} = ${c+m[0][0]}, said "${cr+m[0][1]}".`,c+m[0][0])};
const mSay=()=>{const[c,cr]=one(MC),m=sample(MAT,3);return txtQ(dv(c+m[0][0],96),'How do you say this?',cr+m[0][1],m.slice(1).map(x=>cr+x[1]),`${c} + ${m[0][0]||'(no sign)'} = ${c+m[0][0]}, said "${cr+m[0][1]}".`,c+m[0][0])};
const mJoin=()=>{const[c]=one(MC),m=sample(MAT.slice(1),3);return devQ(`<span class="wordbig dev">${c} + ◌${m[0][0]}</span>`,'What do they make together?',c+m[0][0],m.slice(1).map(x=>c+x[0]),`${c} with the sign ${m[0][0]} makes ${c+m[0][0]}.`)};
function slQ(ii,mode){const[c,cr]=one(MC),lng=Math.random()<.5,s=ii?'ि':'ु',l=ii?'ी':'ू',want=lng?l:s,other=lng?s:l,rr=cr+(ii?(lng?'ee':'i'):(lng?'oo':'u')),ro=cr+(ii?(lng?'i':'ee'):(lng?'u':'oo'));
  const h=ii?`Short i ि is written before the letter; long ee ी comes after it. "${rr}" is ${c+want}.`:`ु is the short "u", ू is the long "oo". "${rr}" is ${c+want}.`;
  return mode==='say'?txtQ(dv(c+want,96),'How do you say this: short or long?',rr,[ro],h,c+want):devQ('',`Which one is the ${lng?'long':'short'} sound "${rr}"?`,c+want,[c+other],h,c+want)}
const wPicWord=pool=>{const w=one(pool);return devQ(wpic(w),'Which word matches the picture?',w[0],sample(WA2.filter(x=>x!==w),2).map(x=>x[0]),`${w[0]} means ${w[2]}: ${w[3].join(' + ')}.`,w[0])};
const wWordPic=pool=>{const w=one(pool),o=shuffle([w,...sample(WA2.filter(x=>x!==w),2)]);return{kind:'pick',show:dv(w[0],64),ask:'Read the word. Tap its picture.',say:w[0],lang:'hi-IN',opts:o.map(x=>({h:wpic(x),v:x[0],cls:'big'})),a:w[0],ah:wpic(w)+dv(w[0],40),hint:`${w[3].join(' + ')} = ${w[0]}, ${w[2]}.`}};
const AK=['क','म','स','ल','ना','को','ज','रा','ब','गा','पा','दू'];
const wMiss=()=>{const w=one(WA2),i=rnd(0,w[3].length-1),shown=w[3].map((x,j)=>j===i?'__':x).join(' ');return devQ(wpic(w)+`<span class="wordbig dev">${shown}</span>`,'Which part is missing?',w[3][i],sample(AK.filter(x=>w[3].indexOf(x)<0),2),`${w[0]} = ${w[3].join(' + ')}.`,w[0])};
const wFirst=()=>{const w=one(WA2);return devQ(wpic(w),'Which part comes first in this word?',w[3][0],sample(AK.filter(x=>w[3].indexOf(x)<0),2),`${w[0]} starts with ${w[3][0]}: ${w[3].join(' + ')}.`,w[0])};
const bld=(pool,nx)=>{const w=one(pool),extra=sample(AK.filter(x=>w[3].indexOf(x)<0),nx);return{kind:'build',show:wpic(w),ask:'Tap the parts in order to write the word.',say:w[0],lang:'hi-IN',tiles:shuffle([...w[3],...extra]),target:w[3],ah:dv(w[0],56),hint:`${w[3].join(' + ')} = ${w[0]} (${w[2]}).`}};
const nDev=(lo,hi)=>{const n=rnd(lo,hi),w=[];while(w.length<2){const x=rnd(lo,hi);if(x!==n&&w.indexOf(String(x))<0)w.push(String(x))}return{kind:'pick',show:dv(toDev(n),80),ask:'What number is this?',say:'',opts:shuffle([String(n),...w]).map(v=>({h:v,v,cls:'txt'})),a:String(n),ah:ex(String(n)),hint:`${toDev(n)} = ${n}: ${String(n).split('').map(d=>DG[+d]+' is '+d).join(', ')}.`}};
const nToDev=(lo,hi)=>{const n=rnd(lo,hi),w=[];while(w.length<2){const x=rnd(lo,hi);if(x!==n&&w.indexOf(toDev(x))<0)w.push(toDev(x))}return devQ(ex(String(n)),'Which is the same number in Devanagari?',toDev(n),w,`${n} is written ${toDev(n)}.`)};
const nSum=()=>{const a=rnd(1,9),b=rnd(1,9),s=Math.random()<.5;if(!s&&a<b)return nSum();return numQ(dv(`${toDev(a)} ${s?'+':'−'} ${toDev(b)}`,64),'Type the answer in normal digits.',s?a+b:a-b,`${toDev(a)} is ${a} and ${toDev(b)} is ${b}. ${a} ${s?'+':'−'} ${b} = ${s?a+b:a-b}.`)};
const SET=(name,f)=>({name,make:()=>ten(f)});
const dx=t=>`<span class="dev">${t}</span>`;
const BH=[
 {n:1,title:'Vowels (स्वर)',level:'Beginners',
  learn:`<h4>The idea</h4><p>Vowels (<b>स्वर</b>) are the letters that can be said on their own, without help from another letter. Every consonant needs a vowel to be spoken. There are <b>13 vowels</b> in the traditional list. Most come in <b>short and long pairs</b>: the long one is the same sound, held longer.</p>
  <div class="center"><div class="dev wiggle" style="font-size:56px;line-height:1.3">अ आ इ ई उ ऊ ऋ</div><div class="dev" style="font-size:56px;line-height:1.3">ए ऐ ओ औ अं अः</div></div>
  <h4>All the vowels</h4><p>(M) marks a Marathi word and (H) a Hindi word where the two languages differ.</p><div class="tw"><table><tr><th>Letter</th><th>Sound</th><th>Matra</th><th>Example word</th></tr>
<tr><td class="dbig">अ</td><td>a (about)</td><td>none</td><td>${dx('अगरबत्ती')} incense</td></tr>
<tr><td class="dbig">आ</td><td>aa (father)</td><td class="dbig">ा</td><td>${dx('आग')} fire</td></tr>
<tr><td class="dbig">इ</td><td>i (sit)</td><td class="dbig">ि</td><td>${dx('इमारत')} building</td></tr>
<tr><td class="dbig">ई</td><td>ee (see)</td><td class="dbig">ी</td><td>${dx('ईद')} Eid</td></tr>
<tr><td class="dbig">उ</td><td>u (put)</td><td class="dbig">ु</td><td>${dx('उत्तर')} answer</td></tr>
<tr><td class="dbig">ऊ</td><td>oo (moon)</td><td class="dbig">ू</td><td>${dx('ऊस')} sugarcane (M), ${dx('ऊन')} wool (H)</td></tr>
<tr><td class="dbig">ऋ</td><td>ri (rhythm)</td><td class="dbig">ृ</td><td>${dx('ऋषी')} (M), ${dx('ऋषि')} (H) sage</td></tr>
<tr><td class="dbig">ए</td><td>e (they)</td><td class="dbig">े</td><td>${dx('एक')} one</td></tr>
<tr><td class="dbig">ऐ</td><td>ai (bat, said long)</td><td class="dbig">ै</td><td>${dx('ऐरावत')} Indra's elephant</td></tr>
<tr><td class="dbig">ओ</td><td>o (go)</td><td class="dbig">ो</td><td>${dx('ओम')} Om</td></tr>
<tr><td class="dbig">औ</td><td>au (August)</td><td class="dbig">ौ</td><td>${dx('औषध')} (M), ${dx('औषधि')} (H) medicine</td></tr>
<tr><td class="dbig">अं</td><td>am / an (nasal)</td><td class="dbig">ं</td><td>${dx('अंडे')} (M), ${dx('अंडा')} (H) egg</td></tr>
<tr><td class="dbig">अः</td><td>ah (breath)</td><td class="dbig">ः</td><td>${dx('दुःख')} sorrow</td></tr></table></div>
  <h4>The groups</h4><ul><li><b>Short and long pairs:</b> ${dx('अ आ')}, ${dx('इ ई')}, ${dx('उ ऊ')}. Short ones are quick; long ones are held.</li><li><b>ऋ</b> sounds like "ri". It appears mostly in Sanskrit-based words: ${dx('ऋतु')} season, ${dx('कृष्ण')}.</li><li><b>Joined vowels:</b> ${dx('ए ऐ ओ औ')}. ${dx('ऐ')} and ${dx('औ')} look like ${dx('ए')} and ${dx('ओ')} with one extra stroke on top.</li><li><b>अं and अः</b> are a nasal sound and a breath sound added to अ. Chapter 9 covers them.</li></ul>
  <h4>Marathi extras</h4><p>Marathi writes two more vowels for English words: ${dx('अॅ')} as in ${dx('बॅट')} (bat) and ${dx('ऑ')} as in ${dx('ऑफिस')} (office). Hindi also uses ${dx('ऑ')} (${dx('ऑफ़िस')}).</p>
  <h4>Step by step</h4><ol><li>Say the sound before you show the letter.</li><li>Learn one pair at a time: ${dx('अ आ')}, then ${dx('इ ई')}, then ${dx('उ ऊ')}, then ${dx('ए ऐ ओ औ')}.</li><li>Clap once for a short sound; stretch your arms for a long sound.</li><li>Write each vowel with its roof line, then find it at the start of a word.</li></ol>
  ${eg('Example 1: the a pair',`${dx('अ')} says "a" as in <i>about</i>. ${dx('आ')} says "aa" as in <i>father</i>. The extra standing line on ${dx('आ')} makes it long.`)}${eg('Example 2: the i pair',`${dx('इ')} says a short "i" as in <i>sit</i>. ${dx('ई')} says a long "ee" as in <i>see</i>.`)}${eg('Example 3: ए and ऐ',`${dx('ए')} says "e" as in <i>they</i>. Add one more stroke on top and it becomes ${dx('ऐ')}, "ai".`)}${eg('Example 4: vowel or matra?',`At the start of a word a vowel is written in full: ${dx('आग')}. After a consonant it becomes a matra: ${dx('का')}. Chapter 4 covers matras.`)}
  <h4>Watch out</h4><ul><li>${dx('अ')} is not the "a" in <i>apple</i>. It is the soft, short "a" in <i>about</i>.</li><li>${dx('इ')} and ${dx('ई')} are easy to mix up when writing. Say the word slowly and listen for short or long.</li><li>${dx('ऋ')} is a vowel, even though it sounds like "r" + "i".</li></ul>`,
  sets:[SET('Level 1: the first six',()=>vSound(VOW.slice(0,6))),SET('Level 2: all the vowels',()=>vSound(VOW)),SET('Level 3: say the letter',()=>vName(VOW)),
   SET('Short and long pairs',()=>{const[s,l]=one(VPAIR),lg=Math.random()<.5,w=lg?l:s;return devQ(dx(lg?s:l).replace('class="dev"','class="dev" style="font-size:64px"'),`Which letter is the ${lg?'long':'short'} partner of this one?`,w,sample(VOW.map(v=>v[0]).filter(x=>x!==w&&x!==s&&x!==l),2),`${s} and ${l} are a pair: ${s} is short (${romOf(s)}), ${l} is long (${romOf(l)}).`)}),
   SET('Challenge: mixed',()=>Math.random()<.5?vSound(VOW):vName(VOW))]},
 {n:2,title:'Consonants (व्यंजन)',level:'Beginners',
  learn:`<h4>The idea</h4><p>Consonants (<b>व्यंजन</b>) are the letters that need a vowel to be spoken. Every consonant already carries a soft "a": ${dx('क')} is "ka", not "k". The letters are arranged in <b>families</b>, each made in the same part of the mouth. Learn the families and the alphabet makes sense.</p>
  <div class="center dev pulse" style="font-size:52px"><span>क</span> <span>ख</span> <span>ग</span> <span>घ</span> <span>ङ</span></div>
  <h4>All the consonants</h4><p>(M) marks a Marathi word and (H) a Hindi word where the two languages differ.</p><div class="tw"><table><tr><th>Family</th><th>Letters</th><th>Example words</th></tr>
<tr><td>Throat (कंठ्य)</td><td class="dbig">क ख ग घ ङ</td><td>${dx('कप')} cup · ${dx('खजूर')} date · ${dx('गाय')} cow · ${dx('घर')} house · ${dx('ङ')} mostly inside words: ${dx('वाङ्मय')}</td></tr>
<tr><td>Palate (तालव्य)</td><td class="dbig">च छ ज झ ञ</td><td>${dx('चप्पल')} slippers · ${dx('छत')} roof/ceiling · ${dx('जंगल')} forest · ${dx('झोपडी')} (M), ${dx('झोपड़ी')} (H) hut · ${dx('ञ')} mostly inside words</td></tr>
<tr><td>Tongue curled back, hard (मूर्धन्य)</td><td class="dbig">ट ठ ड ढ ण</td><td>${dx('टेबल')} table · ${dx('ठसा')} stamp (M), ${dx('ठंड')} cold (H) · ${dx('डमरू')} drum · ${dx('ढोल')} drum · ${dx('बाण')} arrow</td></tr>
<tr><td>Tongue on teeth, soft (दंत्य)</td><td class="dbig">त थ द ध न</td><td>${dx('तारा')} star · ${dx('थाळी')} (M), ${dx('थाली')} (H) plate · ${dx('दूध')} milk · ${dx('धागा')} thread · ${dx('नाक')} nose</td></tr>
<tr><td>Lips (ओष्ठ्य)</td><td class="dbig">प फ ब भ म</td><td>${dx('पतंग')} kite · ${dx('फूल')} flower · ${dx('बस')} bus · ${dx('भारत')} India · ${dx('मोर')} peacock</td></tr>
<tr><td>Others</td><td class="dbig">य र ल व</td><td>${dx('योग')} yoga · ${dx('रथ')} chariot · ${dx('लाल')} red · ${dx('वजन')} weight</td></tr>
<tr><td>Hissing sounds</td><td class="dbig">श ष स ह</td><td>${dx('शंख')} conch · ${dx('ष')} mostly inside words: ${dx('धनुष्य')} (M) bow · ${dx('सूर्य')} sun · ${dx('हत्ती')} (M), ${dx('हाथी')} (H) elephant</td></tr>
<tr><td>Marathi only</td><td class="dbig">ळ</td><td>${dx('शाळा')} school · ${dx('बाळ')} baby</td></tr>
<tr><td>Special joined letters</td><td class="dbig">क्ष त्र ज्ञ श्र</td><td>${dx('क्षमा')} forgiveness · ${dx('त्रिकोण')} triangle · ${dx('ज्ञान')} knowledge · ${dx('श्रम')} hard work</td></tr></table></div>
  <h4>How each family works</h4><p>The first five families have the same pattern of five letters:</p><ol><li><b>Plain:</b> ${dx('क')} ka</li><li><b>Breathy:</b> ${dx('ख')} kha, with a puff of air</li><li><b>Voiced:</b> ${dx('ग')} ga, the throat hums</li><li><b>Voiced and breathy:</b> ${dx('घ')} gha</li><li><b>Nasal:</b> ${dx('ङ')}, said through the nose</li></ol><p>The same pattern repeats: ${dx('च छ ज झ ञ')}, ${dx('ट ठ ड ढ ण')}, ${dx('त थ द ध न')}, ${dx('प फ ब भ म')}.</p>
  ${eg('Example 1: plain and breathy',`${dx('क')} (ka) and ${dx('ख')} (kha). Hold a paper strip in front of your mouth: it moves only for the breathy one.`)}${eg('Example 2: hard and soft t and d',`${dx('ट')} and ${dx('ड')} are hard: curl your tongue back. ${dx('त')} and ${dx('द')} are soft: touch your teeth.`)}${eg('Example 3: three kinds of sh',`${dx('श')} as in ${dx('शंख')}, ${dx('ष')} (tongue curled back) as in ${dx('धनुष्य')}, and ${dx('स')} as in ${dx('सूर्य')}. In everyday speech ${dx('श')} and ${dx('ष')} sound almost the same.`)}${eg('Example 4: ज्ञ',`${dx('ज्ञ')} is said "dnya" in Marathi (${dx('ज्ञान')} dnyaan) and "gya" in Hindi (gyaan).`)}
  <h4>Watch out</h4><ul><li>English has one "t" and one "d"; Devanagari has two of each.</li><li>${dx('ङ ञ ण')} rarely start a word. Learn to recognise them inside words.</li><li>${dx('ळ')} is used in Marathi, not in Hindi.</li></ul>`,
  sets:[SET('Level 1: throat and lips',()=>cSound(CON.filter(c=>'कखगघपफबभम'.includes(c[0])))),SET('Level 2: all consonants',()=>cSound(CON)),SET('Level 3: say the letter',cName),
   SET('Picture words: first letter',cFirst),SET('Challenge: which family?',cFam)]},
 {n:3,title:'Look-alike letters',level:'Beginners',
  learn:`<h4>The idea</h4><p>Some letters look like twins. Two places tell them apart: the <b>roof</b> (the line on top, called शिरोरेखा) and the <b>inside</b> of the letter.</p>
  <div class="center dev" style="font-size:80px;line-height:1.2">घ <span class="team">ध</span> &nbsp; म <span class="team">भ</span></div>
  <h4>Step by step</h4><ol><li>Look at the roof first: is it full, or does it have a gap?</li><li>Then look inside: is there an extra line?</li><li>Then say the sound.</li></ol>
  ${eg('Example 1: the open roof',`${dx('घ')} (gha) has a full roof. ${dx('ध')} (dha) has a gap on the left. ${dx('म')} (ma) and ${dx('भ')} (bha) work the same way.`)}${eg('Example 2: the inside line',`${dx('ब')} (ba) has a small line inside. ${dx('व')} (va) is empty inside.`)}${eg('Example 3: joined or apart',`${dx('ख')} (kha) is one letter, joined in the middle. ${dx('र')} and ${dx('व')} written side by side (${dx('रव')}) stand apart.`)}
  <h4>All the look-alike pairs</h4><div class="tw"><table><tr><th>Pair</th><th>How to tell them apart</th></tr><tr><td class="dbig">घ ध</td><td>${dx('ध')} has a gap in the roof</td></tr><tr><td class="dbig">म भ</td><td>${dx('भ')} has a gap in the roof</td></tr><tr><td class="dbig">ख रव</td><td>${dx('ख')} is joined in the middle</td></tr><tr><td class="dbig">ब व</td><td>${dx('ब')} has a line inside</td></tr><tr><td class="dbig">प ष</td><td>${dx('ष')} has a line across</td></tr><tr><td class="dbig">ड ङ</td><td>${dx('ङ')} has a dot on the right</td></tr><tr><td class="dbig">द ढ</td><td>${dx('ढ')} has a tail curling out at the bottom</td></tr><tr><td class="dbig">थ य</td><td>${dx('थ')} has a small loop on the left</td></tr></table></div>
  <h4>Watch out</h4><p>One wrong letter changes the word: ${dx('घर')} is a house, but ${dx('धर')} is not. When copying from the board, check the roof and the inside of every letter.</p>`,
  sets:[SET('Level 1: the open roof',()=>rSound(ROOF.slice(0,4))),SET('Level 2: all look-alikes',()=>rSound(ROOF)),SET('Level 3: say the letter',rName),
   SET('Words: spot the right spelling',rWord),SET('Challenge: mixed',()=>one([()=>rSound(ROOF),rName,rWord])())]},
 {n:4,title:'Matras (बाराखडी / बारहखड़ी)',level:'Beginners',
  learn:`<h4>The idea</h4><p>When a vowel joins a consonant, it is not written in full. It becomes a small <b>sign</b> called a <b>matra</b>. Every vowel except ${dx('अ')} has a matra, because ${dx('अ')} is already inside every consonant. The chart of one letter with all its matras is the <b>बाराखडी</b> in Marathi and <b>बारहखड़ी</b> in Hindi (both mean "twelve").</p>
  <div class="center dev" style="font-size:42px;line-height:1.5">क का कि की कु कू के कै को कौ कं कः</div>
  <h4>The full chart</h4><p>The sign does the same job on every letter. Learn it once with ${dx('क')}, and the whole alphabet follows.</p><div class="tw"><table><tr><th>Sign</th><th>क</th><th>ग</th><th>म</th><th>स</th><th>Said</th></tr>
${[['',''],['ा','aa'],['ि','i'],['ी','ee'],['ु','u'],['ू','oo'],['े','e'],['ै','ai'],['ो','o'],['ौ','au'],['ं','am'],['ः','ah']].map(([m,r])=>`<tr><td class="dbig">${m?'◌'+m:'–'}</td>${['क','ग','म','स'].map(c=>`<td class="dbig">${c+m}</td>`).join('')}<td>k${r||'a'}, g${r||'a'}…</td></tr>`).join('')}</table></div>
  <h4>Where each sign sits</h4><ul><li><b>After:</b> ${dx('ा')} (${dx('का')}), ${dx('ी')} (${dx('की')})</li><li><b>Before:</b> ${dx('ि')} (${dx('कि')})</li><li><b>Below:</b> ${dx('ु ू ृ')} (${dx('कु कू कृ')})</li><li><b>On top:</b> ${dx('े ै ं')} (${dx('के कै कं')})</li><li><b>After, with a mark on top:</b> ${dx('ो ौ')} (${dx('को कौ')})</li><li><b>After, two dots:</b> ${dx('ः')} (${dx('कः')})</li></ul>
  <h4>Letters that change shape</h4><ul><li>${dx('र')} takes ${dx('ु ू')} beside it, not below: ${dx('रु')} (ru), ${dx('रू')} (roo).</li><li>${dx('ऋ')} as a matra is ${dx('ृ')} under the letter: ${dx('कृ')} (kri), ${dx('गृ')} (gri).</li></ul>
  ${eg('Example 1',`${dx('म')} + ${dx('ा')} = ${dx('मा')} (maa).`)}${eg('Example 2',`${dx('न')} + ${dx('ी')} = ${dx('नी')} (nee).`)}${eg('Example 3',`${dx('ल')} + ${dx('ो')} = ${dx('लो')} (lo).`)}${eg('Example 4: a whole word',`${dx('गुलाब')} = ${dx('ग')} + ${dx('ु')}, ${dx('ल')} + ${dx('ा')}, ${dx('ब')}.`)}
  <h4>Watch out</h4><ul><li>${dx('ि')} is written <b>before</b> the letter but said <b>after</b> it: ${dx('कि')} is "ki", not "ik".</li><li>${dx('ो')} and ${dx('ौ')} differ only in the mark on top: one stroke for "o", two for "au".</li></ul>`,
  sets:[SET('Level 1: ा ि ी with क',()=>mWhich([['क','k']],MAT.slice(0,4))),SET('Level 2: every matra with क',()=>mWhich([['क','k']],MAT)),SET('Level 3: every matra, every letter',()=>mWhich(MC,MAT)),
   SET('Say it',mSay),SET('Challenge: join the sign',mJoin)]},
 {n:5,title:'Short or long?',level:'Beginners',
  learn:`<h4>The idea</h4><p>The most common spelling mistakes in both Marathi and Hindi are short and long matras. Short sounds are quick; long sounds are held.</p>
  <div class="center dev" style="font-size:64px">कि &nbsp; की &nbsp;&nbsp; कु &nbsp; कू</div>
  <h4>Step by step</h4><ol><li>Say the sound slowly. Clap once for short; stretch your arms for long.</li><li>Short i (${dx('ि')}) stands <b>before</b> the letter. Long ee (${dx('ी')}) comes <b>after</b> it.</li><li>Short u (${dx('ु')}) and long oo (${dx('ू')}) both sit under the letter: look carefully at the sign.</li></ol>
  ${eg('Example 1',`${dx('मि')} is a quick "mi". ${dx('मी')} is a long "mee".`)}${eg('Example 2',`${dx('पु')} is a quick "pu". ${dx('पू')} is a long "poo".`)}${eg('Example 3',`In ${dx('फूल')} (flower) the "oo" is long, so it takes ${dx('ू')}.`)}
  <h4>Words to practise</h4><div class="tw"><table><tr><th>Short</th><th>Long</th></tr><tr><td class="dbig">दिन (day, H)</td><td class="dbig">दीप (lamp)</td></tr><tr><td class="dbig">गुलाब (rose)</td><td class="dbig">दूध (milk)</td></tr><tr><td class="dbig">जिराफ (giraffe)</td><td class="dbig">फूल (flower)</td></tr><tr><td class="dbig">उत्तर (answer)</td><td class="dbig">ईद (Eid)</td></tr></table></div>
  <h4>Watch out</h4><p>Before writing an i or u sound, ask yourself: short or long? Marathi and Hindi sometimes spell the same word differently: ${dx('ऋषी')} (M) and ${dx('ऋषि')} (H).</p>`,
  sets:[SET('Level 1: ि or ी with क',()=>{const q=slQ(true);return q}),SET('Level 2: ि or ी with all letters',()=>slQ(true)),SET('Level 3: ु or ू',()=>slQ(false)),
   SET('Say it: short or long?',()=>slQ(Math.random()<.5,'say')),SET('Challenge: mixed',()=>slQ(Math.random()<.5,Math.random()<.5?'say':''))]},
 {n:6,title:'Read words',level:'Beginners',
  learn:`<h4>The idea</h4><p>Words are made of <b>akshars</b>: a letter, with or without a matra. Read each akshar, then join them, just like blending sounds in English.</p>
  <div class="center"><span class="pic">🦚</span><div class="dev" style="font-size:52px">मो + र = मोर</div></div>
  <h4>Step by step</h4><ol><li>Cover the word and show one akshar at a time.</li><li>Say each akshar.</li><li>Say them faster until they join into the word.</li></ol>
  ${eg('Example 1',`${dx('घ + र = घर')} (house).`)}${eg('Example 2',`${dx('प + तं + ग = पतंग')} (kite). The dot on ${dx('तं')} adds an "n" sound.`)}${eg('Example 3',`${dx('गु + ला + ब = गुलाब')} (rose).`)}
  <h4>Watch out</h4><p>Don't guess from the first akshar. ${dx('गाय')} and ${dx('गाजर')} start the same way. The words here are the same in Marathi and Hindi.</p>`,
  sets:[SET('Level 1: picture to word',()=>wPicWord(WS)),SET('Level 2: word to picture',()=>wWordPic(WS)),SET('Level 3: three-akshar words',()=>Math.random()<.5?wPicWord(WL):wWordPic(WL)),
   SET('Find the missing part',wMiss),SET('Challenge: look-alike spellings',()=>Math.random()<.6?rWord():wPicWord(WA2))]},
 {n:7,title:'Build words',level:'Beginners',
  learn:`<h4>The idea</h4><p>Writing a word is reading in reverse: say the word slowly, hear each akshar, and write them in order.</p>
  <div class="center"><div class="tiles"><span class="tile">प</span><span class="tile">तं</span><span class="tile">ग</span></div><span class="pic wiggle">🪁</span></div>
  <h4>Step by step</h4><ol><li>Say the word aloud.</li><li>Tap once for each akshar you hear.</li><li>Write the letters first, then draw the roof line across the whole word.</li></ol>
  ${eg('Example 1',`${dx('कान')} (ear): ${dx('का')} + ${dx('न')}.`)}${eg('Example 2',`${dx('गाजर')} (carrot): ${dx('गा')} + ${dx('ज')} + ${dx('र')}.`)}${eg('Example 3',`${dx('जिराफ')} (giraffe): ${dx('जि')} + ${dx('रा')} + ${dx('फ')}.`)}
  <h4>Watch out</h4><p>Check the matra on each akshar: ${dx('का')} and ${dx('क')} sound different.</p>`,
  sets:[SET('Level 1: two-akshar words',()=>bld(WS,0)),SET('Level 2: with an extra tile',()=>bld(WS,1)),SET('Level 3: three-akshar words',()=>bld(WL,1)),
   SET('Which part comes first?',wFirst),SET('Challenge: two extra tiles',()=>bld(WA2,2))]},
 {n:8,title:'Devanagari numbers',level:'Beginners',
  learn:`<h4>The idea</h4><p>Marathi and Hindi books often write numbers in Devanagari digits. They work exactly like English digits: only the shapes are different.</p>
  <div class="center dev pulse" style="font-size:48px"><span>०</span> <span>१</span> <span>२</span> <span>३</span> <span>४</span></div><div class="center dev" style="font-size:48px">५ ६ ७ ८ ९</div>
  <h4>Step by step</h4><ol><li>Learn the ten shapes, five at a time.</li><li>Read bigger numbers digit by digit, just like in English.</li></ol>
  ${eg('Example 1',`${dx('७')} is 7. ${dx('९')} is 9.`)}${eg('Example 2',`${dx('२५')} is 25: ${dx('२')} is 2 and ${dx('५')} is 5.`)}${eg('Example 3',`${dx('३ + ४')} = 7, written ${dx('७')}.`)}
  <h4>Watch out</h4><p>${dx('१')} (1) and ${dx('९')} (9) look alike. ${dx('९')} has a loop on top.</p>`,
  sets:[SET('Level 1: read 0 to 9',()=>nDev(0,9)),SET('Level 2: write 0 to 9',()=>nToDev(0,9)),SET('Level 3: two-digit numbers',()=>Math.random()<.5?nDev(10,99):nToDev(10,99)),
   SET('Three-digit numbers',()=>nDev(100,999)),SET('Challenge: sums in Devanagari',nSum)]},
 {n:9,title:'Nasal and breath marks (ं ँ ः)',level:'Beginners',
  learn:`<h4>The idea</h4><p>Three small marks sit on or beside a letter and change how it sounds.</p>
  <div class="tw"><table><tr><th>Mark</th><th>Name</th><th>What it does</th><th>Example</th></tr>
  <tr><td class="dbig">ं</td><td>Anusvara (अनुस्वार)</td><td>A dot on top: adds an "n" or "m" sound</td><td>${dx('पतंग')} kite, ${dx('शंख')} conch, ${dx('जंगल')} forest</td></tr>
  <tr><td class="dbig">ँ</td><td>Chandrabindu (चंद्रबिंदू / चंद्रबिंदु)</td><td>A moon with a dot: the vowel is said through the nose</td><td>${dx('चाँद')} moon (H), ${dx('माँ')} mother (H), ${dx('आँख')} eye (H)</td></tr>
  <tr><td class="dbig">ः</td><td>Visarga (विसर्ग)</td><td>Two dots after a letter: a soft breath "h"</td><td>${dx('दुःख')} sorrow, ${dx('प्रातः')} early morning</td></tr></table></div>
  <h4>Step by step</h4><ol><li>Read the letter first.</li><li>Then add the mark: a dot means an "n/m" sound, a moon means a nose sound, two dots mean a breath.</li></ol>
  ${eg('Example 1',`${dx('प + तं + ग')}: the dot on ${dx('तं')} adds "n", so it is "patang".`)}${eg('Example 2',`${dx('शंख')}: the dot on ${dx('शं')} is said "n" before ${dx('ख')}: "shankh".`)}${eg('Example 3',`${dx('दुःख')}: the two dots add a breath: "duh-kh".`)}
  <h4>Marathi and Hindi</h4><p>Hindi often uses the moon ${dx('ँ')} for nose sounds (${dx('चाँद')}). Marathi usually writes a simple dot ${dx('ं')} instead (${dx('चांदणे')} moonlight).</p>
  <h4>Watch out</h4><p>Don't confuse the anusvara dot with the matra ${dx('े')}: the dot is round and small, the matra is a slanting stroke.</p>`,
  sets:[SET('Level 1: name the mark',()=>{const m=one([['ं','Anusvara'],['ँ','Chandrabindu'],['ः','Visarga']]);return txtQ(dv('क'+m[0],96),'Which mark is used here?',m[1],['Anusvara','Chandrabindu','Visarga'].filter(x=>x!==m[1]),`${m[0]} is the ${m[1].toLowerCase()}.`)}),
   SET('Level 2: find the anusvara',()=>{const c=one(['पतंग','शंख','जंगल','अंडे','गंगा','मंगल']);return devQ('','Which word has an anusvara (dot on top)?',c,sample(['घर','मोर','बस','कप','दूध','फूल'],2),`${c} has the dot ं.`,c)}),
   SET('Level 3: find the visarga',()=>{const c=one(['दुःख','प्रातः','अतः','पुनः']);return devQ('','Which word has a visarga (two dots)?',c,sample(['घर','तारा','पान','नाक','ढोल'],2),`${c} has the two dots ः.`,c)}),
   SET('Read the sound',()=>{const w=one([['पतंग','patang'],['शंख','shankh'],['जंगल','jangal'],['गंगा','ganga'],['दुःख','duhkh']]);return txtQ(dv(w[0],72),'How do you say this word?',w[1],sample(['patag','shakh','jagal','gaga','dukh','pataga'].filter(x=>x!==w[1]),2),`The mark changes the sound: ${w[0]} is "${w[1]}".`,w[0])}),
   SET('Challenge: mixed',()=>one([()=>{const m=one([['ं','Anusvara'],['ँ','Chandrabindu'],['ः','Visarga']]);return txtQ(dv('म'+m[0],96),'Which mark is used here?',m[1],['Anusvara','Chandrabindu','Visarga'].filter(x=>x!==m[1]),`${m[0]} is the ${m[1].toLowerCase()}.`)},()=>{const c=one(['पतंग','शंख','जंगल','गंगा']);return devQ('','Which word has an anusvara?',c,sample(['घर','मोर','कप','दूध'],2),`${c} has the dot ं.`,c)}])())]},
 {n:10,title:'Joint letters (जोडाक्षरे / संयुक्ताक्षर)',level:'Next step',
  learn:`<h4>The idea</h4><p>When two consonants are said together with no vowel between them, they join into one <b>joint letter</b>. The first letter usually becomes a <b>half letter</b>. Joint letters are called <b>जोडाक्षरे</b> in Marathi and <b>संयुक्ताक्षर</b> in Hindi.</p>
  <div class="center dev" style="font-size:56px">स् + त = स्त</div>
  <h4>The four rules</h4><ol><li><b>Half letter:</b> a letter with a standing line drops the line: ${dx('स्')} + ${dx('त')} = ${dx('स्त')} as in ${dx('पुस्तक')} (book).</li><li><b>र first (रफार):</b> र becomes a small hook on top of the next letter: ${dx('र्')} + ${dx('म')} = ${dx('र्म')} as in ${dx('धर्म')}.</li><li><b>र second:</b> र becomes a small slanting stroke under the letter: ${dx('प्')} + ${dx('र')} = ${dx('प्र')} as in ${dx('प्रकाश')} (light).</li><li><b>Special shapes:</b> some joints have their own shape: ${dx('क्ष')} (क् + ष), ${dx('त्र')} (त् + र), ${dx('ज्ञ')} (ज् + ञ), ${dx('श्र')} (श् + र).</li></ol>
  <h4>Common joint letters</h4><div class="tw"><table><tr><th>Joint</th><th>Made of</th><th>Example</th></tr>
  <tr><td class="dbig">स्त</td><td>स् + त</td><td>${dx('पुस्तक')} book, ${dx('नमस्ते')}</td></tr><tr><td class="dbig">त्य</td><td>त् + य</td><td>${dx('सत्य')} truth</td></tr><tr><td class="dbig">द्य</td><td>द् + य</td><td>${dx('विद्यार्थी')} student</td></tr>
  <tr><td class="dbig">र्य</td><td>र् + य</td><td>${dx('सूर्य')} sun</td></tr><tr><td class="dbig">द्र</td><td>द् + र</td><td>${dx('चंद्र')} moon</td></tr><tr><td class="dbig">प्र</td><td>प् + र</td><td>${dx('प्रकाश')} light</td></tr>
  <tr><td class="dbig">त्र</td><td>त् + र</td><td>${dx('त्रिकोण')} triangle, ${dx('पत्र')} letter</td></tr><tr><td class="dbig">क्ष</td><td>क् + ष</td><td>${dx('क्षमा')} forgiveness</td></tr><tr><td class="dbig">ज्ञ</td><td>ज् + ञ</td><td>${dx('ज्ञान')} knowledge</td></tr><tr><td class="dbig">श्र</td><td>श् + र</td><td>${dx('श्रम')} hard work</td></tr></table></div>
  ${eg('Example 1',`${dx('पु + स्त + क = पुस्तक')}: "pus-tak". The ${dx('स')} is half because no vowel comes after it.`)}${eg('Example 2',`${dx('सू + र्य = सूर्य')}: the hook on ${dx('य')} is a half ${dx('र')}, said before ${dx('य')}.`)}${eg('Example 3',`${dx('त्रि + को + ण = त्रिकोण')}: ${dx('त्र')} is त् + र.`)}
  <h4>Watch out</h4><p>The hook on top (${dx('र्म')}) is said <b>before</b> the letter it sits on; the stroke below (${dx('प्र')}) is said <b>after</b> it.</p>`,
  sets:[SET('Level 1: join the letters',()=>{const J=JN,j=one(J);return devQ(`<span class="wordbig dev">${j[0]} + ${j[1]}</span>`,'What joint letter do they make?',j[2],sample(J.filter(x=>x!==j),2).map(x=>x[2]),`${j[0]} + ${j[1]} = ${j[2]}.`)}),
   SET('Level 2: break it apart',()=>{const j=one(JN);return txtQ(dv(j[2],96),'Which letters make this joint letter?',`${j[0]} + ${j[1]}`,sample(JN.filter(x=>x!==j),2).map(x=>`${x[0]} + ${x[1]}`),`${j[2]} = ${j[0]} + ${j[1]}.`)}),
   SET('Level 3: find it in a word',()=>{const w=one(JW);return devQ(dv(w[0],60)+(w[2]?`<span class="pic">${w[2]}</span>`:''),'Which joint letter is in this word?',w[1],sample(JN.map(x=>x[2]).filter(x=>x!==w[1]),2),`${w[0]} has ${w[1]}.`,w[0])}),
   SET('Build the word',()=>{const w=one(JB);return{kind:'build',show:(w[2]?`<span class="pic">${w[2]}</span>`:'')+`<p class="muted">${w[3]}</p>`,ask:'Tap the parts in order to write the word.',say:w[0],lang:'hi-IN',tiles:shuffle([...w[1],...sample(['क','म','प्र','स्त','र','ना'].filter(x=>w[1].indexOf(x)<0),1)]),target:w[1],ah:dv(w[0],56),hint:`${w[1].join(' + ')} = ${w[0]}.`}}),
   SET('Challenge: mixed',()=>one([()=>{const j=one(JN);return devQ(`<span class="wordbig dev">${j[0]} + ${j[1]}</span>`,'What joint letter do they make?',j[2],sample(JN.filter(x=>x!==j),2).map(x=>x[2]),`${j[0]} + ${j[1]} = ${j[2]}.`)},()=>{const w=one(JW);return devQ(dv(w[0],60),'Which joint letter is in this word?',w[1],sample(JN.map(x=>x[2]).filter(x=>x!==w[1]),2),`${w[0]} has ${w[1]}.`,w[0])}])())]}
];
const JN=[['स्','त','स्त'],['त्','य','त्य'],['द्','य','द्य'],['र्','य','र्य'],['द्','र','द्र'],['प्','र','प्र'],['त्','र','त्र'],['क्','ष','क्ष'],['ज्','ञ','ज्ञ'],['श्','र','श्र'],['र्','म','र्म'],['स्','थ','स्थ'],['च्','च','च्च'],['म्','ब','म्ब']];
const JW=[['पुस्तक','स्त','📖'],['नमस्ते','स्त','🙏'],['सत्य','त्य',''],['विद्यार्थी','द्य','🧑‍🎓'],['सूर्य','र्य','☀️'],['चंद्र','द्र','🌙'],['प्रकाश','प्र','💡'],['त्रिकोण','त्र','🔺'],['पत्र','त्र','✉️'],['क्षमा','क्ष',''],['ज्ञान','ज्ञ',''],['श्रम','श्र',''],['धर्म','र्म','']];
const JB=[['पुस्तक',['पु','स्त','क'],'📖','book'],['नमस्ते',['न','म','स्ते'],'🙏','namaste'],['सूर्य',['सू','र्य'],'☀️','sun'],['पत्र',['प','त्र'],'✉️','letter'],['त्रिकोण',['त्रि','को','ण'],'🔺','triangle'],['चंद्र',['चं','द्र'],'🌙','moon'],['प्रकाश',['प्र','का','श'],'💡','light']];
const BGUIDE=[
['How to use this module',`<p>Built for beginners and for children from non-Marathi homes, from Grade 1 up. Marathi and Hindi share the Devanagari script, so the letters, matras and reading skills here work for both. The picture words chosen are the same in both languages.</p>
<h4>Order</h4><ol><li>Vowels and consonants by sound</li><li>Look-alike letters</li><li>Matras on one consonant, then all</li><li>Short and long matras</li><li>Reading and building two- and three-part words</li><li>Devanagari numbers, whenever the school book uses them</li></ol>
<h4>Rules</h4><ul><li>Sound first: say the letter before showing it.</li><li>One family of letters a week, with lots of oral practice.</li><li>Every lesson ends with the child reading something successfully.</li></ul>`],
['Vowels (स्वर)',`<p>Teach in pairs of short and long: <span class="dev">अ आ, इ ई, उ ऊ</span>, then <span class="dev">ए ऐ, ओ औ</span>. Add <span class="dev">अं अः</span> later.</p>
<h4>Activities</h4><ul><li>Sound and stretch: clap once for short, stretch the arms for long.</li><li>Sand tray tracing while saying the sound.</li><li>Vowel bingo with cards.</li></ul>
<h4>Watch for</h4><p>Children from English-medium schools reading <span class="dev">अ</span> as "ae". Remind them it is the short "a" in "about".</p>`],
['Consonants by family (व्यंजन)',`<p>Teach by mouth position, not just in alphabet order, so the sounds make sense.</p>
<ul><li>Throat: <span class="dev">क ख ग घ ङ</span></li><li>Palate: <span class="dev">च छ ज झ ञ</span></li><li>Tongue curled back (hard): <span class="dev">ट ठ ड ढ ण</span></li><li>Tongue on teeth (soft): <span class="dev">त थ द ध न</span></li><li>Lips: <span class="dev">प फ ब भ म</span></li><li>Others: <span class="dev">य र ल व श ष स ह</span>, and <span class="dev">ळ</span> in Marathi</li></ul>
<h4>Breathy letters</h4><p>Each family has plain and "breathy" pairs (<span class="dev">क/ख, ग/घ</span>). Hold a paper strip in front of the mouth: it moves for the breathy one.</p>
<h4>Hard and soft t, d</h4><p><span class="dev">ट/त</span> and <span class="dev">ड/द</span> are hard for English speakers. Hard: tongue curls back. Soft: tongue touches the teeth.</p>`],
['Look-alike letters',`<ul><li><span class="dev">घ / ध</span> and <span class="dev">म / भ</span>: the second has a gap in its roof.</li><li><span class="dev">ख / रव</span>: <span class="dev">ख</span> is joined in one piece.</li><li><span class="dev">ब / व</span>: <span class="dev">ब</span> has a line inside.</li><li><span class="dev">प / ष</span>: <span class="dev">ष</span> has a line across.</li></ul>
<p>Practise one pair a day: write both, circle the difference in colour, then sort word cards.</p>`],
['Matras and बाराखडी / बारहखड़ी',`<p>Teach every matra with <span class="dev">क</span> first, then the same chart with <span class="dev">ग, म, न, स</span>. Children quickly see the sign does the same job on every letter.</p>
<h4>Where each sign sits</h4><ul><li><span class="dev">ा</span> after the letter</li><li><span class="dev">ि</span> before the letter (said after it)</li><li><span class="dev">ी</span> after the letter</li><li><span class="dev">ु ू</span> below</li><li><span class="dev">े ै</span> above</li><li><span class="dev">ो ौ</span> after, with a mark above</li></ul>
<h4>Watch for</h4><p>Reading <span class="dev">कि</span> as "ik" because the sign comes first. Say: "the sign stands in front, but the letter speaks first".</p>`],
['Nasal and breath marks',`<ul><li><b>Anusvara ं</b>: a dot that adds n/m before the next letter (<span class="dev">पतंग, शंख</span>).</li><li><b>Chandrabindu ँ</b>: a nasal vowel, common in Hindi (<span class="dev">चाँद, माँ</span>); Marathi usually writes a dot instead.</li><li><b>Visarga ः</b>: a soft breath (<span class="dev">दुःख</span>).</li></ul><p>Teach by contrast: say <span class="dev">पतग</span> and <span class="dev">पतंग</span> aloud and let the child hear the difference.</p>`],
['Joint letters',`<p>Start only once matras are secure. Teach the four rules one at a time: half letters (<span class="dev">स्त</span>), र on top (<span class="dev">र्म</span>), र below (<span class="dev">प्र</span>), and special shapes (<span class="dev">क्ष त्र ज्ञ श्र</span>). Have the child underline joint letters in their textbook and say each part aloud. Note that <span class="dev">ज्ञ</span> is said "dnya" in Marathi and "gya" in Hindi.</p>`],
['Short and long sounds',`<p>The most common spelling mistakes in both languages are <span class="dev">ि/ी</span> and <span class="dev">ु/ू</span>.</p><ul><li>Clap once for short, hold the sound for long.</li><li>Practise minimal pairs aloud from the child's own textbook.</li><li>When the child writes a word, ask "short or long?" before they write the matra.</li></ul>`],
['Reading and writing words',`<ul><li>Break words into akshars: <span class="dev">प | तं | ग</span>.</li><li>Read each akshar, then join: like blending in English.</li><li>Writing order: write the letters first, then draw the roof line (शिरोरेखा) across the whole word.</li><li>Move to short sentences from the school book once two-akshar words are easy.</li></ul>`],
['Where Marathi and Hindi differ',`<ul><li><b>Extra letter:</b> Marathi uses <span class="dev">ळ</span> (<span class="dev">शाळा, बाळ</span>).</li><li><b>Same word, different spelling:</b> Marathi <span class="dev">पाणी</span>, Hindi <span class="dev">पानी</span> (water).</li><li><b>Different words:</b> mother is <span class="dev">आई</span> in Marathi and <span class="dev">माँ</span> in Hindi; mango is <span class="dev">आंबा</span> and <span class="dev">आम</span>.</li><li><b>English loan sounds:</b> Marathi writes the "a" of "bat" as <span class="dev">ॅ</span> (<span class="dev">बॅट</span>).</li><li><b>Nasal sounds:</b> Hindi often uses <span class="dev">ँ</span> where Marathi uses <span class="dev">ं</span>.</li></ul>
<p>Teach the shared script once, then use the child's own school book for the language-specific words and spellings.</p>`],
['For children from non-Marathi homes',`<ul><li>Parents may not be able to help, so give 5-minute home tasks that need no Marathi: tracing, matching picture cards, listening to a recording.</li><li>Build spoken vocabulary alongside reading: 5 everyday words a week with pictures.</li><li>Use English sounds as a bridge only at first; move to Devanagari sounds quickly.</li><li>Celebrate reading the first full sentence; it is a big moment for these children.</li></ul>`],
['A 12-week beginner track',`<p>Weeks 1–2: vowels · Weeks 3–6: consonants, one family a week, look-alikes as they appear · Weeks 7–9: matras with <span class="dev">क</span>, then all letters · Week 10: short and long · Weeks 11–12: reading and writing two- and three-akshar words, first sentences. Devanagari numbers alongside, whenever the school book uses them.</p>`]];
MODS.bhasha={name:'Marathi & Hindi',title:'Marathi & Hindi: reading and writing',key:'bh',ch:BH,guide:BGUIDE,gnote:'A quick reference for teaching Devanagari reading and writing to beginners. The Kids’ self study has 10 chapters in the same order, each with a full concept page and 50 practice questions. Picture words are the same in Marathi and Hindi; the last guide sections cover where the two languages differ.'};

/* ====== English grammar, Grade 3+ ====== */
const uniq=a=>a.filter((x,i)=>a.indexOf(x)===i);
const gblank=s=>esc(s).replace('___','<span class="blank">_____</span>');
function gQ(sent,ask,correct,wrongs,hint){const w=uniq(wrongs.filter(x=>x!==correct)).slice(0,3);return{kind:'pick',show:sent?`<div class="sent gsent">${gblank(sent)}</div>`:'',ask,say:'',opts:shuffle([correct,...w]).map(v=>({h:esc(v),v,cls:'txt'})),a:correct,ah:`<span class="wordbig">${esc(correct)}</span>`,hint}}
const BOYS=['Aarav','Kabir','Rohan','Arjun'],GIRLS=['Meera','Siya','Riya','Ananya'];
const NOUNS=['dog','girl','teacher','bird','farmer','baby','cat','boy','monkey','driver'],ADJS=['big','little','happy','tall','clever','hungry','tired','kind','noisy','old'],VERBS=['barked','laughed','smiled','sang','slept','jumped','waved','danced','shouted','ran'];
const PROPER=['Pune','Meera','Monday','India','Diwali','Ganga','Mumbai','January','Everest','Kabir','Sunday','Maharashtra'],COMMON=['city','girl','day','country','festival','river','school','month','mountain','book','teacher','pencil'];
const PLR=[['box','boxes'],['bus','buses'],['dish','dishes'],['watch','watches'],['glass','glasses'],['baby','babies'],['city','cities'],['story','stories'],['toy','toys'],['day','days'],['boy','boys'],['leaf','leaves'],['knife','knives'],['wolf','wolves'],['book','books'],['pen','pens'],['tomato','tomatoes'],['potato','potatoes']];
const IRR=[['child','children'],['man','men'],['woman','women'],['tooth','teeth'],['foot','feet'],['mouse','mice'],['sheep','sheep'],['fish','fish'],['goose','geese'],['person','people'],['ox','oxen'],['deer','deer']];
const wrongPl=w=>uniq([w+'s',w+'es',w.replace(/y$/,'ies'),w.replace(/f$|fe$/,'ves')]);
const V=[['go','goes','went','going','to school'],['eat','eats','ate','eating','an apple'],['play','plays','played','playing','cricket'],['write','writes','wrote','writing','a letter'],['sing','sings','sang','singing','a song'],['drink','drinks','drank','drinking','milk'],['cook','cooks','cooked','cooking','dinner'],['swim','swims','swam','swimming','in the pool'],['run','runs','ran','running','in the park'],['walk','walks','walked','walking','to the shop'],['make','makes','made','making','a kite'],['buy','buys','bought','buying','vegetables'],['clean','cleans','cleaned','cleaning','the room'],['catch','catches','caught','catching','the ball'],['draw','draws','drew','drawing','a picture'],['fly','flies','flew','flying','a kite']];
const nm=()=>one(BOYS.concat(GIRLS));
const ADJC=[['tall','taller','tallest','p'],['short','shorter','shortest','p'],['young','younger','youngest','p'],['old','older','oldest','p'],['fast','faster','fastest','p'],['happy','happier','happiest','p'],['careful','more careful','most careful','p'],['big','bigger','biggest','t'],['small','smaller','smallest','t'],['heavy','heavier','heaviest','t'],['long','longer','longest','t'],['hot','hotter','hottest','t'],['good','better','best','t'],['bad','worse','worst','t'],['beautiful','more beautiful','most beautiful','t'],['interesting','more interesting','most interesting','t']];
const cmpWrong=(a,c)=>uniq([a[0]+'er',a[0]+'est','more '+a[0]+'er',a[1]==='better'?'gooder':a[0]+'er',a[2]]).filter(x=>x!==c);
const ADV=[['quick','quickly','runs'],['slow','slowly','walks'],['careful','carefully','writes'],['happy','happily','sings'],['loud','loudly','talks'],['quiet','quietly','reads'],['easy','easily','wins'],['good','well','plays'],['soft','softly','speaks'],['neat','neatly','draws']];
const AN=['apple','umbrella','egg','orange','elephant','ice cream','owl','ant','onion','idli','hour','honest boy'],A1=['ball','cat','dog','banana','pen','book','kite','mango','uniform','unicorn','university','one-rupee coin'];
const THE=[['___ sun rises in the east.','The'],['___ moon shines at night.','The'],['___ Ganga is a long river.','The'],['Please close ___ door behind you.','the'],['___ Himalayas are very high.','The'],['Mumbai is on ___ west coast of India.','the'],['Kabir is ___ tallest boy in the class.','the'],['I have a dog. ___ dog is brown.','The'],['___ earth goes round the sun.','The'],['We saw a film. ___ film was funny.','The']];
const PPLACE=[['The fish swims ___ the water.','in',['on','between']],['The picture hangs ___ the wall.','on',['in','between']],['The ball rolled ___ the bed, and now I cannot see it.','under',['on','between']],['Riya sits ___ Siya and Meera.','between',['on','under']],['Put the plate ___ the table.','on',['between','at']],['The car is parked ___ the house, so we cannot see it from the road.','behind',['on','between']],['The keys are ___ my pocket.','in',['on','under']],['The cat is sleeping ___ the cushion.','on',['between','at']],['The shop is ___ the bank and the school.','between',['on','under']],['My shoe was on the floor, hidden ___ the chair.','under',['on','between']],['The teacher stood ___ the class to speak.','in front of',['between','under']],['A bridge goes ___ the river.','over',['between','in']]];
const PTIME=[['School starts ___ 8 o\u2019clock.','at'],['My birthday is ___ May.','in'],['We have music class ___ Monday.','on'],['I brush my teeth ___ the morning.','in'],['Owls hunt ___ night.','at'],['Independence Day is ___ 15 August.','on'],['It is very hot ___ summer.','in'],['The shop opens ___ 10 a.m.','at'],['We will visit Grandma ___ Sunday.','on'],['Diwali comes ___ autumn.','in']].map(t=>[t[0],t[1],['at','on','in'].filter(x=>x!==t[1])]);
const PMOVE=[['The frog jumped ___ the pond.','into',['on','at']],['He took the cake ___ the box.','out of',['on','at']],['We walked ___ the road at the zebra crossing.','across',['into','out of']],['The children ran ___ the hill to the top.','up',['down','into']],['The ball rolled ___ the hill to the bottom.','down',['up','into']],['The train went ___ a long tunnel.','through',['on','at']],['She walked ___ the room and switched on the light.','into',['on','at']],['The bird flew ___ the cage and away.','out of',['into','on']]];
const PALL=['in','on','under','at','between','behind','into','out of','across','over','up','down','through','in front of'];
const SG=['My sister','Kabir','The teacher','Riya','My friend','Grandpa'],PLS=['My sisters','Kabir and Siya','The teachers','The children','We','They','My friends'];
const AGR=[['is','are','happy today.'],['has','have','a red bicycle.'],['likes','like','mangoes.'],['plays','play','outside after school.'],['was','were','late yesterday.'],['does','do','homework every evening.'],['goes','go','to the market on Sundays.']];
const ST=['I like mangoes','We live in Pune','The sun is very hot today','My brother plays cricket','Riya has a new bag','School starts at eight','The kite is flying high','Grandma tells good stories'],QS=['Where do you live','What is your name','Can you swim','Is it raining','How old are you','Did you finish your homework','Which book is yours','Who is your best friend'],EXS=['What a beautiful rainbow','How tall you are','Wow, we won the match','What a lovely surprise','Ouch, that hurts','Hurray, the holidays are here'],CMD=['Please shut the door','Sit down quietly','Wash your hands before lunch','Bring your notebook tomorrow','Do not run in the corridor','Switch off the fan'];
const CAP=[['my name is riya.','My name is Riya.'],['kabir lives in pune.','Kabir lives in Pune.'],['we visited mumbai on sunday.','We visited Mumbai on Sunday.'],['diwali comes in october or november.','Diwali comes in October or November.'],['meera and i went to the ganga.','Meera and I went to the Ganga.'],['my teacher is from india.','My teacher is from India.']];
const CON2=[['do not','don’t',['dont','do’nt']],['can not','can’t',['cant','ca’nt']],['it is','it’s',['its','i’ts']],['I am','I’m',['Im','I’am']],['they are','they’re',['theyre','the’yre']],['we will','we’ll',['well','we’ill']],['is not','isn’t',['isnt','is’nt']],['she is','she’s',['shes','sh’es']]];
const POSS=[['Riya','bag'],['Kabir','kite'],['the dog','bone'],['Meera','book'],['my brother','bicycle'],['the teacher','desk']];
const CJ=[['I was hungry, ___ I ate a banana.','so'],['I stayed at home ___ I was sick.','because'],['She is small, ___ she is very strong.','but'],['Do you want tea ___ milk?','or'],['Riya ___ Meera are sisters.','and'],['It was raining, ___ we took umbrellas.','so'],['He was late ___ he missed the bus.','because'],['I like mangoes, ___ I do not like bananas.','but'],['We can play cricket ___ football.','or'],['I washed my hands ___ ate my lunch.','and'],['The shop was closed, ___ we went home.','so'],['She smiled ___ she was happy.','because'],['The test was hard, ___ I passed.','but'],['Would you like rice ___ chapati?','or'],['Kabir sings ___ dances well.','and']];
const CJJ=[['I was tired.','I went to bed.','so'],['I was tired.','I finished my homework.','but'],['I went to bed.','I was tired.','because'],['It was cold.','I wore a sweater.','so'],['We wanted to play.','It started raining.','but'],['She laughed.','The joke was funny.','because'],['The road was wet.','It had rained.','because'],['I studied hard.','I did well in the test.','so']];
const lc=s=>s[0].toLowerCase()+s.slice(1);
const GR=[
 {n:1,title:'Nouns',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A <b>noun</b> is a naming word. It names a <b>person</b> (teacher, Meera), a <b>place</b> (school, Pune), an <b>animal</b> (dog) or a <b>thing</b> (pencil).</p>
  <h4>Common and proper nouns</h4><p>A <b>common noun</b> names any one of a kind: <i>city, girl, river</i>. A <b>proper noun</b> names one special person, place or thing, and always starts with a <b>capital letter</b>: <i>Pune, Meera, Ganga, Monday</i>.</p>
  <h4>Singular and plural</h4><div class="tw"><table><tr><th>Rule</th><th>Examples</th></tr><tr><td>Most words: add <b>-s</b></td><td>book → books, pen → pens</td></tr><tr><td>Ends in s, sh, ch, x, o: add <b>-es</b></td><td>bus → buses, dish → dishes, watch → watches, box → boxes, tomato → tomatoes</td></tr><tr><td>Consonant + y: change y to <b>-ies</b></td><td>baby → babies, city → cities</td></tr><tr><td>Vowel + y: just add <b>-s</b></td><td>toy → toys, day → days</td></tr><tr><td>Ends in f or fe: often <b>-ves</b></td><td>leaf → leaves, knife → knives</td></tr><tr><td>Special plurals: learn by heart</td><td>child → children, man → men, tooth → teeth, mouse → mice, sheep → sheep</td></tr></table></div>
  ${eg('Example 1: find the noun','"The happy <b>girl</b> sang." <i>Girl</i> names a person, so it is the noun. <i>Happy</i> describes her; <i>sang</i> is what she did.')}${eg('Example 2: proper noun','"we went to <b>pune</b>" should be "We went to <b>Pune</b>." Pune is the name of one city.')}${eg('Example 3: plurals','one baby, two <b>babies</b>; one toy, two <b>toys</b>; one child, two <b>children</b>.')}
  <h4>Watch out</h4><p>Some nouns stay the same in the plural: one sheep, ten sheep; one fish, three fish.</p>`,
  sets:[SET('Level 1: find the noun',()=>{const n=one(NOUNS),a=one(ADJS),v=one(VERBS);return gQ(`The ${a} ${n} ${v}.`,'Which word is the noun?',n,[a,v],`"${n}" names a person or animal. "${a}" describes it and "${v}" is the action.`)}),
   SET('Level 2: common or proper?',()=>{const p=Math.random()<.5,w=p?one(PROPER):one(COMMON);return gQ('',`Is "${w}" a common noun or a proper noun?`,p?'Proper noun':'Common noun',[p?'Common noun':'Proper noun'],p?`"${w}" names one special person, place or thing, so it is proper and starts with a capital.`:`"${w}" names any one of a kind, so it is common.`)}),
   SET('Level 3: plurals with -s, -es, -ies, -ves',()=>{const[s,p]=one(PLR);return gQ('',`What is the plural of "${s}"?`,p,wrongPl(s),`${s} → ${p}.`)}),
   SET('Special plurals',()=>{const[s,p]=one(IRR);return gQ('',`What is the plural of "${s}"?`,p,[s+'s',s+'es',p+'s'].filter(x=>x!==p),`${s} → ${p}. Special plurals are learned by heart.`)}),
   SET('Challenge: plurals in sentences',()=>{const[s,p]=one(PLR.concat(IRR));return gQ(`There are three ___ in the picture.`,`Which word fits? (${s})`,p,wrongPl(s).concat([s]),`More than one ${s} is ${p}.`)})]},
 {n:2,title:'Pronouns',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A <b>pronoun</b> takes the place of a noun, so we don't repeat the same name again and again. "Meera has a cat. <b>She</b> loves <b>it</b>."</p>
  <div class="tw"><table><tr><th>Doing the action</th><th>Receiving the action</th><th>Owning something</th></tr><tr><td>I</td><td>me</td><td>my / mine</td></tr><tr><td>you</td><td>you</td><td>your / yours</td></tr><tr><td>he</td><td>him</td><td>his</td></tr><tr><td>she</td><td>her</td><td>her / hers</td></tr><tr><td>it</td><td>it</td><td>its</td></tr><tr><td>we</td><td>us</td><td>our / ours</td></tr><tr><td>they</td><td>them</td><td>their / theirs</td></tr></table></div>
  ${eg('Example 1','"Kabir is tall. <b>He</b> plays basketball." He = Kabir.')}${eg('Example 2','"This book is Riya’s. Give it to <b>her</b>." After a word like <i>to</i> or <i>with</i>, use me, him, her, us, them.')}${eg('Example 3','"Siya and I are friends. <b>We</b> walk to school together."')}${eg('Example 4','"The birds are singing. <b>They</b> are happy." Use <i>it</i> for one thing or animal, <i>they</i> for more than one.')}
  <h4>Watch out</h4><p><b>its</b> (belonging) has no apostrophe: "The dog wagged its tail." <b>it’s</b> means "it is".</p>`,
  sets:[SET('Level 1: he or she?',()=>{const b=Math.random()<.5,n=one(b?BOYS:GIRLS);return gQ(`${n} is reading. ___ likes stories.`,'Which pronoun fits?',b?'He':'She',[b?'She':'He','It','They'],`${n} is a ${b?'boy, so we use He':'girl, so we use She'}.`)}),
   SET('Level 2: him, her, them',()=>{const k=one([['b',BOYS],['g',GIRLS],['p',null]]);if(k[0]==='p'){const a=one(BOYS),c=one(GIRLS);return gQ(`These gifts are for ${a} and ${c}. Please give the gifts to ___.`,'Which pronoun fits?','them',['they','their','him'],`More than one person, after "to": them.`)}const n=one(k[1]),b=k[0]==='b';return gQ(`This bag belongs to ${n}. Please give it to ___.`,'Which pronoun fits?',b?'him':'her',b?['he','his','her']:['she','hers','him'],`After "to" we use ${b?'him':'her'}.`)}),
   SET('Level 3: we and they',()=>{if(Math.random()<.5){const n=one(BOYS.concat(GIRLS));return gQ(`${n} and I are in the same class. ___ sit together.`,'Which pronoun fits?','We',['They','Us','I'],`"${n} and I" includes me, so we use We.`)}const a=one(BOYS),c=one(GIRLS);return gQ(`${a} and ${c} are cousins. ___ live in Pune.`,'Which pronoun fits?','They',['We','Them','He'],'Two other people: They.')}),
   SET('Owning: his, her, their, its',()=>{const k=rnd(0,3);if(k===0){const n=one(BOYS);return gQ(`This is ${n}’s pencil. It is ___ pencil.`,'Which word fits?','his',['him','he','her'],'Something that belongs to a boy: his.')}if(k===1){const n=one(GIRLS);return gQ(`This is ${n}’s pencil. It is ___ pencil.`,'Which word fits?','her',['she','hers','his'],'Something that belongs to a girl: her (before the noun).')}if(k===2)return gQ('The children packed ___ bags.','Which word fits?','their',['there','they','them'],'Belonging to them: their.');return gQ('The dog wagged ___ tail.','Which word fits?','its',['it’s','it','his'],'Belonging to it: its, with no apostrophe.')}),
   SET('Challenge: it or they, and more',()=>{const T=[['The kite is stuck in the tree. ___ is red.','It',['They','He']],['The mangoes are ripe. ___ taste sweet.','They',['It','Them']],['My grandmother tells stories. I love ___ stories.','her',['she','hers']],['Aarav and I won the match. The coach praised ___.','us',['we','our']],['The puppy is hungry. ___ wants milk.','It',['They','She']],['That pen is not yours. It is ___.','mine',['me','my']],['Please call Kabir. I need to talk to ___.','him',['he','his']]];const t=one(T);return gQ(t[0],'Which word fits?',t[1],t[2],`The answer is "${t[1]}".`)})]},
 {n:3,title:'Verbs and tenses',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A <b>verb</b> is a doing word: <i>run, eat, write, sing</i>. <i>Is, am, are, was, were</i> are verbs too. The <b>tense</b> of a verb tells us <b>when</b> something happens.</p>
  <div class="tw"><table><tr><th>Tense</th><th>When</th><th>Example</th><th>Clue words</th></tr><tr><td>Simple present</td><td>Habits, facts</td><td>Riya <b>plays</b> every day.</td><td>every day, always, usually</td></tr><tr><td>Present continuous</td><td>Happening right now</td><td>Riya <b>is playing</b> now.</td><td>now, look!, at the moment</td></tr><tr><td>Simple past</td><td>Already finished</td><td>Riya <b>played</b> yesterday.</td><td>yesterday, last week, ago</td></tr><tr><td>Simple future</td><td>Not yet happened</td><td>Riya <b>will play</b> tomorrow.</td><td>tomorrow, next week, soon</td></tr></table></div>
  <h4>Rules to remember</h4><ul><li>Present with he, she, it or one name: add <b>-s</b> (plays), or <b>-es</b> after s, sh, ch, x, o (catches, goes).</li><li>Regular past: add <b>-ed</b> (walked, cleaned).</li><li>Irregular past: learn by heart: go → went, eat → ate, write → wrote, buy → bought.</li><li>Future: <b>will</b> + the plain verb (will go, never "will goes").</li></ul>
  ${eg('Example 1','"Every day, Kabir <b>goes</b> to school." Every day is a habit, so simple present.')}${eg('Example 2','"Yesterday, Meera <b>ate</b> an apple." Yesterday is finished, so simple past. Not "eated".')}${eg('Example 3','"Look! Siya <b>is swimming</b>." Happening now: is + -ing. Note the double m.')}
  <h4>Watch out</h4><p>Look for the clue word first: it tells you the tense.</p>`,
  sets:[SET('Level 1: simple present',()=>{const v=one(V),n=nm();return gQ(`Every day, ${n} ___ ${v[4]}.`,'Which verb fits?',v[1],[v[0],v[2],v[3]],`"Every day" is a habit. With one person, add -s or -es: ${v[1]}.`)}),
   SET('Level 2: simple past',()=>{const v=one(V.filter(x=>x[0]!=='read')),n=nm();return gQ(`Yesterday, ${n} ___ ${v[4]}.`,'Which verb fits?',v[2],[v[0],v[1],v[0]+'ed'],`"Yesterday" is finished, so past tense: ${v[0]} → ${v[2]}.`)}),
   SET('Level 3: present continuous',()=>{const v=one(V),n=nm();return gQ(`Look! ${n} is ___ ${v[4]} right now.`,'Which verb fits?',v[3],[v[0],v[1],v[2]],`Happening now: is + ${v[3]}.`)}),
   SET('Simple future',()=>{const v=one(V),n=nm();return gQ(`Tomorrow, ${n} ___ ${v[4]}.`,'Which verb fits?','will '+v[0],['will '+v[1],v[2],v[1]],`"Tomorrow" is the future: will + ${v[0]}.`)}),
   SET('Challenge: read the clue word',()=>{const v=one(V.filter(x=>x[0]!=='read')),n=nm(),k=rnd(0,3),C=[['Every day',v[1],'habit, simple present'],['Last Sunday',v[2],'finished, simple past'],['Next week',`will ${v[0]}`,'future: will + verb'],['At the moment,',`is ${v[3]}`,'happening now: is + -ing']][k];
     return gQ(`${C[0]} ${n} ___ ${v[4]}.`,'Which verb fits?',C[1],[v[1],v[2],`will ${v[0]}`,`is ${v[3]}`],`"${C[0].replace(',','')}" means ${C[2]}: ${C[1]}.`)})]},
 {n:4,title:'Adjectives and adverbs',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>An <b>adjective</b> describes a noun: a <b>tall</b> tree, a <b>red</b> kite. An <b>adverb</b> describes a verb, telling <b>how</b> something is done: she sings <b>sweetly</b>.</p>
  <h4>Comparing</h4><div class="tw"><table><tr><th>Word</th><th>Comparing two (-er)</th><th>Comparing three or more (-est)</th></tr><tr><td>tall</td><td>taller</td><td>tallest</td></tr><tr><td>big</td><td>bigger (double the g)</td><td>biggest</td></tr><tr><td>happy</td><td>happier (y → i)</td><td>happiest</td></tr><tr><td>beautiful</td><td>more beautiful</td><td>most beautiful</td></tr><tr><td>good</td><td>better</td><td>best</td></tr><tr><td>bad</td><td>worse</td><td>worst</td></tr></table></div>
  <h4>Making adverbs</h4><p>Most adverbs add <b>-ly</b> to an adjective: quick → quickly, careful → carefully, happy → happily. The special one: good → <b>well</b>.</p>
  ${eg('Example 1','"Riya is <b>taller</b> than Kabir." Two people, so -er + than.')}${eg('Example 2','"Everest is the <b>highest</b> mountain in the world." Comparing many, so the + -est.')}${eg('Example 3','"Kabir writes <b>neatly</b>." <i>Neatly</i> tells how he writes.')}
  <h4>Watch out</h4><p>Never use both: "more taller" and "most biggest" are wrong. Long words take more/most; short words take -er/-est.</p>`,
  sets:[SET('Level 1: find the adjective',()=>{const n=one(NOUNS),a=one(ADJS),v=one(VERBS);return gQ(`The ${a} ${n} ${v}.`,'Which word is the adjective?',a,[n,v],`"${a}" describes the ${n}.`)}),
   SET('Level 2: comparing two',()=>{const a=one(ADJC),s=a[3]==='p'?`${one(GIRLS)} is ___ than ${one(BOYS)}.`:`This box is ___ than that box.`;return gQ(s,`Which word fits? (${a[0]})`,a[1],cmpWrong(a,a[1]),`Comparing two things: ${a[0]} → ${a[1]}.`)}),
   SET('Level 3: comparing many',()=>{const a=one(ADJC),s=a[3]==='p'?`${one(GIRLS)} is the ___ in the class.`:`This is the ___ box of all.`;return gQ(s,`Which word fits? (${a[0]})`,a[2],cmpWrong(a,a[2]).concat([a[1]]),`Comparing three or more: the ${a[2]}.`)}),
   SET('Adverbs: how is it done?',()=>{const a=one(ADV),n=nm();return gQ(`${n} ${a[2]} ___.`,`Which word fits? (${a[0]})`,a[1],[a[0],a[0]+'er',a[0]==='good'?'goodly':a[0]+'est'],`It tells how ${n} ${a[2]}: ${a[1]}.`)}),
   SET('Challenge: mixed',()=>{const k=rnd(0,2);if(k===0){const a=one(ADJC);return gQ(`Of the three bags, this one is the ___.`,`Which word fits? (${a[0]})`,a[2],cmpWrong(a,a[2]).concat([a[1]]),`Three or more: the ${a[2]}.`)}if(k===1){const a=one(ADJC);return gQ(`My kite is ___ than yours.`,`Which word fits? (${a[0]})`,a[1],cmpWrong(a,a[1]),`Two things: ${a[1]}.`)}const a=one(ADV);return gQ(`Please do your work ___.`,`Which word fits? (${a[0]})`,a[1],[a[0],a[0]+'er'],`It tells how to do the work: ${a[1]}.`)})]},
 {n:5,title:'Articles: a, an, the',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p><b>A</b> and <b>an</b> mean "one, any one". <b>The</b> means one particular thing that we both know about.</p>
  <h4>A or an?</h4><p>It depends on the <b>sound</b>, not the letter. Use <b>an</b> before a vowel <b>sound</b> (a, e, i, o, u): <i>an apple, an egg, an umbrella</i>. Use <b>a</b> before a consonant sound: <i>a ball, a mango</i>.</p><div class="tw"><table><tr><th>Tricky word</th><th>Why</th></tr><tr><td><b>an</b> hour, <b>an</b> honest boy</td><td>The h is silent; the word starts with a vowel sound.</td></tr><tr><td><b>a</b> uniform, <b>a</b> unicorn, <b>a</b> university</td><td>The u sounds like "you", a consonant sound.</td></tr><tr><td><b>a</b> one-rupee coin</td><td>"One" starts with a "w" sound.</td></tr></table></div>
  <h4>When to use the</h4><ul><li>Something already mentioned: "I have a dog. <b>The</b> dog is brown."</li><li>Only one exists: <b>the</b> sun, <b>the</b> moon, <b>the</b> earth.</li><li>Rivers, mountain ranges and oceans: <b>the</b> Ganga, <b>the</b> Himalayas.</li><li>With -est words: <b>the</b> tallest boy.</li></ul>
  ${eg('Example 1','"I ate <b>an</b> idli and <b>a</b> banana."')}${eg('Example 2','"We waited for <b>an</b> hour." The h is silent.')}${eg('Example 3','"<b>The</b> sun rises in the east." There is only one sun.')}
  <h4>Watch out</h4><p>Don't use a or an with names of people or cities: "I live in Pune", not "a Pune".</p>`,
  sets:[SET('Level 1: a or an?',()=>{const an=Math.random()<.5,w=an?one(AN.slice(0,10)):one(A1.slice(0,8));return gQ(`___ ${w}`,'A or an?',an?'an':'a',[an?'a':'an'],an?`"${w}" starts with a vowel sound, so "an".`:`"${w}" starts with a consonant sound, so "a".`)}),
   SET('Level 2: a or an in sentences',()=>{const an=Math.random()<.5,w=an?one(AN.slice(0,10)):one(A1.slice(0,8));return gQ(`I can see ___ ${w} in the picture.`,'A or an?',an?'an':'a',[an?'a':'an'],an?`"${w}" starts with a vowel sound: an.`:`"${w}" starts with a consonant sound: a.`)}),
   SET('Level 3: when to use the',()=>{const t=one(THE);return gQ(t[0],'Which word fits?',t[1],t[1]==='The'?['A','An']:['a','an'],'Use "the" for something particular, already mentioned, or the only one.')}),
   SET('Tricky sounds',()=>{const an=Math.random()<.4,w=an?one(['hour','honest boy','umbrella','idli','owl']):one(['uniform','unicorn','university','one-rupee coin','useful book']);return gQ(`___ ${w}`,'A or an?',an?'an':'a',[an?'a':'an'],an?`"${w}" begins with a vowel sound.`:`"${w}" begins with a "y" or "w" sound, which is a consonant sound.`)}),
   SET('Challenge: mixed',()=>Math.random()<.4?(t=>gQ(t[0],'Which word fits?',t[1],t[1]==='The'?['A','An']:['a','an'],'Use "the" for something particular or the only one.'))(one(THE)):(()=>{const an=Math.random()<.5,w=an?one(AN):one(A1);return gQ(`I saw ___ ${w} today.`,'A or an?',an?'an':'a',[an?'a':'an'],`Decide by the first sound of "${w}".`)})())]},
 {n:6,title:'Prepositions',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A <b>preposition</b> shows where something is, when something happens, or where something moves.</p>
  <h4>Place</h4><p><b>in</b> (inside), <b>on</b> (touching the top), <b>under</b>, <b>behind</b>, <b>in front of</b>, <b>between</b> (in the middle of two), <b>over</b> (above).</p>
  <h4>Time</h4><div class="tw"><table><tr><th>Word</th><th>Used with</th><th>Examples</th></tr><tr><td>at</td><td>clock times, night</td><td>at 8 o’clock, at night</td></tr><tr><td>on</td><td>days and dates</td><td>on Monday, on 15 August</td></tr><tr><td>in</td><td>months, seasons, years, parts of the day</td><td>in May, in summer, in 2026, in the morning</td></tr></table></div>
  <h4>Movement</h4><p><b>into</b> (going inside), <b>out of</b>, <b>across</b> (from one side to the other), <b>through</b> (in one end and out the other), <b>up</b>, <b>down</b>.</p>
  ${eg('Example 1','"The fish swims <b>in</b> the water."')}${eg('Example 2','"School starts <b>at</b> 8 o’clock <b>on</b> Monday <b>in</b> June."')}${eg('Example 3','"The frog jumped <b>into</b> the pond." Into shows movement inside.')}
  <h4>Watch out</h4><p><b>in</b> is where something is; <b>into</b> is moving to the inside. "The fish is in the bowl." "The fish jumped into the bowl."</p>`,
  sets:[SET('Level 1: place',()=>{const t=one(PPLACE);return gQ(t[0],'Which word fits?',t[1],t[2],`"${t[1]}" shows the place.`)}),
   SET('Level 2: time (at, on, in)',()=>{const t=one(PTIME);return gQ(t[0],'Which word fits?',t[1],t[2],t[1]==='at'?'"at" for clock times and night.':t[1]==='on'?'"on" for days and dates.':'"in" for months, seasons and parts of the day.')}),
   SET('Level 3: movement',()=>{const t=one(PMOVE);return gQ(t[0],'Which word fits?',t[1],t[2],`"${t[1]}" shows the movement.`)}),
   SET('Mixed: place and time',()=>{const t=one(PPLACE.concat(PTIME));return gQ(t[0],'Which word fits?',t[1],t[2],`The answer is "${t[1]}".`)}),
   SET('Challenge: all prepositions',()=>{const t=one(PPLACE.concat(PTIME,PMOVE));return gQ(t[0],'Which word fits?',t[1],t[2],`The answer is "${t[1]}".`)})]},
 {n:7,title:'Subject and verb agreement',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>The <b>subject</b> (who or what the sentence is about) and the <b>verb</b> must agree. One person or thing takes a singular verb; more than one takes a plural verb.</p>
  <div class="tw"><table><tr><th>One (singular)</th><th>More than one (plural)</th></tr><tr><td>The dog <b>is</b> happy.</td><td>The dogs <b>are</b> happy.</td></tr><tr><td>Kabir <b>has</b> a bike.</td><td>Kabir and Siya <b>have</b> bikes.</td></tr><tr><td>She <b>likes</b> mangoes.</td><td>They <b>like</b> mangoes.</td></tr><tr><td>The bus <b>was</b> late.</td><td>The buses <b>were</b> late.</td></tr></table></div>
  <h4>Special ones</h4><ul><li><b>I am</b>, <b>you are</b>, <b>we are</b>, <b>they are</b>.</li><li><b>I</b> and <b>you</b> take the plain verb: I like, you play.</li><li><b>Everyone</b> is singular: "Everyone <b>is</b> here."</li><li>Two names joined by <b>and</b> are plural: "Riya and Meera <b>are</b> friends."</li></ul>
  ${eg('Example 1','"The children <b>play</b> outside." Children is plural, so no -s on the verb.')}${eg('Example 2','"My sister <b>does</b> her homework." One person: does.')}
  <h4>Watch out</h4><p>Find the real subject first. In "The box of pencils <b>is</b> on the desk", the subject is the box (one), not the pencils.</p>`,
  sets:[SET('Level 1: is or are',()=>{const p=Math.random()<.5,s=p?one(PLS):one(SG),v=AGR[0];return gQ(`${s} ___ ${v[2]}`,'Which verb fits?',p?v[1]:v[0],[p?v[0]:v[1],'am'],p?`"${s}" is more than one: ${v[1]}.`:`"${s}" is one: ${v[0]}.`)}),
   SET('Level 2: has or have, was or were',()=>{const p=Math.random()<.5,s=p?one(PLS):one(SG),v=one([AGR[1],AGR[4]]);return gQ(`${s} ___ ${v[2]}`,'Which verb fits?',p?v[1]:v[0],[p?v[0]:v[1]],p?`"${s}" is more than one: ${v[1]}.`:`"${s}" is one: ${v[0]}.`)}),
   SET('Level 3: action verbs',()=>{const p=Math.random()<.5,s=p?one(PLS):one(SG),v=one([AGR[2],AGR[3],AGR[5],AGR[6]]);return gQ(`${s} ___ ${v[2]}`,'Which verb fits?',p?v[1]:v[0],[p?v[0]:v[1]],p?`"${s}" is more than one: no -s, so ${v[1]}.`:`"${s}" is one: add -s, so ${v[0]}.`)}),
   SET('I, you, everyone',()=>{const T=[['I ___ happy today.','am',['is','are']],['You ___ my best friend.','are',['is','am']],['Everyone ___ ready for the trip.','is',['are','am']],['I ___ mangoes.','like',['likes','liking']],['You ___ very well.','sing',['sings','singing']],['We ___ in the same class.','are',['is','am']],['I ___ a new pencil box.','have',['has','haves']]];const t=one(T);return gQ(t[0],'Which verb fits?',t[1],t[2],`The answer is "${t[1]}".`)}),
   SET('Challenge: mixed',()=>{const p=Math.random()<.5,s=p?one(PLS):one(SG),v=one(AGR);return gQ(`${s} ___ ${v[2]}`,'Which verb fits?',p?v[1]:v[0],[p?v[0]:v[1]],p?`"${s}" is more than one: ${v[1]}.`:`"${s}" is one: ${v[0]}.`)})]},
 {n:8,title:'Punctuation and sentence types',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Punctuation marks help the reader know where a sentence ends and how to read it.</p>
  <div class="tw"><table><tr><th>Sentence type</th><th>What it does</th><th>Ends with</th><th>Example</th></tr><tr><td>Statement</td><td>Tells something</td><td>full stop .</td><td>I like mangoes.</td></tr><tr><td>Question</td><td>Asks something</td><td>question mark ?</td><td>Where do you live?</td></tr><tr><td>Exclamation</td><td>Shows strong feeling</td><td>exclamation mark !</td><td>What a beautiful rainbow!</td></tr><tr><td>Command</td><td>Tells someone to do something</td><td>full stop .</td><td>Please shut the door.</td></tr></table></div>
  <h4>Capital letters</h4><p>Use a capital letter to start every sentence, for the word <b>I</b>, and for proper nouns: names, places, days, months and festivals.</p>
  <h4>Apostrophes</h4><ul><li><b>Belonging:</b> add <b>’s</b>: Riya’s bag, the dog’s bone.</li><li><b>Short forms:</b> the apostrophe shows the missing letters: do not → don’t, I am → I’m, it is → it’s.</li></ul>
  ${eg('Example 1','"can you swim" → "<b>C</b>an you swim<b>?</b>"')}${eg('Example 2','"kabir lives in pune." → "<b>K</b>abir lives in <b>P</b>une."')}${eg('Example 3','"I can not come." → "I <b>can’t</b> come."')}
  <h4>Watch out</h4><p>Questions often start with who, what, where, when, why, how, can, do, is, are. Check before you put a full stop.</p>`,
  sets:[SET('Level 1: which end mark?',()=>{const k=rnd(0,2),s=one([ST,QS,EXS][k]);return gQ(`${s}___`,'Which mark ends this sentence?',['.','?','!'][k],['.','?','!'].filter((x,i)=>i!==k),['It tells something: full stop.','It asks something: question mark.','It shows strong feeling: exclamation mark.'][k])}),
   SET('Level 2: what kind of sentence?',()=>{const k=rnd(0,3),s=one([ST,QS,EXS,CMD][k])+['.','?','!','.'][k],names=['Statement','Question','Exclamation','Command'];return gQ(s,'What kind of sentence is this?',names[k],names.filter((x,i)=>i!==k),['It tells something.','It asks something.','It shows strong feeling.','It tells someone to do something.'][k])}),
   SET('Level 3: capital letters',()=>{const[w,c]=one(CAP),alt=c.replace(/^(\w)/,m=>m.toLowerCase());const mid=c.split(' ').map((x,i)=>i===0?x:x.toLowerCase()).join(' ');return gQ('','Which sentence is written correctly?',c,[w,alt,mid],'Capitals for the first word, I, and names of people, places, days and months.')}),
   SET('Apostrophes',()=>{if(Math.random()<.5){const[l,s,ws]=one(CON2);return gQ('',`What is the short form of "${l}"?`,s,ws,`The apostrophe takes the place of the missing letter: ${l} → ${s}.`)}const[o,t]=one(POSS),O=o[0].toUpperCase()+o.slice(1);return gQ('',`How do we write "the ${t} that belongs to ${o}"?`,`${O}’s ${t}`,[`${O}s ${t}`,`${O} ${t}’s`,`${O}s’ ${t}`],`For belonging, add ’s: ${O}’s ${t}.`)}),
   SET('Challenge: mixed',()=>{const k=rnd(0,3),s=one([ST,QS,EXS,CMD][k]);return gQ(`${lc(s)}___`.replace(/^./,c=>c),`Which is the correct way to write it?`,s+['.','?','!','.'][k],[lc(s)+['.','?','!','.'][k],s+['?','.','.','?'][k]],'Capital letter at the start, and the right mark at the end.')})]},
 {n:9,title:'Joining words (conjunctions)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A <b>conjunction</b> joins words or sentences. Each one has its own job.</p>
  <div class="tw"><table><tr><th>Word</th><th>Job</th><th>Example</th></tr><tr><td>and</td><td>adds</td><td>Riya <b>and</b> Meera are sisters.</td></tr><tr><td>but</td><td>shows a contrast (something unexpected)</td><td>She is small, <b>but</b> she is strong.</td></tr><tr><td>or</td><td>gives a choice</td><td>Tea <b>or</b> milk?</td></tr><tr><td>because</td><td>gives the reason</td><td>I stayed home <b>because</b> I was sick.</td></tr><tr><td>so</td><td>gives the result</td><td>I was hungry, <b>so</b> I ate a banana.</td></tr></table></div>
  ${eg('Example 1: because or so?','Reason first, result second: "It rained, <b>so</b> we stayed in." Result first, reason second: "We stayed in <b>because</b> it rained."')}${eg('Example 2: joining two sentences','"I was tired. I finished my homework." → "I was tired, <b>but</b> I finished my homework."')}
  <h4>Watch out</h4><p>Ask: am I adding, showing a contrast, giving a choice, a reason or a result? That tells you the word.</p>`,
  sets:[SET('Level 1: and, but, or',()=>{const t=one(CJ.filter(x=>['and','but','or'].includes(x[1])));return gQ(t[0],'Which word fits?',t[1],['and','but','or'].filter(x=>x!==t[1]),{and:'It adds: and.',but:'It shows a contrast: but.',or:'It gives a choice: or.'}[t[1]])}),
   SET('Level 2: because or so',()=>{const t=one(CJ.filter(x=>['because','so'].includes(x[1])));return gQ(t[0],'Which word fits?',t[1],['because','so','and'].filter(x=>x!==t[1]),t[1]==='so'?'The second part is the result: so.':'The second part is the reason: because.')}),
   SET('Level 3: all five',()=>{const t=one(CJ);return gQ(t[0],'Which word fits?',t[1],sample(['and','but','or','because','so'].filter(x=>x!==t[1]),3),`The answer is "${t[1]}".`)}),
   SET('Join two sentences',()=>{const t=one(CJJ);return gQ(`${t[0]} ${t[1]}`,'Which word joins these two sentences best?',t[2],['so','but','because'].filter(x=>x!==t[2]),`"${t[0].slice(0,-1)}${t[2]==='because'?'':','} ${t[2]} ${lc(t[1])}"`)}),
   SET('Challenge: mixed',()=>Math.random()<.5?(t=>gQ(t[0],'Which word fits?',t[1],sample(['and','but','or','because','so'].filter(x=>x!==t[1]),3),`The answer is "${t[1]}".`))(one(CJ)):(t=>gQ(`${t[0]} ${t[1]}`,'Which word joins these best?',t[2],['so','but','because'].filter(x=>x!==t[2]),`The answer is "${t[2]}".`))(one(CJJ)))]}
];
const GGUIDE=[
['How to use the grammar chapters',`<p>For Grade 3 and up. Each chapter has a concept page, a rules table, worked examples and 50 practice questions in 5 sets. Teach the rule with the child's own sentences first, then use the practice sets for homework.</p><h4>Rules</h4><ul><li>Say the sentence aloud: most grammar mistakes sound wrong when spoken.</li><li>Look for clue words (yesterday, every day, more than one).</li><li>Wrong answers go into the child's mistake bank and come back before tests.</li></ul><h4>Order</h4><p>Nouns, pronouns, verbs and tenses, adjectives and adverbs, articles, prepositions, agreement, punctuation, conjunctions. Grade 3 children can stop at Level 2 in each chapter.</p>`],
['Nouns',`<p>Start with a "noun hunt" around the room: person, place, animal, thing. Then sort into common and proper with name cards.</p><p><b>Plurals:</b> teach the -s, -es, -ies, -ves rules one at a time; keep a "special plurals" list on the wall (children, men, teeth, mice, sheep).</p><p><b>Watch for:</b> "childrens", "sheeps", "babys".</p>`],
['Pronouns',`<p>Rewrite a short paragraph where a name repeats in every sentence; the child replaces names with pronouns.</p><p><b>Watch for:</b> "Me and Riya went" (should be "Riya and I"), "him is", and its/it's.</p>`],
['Verbs and tenses',`<p>Teach the four tenses with a timeline on the board: yesterday | now | every day | tomorrow. Clue words decide the tense.</p><p><b>Irregular past:</b> 5 a week (went, ate, wrote, bought, caught...). Use them in spoken sentences before writing.</p><p><b>Watch for:</b> "goed", "eated", "will goes", missing -s with he/she.</p>`],
['Adjectives and adverbs',`<p>Use real objects to compare: two pencils (longer), three (longest).</p><p><b>Watch for:</b> "more taller", "gooder", and "He runs quick" (should be quickly).</p>`],
['Articles',`<p>Teach a/an by sound, not spelling: say the word and listen. Practise the tricky ones (hour, honest, uniform, university).</p><p><b>The:</b> already mentioned, the only one, rivers and mountain ranges, and with -est words.</p>`],
['Prepositions',`<p>Act them out with a box and a ball: in, on, under, behind, between. For time, use a calendar: at for times, on for days and dates, in for months and seasons.</p><p><b>Watch for:</b> in/into, and "on night" (should be at night).</p>`],
['Subject and verb agreement',`<p>Underline the subject, decide one or more than one, then choose the verb. Practise with "and" subjects and tricky ones like "everyone", "the box of pencils".</p>`],
['Punctuation and sentence types',`<p>Sort sentence strips into four piles: statement, question, exclamation, command. For capitals, give a paragraph with no capitals and let the child correct it.</p><p><b>Apostrophes:</b> belonging ('s) versus short forms (don't). Watch for its/it's.</p>`],
['Conjunctions',`<p>Give two sentence cards and five conjunction cards; the child joins them and reads aloud. Because versus so is the key contrast: reason or result.</p>`]];
MODS.grammar={name:'English grammar',title:'English grammar: Grade 3 and up',key:'gr',ch:GR,guide:GGUIDE,gnote:'A quick reference for teaching each grammar chapter: how to introduce it, activities, and the mistakes to watch for. The Kids’ self study chapters follow the same order, each with a concept page and 50 practice questions.'};

/* ====== Kids' World: 3D island map ====== */
const THREE_URL='three.min.js';
const AVS=['🦊','🐼','🐯','🐸','🦄','🐵','🐧','🦁'];
const ISL=[{k:'phonics',name:'Letter Island',sub:'English phonics',col:0x2BB3A3,shape:'tree',href:'#phonics'},
 {k:'grammar',name:'Grammar Castle',sub:'English grammar',col:0x8E6BD8,shape:'castle',href:'#grammar'},
 {k:'maths',name:'Number Mountain',sub:'Maths',col:0xF28C38,shape:'mountain',href:'#maths'},
 {k:'bhasha',name:'Akshar Village',sub:'Marathi & Hindi',col:0xE0577A,shape:'village',href:'#bhasha'},
 {k:'pune',name:'Pune Ride',sub:'Map adventure',col:0x2F80C0,shape:'city',href:'#pune'},
 {k:'kids',name:'Mission Arcade',sub:'Quick missions',col:0xF2B93B,shape:'arcade',href:'#kids'}];
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const RM=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
function islProg(i){if(i.k==='pune'){return[pzProg().done.length,PSTOPS.length]}if(i.k==='kids'){let m=0,t=0;GK.forEach(k=>{const s=kid?stat(kid,k):{m:0,total:G[k].items.length};m+=s.m;t+=s.total});return[m,t]}
  const m=MODS[i.k],p=myProg();return[m.ch.filter(c=>chState(p,i.k,c).done).length,m.ch.length]}
function world(){
  if(!triedAuto){triedAuto=true;const sv=ls.get('ct_kid');if(sv)S.login(sv.id,sv.pin).then(s=>{kid=s;kidPin=sv.pin;render()}).catch(()=>{})}
  const av=ls.get('ct_av')||AVS[0];
  return `<section class="kw">
  <div class="kw-hud"><div class="kw-me"><span class="kw-av" aria-hidden="true">${av}</span><div><b>${kid?esc(kid.name):'Explorer'}</b><span>${kid?'★ '+(kid.stars||0)+' stars · '+streak(kid)+' day streak':'<a href="#kids">Pick your name to save your stars</a>'}</span></div></div>
  <div class="kw-avs" role="group" aria-label="Choose your character">${AVS.map(a=>`<button class="kw-avb" data-act="kwav" data-a="${a}" aria-pressed="${a===av}" aria-label="Character ${a}">${a}</button>`).join('')}</div></div>
  <div class="kw-stage" id="kwstage"><canvas id="kwc" role="img" aria-label="Island map. Tap an island to play."></canvas><div id="kwlabels"></div>
  <p class="kw-tip">Drag to spin the map · Tap an island to play</p><p class="kw-flat">The 3D map could not load on this device. Pick an island below.</p></div>
  <h2>Islands</h2><div class="kw-list">${ISL.map(i=>{const[d,t]=islProg(i);return `<a class="kw-card" href="${i.href}" data-act="kwgo" data-k="${i.k}" style="--c:${hex(i.col)}"><b>${i.name}</b><span>${i.sub}</span><span class="kw-bar"><i style="width:${t?d/t*100:0}%"></i></span><span class="kw-prog">${i.k==='kids'?d+' of '+t+' mastered':i.k==='pune'?d+' of '+t+' stamps':d+' of '+t+' badges'}</span></a>`}).join('')}</div></section>`}
let W3=null;
function unmountWorld(){if(W3){cancelAnimationFrame(W3.raf);try{W3.ro.disconnect()}catch(e){}try{W3.r.dispose()}catch(e){}W3=null}}
function loadThree(){return window.THREE?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=THREE_URL;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function mountWorld(){unmountWorld();const st=document.getElementById('kwstage');if(!st)return;
  loadThree().then(()=>{if(view==='world'&&document.getElementById('kwc'))build3d()}).catch(()=>st.classList.add('flat'))}
function addShape(g,shape,col,T,M){const add=(geo,c,x,y,z)=>{const m=new T.Mesh(geo,M(c));m.position.set(x,y,z);g.add(m);return m};
  if(shape==='tree'){add(new T.CylinderGeometry(.12,.16,1,8),0x8B5A2B,-.3,.9,0);add(new T.SphereGeometry(.55,14,10),0x3E9B4F,-.3,1.55,0);add(new T.SphereGeometry(.4,14,10),0x52B862,.15,1.3,.2);add(new T.BoxGeometry(.5,.5,.5),0xFFFFFF,.55,.7,-.4).rotation.y=.4}
  else if(shape==='castle'){add(new T.BoxGeometry(1.2,.9,1),col,0,.9,0);[[-.6,-.5],[.6,-.5],[-.6,.5],[.6,.5]].forEach(([x,z])=>{add(new T.CylinderGeometry(.2,.2,1.3,10),0xD9CFF5,x,1.05,z);add(new T.ConeGeometry(.28,.45,10),col,x,1.9,z)});add(new T.BoxGeometry(.3,.45,.05),0x5A3E9B,0,.7,.53)}
  else if(shape==='mountain'){add(new T.ConeGeometry(1.25,2.2,7),col,0,1.5,0);add(new T.ConeGeometry(.5,.6,7),0xFFFFFF,0,2.35,0)}
  else if(shape==='village'){[[-.6,0,-.2],[.5,0,-.4],[.05,0,.55]].forEach(([x,y,z],i)=>{add(new T.BoxGeometry(.6,.5,.6),[0xFFF1E0,0xFCE4EC,0xFFF8D6][i],x,.7,z);const r=add(new T.ConeGeometry(.5,.45,4),col,x,1.17,z);r.rotation.y=Math.PI/4})}
  else if(shape==='city'){[[-.5,-.3,1.1,0xFFFFFF],[.1,.2,1.6,0xCFE3F5],[.6,-.35,.8,0xFFF1D2]].forEach(([x,z,h,c])=>add(new T.BoxGeometry(.45,h,.45),c,x,.5+h/2,z));add(new T.BoxGeometry(.5,.25,.3),0xF4A300,-.1,.62,.7)}
  else{const t=add(new T.TorusGeometry(.55,.16,10,24),col,0,1.25,0);t.rotation.y=.5;add(new T.SphereGeometry(.25,14,10),0xE0577A,0,1.25,0);add(new T.BoxGeometry(.7,.4,.5),0x123A7A,0,.6,0)}}
function build3d(){const T=THREE,cv=document.getElementById('kwc'),st=document.getElementById('kwstage'),lb=document.getElementById('kwlabels');let r;
  try{r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){st.classList.add('flat');return}
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));const reduce=RM();
  const sc=new T.Scene();sc.fog=new T.Fog(0xCDE9FF,24,44);
  const cam=new T.PerspectiveCamera(42,1,.1,100);cam.position.set(0,10,16);cam.lookAt(0,.5,0);
  sc.add(new T.HemisphereLight(0xffffff,0x5d8fc4,.95));const dl=new T.DirectionalLight(0xffffff,.75);dl.position.set(6,12,8);sc.add(dl);
  const M=c=>new T.MeshLambertMaterial({color:c});
  const sea=new T.Mesh(new T.CircleGeometry(40,64),M(0x5FB0E8));sea.rotation.x=-Math.PI/2;sea.position.y=-.45;sc.add(sea);
  const wg=new T.Group();sc.add(wg);const isl=[],lbls=[];const R=5.8;
  const prev=ls.get('ct_seen')||{},seen={};
  ISL.forEach((d,i)=>{const g=new T.Group(),a=i/ISL.length*Math.PI*2;g.position.set(Math.sin(a)*R,0,Math.cos(a)*R);
    const b=new T.Mesh(new T.CylinderGeometry(1.7,2,.75,28),M(0xF4D9A0));g.add(b);const gr=new T.Mesh(new T.CylinderGeometry(1.62,1.7,.14,28),M(d.col));gr.position.y=.42;g.add(gr);
    addShape(g,d.shape,d.col,T,M);const[dn,tt]=islProg(d),f=tt?dn/tt:0;
    const pole=new T.Mesh(new T.CylinderGeometry(.04,.04,1.8,8),M(0x666666));pole.position.set(1.15,1.35,.35);g.add(pole);
    const flag=new T.Mesh(new T.BoxGeometry(.55,.32,.03),M(dn?0xF2B93B:0xFFFFFF));flag.position.set(1.43,.75+1.2*f,.35);g.add(flag);
    if(!dn){const mist=new T.Mesh(new T.SphereGeometry(1.8,18,12),new T.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.22}));mist.scale.y=.55;mist.position.y=1;g.add(mist)}
    g.userData={d,ph:i*1.3};wg.add(g);isl.push(g);
    const el=document.createElement('button');el.className='kw-lbl';el.type='button';el.style.setProperty('--c',hex(d.col));
    el.innerHTML=`<b>${d.name}</b><span>${d.k==='kids'?dn+'/'+tt+' mastered':d.k==='pune'?dn+'/'+tt+' stamps':dn+'/'+tt+' badges'}</span>`;el.onclick=()=>goIsl(d,g);lb.appendChild(el);lbls.push(el);
    seen[d.k]=dn;if(prev[d.k]!=null&&dn>prev[d.k])el.classList.add('cele')});
  ls.set('ct_seen',seen);
  const clouds=new T.Group();for(let i=0;i<6;i++){const c=new T.Group();for(let j=0;j<3;j++){const s=new T.Mesh(new T.SphereGeometry(.55+Math.random()*.3,12,8),M(0xffffff));s.position.set(j*.6-.6,Math.random()*.2,Math.random()*.3);c.add(s)}
    const a=i/6*Math.PI*2+.4;c.position.set(Math.sin(a)*11,4.5+Math.random()*1.5,Math.cos(a)*11);clouds.add(c)}sc.add(clouds);
  const av=document.createElement('div');av.className='kw-avatar';av.textContent=ls.get('ct_av')||AVS[0];lb.appendChild(av);
  const last=ISL.findIndex(d=>d.k===ls.get('ct_last'));const avPos=new T.Vector3();let hop=null;
  const islTop=g=>{const v=new T.Vector3();g.getWorldPosition(v);v.y+=.6;return v};
  avPos.copy(last>=0?islTop(isl[last]):new T.Vector3(0,.2,0));
  function goIsl(d,g){ls.set('ct_last',d.k);const from=avPos.clone(),to=islTop(g),t0=performance.now();
    if(reduce){nav(d);return}hop={from,to,t0,d}}
  function nav(d){ptab='kids';ps=null;location.hash=d.href}
  const ray=new T.Raycaster(),pt=new T.Vector2();let drag=null,vel=0,moved=0;
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX};moved=0;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;drag.x=e.clientX;moved+=Math.abs(dx);wg.rotation.y+=dx*.008;vel=dx*.008});
  cv.addEventListener('pointerup',e=>{const was=drag;drag=null;if(!was||moved>6)return;const b=cv.getBoundingClientRect();pt.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);
    ray.setFromCamera(pt,cam);const hit=ray.intersectObjects(wg.children,true)[0];if(!hit)return;let o=hit.object;while(o&&!(o.userData&&o.userData.d))o=o.parent;if(o)goIsl(o.userData.d,o)});
  function size(){const w=st.clientWidth,h=st.clientHeight;r.setSize(w,h,false);cam.aspect=w/h;const n=w/h<.8;cam.position.set(0,n?17:10,n?27:16);cam.lookAt(0,.5,0);cam.updateProjectionMatrix()}
  const ro=new ResizeObserver(size);ro.observe(st);size();
  const v=new T.Vector3();
  function frame(now){const t=now/1000;
    if(!drag){if(Math.abs(vel)>.0002){wg.rotation.y+=vel;vel*=.94}else if(!reduce&&!hop)wg.rotation.y+=.0012}
    if(!reduce){isl.forEach(g=>{g.position.y=Math.sin(t*1.1+g.userData.ph)*.09});clouds.rotation.y=t*.02}
    const w=st.clientWidth,h=st.clientHeight;
    isl.forEach((g,i)=>{g.getWorldPosition(v);v.y+=2.9;v.project(cam);const el=lbls[i];el.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px)`;el.style.zIndex=String(Math.round((1-v.z)*1000))});
    if(hop){const k=Math.min(1,(now-hop.t0)/750);const tgt=islTop(isl[ISL.indexOf(hop.d)]);avPos.lerpVectors(hop.from,tgt,k);avPos.y+=Math.sin(k*Math.PI)*2.2;if(k>=1){const d=hop.d;hop=null;nav(d)}}
    else if(last>=0){avPos.copy(islTop(isl[last]))}
    v.copy(avPos);if(!hop&&last<0){v.set(0,.2,0)}v.project(cam);av.style.transform=`translate(-50%,-100%) translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px)`;
    r.render(sc,cam);W3.raf=requestAnimationFrame(frame)}
  W3={r,ro,raf:0};W3.raf=requestAnimationFrame(frame)}
Object.assign(acts,{kwav(d){ls.set('ct_av',d.a);render()},kwgo(d){ls.set('ct_last',d.k);ptab='kids';ps=null;location.hash=(ISL.find(i=>i.k===d.k)||{}).href||'#learn'}});

/* ====== Free starting check ====== */
const CKB={
 g12:{name:'Grades 1–2',skills:[['phonics',1,null,'Hearing sounds in words'],['phonics',2,null,'Letters and their sounds'],['phonics',3,null,'Building short words'],['phonics',4,null,'Letter teams and magic e'],['phonics',5,null,'Tricky sight words'],['maths',1,0,'Adding'],['maths',2,0,'Taking away']]},
 g34:{name:'Grades 3–4',skills:[['maths',1,1,'Addition'],['maths',2,1,'Subtraction'],['maths',6,0,'Multiplication'],['maths',7,0,'Division'],['maths',10,1,'Tables up to 10'],['maths',13,0,'Fractions'],['grammar',1,0,'Nouns'],['grammar',3,0,'Verbs and tenses'],['grammar',5,0,'Articles a, an, the'],['grammar',8,0,'Punctuation']]},
 g5:{name:'Grades 5 and up',skills:[['maths',5,1,'Big-number sums'],['maths',8,1,'Big multiply and divide'],['maths',11,0,'Tables 11 to 20'],['maths',12,0,'LCM and HCF'],['maths',14,0,'Fraction operations'],['grammar',3,2,'Verbs and tenses'],['grammar',6,0,'Prepositions'],['grammar',7,0,'Subject–verb agreement'],['grammar',9,0,'Joining words']]}};
const CK_BH=[['bhasha',1,0,'Marathi/Hindi vowels'],['bhasha',4,0,'Matras'],['bhasha',6,0,'Reading Devanagari words']];
let ck=null;
function ckQs(m,n,s){const c=MODS[m].ch[n-1];const all=s!=null&&c.sets?c.sets[Math.min(s,c.sets.length-1)].make():c.make();return all.slice(0,2)}
function ckStart(band,bh,name){const sk=CKB[band].skills.concat(bh?CK_BH:[]);const q=[];
  sk.forEach((x,i)=>ckQs(x[0],x[1],x[2]).forEach(a=>q.push(Object.assign({},a,{sk:i}))));
  ck={band,bh,name,sk,q,i:0,res:sk.map(()=>0),input:'',built:[],phase:'ask'}}
function check(){
  if(!ck){const last=ls.get('ct_check');return `<section class="card stack ckhero"><h1>Free starting check</h1>
  <p>About 10 minutes. Your child answers short questions on their own, and you get a clear picture straight away: what they are strong in, and what to work on next.</p>
  <ul class="ckpts"><li>No sign-up, nothing to pay</li><li>Results stay on this device</li><li>Send the results to Chetana in one tap if you want her advice</li></ul></section>
  <section class="card stack"><label class="fld"><span>Child’s first name (optional)</span><input id="ckname" maxlength="30" autocomplete="off" value="${kid?esc(kid.name):''}"></label>
  <fieldset class="fld"><legend>Which class is your child in?</legend><div class="row">${Object.keys(CKB).map((k,i)=>`<label class="ckband"><input type="radio" name="ckb" value="${k}"${i===0?' checked':''}> ${CKB[k].name}</label>`).join('')}</div></fieldset>
  <label class="ckband"><input type="checkbox" id="ckbh"> Also check Marathi/Hindi reading</label>
  <p class="small muted">Tip: sit with your child, read questions aloud if needed, but let them choose the answer. “I don’t know yet” is a fine answer.</p>
  <button class="btn go big" data-act="ckgo">Start the check</button>
  ${last?`<p class="small"><a href="#check" data-act="cklast">See the last result (${esc(last.name||'child')}, ${esc(last.date)})</a></p>`:''}</section>`}
  if(ck.phase==='done')return ckReport(ck.result);
  const a=ck.q[ck.i];let body;
  if(a.kind==='pick')body=`<div class="opts">${a.opts.map(o=>`<button class="btn ${o.cls}" data-act="ckans" data-v="${esc(o.v)}">${o.h}</button>`).join('')}</div>`;
  else if(a.kind==='num')body=`<div class="ans" aria-live="polite">${esc(ck.input)||' '}</div><div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="ckd" data-d="${d}">${d}</button>`).join('')}<button class="btn" data-act="ckb" aria-label="Delete">⌫</button><button class="btn" data-act="ckd" data-d="0">0</button><button class="btn go" data-act="ckok">OK</button></div>`;
  else{const left=a.tiles.map((t,i)=>i).filter(i=>ck.built.indexOf(i)<0);
   body=`<div class="tiles slot">${ck.built.map((i,j)=>`<button class="tile" data-act="ckun" data-j="${j}">${esc(a.tiles[i])}</button>`).join('')||'<span class="muted small">Tap the tiles below</span>'}</div><div class="tiles">${left.map(i=>`<button class="tile" data-act="cktile" data-i="${i}">${esc(a.tiles[i])}</button>`).join('')}</div><button class="btn go" data-act="ckcheck">Done</button>`}
  return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">Starting check · ${esc(ck.sk[a.sk][3])}</h3><span class="pill">${ck.i+1} of ${ck.q.length}</span></div>
  <div class="bar"><i style="width:${ck.i/ck.q.length*100}%"></i></div>${a.show?`<div class="showbox">${a.show}</div>`:''}
  <div class="ask">${esc(a.ask)} ${canSay&&a.say?`<button class="btn" data-act="cksay">Hear it</button>`:''}</div>${body}
  <button class="btn ghost" data-act="ckskip">I don’t know yet</button></section>`}
function ckMark(ok){if(ok)ck.res[ck.q[ck.i].sk]++;ck.i++;ck.input='';ck.built=[];
  if(ck.i>=ck.q.length){const r={name:ck.name,band:ck.band,date:new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),sk:ck.sk.map((x,i)=>({t:x[3],m:x[0],n:x[1],s:ck.res[i]}))};ls.set('ct_check',r);ck.result=r;ck.phase='done'}
  render();window.scrollTo(0,0)}
function ckLead(r){const tot=r.sk.reduce((a,x)=>a+x.s,0),pick=n=>r.sk.filter(x=>x.s===n).map(x=>x.t).join(', ')||'-';
  return{id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),parent:'(from starting check)',child:r.name||'',grade:CKB[r.band].name,source:'Starting check',
    note:'Score '+tot+'/'+r.sk.length*2+' on '+r.date+'. Strong: '+pick(2)+'. Getting there: '+pick(1)+'. Needs work: '+pick(0)}}
document.addEventListener('click',e=>{const a=e.target.closest('a[data-lead="check"]');if(a&&ck&&ck.result&&!ck.sent){ck.sent=true;S.lead(ckLead(ck.result)).catch(()=>{})}});
function ckReport(r){const g=r.sk.filter(x=>x.s===2),d=r.sk.filter(x=>x.s===1),w=r.sk.filter(x=>x.s===0),tot=r.sk.reduce((a,x)=>a+x.s,0),max=r.sk.length*2;
  const who=r.name?esc(r.name):'Your child';
  const head=tot/max>=.8?`${who} is ready for a challenge`:tot/max>=.5?`${who} has a good base to build on`:`${who} will grow fast with the right start`;
  const li=(a,cls)=>a.map(x=>`<li class="${cls}"><span>${esc(x.t)}</span><a href="#${x.m}" data-act="ckch" data-m="${x.m}" data-n="${x.n}">Practise</a></li>`).join('');
  const txt=`Hi Chetana, I did the free starting check for ${r.name||'my child'} (${CKB[r.band].name}) on ${r.date}. Score ${tot}/${max}.\nStrong: ${g.map(x=>x.t).join(', ')||'-'}\nGetting there: ${d.map(x=>x.t).join(', ')||'-'}\nNeeds work: ${w.map(x=>x.t).join(', ')||'-'}\nCould we talk about a plan and a free demo class?`;
  return `<section class="card stack center ckres"><p class="small muted">${esc(CKB[r.band].name)} · ${esc(r.date)}</p><h1>${head}</h1>
  <div class="ckring" style="--p:${tot/max*100}"><b>${tot}</b><span>of ${max}</span></div>
  <p class="muted">This is a quick snapshot from ${max} questions, not an exam. It shows where to start.</p></section>
  <div class="ckgrid">
   <section class="card stack"><h2>🌟 Strong</h2><ul class="cklist">${li(g,'g')||'<li class="muted">Nothing yet, and that is fine.</li>'}</ul></section>
   <section class="card stack"><h2>🌱 Getting there</h2><ul class="cklist">${li(d,'d')||'<li class="muted">None</li>'}</ul></section>
   <section class="card stack"><h2>🎯 Start here</h2><ul class="cklist">${li(w,'w')||'<li class="muted">No weak spots in this check!</li>'}</ul></section></div>
  <section class="card stack ckcta"><h2>Want a plan from Chetana?</h2><p>Send these results on WhatsApp. She will suggest where to begin and fix a free demo class.</p>
  <div class="row"><a class="btn go big" href="https://wa.me/919730195429?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" data-lead="check">Send results on WhatsApp</a><a class="btn" href="#world">Practise in Kids’ World</a><button class="btn ghost" data-act="ckagain">Check again</button></div></section>`}
Object.assign(acts,{
 ckgo(){const b=(document.querySelector('input[name=ckb]:checked')||{}).value||'g12';ckStart(b,document.getElementById('ckbh').checked,(document.getElementById('ckname').value||'').trim().slice(0,30));render();window.scrollTo(0,0)},
 cklast(){ck={phase:'done',result:ls.get('ct_check')};render()},
 ckagain(){ck=null;render();window.scrollTo(0,0)},
 ckans(d){ckMark(d.v===ck.q[ck.i].a)},
 ckd(d){if(ck.input.length<7){ck.input+=d.d;render()}},ckb(){ck.input=ck.input.slice(0,-1);render()},
 ckok(){if(ck.input)ckMark(String(parseInt(ck.input,10))===ck.q[ck.i].a)},
 cktile(d){ck.built.push(+d.i);render()},ckun(d){ck.built.splice(+d.j,1);render()},
 ckcheck(){const a=ck.q[ck.i];if(ck.built.length)ckMark(ck.built.map(i=>a.tiles[i]).join('|')===a.target.join('|'))},
 ckskip(){ckMark(false)},cksay(){const q=ck.q[ck.i];say(q.say,q.lang)},
 ckch(d){ptab='kids';ps={mod:d.m,ch:+d.n,phase:'learn'};cm=d.m;location.hash=d.m}});

/* ====== Pune Ride: map adventure ====== */
const PSTOPS=[
 {id:'hinj',name:'Hinjawadi',e:'🏢',x:46,y:104,fact:'Hinjawadi is home to the Rajiv Gandhi Infotech Park, where thousands of people build software every day. Your ride across Pune starts here!',g:'signal',job:'Help the traffic police at the IT Park signal'},
 {id:'uni',name:'Pune University',e:'🎓',x:122,y:128,fact:'Pune is called the “Oxford of the East” because so many students come here to study. The university’s main building looks like a palace!',g:'jam',job:'Clear the traffic jam at University Circle'},
 {id:'pat',name:'Pataleshwar Caves',e:'🪨',x:138,y:204,fact:'Pataleshwar is a cave temple carved out of one single rock more than 1,000 years ago, right in the middle of the city.',g:'sign',job:'Fix the broken road signs'},
 {id:'shan',name:'Shaniwar Wada',e:'🏰',x:214,y:156,fact:'Shaniwar Wada was the palace of the Peshwas, built in the 1730s. “Shaniwar” means Saturday: its first stone was laid on a Saturday!',g:'compass',job:'Guide lost tourists with the compass'},
 {id:'aga',name:'Aga Khan Palace',e:'🕊️',x:306,y:98,fact:'Mahatma Gandhi and Kasturba Gandhi were kept here during the freedom struggle (1942–44). Today it is a peaceful museum and garden.',g:'clock',job:'Help the bus driver keep time'},
 {id:'dagdu',name:'Dagdusheth Ganpati',e:'🐘',x:262,y:214,fact:'This famous Ganpati temple was started by a sweet-maker called Dagdusheth Halwai. During Ganeshotsav, lakhs of people visit.',g:'fare',job:'Work out the auto fares'},
 {id:'saras',name:'Saras Baug',e:'🌳',x:196,y:262,fact:'Saras Baug has a Ganpati temple on a little island, surrounded by gardens. A favourite spot for evening bhel!',g:'jam',job:'Beat the evening traffic jam'},
 {id:'parv',name:'Parvati Hill',e:'⛰️',x:150,y:312,fact:'Parvati Hill has temples at the top and over 100 steps to climb. From the top you can see the whole city.',g:'signal',job:'Count the climbers and cars'},
 {id:'katraj',name:'Katraj Zoo',e:'🐯',x:226,y:404,fact:'The Rajiv Gandhi Zoological Park at Katraj has tigers, elephants and a famous snake park.',g:'fare',job:'Buy zoo tickets for the family'},
 {id:'khad',name:'Khadakwasla Dam',e:'💧',x:86,y:330,fact:'Khadakwasla Dam stores the water that Pune drinks. The Mutha river flows from here into the city, where it meets the Mula river.',g:'clock',job:'Time the water tanker trips'},
 {id:'sinh',name:'Sinhagad Fort',e:'🦁',x:52,y:432,fact:'Sinhagad means “Lion’s Fort”. Tanaji Malusare climbed its steep cliffs in 1670 in a brave night battle. Try the pithla bhakri at the top!',g:'compass',job:'Find the way up the fort'}];
const PGAMES={
 signal:{t:'Traffic police',e:'👮',how:'The constable needs your help. Solve the sum to turn the light green!',make(){const k=rnd(0,2);
   if(k===0){const r=rnd(2,6),c=rnd(3,9);return{ask:`${r} lanes have ${c} cars each. How many cars are waiting?`,a:r*c,show:`<div class="pz-cars">${('🚗'.repeat(c)+'<br>').repeat(r)}</div>`}}
   if(k===1){const a=rnd(12,48),b=rnd(5,30);return{ask:`${a} scooters crossed, then ${b} more. How many crossed in all?`,a:a+b,show:'🛵🛵🛵'}}
   const t=rnd(30,90),g=rnd(8,t-10);return{ask:`${t} vehicles are waiting. ${g} have gone. How many are still waiting?`,a:t-g,show:'🚦'}}},
 fare:{t:'Auto fare',e:'🛺',how:'Rickshaw-wale kaka needs help with money. Work out the rupees!',make(){const k=rnd(0,2);
   if(k===0){const f=one([25,30]),p=one([10,12,15]),km=rnd(2,6);return{ask:`Auto fare: ₹${f} for the first km, then ₹${p} for every km after. How much for ${km} km?`,a:f+p*(km-1),pre:'₹'}}
   if(k===1){const c=rnd(3,9)*5,n=one([50,100]);return{ask:`The fare is ₹${c}. You pay with a ₹${n} note. How much change?`,a:n-c,pre:'₹'}}
   const t=one([20,30,40,50]),n=rnd(2,5);return{ask:`Zoo tickets cost ₹${t} each. ${n} people are going. Total cost?`,a:t*n,pre:'₹'}}},
 clock:{t:'Bus timer',e:'🚌',how:'The PMPML bus must be on time. Work out the clock time!',make(){const h=rnd(1,11),m=one([0,10,15,20,30,40,45]),d=one([15,20,25,30,35,40,45,50]);
   const f=(H,M)=>{H=((H-1)%12)+1;return H+':'+String(M).padStart(2,'0')};const t=h*60+m+d,ans=f(Math.floor(t/60),t%60);
   const opts=new Set([ans]);while(opts.size<4){const x=t+one([-10,-5,5,10,60,-60]);opts.add(f(Math.floor(x/60),((x%60)+60)%60))}
   return{ask:`The bus leaves at ${f(h,m)}. The ride takes ${d} minutes. What time does it arrive?`,a:ans,opts:shuffle([...opts]),show:'🕒'}}},
 compass:{t:'Compass guide',e:'🧭',how:'Tourists are lost! Use the compass on the map to point the way.',make(){
   const P=PSTOPS.filter(s=>s.id!=='hinj');const a=one(P);let b=one(P);while(b===a)b=one(P);
   const dx=b.x-a.x,dy=b.y-a.y,ns=dy<-25?'North':dy>25?'South':'',ew=dx>25?'East':dx<-25?'West':'';const ans=(ns+(ns&&ew?'-':'')+ew.toLowerCase().replace(/^./,c=>ns?c:c.toUpperCase()))||null;
   if(!ans)return this.make();
   const all=['North','South','East','West','North-east','North-west','South-east','South-west'];const o=new Set([ans]);while(o.size<4)o.add(one(all));
   return{ask:`You are at ${a.name}. Which way is ${b.name}? (Look at the map: north is up.)`,a:ans,opts:shuffle([...o]),show:`${a.e} ➡️ ${b.e}`}}},
 sign:{t:'Sign fixer',e:'🪧',how:'Rain washed letters off the road signs. Pick the missing letter!',make(){
   const w=one(['STOP','LEFT','RIGHT','BRIDGE','RIVER','SCHOOL','BUS STOP','SLOW','FORT','TEMPLE','GARDEN','STATION','HOSPITAL','PARKING']);
   const idx=[...w].map((c,i)=>c===' '?-1:i).filter(i=>i>=0),i=one(idx),L=w[i];const o=new Set([L]);while(o.size<4)o.add(String.fromCharCode(65+rnd(0,25)));
   return{ask:'Which letter is missing from this sign?',a:L,opts:shuffle([...o]),show:`<span class="pz-sign">${esc(w.slice(0,i))}<u>?</u>${esc(w.slice(i+1))}</span>`}}},
 jam:{t:'Jam buster',e:'🚗',how:'Cars can only leave in order. Tap them from the smallest number to the biggest!',jam:true}};
let pz=null;
const pzProg=()=>ls.get('ct_pune')||{done:[],at:0};
function puneMap(pr){const pts=PSTOPS.map(s=>s.x+','+s.y).join(' ');const cur=PSTOPS[Math.min(pr.at,PSTOPS.length-1)];
 return `<div class="pz-map"><svg viewBox="0 0 360 480" role="img" aria-label="Map of Pune with ${PSTOPS.length} stops">
 <rect width="360" height="480" fill="#EFE6CF"/>
 <path d="M10 470 C40 400 30 380 70 340 S120 300 150 260 S170 200 180 190" fill="none" stroke="#7FB8D8" stroke-width="9" stroke-linecap="round"/>
 <path d="M0 150 C60 160 100 140 140 160 S170 190 180 190 S240 170 300 150 S340 140 360 135" fill="none" stroke="#7FB8D8" stroke-width="9" stroke-linecap="round"/>
 <text x="40" y="380" class="pz-riv">Mutha</text><text x="250" y="148" class="pz-riv">Mula-Mutha</text><text x="60" y="160" class="pz-riv">Mula</text>
 <ellipse cx="70" cy="445" rx="55" ry="30" fill="#B9CF9A"/><ellipse cx="175" cy="300" rx="28" ry="18" fill="#B9CF9A"/><ellipse cx="88" cy="335" rx="30" ry="14" fill="#9CCBE3"/>
 <polyline points="${pts}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#8B5E34" stroke-width="2" stroke-dasharray="6 6"/>
 <g class="pz-comp" transform="translate(320,40)"><circle r="20" fill="#fff" stroke="#1F3B2D"/><path d="M0-15 L5 0 L0 15 L-5 0Z" fill="#E2583E"/><text y="-23" text-anchor="middle">N</text></g>
 ${PSTOPS.map((s,i)=>{const done=pr.done.indexOf(s.id)>=0,open=i<=pr.at;return `<g class="pz-stop${done?' done':''}${open?'':' locked'}" data-act="pzstop" data-i="${i}" tabindex="0" role="button" aria-label="${s.name}${done?', done':open?'':', locked'}">
  <circle cx="${s.x}" cy="${s.y}" r="17"/><text x="${s.x}" y="${s.y+6}" text-anchor="middle" class="pz-em">${open?s.e:'🔒'}</text>
  <text x="${s.x}" y="${s.y+31}" text-anchor="middle" class="pz-lb">${s.name}</text>${done?`<text x="${s.x+13}" y="${s.y-11}" class="pz-star">⭐</text>`:''}</g>`}).join('')}
 </svg><div class="pz-auto" id="pzauto" style="left:${cur.x/360*100}%;top:${cur.y/480*100}%">🛺</div></div>`}
function pune(){const pr=pzProg();
 if(pz&&pz.phase!=='map'){const s=PSTOPS[pz.i],G=PGAMES[s.g];
  if(pz.phase==='fact')return `<section class="card stack pz-fact"><div class="row"><span class="pz-big">${s.e}</span><div><p class="small muted">Stop ${pz.i+1} of ${PSTOPS.length}</p><h1>${s.name}</h1></div></div>
   <div class="pz-did"><b>Did you know?</b> ${s.fact}</div>
   <div class="pz-job"><span>${G.e}</span><div><b>Your job: ${s.job}</b><p>${G.how}</p></div></div>
   <div class="row"><button class="btn go big" data-act="pzplay">Let’s go!</button><button class="btn" data-act="pzmap">Back to map</button></div></section>`;
  if(pz.phase==='done'){const win=pz.right>=4,next=PSTOPS[pz.i+1];return `<section class="card stack center"><span class="pz-big">${win?'🏅':'💪'}</span><h1>${win?s.name+' stamp earned!':'Nearly there!'}</h1>
   <div class="stars">${'<span>★</span>'.repeat(pz.right)}</div><p class="muted">${pz.right} of 5 ${win?(next?`The road to <b>${next.name}</b> is open!`:'You have ridden all across Pune. Champion!'):'Get 4 or more to earn the stamp and unlock the next stop.'}</p>
   <div class="row" style="justify-content:center">${win?'':`<button class="btn go" data-act="pzplay">Try again</button>`}<button class="btn ${win?'go':''}" data-act="pzmap">Back to map</button></div></section>`}
  const top=`<div class="row"><h3 style="margin-right:auto">${G.e} ${G.t} · ${s.name}</h3><span class="pill">${pz.n+1} of 5</span><button class="btn ghost" data-act="pzmap">Stop</button></div><div class="bar"><i style="width:${pz.n/5*100}%"></i></div>`;
  const fb=pz.fb?`<div class="fb ${pz.fb[0]?'ok':'bad'}" role="status"><b>${pz.fb[0]?'Brilliant!':'Not quite.'}</b> ${pz.fb[1]}</div><button class="btn go" data-act="pznext">Next</button>`:'';
  if(G.jam){const j=pz.q;return `<section class="card stack">${top}<div class="ask">${G.how}</div>
   <div class="pz-road">${j.cars.map((c,k)=>j.gone.indexOf(k)>=0?`<span class="pz-car gone"></span>`:`<button class="pz-car" data-act="pzcar" data-k="${k}" style="--h:${c.h}" ${pz.fb?'disabled':''}><span>🚗</span><b>${c.v}</b></button>`).join('')}</div>
   <p class="small muted">${j.gone.length} of ${j.cars.length} cars cleared</p>${fb}</section>`}
  const q=pz.q;const opts=q.opts||(()=>{const o=new Set([q.a]);while(o.size<4){const d=q.a+one([-10,-5,-2,-1,1,2,5,10]);if(d>0)o.add(d)}return shuffle([...o])})();q.opts=opts;
  return `<section class="card stack">${top}${q.show?`<div class="showbox">${q.show}</div>`:''}<div class="ask">${esc(q.ask)}</div>
   ${pz.fb?fb:`<div class="opts">${opts.map(o=>`<button class="btn ${String(o).length>4?'txt':''}" data-act="pzans" data-v="${esc(String(o))}">${q.pre||''}${esc(String(o))}</button>`).join('')}</div>`}</section>`}
 const n=pr.done.length;
 return `<section class="pz-head"><div><h1>Pune Ride</h1><p>Hop in the auto! Ride across Pune, learn a fact at every stop, and solve puzzles to beat the traffic.</p></div><div class="pz-pass"><b>${n}</b><span>of ${PSTOPS.length} stamps</span></div></section>
 ${puneMap(pr)}
 <p class="small muted center">Tap the next stop to ride there. Each stop has a fact and a 5-puzzle job. Get 4 right to earn its stamp.</p>
 <section class="card stack"><h2>My Pune passport</h2><div class="pz-stamps">${PSTOPS.map(s=>`<div class="pz-stamp${pr.done.indexOf(s.id)>=0?' got':''}"><span>${pr.done.indexOf(s.id)>=0?s.e:'?'}</span><small>${s.name}</small></div>`).join('')}</div>
 ${n?`<button class="btn ghost" data-act="pzreset">Start the ride again</button>`:''}</section>`}
function pzNewQ(){const G=PGAMES[PSTOPS[pz.i].g];if(G.jam){const N=Math.min(4+Math.floor(pz.n/2)+1,7),base=rnd(1,40),vals=new Set();while(vals.size<N)vals.add(base+rnd(0,N*6));
  pz.q={cars:shuffle([...vals]).map(v=>({v,h:rnd(0,360)})),gone:[]}}else pz.q=G.make()}
function pzAnswer(ok,txt){if(ok)pz.right++;pz.fb=[ok,txt];render()}
Object.assign(acts,{
 pzstop(d){const pr=pzProg(),i=+d.i;if(i>pr.at)return;const go=()=>{pz={i,phase:'fact'};render();window.scrollTo(0,0)};
  const el=document.getElementById('pzauto'),s=PSTOPS[i];if(el&&!RM()){el.style.left=s.x/360*100+'%';el.style.top=s.y/480*100+'%';setTimeout(go,750)}else go()},
 pzplay(){pz.phase='play';pz.n=0;pz.right=0;pz.fb=null;pzNewQ();render()},
 pzmap(){pz=null;render()},
 pzans(d){const q=pz.q;if(pz.fb)return;const ok=d.v===String(q.a);pzAnswer(ok,ok?'':'The answer is '+(q.pre||'')+q.a+'.')},
 pzcar(d){const j=pz.q,k=+d.k,left=j.cars.map((c,i)=>i).filter(i=>j.gone.indexOf(i)<0),min=Math.min(...left.map(i=>j.cars[i].v));
  if(j.cars[k].v===min){j.gone.push(k);if(j.gone.length===j.cars.length)pzAnswer(true,'Road cleared!');else render()}
  else pzAnswer(false,`Car ${min} had to go first. Look for the smallest number each time.`)},
 pznext(){pz.n++;pz.fb=null;if(pz.n>=5){pz.phase='done';if(pz.right>=4){const pr=pzProg(),s=PSTOPS[pz.i];if(pr.done.indexOf(s.id)<0)pr.done.push(s.id);pr.at=Math.max(pr.at,Math.min(pz.i+1,PSTOPS.length-1));ls.set('ct_pune',pr);if(kid){kid.stars=(kid.stars||0)+pz.right;saveKid()}}}else pzNewQ();render()},
 pzreset(){ls.set('ct_pune',{done:[],at:0});render()}});

/* ====== Teacher console v2: Today, Students, Batches, Fees, Leads ====== */
let tdate=today(),tcls=null,tmonth=today().slice(0,7),tedit=null;
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const BOARDS=['','State','CBSE','ICSE','Other'];
const T=k=>(tdata&&tdata[k])||[];
const active=()=>T('students').filter(s=>s.status!=='left');
const waNum=p=>{let d=String(p||'').replace(/\D/g,'');if(d.length===10)d='91'+d;return d.length>=11?d:''};
const waLink=(p,t)=>{const n=waNum(p);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(t):''};
const rupee=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const monthName=m=>{const[y,mm]=m.split('-');return new Date(+y,+mm-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})};
const dayOf=d=>new Date(d+'T00:00').getDay();
const prettyDate=d=>new Date(d+'T00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
const batchOf=s=>T('batches').find(b=>b.id===s.batch);
const inBatch=b=>active().filter(s=>s.batch===b.id).sort((a,c)=>a.name.localeCompare(c.name));
const clsId=(b,d)=>'c_'+b+'_'+d;
const feeRec=(s,m)=>T('fees').find(f=>f.id==='f_'+s.id+'_'+m);
function attend(s,m){const cs=T('classes').filter(c=>c.date.slice(0,7)===m&&((c.present||[]).indexOf(s.id)>=0||(c.absent||[]).indexOf(s.id)>=0));
  return{p:cs.filter(c=>c.present.indexOf(s.id)>=0).length,t:cs.length}}
function tPutK(kind,o){return S.tPut(tpin,kind,o).then(r=>{tdata[kind]=tdata[kind]||[];const i=tdata[kind].findIndex(x=>x.id===o.id);if(i<0)tdata[kind].push(o);else tdata[kind][i]=o;msg='';render();return r}).catch(tfail)}
function tDelK(kind,id){return S.tDel(tpin,kind,id).then(()=>{tdata[kind]=T(kind).filter(x=>x.id!==id);armed=null;msg='';render()}).catch(tfail)}

function teacher(){
  if(!tdata){const first=!SYNC_URL&&!db().tpin;return pad(first?'Choose a teacher PIN':'Teacher PIN',first?'6 digits or more. Remember it: it protects this page.':'',true)}
  const tabs=[['today','Today'],['students','Students'],['batches','Batches'],['fees','Fees'],['enquiries','Leads'],['help','Setup']];
  const body=tview==='today'?todayView():tview==='students'?(tsel?studentDetail():studentList()):tview==='batches'?batchesView():tview==='fees'?feesView():tview==='enquiries'?enquiries():help();
  return `<section class="stack"><div class="row"><h1 style="margin-right:auto">Teacher console</h1><button class="btn ghost" data-act="tlock">Lock</button></div>
  <div class="tabs tc-tabs">${tabs.map(([k,l])=>`<button class="btn" data-act="ttab" data-t="${k}" aria-pressed="${tview===k}">${l}</button>`).join('')}</div>
  ${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}</section>${body}`}

/* ---------- Today ---------- */
function todayView(){if(tcls)return classLog();
  const wd=dayOf(tdate),bs=T('batches').filter(b=>(b.days||[]).indexOf(wd)>=0).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const m=tdate.slice(0,7),feeDue=active().filter(s=>+s.fee>0&&!(feeRec(s,m)||{}).paid),newL=T('enquiries').filter(e=>e.status==='New'||e.status==='Demo booked');
  const other=T('batches').filter(b=>bs.indexOf(b)<0);
  return `<section class="card stack"><div class="row"><h2 style="margin-right:auto">${prettyDate(tdate)}</h2>
   <button class="btn" data-act="tday" data-d="-1" aria-label="Previous day">‹</button><input type="date" value="${tdate}" data-change="tdate" aria-label="Pick a date" style="width:auto"><button class="btn" data-act="tday" data-d="1" aria-label="Next day">›</button></div>
  ${bs.length?bs.map(b=>{const c=T('classes').find(x=>x.id===clsId(b.id,tdate)),n=inBatch(b).length;return `<div class="tc-class${c?' logged':''}"><div class="grow"><b>${esc(b.time||'')} · ${esc(b.name)}</b>
     <div class="small muted">${n} student${n===1?'':'s'} · ${b.mode==='online'?'Online':'In person'}${c?` · ✅ ${c.present.length}/${(c.present.length+c.absent.length)} present${c.topic?' · '+esc(c.topic):''}`:''}</div></div>
     ${b.mode==='online'&&b.link?`<a class="btn" href="${esc(b.link)}" target="_blank" rel="noopener">Open Meet</a>`:''}<button class="btn ${c?'':'go'}" data-act="topencls" data-b="${b.id}">${c?'Edit log':'Take attendance'}</button></div>`}).join('')
   :`<p class="muted">${T('batches').length?'No regular classes on this day.':'Add your batches in the <b>Batches</b> tab, and they will show here on their days.'}</p>`}
  ${other.length?`<div class="row"><label class="grow">Extra or make-up class<select id="tc-extra">${other.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label><button class="btn" data-act="textra">Log it</button></div>`:''}</section>
  <section class="tc-stats"><button class="card center tc-stat" data-act="ttab" data-t="fees"><div class="stat">${feeDue.length}</div><div class="muted small">fees pending for ${monthName(m).split(' ')[0]}</div></button>
   <button class="card center tc-stat" data-act="ttab" data-t="enquiries"><div class="stat">${newL.length}</div><div class="muted small">leads to follow up</div></button>
   <button class="card center tc-stat" data-act="ttab" data-t="students"><div class="stat">${active().length}</div><div class="muted small">active students</div></button></section>
  ${newL.slice(0,3).length?`<section class="card stack"><h3>Follow up today</h3>${newL.slice(0,3).map(e=>{const l=waLink(e.phone,`Hello ${e.parent}, this is Chetana from Chetana’s Tutoring. Following up about classes for your child. When would suit you for a free demo?`);return `<div class="item"><div class="grow"><b>${esc(e.parent)}</b> <span class="small muted">${esc(e.status)} · ${esc(e.date)}</span>${e.note?`<div class="small">${esc(e.note)}</div>`:''}</div>${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`}).join('')}</section>`:''}`}

function classLog(){const b=T('batches').find(x=>x.id===tcls);if(!b){tcls=null;return todayView()}
  const id=clsId(b.id,tdate),c=T('classes').find(x=>x.id===id)||{},ss=inBatch(b),abs=c.absent||[],notes=c.notes||{};
  return `<div class="row"><button class="btn" data-act="tclose">← Today</button></div>
  <form class="card stack" data-form="savecls"><h2>${esc(b.name)}</h2><p class="muted">${prettyDate(tdate)} · ${esc(b.time||'')}</p>
  <fieldset class="fld"><legend>Attendance: tap a name to mark absent</legend><div class="tc-att">${ss.length?ss.map(s=>`<label class="tc-kid"><input type="checkbox" name="att" value="${s.id}" ${abs.indexOf(s.id)<0?'checked':''}><span>${esc(s.name)}</span></label>`).join(''):'<p class="muted">No students in this batch yet. Set the batch on each student’s page.</p>'}</div></fieldset>
  <label>What I taught<input id="cl-topic" maxlength="120" value="${esc(c.topic||'')}" placeholder="e.g. Fractions: equivalent fractions"></label>
  <label>Homework given<input id="cl-hw" maxlength="160" value="${esc(c.homework||'')}" placeholder="e.g. Textbook p.42, Q1–10"></label>
  ${ss.length?`<details${Object.keys(notes).length?' open':''}><summary>Notes about a child (optional)</summary><div class="stack">${ss.map(s=>`<label>${esc(s.name)}<input name="note" data-sid="${s.id}" maxlength="140" value="${esc(notes[s.id]||'')}" placeholder="e.g. confused about carry-over"></label>`).join('')}</div></details>`:''}
  <div class="row"><button class="btn go">Save class log</button>${c.id?`<button type="button" class="btn bad" data-act="tdelcls">${armed==='c'?'Tap again to delete':'Delete log'}</button>`:''}</div></form>`}

/* ---------- Batches ---------- */
function batchesView(){const bs=T('batches').slice().sort((a,b)=>a.name.localeCompare(b.name)),e=tedit&&tedit!=='new'?bs.find(b=>b.id===tedit):null;
  const form=(b)=>`<form class="card stack" data-form="savebatch"><h3>${b.id?'Edit batch':'Add a batch'}</h3>
   <div class="row"><label class="grow">Batch name<input id="bt-name" required maxlength="40" value="${esc(b.name||'')}" placeholder="e.g. Grade 4 Maths"></label><label>Time<input id="bt-time" type="time" value="${esc(b.time||'')}"></label></div>
   <fieldset class="fld"><legend>Days</legend><div class="row">${DAYS.map((d,i)=>`<label class="ckband"><input type="checkbox" name="bday" value="${i}" ${(b.days||[]).indexOf(i)>=0?'checked':''}> ${d}</label>`).join('')}</div></fieldset>
   <div class="row"><label>Where<select id="bt-mode"><option value="inperson">In person (Sparklet)</option><option value="online" ${b.mode==='online'?'selected':''}>Online (Google Meet)</option></select></label>
   <label class="grow">Meet link (online only)<input id="bt-link" type="url" maxlength="200" value="${esc(b.link||'')}" placeholder="https://meet.google.com/..."></label></div>
   <div class="row"><button class="btn go">Save batch</button><button type="button" class="btn" data-act="tbcancel">Cancel</button>${b.id?`<button type="button" class="btn bad" data-act="tdelbatch">${armed==='b'?'Tap again to delete':'Delete'}</button>`:''}</div></form>`;
  if(tedit)return form(e||{});
  return `<section class="card stack">${bs.length?bs.map(b=>`<div class="item"><div class="grow"><b>${esc(b.name)}</b><div class="small muted">${(b.days||[]).map(i=>DAYS[i]).join(', ')||'No days set'} · ${esc(b.time||'')} · ${b.mode==='online'?'Online':'In person'} · ${inBatch(b).length} students</div></div><button class="btn" data-act="tbedit" data-id="${b.id}">Edit</button></div>`).join(''):'<p class="muted">No batches yet. A batch is a group that meets at the same time, like “Grade 4 Maths, Mon/Wed/Fri 5 pm”.</p>'}
  <div class="row"><button class="btn go" data-act="tbedit" data-id="new">Add a batch</button></div></section>`}

/* ---------- Fees ---------- */
function feesView(){const m=tmonth,ss=active().filter(s=>+s.fee>0).sort((a,b)=>a.name.localeCompare(b.name));
  const got=ss.filter(s=>(feeRec(s,m)||{}).paid),due=ss.filter(s=>!(feeRec(s,m)||{}).paid);
  const sum=a=>a.reduce((t,s)=>t+((feeRec(s,m)||{}).amount||+s.fee),0);
  return `<section class="card stack"><div class="row"><h2 style="margin-right:auto">Fees: ${monthName(m)}</h2><input type="month" value="${m}" data-change="tmonth" aria-label="Pick a month" style="width:auto"></div>
  <div class="grid"><div class="card center"><div class="stat">${rupee(sum(got))}</div><div class="muted small">collected (${got.length})</div></div><div class="card center"><div class="stat">${rupee(sum(due))}</div><div class="muted small">pending (${due.length})</div></div></div>
  ${ss.length?'':'<p class="muted">Set a monthly fee on each student’s page and they will appear here.</p>'}
  ${due.map(s=>{const l=waLink(s.phone,`Hello${s.parent?' '+s.parent:''}, a gentle reminder that ${s.name}’s tuition fee of ${rupee(s.fee)} for ${monthName(m)} is due. UPI or cash both work. Thank you! – Chetana`);
    return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="pill bad">Due</span><div class="small muted">${rupee(s.fee)}${batchOf(s)?' · '+esc(batchOf(s).name):''}</div></div>
    ${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">Remind</a>`:''}<button class="btn go" data-act="tpaid" data-id="${s.id}" data-m="UPI">Paid UPI</button><button class="btn" data-act="tpaid" data-id="${s.id}" data-m="Cash">Cash</button></div>`}).join('')}
  ${got.map(s=>{const f=feeRec(s,m);return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="pill ok">Paid</span><div class="small muted">${rupee(f.amount)} · ${esc(f.mode)} · ${esc(f.date)}</div></div><button class="btn ghost" data-act="tunpaid" data-id="${s.id}">${armed==='f'+s.id?'Tap again to undo':'Undo'}</button></div>`}).join('')}</section>`}

/* ---------- Students ---------- */
function studentList(){const all=T('students').slice().sort((a,b)=>a.name.localeCompare(b.name)),ss=all.filter(s=>s.status!=='left'),left=all.filter(s=>s.status==='left'),m=today().slice(0,7);
  const row=s=>{const tr=tricky(s),b=batchOf(s),f=+s.fee>0?(feeRec(s,m)||{}).paid:null,a=attend(s,m);return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="muted small">Grade ${esc(s.grade||'?')}${s.board?' · '+esc(s.board):''}</span>
   <div class="small muted">${b?esc(b.name):'No batch'} · attended ${a.p}/${a.t} this month · ★ ${s.stars||0}</div></div>
   ${f===false?'<span class="pill bad">Fee due</span>':''}${tr.length?`<span class="pill">${tr.length} tricky</span>`:''}<button class="btn" data-act="tsel" data-id="${esc(s.id)}">Open</button></div>`};
  return `<section class="card">${ss.length?ss.map(row).join(''):`<p class="muted">No students yet. Add the first one below.</p>`}</section>
  ${left.length?`<details class="card"><summary>Past students (${left.length})</summary>${left.map(row).join('')}</details>`:''}
  <form class="card stack" data-form="addstudent"><h3>Add a student</h3>
  <div class="row"><label>First name<input id="as-name" required maxlength="20"></label><label>Grade<input id="as-grade" inputmode="numeric" maxlength="2"></label><label>4-digit PIN<input id="as-pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label></div>
  <div class="row"><label>Batch<select id="as-batch"><option value="">None yet</option>${T('batches').map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label><label>Monthly fee (₹)<input id="as-fee" inputmode="numeric" maxlength="6"></label></div>
  <label class="ckband"><input type="checkbox" id="as-ok" required> A parent or guardian has agreed to us keeping this child’s details (see the Privacy page)</label>
  <div class="row"><button class="btn navy">Add student</button>${!SYNC_URL&&!all.length?`<button type="button" class="btn" data-act="sample">Add 2 sample students to try it</button>`:''}</div>
  <p class="small muted">The child uses the first name and PIN in the Kids’ Zone. Add parent details on the student’s page.</p></form>`}

function report(s){const lines=['*'+s.name+"'s progress* (Chetana's Tutoring)"],m=today().slice(0,7),a=attend(s,m);
  if(a.t)lines.push('Classes attended in '+monthName(m)+': '+a.p+' of '+a.t);
  const cs=T('classes').filter(c=>c.notes&&c.notes[s.id]).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,3);
  if(s.level>0)lines.push('Reading level: '+LEVELS[s.level]);
  lines.push('Online practice: '+(s.sessions||[]).length+' day'+((s.sessions||[]).length===1?'':'s')+', '+(s.stars||0)+' stars');
  GK.forEach(k=>{const st=stat(s,k);if(st.tried)lines.push(G[k].name+': '+st.m+' of '+st.total+' mastered')});
  Object.keys(MODS).forEach(m2=>{if(modDone(s,m2))lines.push(MODS[m2].name+': '+modDone(s,m2)+' of '+MODS[m2].ch.length+' chapter badges')});
  const tr=tricky(s);if(tr.length)lines.push('Still practising: '+tr.slice(0,6).join(', '));
  cs.forEach(c=>lines.push('Class note ('+c.date+'): '+c.notes[s.id]));
  if(s.note)lines.push('Note: '+s.note);return lines.join('\n')}

function studentDetail(){const s=T('students').find(x=>x.id===tsel);if(!s){tsel=null;return studentList()}
  const m=today().slice(0,7),a=attend(s,m),hist=T('classes').filter(c=>(c.present||[]).indexOf(s.id)>=0||(c.absent||[]).indexOf(s.id)>=0).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,8);
  const fees=T('fees').filter(f=>f.sid===s.id&&f.paid).sort((x,y)=>y.month.localeCompare(x.month)).slice(0,6),rep=report(s),wl=waLink(s.phone,rep);
  return `<div class="row"><button class="btn" data-act="tback">← All students</button></div>
  <form class="card stack" data-form="savestudent"><h2>${esc(s.name)}</h2>
  <div class="row"><label>First name<input id="es-name" value="${esc(s.name)}" required maxlength="20"></label><label>Grade<input id="es-grade" value="${esc(s.grade||'')}" maxlength="2"></label>
   <label>Board<select id="es-board">${BOARDS.map(b=>`<option ${b===(s.board||'')?'selected':''}>${b}</option>`).join('')}</select></label></div>
  <div class="row"><label class="grow">School<input id="es-school" value="${esc(s.school||'')}" maxlength="60"></label><label>Batch<select id="es-batch"><option value="">None</option>${T('batches').map(b=>`<option value="${b.id}" ${b.id===s.batch?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label></div>
  <div class="row"><label class="grow">Parent’s name<input id="es-parent" value="${esc(s.parent||'')}" maxlength="40"></label><label class="grow">Parent’s WhatsApp<input id="es-phone" type="tel" inputmode="tel" value="${esc(s.phone||'')}" maxlength="16" placeholder="98xxxxxxxx"></label></div>
  <div class="row"><label>Monthly fee (₹)<input id="es-fee" inputmode="numeric" value="${esc(s.fee||'')}" maxlength="6"></label><label>Joined on<input id="es-start" type="date" value="${esc(s.start||'')}"></label>
   <label>Status<select id="es-status"><option value="active">Active</option><option value="left" ${s.status==='left'?'selected':''}>Left</option></select></label></div>
  <div class="row"><label>Reading level<select id="es-level">${LEVELS.map((l,i)=>`<option value="${i}" ${i==(s.level||0)?'selected':''}>${l}</option>`).join('')}</select></label>
   <label>${SYNC_URL?'New PIN (leave empty to keep)':'PIN'}<input id="es-pin" value="${SYNC_URL?'':esc(s.pin||'')}" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" ${SYNC_URL?'':'required'}></label></div>
  <label>Note for the child and parents<textarea id="es-note" rows="2" maxlength="300">${esc(s.note||'')}</textarea></label>
  <div class="row"><button class="btn navy">Save</button><button type="button" class="btn bad" data-act="tdelstudent">${armed==='s'?'Tap again to delete':'Delete student'}</button></div>
  <p class="small muted">If a child stops coming, set Status to Left instead of deleting, so fee and class history stay.</p></form>
  <section class="card stack"><h3>Classes</h3><p><b>${a.p} of ${a.t}</b> attended in ${monthName(m)}.</p>
  ${hist.length?hist.map(c=>{const b=T('batches').find(x=>x.id===c.batch);const here=c.present.indexOf(s.id)>=0;return `<div class="item"><div class="grow"><b>${esc(c.date)}</b> ${here?'<span class="pill ok">Present</span>':'<span class="pill bad">Absent</span>'} <span class="small muted">${b?esc(b.name):''}</span>
    ${c.topic?`<div class="small">${esc(c.topic)}</div>`:''}${c.notes&&c.notes[s.id]?`<div class="small"><b>Note:</b> ${esc(c.notes[s.id])}</div>`:''}</div></div>`}).join(''):'<p class="muted small">No classes logged yet. Use the Today tab after each class.</p>'}</section>
  ${+s.fee>0?`<section class="card stack"><h3>Fees</h3><p>This month: ${(feeRec(s,m)||{}).paid?'<span class="pill ok">Paid</span>':'<span class="pill bad">Due '+rupee(s.fee)+'</span>'}</p>${fees.map(f=>`<div class="small">${monthName(f.month)}: ${rupee(f.amount)} by ${esc(f.mode)} on ${esc(f.date)}</div>`).join('')}</section>`:''}
  <section class="card stack"><h3>Online practice</h3><div class="tw"><table><tr><th>Mission</th><th>Mastered</th><th>Tricky right now</th></tr>
  ${GK.map(k=>{const st=stat(s,k);return `<tr><td>${G[k].name}</td><td>${st.tried?st.m+' of '+st.total:'Not started'}</td><td class="dev">${st.weak.map(esc).join(', ')||'–'}</td></tr>`}).join('')}${Object.keys(MODS).map(m2=>`<tr><td>${MODS[m2].name} chapters</td><td>${modDone(s,m2)} of ${MODS[m2].ch.length} badges</td><td>${MODS[m2].ch.map(c=>{const t=chState(s.progress||{},m2,c);return t.played?'Ch'+c.n+': '+t.short:''}).filter(Boolean).join(', ')||'–'}</td></tr>`).join('')}</table></div></section>
  <section class="card stack"><h3>Mistake bank from class</h3><p class="small muted">Open mistakes show to the child as tricky ones and go in the parent report.</p>
  ${(s.mistakes||[]).map(mm=>`<div class="item"><div class="grow ${mm.fixed?'muted':''}">${mm.fixed?'<s>'+esc(mm.text)+'</s>':esc(mm.text)}</div><button class="btn" data-act="mfix" data-id="${mm.id}">${mm.fixed?'Reopen':'Mark fixed'}</button></div>`).join('')}
  <form class="row" data-form="addmistake"><label class="grow">New mistake<input id="am-text" required maxlength="80" placeholder="e.g. forgets the full stop"></label><button class="btn navy">Add</button></form></section>
  <section class="card stack"><h3>Parent report</h3><textarea id="rep" rows="9" readonly>${esc(rep)}</textarea>
  <div class="row">${wl?`<a class="btn go" href="${wl}" target="_blank" rel="noopener">Send on WhatsApp</a>`:''}<button class="btn" data-act="copyrep">Copy report</button><span id="copied" class="pill ok" hidden>Copied</span></div>
  ${wl?'':'<p class="small muted">Add the parent’s WhatsApp number above to send it in one tap.</p>'}</section>`}

/* ---------- Leads ---------- */
const SRC=['Starting check','Website','MyGate','WhatsApp group','Referral','Flyer','Demo class','Other'],STAT=['New','Demo booked','Joined','Not now'];
function enquiries(){const es=T('enquiries').slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return `<section class="grid">${STAT.map(st=>`<div class="card center"><div class="stat">${es.filter(e=>e.status===st).length}</div><div class="muted small">${st}</div></div>`).join('')}</section>
  <section class="card">${es.length?es.map(e=>{const l=waLink(e.phone,`Hello ${e.parent}, this is Chetana from Chetana’s Tutoring.`);return `<div class="item tc-lead"><div class="grow"><b>${esc(e.parent)}</b>${e.child?' for '+esc(e.child):''} <span class="muted small">Grade ${esc(e.grade||'?')} · ${esc(e.source)} · ${esc(e.date)}</span>${e.note?`<div class="small">${esc(e.note)}</div>`:''}</div>
   <select aria-label="Status for ${esc(e.parent)}" data-change="estatus" data-id="${esc(e.id)}" style="width:auto">${STAT.map(st=>`<option ${st===e.status?'selected':''}>${st}</option>`).join('')}</select>
   ${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">WhatsApp</a>`:''}${e.status!=='Joined'?`<button class="btn" data-act="econvert" data-id="${esc(e.id)}">Make student</button>`:''}
   <button class="btn bad" data-act="edel" data-id="${esc(e.id)}">${armed===e.id?'Tap again':'Delete'}</button></div>`}).join(''):`<p class="muted">No leads yet. Add each parent who asks, so nobody is forgotten.</p>`}</section>
  <form class="card stack" data-form="addenq"><h3>Add a lead</h3>
  <div class="row"><label>Parent’s name<input id="ae-parent" required maxlength="30"></label><label>Child’s first name<input id="ae-child" maxlength="20"></label><label>Grade<input id="ae-grade" maxlength="2"></label></div>
  <div class="row"><label>WhatsApp<input id="ae-phone" type="tel" inputmode="tel" maxlength="16"></label><label>Came from<select id="ae-source">${SRC.map(x=>`<option>${x}</option>`).join('')}</select></label></div>
  <label>Note<input id="ae-note" maxlength="160" placeholder="e.g. starting check 12/26, weak in fractions; demo Saturday"></label><div class="row"><button class="btn navy">Add lead</button></div></form>`}

/* ---------- Setup ---------- */
function help(){return `<section class="card stack"><h3>Where the data lives</h3>
  <p>${SYNC_URL?'<span class="pill ok">Synced</span> Saved in your private Google Sheet. Every device sees the same data.':'<span class="pill bad">This device only</span> Saved in this browser only. Clearing the browser deletes it, so download a backup regularly. The README explains the free Google Sheet setup.'}</p>
  <div class="row"><button class="btn" data-act="tbackup">Download a backup</button></div>
  <h3>Daily routine (2 minutes)</h3>
  <p>1. After each class, open <b>Today</b>, tap the batch, untick absent children, type what you taught and the homework.<br>2. When a parent pays, tap <b>Paid UPI</b> or <b>Cash</b> in <b>Fees</b>. Use <b>Remind</b> for anyone pending after the 10th.<br>3. Every new parent enquiry goes in <b>Leads</b>. Starting-check messages on WhatsApp go there too.<br>4. Once a month, open each student and tap <b>Send on WhatsApp</b> for the parent report.</p>
  <h3>Privacy</h3><p>Children: first names only. Parent numbers and fees are visible only after the teacher PIN. Lock this page when you hand the phone to a child. If a parent asks, delete their child’s record.</p></section>`}

/* ---------- auto-lock after 10 minutes idle ---------- */
let tIdle=0;['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{tIdle=Date.now()},true));
setInterval(()=>{if(tdata&&tIdle&&Date.now()-tIdle>6e5){tpin='';tdata=null;tsel=null;tcls=null;msg='Locked after 10 minutes without use.';render()}},3e4);
/* ---------- actions ---------- */
Object.assign(acts,{
  tday(d){const x=new Date(tdate+'T00:00');x.setDate(x.getDate()+ +d.d);tdate=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');tcls=null;render()},
  topencls(d){tcls=d.b;armed=null;render();window.scrollTo(0,0)},
  textra(){tcls=document.getElementById('tc-extra').value;render();window.scrollTo(0,0)},
  tclose(){tcls=null;armed=null;render()},
  tdelcls(){if(armed!=='c'){armed='c';render();return}const id=clsId(tcls,tdate);tcls=null;tDelK('classes',id)},
  tbedit(d){tedit=d.id;armed=null;render()},tbcancel(){tedit=null;armed=null;render()},
  tdelbatch(){if(armed!=='b'){armed='b';render();return}const id=tedit;tedit=null;tDelK('batches',id)},
  tpaid(d){const s=T('students').find(x=>x.id===d.id);tPutK('fees',{id:'f_'+s.id+'_'+tmonth,sid:s.id,month:tmonth,amount:+s.fee,paid:true,mode:d.m,date:today()})},
  tunpaid(d){if(armed!=='f'+d.id){armed='f'+d.id;render();return}tDelK('fees','f_'+d.id+'_'+tmonth)},
  econvert(d){if(!confirm('Has the parent agreed to us keeping their child’s details? (See the Privacy page.)'))return;const e=T('enquiries').find(x=>x.id===d.id);const s={id:newId('s'),name:e.child||e.parent.split(' ')[0],grade:e.grade,parent:e.parent,phone:e.phone,pin:String(rnd(1000,9999)),level:0,note:'',mistakes:[],status:'active',start:today(),consent:today()};
    e.status='Joined';S.tPut(tpin,'enquiries',e).then(()=>putStudent(s)).then(()=>{tview='students';tsel=s.id;msg='Student added with PIN '+s.pin+'. Tell the child, then fill in the rest.';render()}).catch(tfail)},
  tbackup(){const blob=new Blob([JSON.stringify(tdata,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='chetanas-tutoring-backup-'+today()+'.json';document.body.appendChild(a);a.click();a.remove()}
});
Object.assign(forms,{
  kidname(){const n=val('kn');if(!n)return;pick={name:n};buf='';msg='';render()},
  addstudent(){const pin=val('as-pin');if(!/^\d{4}$/.test(pin)){msg='The PIN must be 4 digits.';render();return}
    putStudent({id:newId('s'),name:val('as-name'),grade:val('as-grade'),pin,batch:val('as-batch'),fee:val('as-fee').replace(/\D/g,''),level:0,note:'',mistakes:[],status:'active',start:today(),consent:today()})},
  savestudent(){const s=T('students').find(x=>x.id===tsel),pin=val('es-pin');
    if(pin&&!/^\d{4}$/.test(pin)||!SYNC_URL&&!pin){msg='The PIN must be 4 digits.';render();return}
    const o=Object.assign({},s,{name:val('es-name'),grade:val('es-grade'),board:val('es-board'),school:val('es-school'),batch:val('es-batch'),parent:val('es-parent'),phone:val('es-phone'),
      fee:val('es-fee').replace(/\D/g,''),start:val('es-start'),status:val('es-status'),level:+val('es-level'),note:val('es-note')});
    if(o.status==='left'){if(!o.leftOn)o.leftOn=today()}else delete o.leftOn;
    if(pin)o.pin=pin;else delete o.pin;putStudent(o)},
  savebatch(){const days=[...document.querySelectorAll('input[name=bday]:checked')].map(x=>+x.value),link=val('bt-link');
    if(link&&!/^https:\/\//.test(link)){msg='The Meet link must start with https://';render();return}
    const b={id:tedit&&tedit!=='new'?tedit:newId('b'),name:val('bt-name'),time:val('bt-time'),days,mode:val('bt-mode'),link};tedit=null;tPutK('batches',b)},
  savecls(){const b=T('batches').find(x=>x.id===tcls),ss=inBatch(b),on=[...document.querySelectorAll('input[name=att]:checked')].map(x=>x.value),notes={};
    document.querySelectorAll('input[name=note]').forEach(x=>{if(x.value.trim())notes[x.dataset.sid]=x.value.trim()});
    const c={id:clsId(b.id,tdate),batch:b.id,date:tdate,present:ss.filter(s=>on.indexOf(s.id)>=0).map(s=>s.id),absent:ss.filter(s=>on.indexOf(s.id)<0).map(s=>s.id),topic:val('cl-topic'),homework:val('cl-hw'),notes};
    tcls=null;tPutK('classes',c)},
  addenq(){const e={id:newId('e'),parent:val('ae-parent'),child:val('ae-child'),grade:val('ae-grade'),phone:val('ae-phone'),source:val('ae-source'),note:val('ae-note'),status:'New',date:today()};tPutK('enquiries',e)}
});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.change==='tdate'&&t.value){tdate=t.value;tcls=null;render()}if(t.dataset.change==='tmonth'&&t.value){tmonth=t.value;armed=null;render()}});

/* ====== Privacy page ====== */
function privacy(){return `<section class="stack"><h1>Privacy</h1><p class="lead">Short and plain: what we keep, why, and how to get it removed.</p></section>
<section class="card stack prose">
<h2>What we keep about your child</h2>
<p>Only what we need to teach well: <b>first name</b>, grade, board and school, batch, attendance, class notes, practice scores on this website, and fee payments. For parents: your name and WhatsApp number, so we can send reports and reminders.</p>
<p>We do <b>not</b> keep surnames of children, photos or videos of children, home addresses, Aadhaar or any ID numbers, or bank or card details.</p>
<h2>Why</h2><p>To plan your child’s lessons, track progress, send you monthly reports, and manage fees. Nothing else. We never sell, share or advertise with your data, and we do not use advertising or tracking cookies.</p>
<h2>Who can see it</h2><p>Only Chetana. The records are kept in a private Google Sheet in her account, protected by 2-step verification. The teacher area of this website opens only with her PIN. A child’s own login (first name and a 4-digit PIN) shows only that child’s practice stars and missions.</p>
<h2>Practice without signing in</h2><p>Children can use the learning library, Kids’ World, Pune Ride and the starting check without any login. Those results stay on your own device only. If you choose to send starting-check results to Chetana, or book a demo, those details also go into her private enquiry list so she can follow up.</p>
<h2>Your consent</h2><p>We add a child only after a parent or guardian agrees. You can withdraw consent at any time.</p>
<h2>See, correct or delete</h2><p>Message Chetana on WhatsApp to see what we hold, correct it, or delete it. We delete a child’s record within 7 days of a request, and we automatically delete records of children who left more than 12 months ago (fee entries are kept for accounts), and enquiries that did not lead to classes after 12 months.</p>
<h2>If something goes wrong</h2><p>If we ever find that your child’s data was seen by someone it shouldn’t have been, we will tell you promptly and explain what we are doing about it.</p>
<p class="small muted">Last updated: November 2026.</p>
<div class="row"><a class="btn go" href="${WA}" target="_blank" rel="noopener">Message Chetana</a></div></section>`}

document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&acts[b.dataset.act]){if(b.tagName==='BUTTON'&&b.type!=='submit'||b.tagName!=='BUTTON')e.preventDefault();acts[b.dataset.act](b.dataset)}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(f){e.preventDefault();forms[f.dataset.form]()}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-change="estatus"]');if(el){const en=tdata.enquiries.find(x=>x.id===el.dataset.id);en.status=el.value;S.tPut(tpin,'enquiries',en).then(render).catch(tfail)}});

function render(){if(view!=='world')unmountWorld();app.innerHTML=view==='kids'?kids():view==='teacher'?teacher():MODS[view]?modPage():view==='programmes'?programmes():view==='about'?about():view==='learn'?learn():view==='faq'?faq():view==='book'?book():view==='world'?world():view==='check'?check():view==='pune'?pune():view==='privacy'?privacy():home();
  if(view==='world')mountWorld();const nv=['phonics','maths','kids','bhasha','grammar','pune'].indexOf(view)>=0?'learn':view;document.querySelectorAll('.top nav a').forEach(a=>{if(a.getAttribute('href')==='#'+nv)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
function route(){const h=(location.hash||'').slice(1);view=['home','kids','teacher','phonics','maths','programmes','about','learn','faq','book','bhasha','grammar','world','check','pune','privacy'].indexOf(h)>=0?h:'home';if(MODS[view]){cm=view;if(ps&&ps.mod!==cm)ps=null}msg='';buf='';pick=null;armed=null;render()}
window.addEventListener('hashchange',route);route();
