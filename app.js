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
const TK=['students','enquiries','batches','classes','fees','notes','roadmaps','docs','marks','assign'];
const blank=()=>({tpin:null,students:{},enquiries:{},batches:{},classes:{},fees:{},notes:{},roadmaps:{},docs:{},marks:{},assign:{}});
const db=()=>Object.assign(blank(),ls.get('ct_data')||{});
function tcheck(d,pin){if(!d.tpin)d.tpin=pin;if(d.tpin!==pin)throw Error('Wrong PIN')}
const Local={
  async names(){return Object.values(db().students).filter(s=>s.status!=='left').map(s=>({id:s.id,name:s.name}))},
  async login(id,pin,name){const n=String(name||'').trim().toLowerCase(),s=id?db().students[id]:Object.values(db().students).find(x=>x.status!=='left'&&x.name.trim().toLowerCase()===n&&x.pin===pin);if(!s||s.pin!==pin||s.status==='left')throw Error('Wrong PIN');const d0=db();s.assign=Object.values(d0.assign||{}).filter(a=>a.target==='s:'+s.id||a.target==='b:'+s.batch);return s},
  async sSave(id,pin,patch){const d=db(),s=d.students[id];if(!s||s.pin!==pin)throw Error('Wrong PIN');KEEP.forEach(k=>{if(k in patch)s[k]=patch[k]});ls.set('ct_data',d)},
  async tAll(pin){const d=db();tcheck(d,pin);ls.set('ct_data',d);const o={me:{role:'owner',name:'Chetana'}};TK.forEach(k=>o[k]=Object.values(d[k]));o.teachers=[];return o},
  async tPut(pin,kind,o){const d=db();tcheck(d,pin);if(TK.indexOf(kind)<0)throw Error('Bad request');if(kind==='students'&&!o.pin&&d.students[o.id])o.pin=d.students[o.id].pin;const old=d[kind][o.id];if(kind==='students'&&old)KEEP.forEach(k=>{if(k in old)o[k]=old[k]});d[kind][o.id]=o;ls.set('ct_data',d);return o},
  async tDel(pin,kind,id){const d=db();tcheck(d,pin);delete d[kind][id];ls.set('ct_data',d)},
  async lead(o){if(o.web)return;const d=db(),id='w_'+o.id;d.enquiries[id]={id,parent:o.parent||'(not given)',child:o.child||'',grade:o.grade||'',phone:o.phone||'',source:o.source,note:o.note||'',status:'New',date:today()};ls.set('ct_data',d)}
};
async function call(action,p,tries){tries=tries==null?1:tries;let r;
  const ctl=typeof AbortController!=='undefined'?new AbortController():null,t=ctl&&setTimeout(()=>ctl.abort(),20000);
  try{r=await fetch(SYNC_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},p,gTok&&action[0]==='t'?{idToken:gTok}:{})),signal:ctl&&ctl.signal})}
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
<section class="hero hasme"><img class="me" src="img/chetana.jpg" alt="Chetana, the teacher" width="420" height="525"><div><p class="eyebrow">${L(0)}</p><h1>${L(1)}</h1>
<p>${L(2)}</p>
<div class="row"><a class="btn go" href="#book">${L(3)}</a><a class="btn" href="#check">${L(4)}</a></div></div></section>
<a class="ckban" href="#check"><span aria-hidden="true">🧭</span><span><b>${L(5)}</b><span>${L(6)}</span></span>${L(7)}</a>
<section class="grid facts">
<div class="card fact">${L(8)}</div>
<div class="card fact">${L(9)}</div>
<div class="card fact">${L(10)}</div>
<div class="card fact">${L(11)}</div></section>
${reviews()}
<section class="stack"><div class="row">${L(12)}</div>
<div class="grid">${progsL().slice(0,3).map(progCard).join('')}</div></section>
<section class="stack">${L(13)}<div class="grid">
<div class="card step">${L(14)}</div>
<div class="card step">${L(15)}</div>
<div class="card step">${L(16)}</div></div>
<div class="grid">
<div class="card step">${L(17)}</div>
<div class="card step">${L(18)}</div>
<div class="card step">${L(19)}</div>
<div class="card step">${L(20)}</div></div></section>
<a class="kwban" href="#world"><span class="kwban-isl" aria-hidden="true">🏝️</span><span>${L(21)}</span></a>
<section class="card stack">${L(22)}
<div class="grid">
<a class="card lib" href="#phonics">${L(23)}</a>
<a class="card lib" href="#grammar">${L(24)}</a>
<a class="card lib" href="#maths">${L(25)}</a>
<a class="card lib" href="#bhasha">${L(26)}</a>
<a class="card lib" href="#kids">${L(27)}</a></div></section>
${contactBlock()}`}

/* ====== Marathi / Hindi for parent pages ====== */
let LANG=(()=>{const l=ls.get('ct_lang');return l==='mr'||l==='hi'?l:'en'})();
const I18N=[["Grades 1 to 10 · Sparklet, Megapolis, Hinjawadi and online", "इयत्ता १ ते १० · स्पार्कलेट, मेगापोलिस, हिंजवडी आणि ऑनलाइन", "कक्षा 1 से 10 · स्पार्कलेट, मेगापोलिस, हिंजवडी और ऑनलाइन"], ["Make learning fun, keep it strategic", "शिकणं आनंदाचं, नियोजन पक्कं", "पढ़ाई मज़ेदार, योजना पक्की"], ["Chetana is a computer science engineer who chose teaching. She plans every child's term like a project and teaches each idea until the child can explain it back.", "चेतना कॉम्प्युटर सायन्स इंजिनिअर आहेत आणि त्यांनी आवडीने शिक्षकी पेशा निवडला. प्रत्येक मुलाच्या सत्राचं नियोजन त्या एखाद्या प्रोजेक्टसारखं करतात, आणि मूल संकल्पना स्वतः समजावून सांगू शकेपर्यंत शिकवतात.", "चेतना कंप्यूटर साइंस इंजीनियर हैं, जिन्होंने शौक से पढ़ाना चुना। वे हर बच्चे के सत्र की योजना एक प्रोजेक्ट की तरह बनाती हैं और तब तक पढ़ाती हैं जब तक बच्चा खुद समझा न सके।"], ["Book a free demo class", "मोफत डेमो वर्ग बुक करा", "मुफ़्त डेमो क्लास बुक करें"], ["Free 10-minute check", "मोफत १० मिनिटांची चाचणी", "मुफ़्त 10 मिनट की जाँच"], ["Where does your child stand?", "तुमचं मूल नेमकं कुठे आहे?", "आपका बच्चा कहाँ खड़ा है?"], ["Take the free 10-minute starting check. Instant results: strengths and what to work on next.", "मोफत १० मिनिटांची सुरुवातीची चाचणी द्या. लगेच निकाल: कशात पक्कं आहे आणि पुढे कशावर काम करायचं.", "मुफ़्त 10 मिनट की शुरुआती जाँच दें। तुरंत नतीजे: बच्चा किसमें मज़बूत है और आगे किस पर काम करना है।"], ["<em>Start</em>", "<em>सुरू करा</em>", "<em>शुरू करें</em>"], ["<b>Grades 1–10</b><span>State, CBSE and ICSE</span>", "<b>इयत्ता १–१०</b><span>स्टेट, CBSE आणि ICSE</span>", "<b>कक्षा 1–10</b><span>स्टेट, CBSE और ICSE</span>"], ["<b>Languages</b><span>English, Marathi, Hindi</span>", "<b>भाषा</b><span>इंग्रजी, मराठी, हिंदी</span>", "<b>भाषाएँ</b><span>अंग्रेज़ी, मराठी, हिंदी</span>"], ["<b>Maths &amp; Science</b><span>Concepts, tricks, practice</span>", "<b>गणित आणि विज्ञान</b><span>संकल्पना, युक्त्या, सराव</span>", "<b>गणित और विज्ञान</b><span>कॉन्सेप्ट, ट्रिक्स, अभ्यास</span>"], ["<b>Small batches</b><span>In person or live online</span>", "<b>लहान बॅच</b><span>प्रत्यक्ष किंवा लाइव्ह ऑनलाइन</span>", "<b>छोटे बैच</b><span>आमने-सामने या लाइव ऑनलाइन</span>"], ["<h2 style=\"margin-right:auto\">Programmes</h2><a class=\"btn ghost\" href=\"#programmes\">All programmes</a>", "<h2 style=\"margin-right:auto\">वर्ग</h2><a class=\"btn ghost\" href=\"#programmes\">सर्व वर्ग</a>", "<h2 style=\"margin-right:auto\">कक्षाएँ</h2><a class=\"btn ghost\" href=\"#programmes\">सभी कक्षाएँ</a>"], ["<h2>How she teaches</h2>", "<h2>त्या कसं शिकवतात</h2>", "<h2>वे कैसे पढ़ाती हैं</h2>"], ["<b>Concept</b>Each idea is explained from your child's own school book, simply.", "<b>संकल्पना</b>प्रत्येक संकल्पना मुलाच्या स्वतःच्या शाळेच्या पुस्तकातून, सोप्या भाषेत समजावली जाते.", "<b>कॉन्सेप्ट</b>हर बात बच्चे की अपनी स्कूल की किताब से, आसान तरीके से समझाई जाती है।"], ["<b>Practice</b>Oral and written practice in class, then self-study missions at home.", "<b>सराव</b>वर्गात तोंडी आणि लेखी सराव, आणि घरी स्वयं-अभ्यासाचे मिशन.", "<b>अभ्यास</b>क्लास में मौखिक और लिखित अभ्यास, फिर घर पर सेल्फ-स्टडी मिशन।"], ["<b>Mastery</b>We move on only when your child can explain it back.", "<b>पक्की तयारी</b>मूल स्वतः समजावून सांगू शकलं, तरच आम्ही पुढे जातो.", "<b>पक्की समझ</b>हम तभी आगे बढ़ते हैं जब बच्चा खुद समझा सके।"], ["<b>Map</b>Syllabus and school test dates become one term roadmap.", "<b>नकाशा</b>अभ्यासक्रम आणि शाळेच्या परीक्षांच्या तारखांवरून सत्राचा एक आराखडा.", "<b>नक्शा</b>सिलेबस और स्कूल टेस्ट की तारीखों से पूरे सत्र का एक रोडमैप।"], ["<b>Chunk</b>Big chapters become small weekly goals.", "<b>छोटे टप्पे</b>मोठे धडे छोट्या साप्ताहिक उद्दिष्टांमध्ये.", "<b>छोटे हिस्से</b>बड़े पाठ छोटे साप्ताहिक लक्ष्यों में।"], ["<b>Play</b>Games, stories and challenges keep it fun.", "<b>खेळ</b>खेळ, गोष्टी आणि आव्हानांमुळे शिकणं मजेदार राहतं.", "<b>खेल</b>खेल, कहानियाँ और चुनौतियाँ पढ़ाई को मज़ेदार रखती हैं।"], ["<b>Review</b>Each child's own tricky spots are revised before every test.", "<b>उजळणी</b>प्रत्येक परीक्षेआधी मुलाच्या स्वतःच्या अवघड जागांची उजळणी.", "<b>दोहराई</b>हर टेस्ट से पहले बच्चे की अपनी कठिन जगहों की दोहराई।"], ["<b>Enter Kids’ World</b><span>Spin the island map, pick a character, and play your way through every subject.</span>", "<b>किड्स वर्ल्डमध्ये चला</b><span>बेटांचा नकाशा फिरवा, आपलं पात्र निवडा आणि खेळत खेळत प्रत्येक विषय शिका.</span>", "<b>किड्स वर्ल्ड में चलें</b><span>द्वीपों का नक्शा घुमाएँ, अपना किरदार चुनें और खेल-खेल में हर विषय सीखें।</span>"], ["<h2>Free learning library</h2><p>Try the same material Chetana uses in class. Every chapter has a concept to read and practice that checks itself.</p>", "<h2>मोफत अभ्यास साहित्य</h2><p>चेतना वर्गात वापरतात तेच साहित्य वापरून पाहा. प्रत्येक धड्यात वाचण्यासाठी संकल्पना आणि आपोआप तपासला जाणारा सराव आहे.</p>", "<h2>मुफ़्त पढ़ाई सामग्री</h2><p>वही सामग्री आज़माएँ जो चेतना क्लास में इस्तेमाल करती हैं। हर पाठ में पढ़ने के लिए कॉन्सेप्ट और अपने-आप जँचने वाला अभ्यास है।</p>"], ["<b>English reading and writing</b><span>7 phonics chapters for Grades 1–2, with games</span>", "<b>इंग्रजी वाचन आणि लेखन</b><span>इयत्ता १–२ साठी फोनिक्सचे ७ धडे, खेळांसह</span>", "<b>अंग्रेज़ी पढ़ना और लिखना</b><span>कक्षा 1–2 के लिए फ़ोनिक्स के 7 पाठ, खेलों के साथ</span>"], ["<b>English grammar</b><span>9 chapters for Grade 3 and up, 50 questions each</span>", "<b>इंग्रजी व्याकरण</b><span>इयत्ता ३ पासून पुढे, ९ धडे, प्रत्येकी ५० प्रश्न</span>", "<b>अंग्रेज़ी व्याकरण</b><span>कक्षा 3 और ऊपर के लिए 9 पाठ, हर पाठ में 50 सवाल</span>"], ["<b>Maths</b><span>14 chapters for Grade 3 and up, 50 questions each</span>", "<b>गणित</b><span>इयत्ता ३ पासून पुढे, १४ धडे, प्रत्येकी ५० प्रश्न</span>", "<b>गणित</b><span>कक्षा 3 और ऊपर के लिए 14 पाठ, हर पाठ में 50 सवाल</span>"], ["<b>Marathi &amp; Hindi</b><span>10 chapters: every letter, barakhadi, joint letters</span>", "<b>मराठी आणि हिंदी</b><span>१० धडे: प्रत्येक अक्षर, बाराखडी, जोडाक्षरे</span>", "<b>मराठी और हिंदी</b><span>10 पाठ: हर अक्षर, बारहखड़ी, संयुक्ताक्षर</span>"], ["<b>Quick missions</b><span>Tables, earn and owe, Marathi letters, -ed, magic e</span>", "<b>झटपट मिशन</b><span>पाढे, कमाई-उधारी, मराठी अक्षरे, -ed, मॅजिक e</span>", "<b>झटपट मिशन</b><span>पहाड़े, कमाई-उधारी, मराठी अक्षर, -ed, मैजिक e</span>"], ["<h1>Programmes</h1><p class=\"muted lead\">Small batches at Sparklet, Megapolis, Hinjawadi, or live online. Simple monthly fees with no long-term lock-in. Ask on WhatsApp for timings and fees.</p>", "<h1>वर्ग</h1><p class=\"muted lead\">स्पार्कलेट, मेगापोलिस, हिंजवडी येथे किंवा लाइव्ह ऑनलाइन लहान बॅच. साधी मासिक फी, दीर्घ मुदतीचं बंधन नाही. वेळा आणि फीसाठी WhatsApp वर विचारा.</p>", "<h1>कक्षाएँ</h1><p class=\"muted lead\">स्पार्कलेट, मेगापोलिस, हिंजवडी में या लाइव ऑनलाइन छोटे बैच। आसान मासिक फ़ीस, लंबी अवधि का कोई बंधन नहीं। समय और फ़ीस के लिए WhatsApp पर पूछें।</p>"], ["<h2>What every family gets</h2>", "<h2>प्रत्येक कुटुंबाला काय मिळतं</h2>", "<h2>हर परिवार को क्या मिलता है</h2>"], ["<b>Free demo class</b><p class=\"muted small\">See the method before you decide.</p>", "<b>मोफत डेमो वर्ग</b><p class=\"muted small\">निर्णय घेण्याआधी पद्धत पाहा.</p>", "<b>मुफ़्त डेमो क्लास</b><p class=\"muted small\">फ़ैसला करने से पहले तरीका देखें।</p>"], ["<b>Starting check</b><p class=\"muted small\">In week one, so we know where your child stands.</p>", "<b>सुरुवातीची चाचणी</b><p class=\"muted small\">पहिल्या आठवड्यात, म्हणजे मूल कुठे आहे ते कळतं.</p>", "<b>शुरुआती जाँच</b><p class=\"muted small\">पहले हफ़्ते में, ताकि पता चले बच्चा कहाँ है।</p>"], ["<b>Progress you can see</b><p class=\"muted small\">Monthly report, stuck-alerts and a pre-exam note.</p>", "<b>दिसणारी प्रगती</b><p class=\"muted small\">मासिक अहवाल, अडचणीची सूचना आणि परीक्षेआधीची टीप.</p>", "<b>दिखने वाली प्रगति</b><p class=\"muted small\">मासिक रिपोर्ट, अटकने पर सूचना और परीक्षा से पहले नोट।</p>"], ["<b>Practice at home</b><p class=\"muted small\">The learning library, free for every student.</p>", "<b>घरी सराव</b><p class=\"muted small\">अभ्यास साहित्य, प्रत्येक विद्यार्थ्यासाठी मोफत.</p>", "<b>घर पर अभ्यास</b><p class=\"muted small\">पढ़ाई सामग्री, हर विद्यार्थी के लिए मुफ़्त।</p>"], ["<h1>About Chetana</h1><p class=\"lead\">An engineer who chose teaching, because she loves it.</p><p class=\"sig\">“Every child can learn anything when the idea is explained the right way.”</p>", "<h1>चेतना यांच्याविषयी</h1><p class=\"lead\">आवडीमुळे शिक्षकी पेशा निवडलेल्या इंजिनिअर.</p><p class=\"sig\">“योग्य पद्धतीने समजावलं, तर प्रत्येक मूल काहीही शिकू शकतं.”</p>", "<h1>चेतना के बारे में</h1><p class=\"lead\">एक इंजीनियर, जिन्होंने पढ़ाने से प्यार के कारण शिक्षण चुना।</p><p class=\"sig\">“सही तरीके से समझाया जाए तो हर बच्चा कुछ भी सीख सकता है।”</p>"], ["<b>Engineer by training</b>Computer Science engineering graduate.", "<b>मूळच्या इंजिनिअर</b>कॉम्प्युटर सायन्स इंजिनिअरिंग पदवीधर.", "<b>प्रशिक्षण से इंजीनियर</b>कंप्यूटर साइंस इंजीनियरिंग स्नातक।"], ["<b>Start-up experience</b>Worked with start-ups before turning to teaching.", "<b>स्टार्ट-अपचा अनुभव</b>शिक्षणाकडे वळण्याआधी स्टार्ट-अप्समध्ये काम केलं.", "<b>स्टार्ट-अप का अनुभव</b>पढ़ाने से पहले स्टार्ट-अप्स के साथ काम किया।"], ["<b>Teaching since the USA</b>Began teaching while living in the USA.", "<b>अमेरिकेपासून शिकवण्याचा अनुभव</b>अमेरिकेत राहत असताना शिकवायला सुरुवात केली.", "<b>अमेरिका से पढ़ाने का अनुभव</b>अमेरिका में रहते हुए पढ़ाना शुरू किया।"], ["<b>Senior-grade teaching</b>Has taught Information Technology to Grade 11 and 12 students.", "<b>वरिष्ठ वर्गांना शिकवण्याचा अनुभव</b>इयत्ता ११ आणि १२ च्या विद्यार्थ्यांना माहिती तंत्रज्ञान शिकवलं आहे.", "<b>बड़ी कक्षाओं को पढ़ाने का अनुभव</b>कक्षा 11 और 12 के विद्यार्थियों को सूचना प्रौद्योगिकी पढ़ाई है।"], ["<span>Her special gift</span><p>From “I’m scared of Marathi” to “Can we read one more page?”</p><small>She turns a child’s fear of English, Marathi or Hindi into real love for the language, and is just as strong in Maths and Science.</small>", "<span>त्यांची खास देणगी</span><p>“मला मराठीची भीती वाटते” पासून “अजून एक पान वाचूया का?” पर्यंत</p><small>इंग्रजी, मराठी किंवा हिंदीची भीती त्या भाषेच्या खऱ्या आवडीत बदलतात, आणि गणित-विज्ञानातही तितक्याच भक्कम आहेत.</small>", "<span>उनकी ख़ास खूबी</span><p>“मुझे मराठी से डर लगता है” से “क्या एक पन्ना और पढ़ें?” तक</p><small>वे बच्चे के अंग्रेज़ी, मराठी या हिंदी के डर को भाषा के सच्चे प्यार में बदल देती हैं, और गणित व विज्ञान में भी उतनी ही मज़बूत हैं।</small>"], ["<h2>Why parents choose her</h2><ul class=\"ticks\"><li>She plans each term like a project, so nothing is left to the last week.</li><li>She teaches from your child’s own book, whatever the school.</li><li>She uses technology where it helps: self-study practice, tracking and clear reports.</li><li>Small batches, so every child is heard.</li></ul>", "<h2>पालक त्यांनाच का निवडतात</h2><ul class=\"ticks\"><li>प्रत्येक सत्राचं नियोजन प्रोजेक्टसारखं, त्यामुळे शेवटच्या आठवड्यासाठी काहीच उरत नाही.</li><li>शाळा कोणतीही असो, मुलाच्या स्वतःच्या पुस्तकातूनच शिकवतात.</li><li>जिथे उपयोग होतो तिथे तंत्रज्ञान: स्वयं-अभ्यास, प्रगतीची नोंद आणि स्पष्ट अहवाल.</li><li>लहान बॅच, त्यामुळे प्रत्येक मुलाचं ऐकलं जातं.</li></ul>", "<h2>माता-पिता उन्हें क्यों चुनते हैं</h2><ul class=\"ticks\"><li>हर सत्र की योजना प्रोजेक्ट की तरह, ताकि आख़िरी हफ़्ते के लिए कुछ न बचे।</li><li>स्कूल कोई भी हो, वे बच्चे की अपनी किताब से पढ़ाती हैं।</li><li>जहाँ काम आए वहाँ तकनीक: सेल्फ-स्टडी, प्रगति का रिकॉर्ड और साफ़ रिपोर्ट।</li><li>छोटे बैच, ताकि हर बच्चे की बात सुनी जाए।</li></ul>"], ["<h2>Book a free demo class</h2><p>Sparklet, Megapolis, Hinjawadi, Pune · Live online classes too</p>", "<h2>मोफत डेमो वर्ग बुक करा</h2><p>स्पार्कलेट, मेगापोलिस, हिंजवडी, पुणे · लाइव्ह ऑनलाइन वर्गही</p>", "<h2>मुफ़्त डेमो क्लास बुक करें</h2><p>स्पार्कलेट, मेगापोलिस, हिंजवडी, पुणे · लाइव ऑनलाइन क्लास भी</p>"], ["<a class=\"btn go\" href=\"#book\">Book a free demo</a><a class=\"btn\" href=\"${WA}\">Message on WhatsApp</a>", "<a class=\"btn go\" href=\"#book\">मोफत डेमो बुक करा</a><a class=\"btn\" href=\"${WA}\">WhatsApp वर संदेश पाठवा</a>", "<a class=\"btn go\" href=\"#book\">मुफ़्त डेमो बुक करें</a><a class=\"btn\" href=\"${WA}\">WhatsApp पर संदेश भेजें</a>"]];
const NAVL={"mr": ["मुख्य पान", "वर्ग", "ओळख", "शिका", "प्रश्नोत्तरे", "किड्स वर्ल्ड", "डेमो बुक करा"], "hi": ["होम", "कक्षाएँ", "परिचय", "सीखें", "सवाल-जवाब", "किड्स वर्ल्ड", "डेमो बुक करें"]};
const PROGS_L={"mr": [{"t": "शाळेची शिकवणी", "g": "इयत्ता १–१०", "d": "इयत्ता ८ पर्यंत सर्व विषय, आणि इयत्ता ९ व १० साठी इंग्रजी, मराठी व हिंदी. मुलाच्या स्वतःच्या पाठ्यपुस्तकातून, शाळेच्या परीक्षांच्या तारखांनुसार नियोजन.", "p": ["शाळेच्या अभ्यासक्रमावरून सत्राचा आराखडा", "प्रत्येक घटक चाचणीआधी उजळणी", "दर महिन्याला WhatsApp वर प्रगती अहवाल"]}, {"t": "वाचनात अडखळणारी मुलं", "g": "इयत्ता १–२", "d": "वाचन-लेखन अवघड जाणाऱ्या मुलांसाठी ६ स्तरांचा फोनिक्स कार्यक्रम: आवाज ओळखण्यापासून पूर्ण वाक्य लिहिण्यापर्यंत.", "p": ["१० मिनिटांची सुरुवातीची चाचणी", "पालकांना दिसणारे स्तर-बॅज", "दर महिन्याला वाचनाचा वेग मोजला जातो"]}, {"t": "मराठी आणि हिंदी सोपी", "g": "इयत्ता १–१०", "d": "मराठी नसलेल्या कुटुंबांतील मुलांसाठी आणि दुसऱ्या किंवा तिसऱ्या भाषेची भीती वाटणाऱ्या प्रत्येकासाठी. वाचन, लेखन, व्याकरण आणि बोलणं.", "p": ["सारख्या दिसणाऱ्या अक्षरांसाठी सोप्या युक्त्या", "प्रत्येक वर्गात तोंडी आणि लेखी सराव", "इयत्ता ९–१० साठी बोर्ड परीक्षेची भाषा-तयारी"]}, {"t": "गणितावर प्रभुत्व", "g": "इयत्ता ३ पासून पुढे", "d": "बेरजेपासून अपूर्णांकांपर्यंत, आकडे सोपे करणाऱ्या युक्त्यांसह: २० पर्यंत पाढे, झटपट गणिताच्या युक्त्या, लसावि-मसावि आणि अपूर्णांकांवरील क्रिया.", "p": ["आधी संकल्पना, मग युक्त्या", "रोजच्या जीवनातील शाब्दिक उदाहरणे", "दोन वर्गांच्या मध्ये स्वयं-अभ्यास"]}, {"t": "परीक्षा स्प्रिंट", "g": "जानेवारी–फेब्रुवारी", "d": "अंतिम परीक्षेआधी छोटा उजळणी वर्ग, प्रत्येक मुलाच्या स्वतःच्या चुकांच्या यादीवरून, म्हणजे वेळ जिथे गरज आहे तिथेच जातो.", "p": ["शाळेच्या पद्धतीचे वेळ लावून सराव पेपर", "प्रत्येक मुलासाठी स्वतंत्र उजळणी पत्रक", "परीक्षेआधी पालकांना सूचना"]}, {"t": "उन्हाळी पूल वर्ग", "g": "एप्रिल–मे", "d": "पुढच्या इयत्तेची तयारी: या वर्षातील कमतरता भरून काढा आणि पुढच्या वर्षाच्या पहिल्या धड्यांची ओळख करून घ्या.", "p": ["सुरुवातीला कमतरता तपासणी", "वाचन आणि पाढ्यांना चालना", "पुढच्या वर्षाच्या पुस्तकाची ओळख"]}], "hi": [{"t": "स्कूल ट्यूशन", "g": "कक्षा 1–10", "d": "कक्षा 8 तक सभी विषय, और कक्षा 9 व 10 के लिए अंग्रेज़ी, मराठी और हिंदी। बच्चे की अपनी पाठ्यपुस्तक से, स्कूल टेस्ट की तारीखों के हिसाब से योजना।", "p": ["स्कूल सिलेबस से सत्र का रोडमैप", "हर यूनिट टेस्ट से पहले दोहराई", "हर महीने WhatsApp पर प्रगति रिपोर्ट"]}, {"t": "पढ़ने में कठिनाई वाले बच्चे", "g": "कक्षा 1–2", "d": "जिन बच्चों को पढ़ना-लिखना कठिन लगता है, उनके लिए 6 स्तरों का फ़ोनिक्स कार्यक्रम: आवाज़ें पहचानने से पूरे वाक्य लिखने तक।", "p": ["10 मिनट की शुरुआती जाँच", "माता-पिता को दिखने वाले स्तर-बैज", "हर महीने पढ़ने की गति मापी जाती है"]}, {"t": "मराठी और हिंदी आसान", "g": "कक्षा 1–10", "d": "गैर-मराठी परिवारों के बच्चों और दूसरी या तीसरी भाषा से डरने वाले हर बच्चे के लिए। पढ़ना, लिखना, व्याकरण और बोलना।", "p": ["एक जैसे दिखने वाले अक्षरों के लिए आसान ट्रिक्स", "हर क्लास में मौखिक और लिखित अभ्यास", "कक्षा 9–10 के लिए बोर्ड परीक्षा की भाषा-तैयारी"]}, {"t": "गणित में महारत", "g": "कक्षा 3 और ऊपर", "d": "जोड़ से भिन्न तक, उन ट्रिक्स के साथ जो अंकों को आसान बनाती हैं: 20 तक पहाड़े, तेज़ गणना की ट्रिक्स, LCM और HCF, और भिन्नों की संक्रियाएँ।", "p": ["पहले कॉन्सेप्ट, फिर ट्रिक्स", "रोज़मर्रा के शाब्दिक सवाल", "दो क्लास के बीच सेल्फ-स्टडी अभ्यास"]}, {"t": "परीक्षा स्प्रिंट", "g": "जनवरी–फ़रवरी", "d": "फ़ाइनल परीक्षा से पहले छोटा रिवीज़न बैच, हर बच्चे की अपनी गलतियों की सूची से बना, ताकि समय वहीं लगे जहाँ ज़रूरत है।", "p": ["स्कूल के फ़ॉर्मैट में समयबद्ध मॉक पेपर", "हर बच्चे के लिए अलग रिवीज़न शीट", "परीक्षा से पहले माता-पिता को नोट"]}, {"t": "समर ब्रिज", "g": "अप्रैल–मई", "d": "अगली कक्षा की तैयारी: इस साल की कमियाँ दूर करें और अगले साल के पहले पाठों की झलक लें।", "p": ["शुरुआत में कमियों की जाँच", "पढ़ने और पहाड़ों पर ज़ोर", "अगले साल की किताब की झलक"]}]};
function L(i){const r=I18N[i];return LANG==='mr'?r[1]:LANG==='hi'?r[2]:r[0]}
const progsL=()=>LANG==='en'?PROGS:PROGS_L[LANG];
function applyLang(){document.documentElement.lang=LANG==='en'?'en':LANG;const a=[...document.querySelectorAll('.top nav a')];
  if(a.length&&!a[0].dataset.en)a.forEach(x=>{x.dataset.en=x.textContent});a.forEach((x,i)=>{x.textContent=LANG==='en'?x.dataset.en:NAVL[LANG][i]});
  document.querySelectorAll('[data-act=lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===LANG)))}

/* ====== Marathi / Hindi: FAQ, booking, starting check, privacy ====== */
const TRT=[["<h1>Questions parents ask</h1><p class=\"muted lead\">Can’t find your answer? Ask on WhatsApp or book a free demo.</p>", "<h1>पालकांचे प्रश्न</h1><p class=\"muted lead\">उत्तर सापडलं नाही? WhatsApp वर विचारा किंवा मोफत डेमो बुक करा.</p>", "<h1>माता-पिता के सवाल</h1><p class=\"muted lead\">जवाब नहीं मिला? WhatsApp पर पूछें या मुफ़्त डेमो बुक करें।</p>"], ["<h1>Almost done</h1><p>Tap the button to send these details to Chetana on WhatsApp. She will reply to fix a demo time.</p>", "<h1>जवळजवळ झालं</h1><p>ही माहिती WhatsApp वर चेतना यांना पाठवण्यासाठी बटण दाबा. डेमोची वेळ ठरवण्यासाठी त्या उत्तर देतील.</p>", "<h1>लगभग हो गया</h1><p>यह जानकारी WhatsApp पर चेतना को भेजने के लिए बटन दबाएँ। डेमो का समय तय करने के लिए वे जवाब देंगी।</p>"], [">Send on WhatsApp</a>", ">WhatsApp वर पाठवा</a>", ">WhatsApp पर भेजें</a>"], [">Copy text</button>", ">मजकूर कॉपी करा</button>", ">टेक्स्ट कॉपी करें</button>"], ["<p class=\"small muted\">WhatsApp not opening? Copy the text and send it to 97301 95429.</p><button class=\"btn ghost\" data-act=\"bedit\">Change details</button>", "<p class=\"small muted\">WhatsApp उघडत नाही? मजकूर कॉपी करून 97301 95429 वर पाठवा.</p><button class=\"btn ghost\" data-act=\"bedit\">माहिती बदला</button>", "<p class=\"small muted\">WhatsApp नहीं खुल रहा? टेक्स्ट कॉपी करके 97301 95429 पर भेजें।</p><button class=\"btn ghost\" data-act=\"bedit\">जानकारी बदलें</button>"], ["<h1>Book a free demo class</h1><p class=\"muted lead\">Fill in a few details. They go to Chetana on WhatsApp and into her private enquiry list, so she can follow up. Nothing else is done with them (see <a href=\"#privacy\">Privacy</a>).</p>", "<h1>मोफत डेमो वर्ग बुक करा</h1><p class=\"muted lead\">थोडी माहिती भरा. ती WhatsApp वर चेतना यांना आणि त्यांच्या खाजगी चौकशी यादीत जाते, म्हणजे त्या संपर्क करू शकतील. तिचा इतर कोणताही वापर होत नाही (<a href=\"#privacy\">गोपनीयता</a> पाहा).</p>", "<h1>मुफ़्त डेमो क्लास बुक करें</h1><p class=\"muted lead\">कुछ जानकारी भरें। यह WhatsApp पर चेतना को और उनकी निजी पूछताछ सूची में जाती है, ताकि वे संपर्क कर सकें। इसका और कोई उपयोग नहीं होता (<a href=\"#privacy\">गोपनीयता</a> देखें)।</p>"], ["<label>Parent’s name<input", "<label>पालकांचे नाव<input", "<label>माता-पिता का नाम<input"], ["<label>Child’s first name<input", "<label>मुलाचे पहिले नाव<input", "<label>बच्चे का पहला नाम<input"], ["<label>Grade<select id=\"bk-grade\"><option value=\"\">Choose</option>", "<label>इयत्ता<select id=\"bk-grade\"><option value=\"\">निवडा</option>", "<label>कक्षा<select id=\"bk-grade\"><option value=\"\">चुनें</option>"], ["<label>Board<select id=\"bk-board\"><option>State</option><option>CBSE</option><option>ICSE</option><option>Not sure</option></select></label>", "<label>बोर्ड<select id=\"bk-board\"><option value=\"State\">स्टेट</option><option>CBSE</option><option>ICSE</option><option value=\"Not sure\">माहीत नाही</option></select></label>", "<label>बोर्ड<select id=\"bk-board\"><option value=\"State\">स्टेट</option><option>CBSE</option><option>ICSE</option><option value=\"Not sure\">पता नहीं</option></select></label>"], ["<label>School<input", "<label>शाळा<input", "<label>स्कूल<input"], ["<legend>Subjects</legend>", "<legend>विषय</legend>", "<legend>विषय</legend>"], ["<legend>Class mode</legend>", "<legend>वर्ग कसा हवा</legend>", "<legend>क्लास कैसे</legend>"], ["checked> In person at Sparklet</label>", "checked> स्पार्कलेट येथे प्रत्यक्ष</label>", "checked> स्पार्कलेट में आमने-सामने</label>"], ["value=\"Online\"> Online</label>", "value=\"Online\"> ऑनलाइन</label>", "value=\"Online\"> ऑनलाइन</label>"], ["value=\"Either\"> Either</label>", "value=\"Either\"> दोन्हीपैकी कोणतेही</label>", "value=\"Either\"> कोई भी</label>"], ["<label>Best time for the demo<select id=\"bk-time\"><option>Weekday evening</option><option>Saturday</option><option>Sunday</option><option>Any time</option></select></label>", "<label>डेमोसाठी सोयीची वेळ<select id=\"bk-time\"><option value=\"Weekday evening\">आठवड्यातील संध्याकाळ</option><option value=\"Saturday\">शनिवार</option><option value=\"Sunday\">रविवार</option><option value=\"Any time\">कधीही</option></select></label>", "<label>डेमो के लिए सही समय<select id=\"bk-time\"><option value=\"Weekday evening\">हफ़्ते के दिन की शाम</option><option value=\"Saturday\">शनिवार</option><option value=\"Sunday\">रविवार</option><option value=\"Any time\">कभी भी</option></select></label>"], ["<label>Your WhatsApp number (optional)<input", "<label>तुमचा WhatsApp नंबर (ऐच्छिक)<input", "<label>आपका WhatsApp नंबर (वैकल्पिक)<input"], ["<label>Anything Chetana should know?<textarea id=\"bk-note\" rows=\"3\" maxlength=\"300\" placeholder=\"e.g. struggles with Marathi reading, unit test next month\"></textarea></label>", "<label>चेतना यांना आणखी काही सांगायचे आहे?<textarea id=\"bk-note\" rows=\"3\" maxlength=\"300\" placeholder=\"उदा. मराठी वाचनात अडचण, पुढच्या महिन्यात घटक चाचणी\"></textarea></label>", "<label>चेतना को और कुछ बताना है?<textarea id=\"bk-note\" rows=\"3\" maxlength=\"300\" placeholder=\"जैसे मराठी पढ़ने में दिक्कत, अगले महीने यूनिट टेस्ट\"></textarea></label>"], ["<button class=\"btn go\">Continue</button></div></form>", "<button class=\"btn go\">पुढे</button></div></form>", "<button class=\"btn go\">आगे</button></div></form>"], ["<h1>Free starting check</h1>", "<h1>मोफत सुरुवातीची चाचणी</h1>", "<h1>मुफ़्त शुरुआती जाँच</h1>"], ["<p>About 10 minutes. Your child answers short questions on their own, and you get a clear picture straight away: what they are strong in, and what to work on next.</p>", "<p>सुमारे १० मिनिटे. मूल स्वतः छोटे प्रश्न सोडवते, आणि लगेच स्पष्ट चित्र मिळते: कशात पक्कं आहे आणि पुढे कशावर काम करायचं.</p>", "<p>लगभग 10 मिनट। बच्चा खुद छोटे सवाल हल करता है, और तुरंत साफ़ तस्वीर मिलती है: किसमें मज़बूत है और आगे किस पर काम करना है।</p>"], ["<li>No sign-up, nothing to pay</li><li>Results stay on this device</li><li>Send the results to Chetana in one tap if you want her advice</li>", "<li>नोंदणी नाही, पैसे नाहीत</li><li>निकाल याच डिव्हाइसवर राहतात</li><li>सल्ला हवा असल्यास एका टॅपमध्ये निकाल चेतना यांना पाठवा</li>", "<li>कोई रजिस्ट्रेशन नहीं, कोई पैसा नहीं</li><li>नतीजे इसी डिवाइस पर रहते हैं</li><li>सलाह चाहिए तो एक टैप में नतीजे चेतना को भेजें</li>"], ["<span>Child’s first name (optional)</span>", "<span>मुलाचे पहिले नाव (ऐच्छिक)</span>", "<span>बच्चे का पहला नाम (वैकल्पिक)</span>"], ["<legend>Which class is your child in?</legend>", "<legend>तुमचे मूल कोणत्या इयत्तेत आहे?</legend>", "<legend>आपका बच्चा किस कक्षा में है?</legend>"], ["> Also check Marathi/Hindi reading</label>", "> मराठी/हिंदी वाचनही तपासा</label>", "> मराठी/हिंदी पढ़ना भी जाँचें</label>"], ["Tip: sit with your child, read questions aloud if needed, but let them choose the answer. “I don’t know yet” is a fine answer.", "टीप: मुलासोबत बसा, गरज असल्यास प्रश्न मोठ्याने वाचा, पण उत्तर मुलालाच निवडू द्या. “अजून माहीत नाही” हे उत्तरही चालते.", "सुझाव: बच्चे के साथ बैठें, ज़रूरत हो तो सवाल ज़ोर से पढ़ें, पर जवाब बच्चे को ही चुनने दें। “अभी नहीं पता” भी ठीक जवाब है।"], [">Start the check</button>", ">चाचणी सुरू करा</button>", ">जाँच शुरू करें</button>"], ["<p class=\"muted\">This is a quick snapshot from ${max} questions, not an exam. It shows where to start.</p>", "<p class=\"muted\">हा ${max} प्रश्नांवरून घेतलेला झटपट अंदाज आहे, परीक्षा नाही. सुरुवात कुठून करायची ते यातून कळतं.</p>", "<p class=\"muted\">यह ${max} सवालों से ली गई झलक है, परीक्षा नहीं। इससे पता चलता है कि शुरुआत कहाँ से करें।</p>"], ["<h2>🌟 Strong</h2>", "<h2>🌟 पक्कं</h2>", "<h2>🌟 मज़बूत</h2>"], ["<h2>🌱 Getting there</h2>", "<h2>🌱 प्रगती सुरू</h2>", "<h2>🌱 सुधार हो रहा है</h2>"], ["<h2>🎯 Start here</h2>", "<h2>🎯 इथून सुरुवात</h2>", "<h2>🎯 यहाँ से शुरू करें</h2>"], ["<h2>Want a plan from Chetana?</h2><p>Send these results on WhatsApp. She will suggest where to begin and fix a free demo class.</p>", "<h2>चेतना यांच्याकडून नियोजन हवंय?</h2><p>हे निकाल WhatsApp वर पाठवा. कुठून सुरुवात करायची ते त्या सुचवतील आणि मोफत डेमो वर्ग ठरवतील.</p>", "<h2>चेतना से योजना चाहिए?</h2><p>ये नतीजे WhatsApp पर भेजें। वे बताएँगी कि कहाँ से शुरू करें और मुफ़्त डेमो क्लास तय करेंगी।</p>"], ["data-lead=\"check\">Send results on WhatsApp</a>", "data-lead=\"check\">निकाल WhatsApp वर पाठवा</a>", "data-lead=\"check\">नतीजे WhatsApp पर भेजें</a>"]];
function TRL(i){const r=TRT[i];return LANG==='mr'?r[1]:LANG==='hi'?r[2]:r[0]}
const SUBJ_L={"mr": ["इंग्रजी", "मराठी", "हिंदी", "गणित", "विज्ञान", "सर्व विषय", "वाचनासाठी मदत (इयत्ता १–२)"], "hi": ["अंग्रेज़ी", "मराठी", "हिंदी", "गणित", "विज्ञान", "सभी विषय", "पढ़ने में मदद (कक्षा 1–2)"]};
const FAQ_L={"mr": [["वर्गांविषयी", [["कोणत्या इयत्ता आणि बोर्डसाठी शिकवता?", "इयत्ता १ ते १०, स्टेट, CBSE आणि ICSE बोर्डसाठी. इयत्ता ८ पर्यंत सर्व विषय, आणि इयत्ता ९ व १० साठी इंग्रजी, मराठी आणि हिंदी."], ["विद्यार्थी कोणत्या शाळांमधून येतात?", "हिंजवडी परिसरातील अनेक शाळांमधून. चेतना प्रत्येक मुलाच्या स्वतःच्या शाळेच्या पाठ्यपुस्तकातून शिकवतात आणि त्या शाळेच्या परीक्षांच्या तारखांनुसार उजळणीचं नियोजन करतात."], ["बॅच किती मोठी असते?", "साधारण ६ ते ८ मुलांची लहान बॅच, शक्यतो शाळा, इयत्ता आणि विषयानुसार. विनंतीवरून एकास-एक वर्गही उपलब्ध."], ["वर्ग कुठे होतात?", "स्पार्कलेट, मेगापोलिस, हिंजवडी, पुणे येथे प्रत्यक्ष, किंवा Google Meet वर लाइव्ह ऑनलाइन."], ["एक वर्ग किती वेळाचा असतो?", "साधारण एक तास: झटपट उजळणी, नवीन संकल्पना, मग तोंडी आणि लेखी सराव."]]], ["शिकवणं आणि प्रगती", [["इतर शिकवण्यांपेक्षा हे वेगळं कसं?", "प्रत्येक सत्राचं नियोजन प्रोजेक्टसारखं होतं: अभ्यासक्रम आणि शाळेच्या परीक्षांच्या तारखांवरून आराखडा, धड्यांचे साप्ताहिक टप्पे, आणि प्रत्येक परीक्षेआधी मुलाच्या स्वतःच्या चुकांची उजळणी. मूल संकल्पना स्वतः समजावून सांगू शकलं तरच पुढे जातो."], ["माझ्या मुलाची प्रगती होतेय हे कसं कळेल?", "पहिल्या आठवड्यात सुरुवातीची चाचणी, एखाद्या विषयात अडकल्यास लगेच संदेश, प्रत्येक शाळेच्या परीक्षेआधी टीप, आणि दर महिन्याला WhatsApp वर प्रगती अहवाल."], ["माझं मूल मराठी किंवा हिंदीत कच्चं आहे आणि घरी ती भाषा बोलली जात नाही. मदत होईल का?", "हो. ही चेतना यांची खासियत आहे. त्या अक्षरांपासून सुरुवात करून वाचन, लेखन आणि बोलण्यापर्यंत नेतात, त्यामुळे तुम्हाला घरी शिकवावं लागत नाही."], ["अभ्यास साहित्य (learning library) म्हणजे काय?", "या वेबसाइटवरील मोफत सराव: इंग्रजी वाचन आणि व्याकरण, गणित, मराठी आणि हिंदी, 3D खेळणी आणि किड्स वर्ल्ड. विद्यार्थी आपलं पहिलं नाव आणि PIN टाइप करतात, त्यामुळे त्यांनी काय सराव केला ते चेतना पाहू शकतात."]]], ["ऑनलाइन वर्ग", [["ऑनलाइन वर्गांसाठी काय लागतं?", "कॅमेरा असलेला लॅपटॉप, टॅबलेट किंवा फोन, स्थिर इंटरनेट आणि शांत जागा. गृहपाठ WhatsApp वर फोटो म्हणून पाठवला जातो."], ["ऑनलाइन वर्ग रेकॉर्ड होतात का?", "फक्त तुमच्या लेखी परवानगीने, आणि फक्त चेतना यांना नोट्स आणि प्रगतीसाठी. रेकॉर्डिंग थोडाच काळ ठेवलं जातं आणि कधीही कोणाला दिलं जात नाही."]]], ["फी आणि प्रवेश", [["फी कशी असते?", "साधी मासिक फी, प्रत्येक महिन्याच्या सुरुवातीला. तुमच्या मुलाच्या इयत्ता आणि विषयांसाठी फी WhatsApp वर विचारा."], ["दीर्घ मुदतीचं बंधन आहे का?", "नाही. एक महिन्याची सूचना देऊन थांबवू शकता, आणि एका महिन्यापेक्षा जास्त आगाऊ फी घेतली जात नाही."], ["मूल एखादा वर्ग चुकवलं तर?", "चेतना छोटी उजळणी पाठवतात किंवा ऑनलाइन भरपाई वर्ग ठेवतात. चुकलेल्या वर्गांची फी परत दिली जात नाही."], ["सुरुवात कशी करायची?", "मोफत डेमो वर्ग बुक करा. चेतना तुमच्या मुलाला भेटतील, छोटी सुरुवातीची चाचणी घेतील आणि योग्य बॅच सुचवतील."]]]], "hi": [["कक्षाओं के बारे में", [["किन कक्षाओं और बोर्ड के लिए पढ़ाती हैं?", "कक्षा 1 से 10, स्टेट, CBSE और ICSE बोर्ड के लिए। कक्षा 8 तक सभी विषय, और कक्षा 9 व 10 के लिए अंग्रेज़ी, मराठी और हिंदी।"], ["विद्यार्थी किन स्कूलों से आते हैं?", "हिंजवडी के आसपास के कई स्कूलों से। चेतना हर बच्चे की अपनी स्कूल की पाठ्यपुस्तक से पढ़ाती हैं और उस स्कूल की टेस्ट तारीखों के हिसाब से दोहराई की योजना बनाती हैं।"], ["बैच कितना बड़ा होता है?", "लगभग 6 से 8 बच्चों का छोटा बैच, जहाँ तक हो सके स्कूल, कक्षा और विषय के हिसाब से। अनुरोध पर वन-टू-वन क्लास भी।"], ["क्लास कहाँ होती है?", "स्पार्कलेट, मेगापोलिस, हिंजवडी, पुणे में आमने-सामने, या Google Meet पर लाइव ऑनलाइन।"], ["एक क्लास कितनी लंबी होती है?", "लगभग एक घंटा: छोटी दोहराई, नया कॉन्सेप्ट, फिर मौखिक और लिखित अभ्यास।"]]], ["पढ़ाई और प्रगति", [["यह दूसरी ट्यूशन से अलग कैसे है?", "हर सत्र की योजना प्रोजेक्ट की तरह बनती है: सिलेबस और स्कूल टेस्ट की तारीखों से रोडमैप, पाठों के साप्ताहिक लक्ष्य, और हर टेस्ट से पहले बच्चे की अपनी गलतियों की दोहराई। बच्चा तभी आगे बढ़ता है जब वह खुद समझा सके।"], ["मुझे कैसे पता चलेगा कि बच्चा सुधर रहा है?", "पहले हफ़्ते में शुरुआती जाँच, किसी विषय में अटकने पर तुरंत संदेश, हर स्कूल टेस्ट से पहले नोट, और हर महीने WhatsApp पर प्रगति रिपोर्ट।"], ["मेरा बच्चा मराठी या हिंदी में कमज़ोर है और घर पर वह भाषा नहीं बोली जाती। क्या मदद मिलेगी?", "हाँ। यह चेतना की ख़ासियत है। वे अक्षरों से शुरू करके पढ़ना, लिखना और बोलना सिखाती हैं, इसलिए आपको घर पर सिखाने की ज़रूरत नहीं।"], ["लर्निंग लाइब्रेरी क्या है?", "इस वेबसाइट पर मुफ़्त अभ्यास: अंग्रेज़ी पढ़ना और व्याकरण, गणित, मराठी और हिंदी, 3D खिलौने और किड्स वर्ल्ड। विद्यार्थी अपना पहला नाम और PIN टाइप करते हैं, ताकि चेतना देख सकें कि उन्होंने क्या अभ्यास किया।"]]], ["ऑनलाइन क्लास", [["ऑनलाइन क्लास के लिए क्या चाहिए?", "कैमरे वाला लैपटॉप, टैबलेट या फ़ोन, स्थिर इंटरनेट और शांत कोना। होमवर्क WhatsApp पर फ़ोटो के रूप में भेजा जाता है।"], ["क्या ऑनलाइन क्लास रिकॉर्ड होती है?", "सिर्फ़ आपकी लिखित अनुमति से, और सिर्फ़ चेतना के नोट्स और प्रगति के लिए। रिकॉर्डिंग थोड़े समय रखी जाती है और कभी किसी को नहीं दी जाती।"]]], ["फ़ीस और दाख़िला", [["फ़ीस कैसे होती है?", "आसान मासिक फ़ीस, हर महीने की शुरुआत में। अपने बच्चे की कक्षा और विषयों की फ़ीस WhatsApp पर पूछें।"], ["क्या लंबी अवधि का बंधन है?", "नहीं। एक महीने की सूचना देकर बंद कर सकते हैं, और एक महीने से ज़्यादा की अग्रिम फ़ीस नहीं ली जाती।"], ["अगर बच्चा कोई क्लास छोड़ दे तो?", "चेतना छोटी दोहराई भेजती हैं या ऑनलाइन भरपाई क्लास रखती हैं। छूटी हुई क्लास की फ़ीस वापस नहीं होती।"], ["शुरुआत कैसे करें?", "मुफ़्त डेमो क्लास बुक करें। चेतना आपके बच्चे से मिलेंगी, छोटी शुरुआती जाँच करेंगी और सही बैच सुझाएँगी।"]]]]};
const PRIV_L={"mr": "<section class=\"stack\"><h1>गोपनीयता</h1><p class=\"lead\">थोडक्यात आणि सोप्या भाषेत: आम्ही काय ठेवतो, का, आणि ते कसं काढून टाकायचं.</p></section>\n<section class=\"card stack prose\">\n<h2>तुमच्या मुलाविषयी आम्ही काय ठेवतो</h2><p>चांगलं शिकवण्यासाठी आवश्यक तेवढंच: <b>पहिलं नाव</b>, इयत्ता, बोर्ड आणि शाळा, बॅच, उपस्थिती, वर्गातील नोंदी, या वेबसाइटवरील सरावाचे गुण, फी भरणा, आणि चाचणी पेपर किंवा गृहपाठाचे फोटो यांसारखी कागदपत्रे (चेतना यांच्या खाजगी Google Drive मध्ये). पालकांसाठी: तुमचं नाव आणि WhatsApp नंबर, अहवाल आणि आठवण पाठवण्यासाठी.</p>\n<p>आम्ही मुलांची आडनावं, मुलांचे फोटो किंवा व्हिडिओ, घरचा पत्ता, आधार किंवा कोणतेही ओळखपत्र क्रमांक, किंवा बँक किंवा कार्डची माहिती <b>ठेवत नाही</b>.</p>\n<h2>का</h2><p>तुमच्या मुलाच्या अभ्यासाचं नियोजन, प्रगतीची नोंद, मासिक अहवाल आणि फीचं व्यवस्थापन करण्यासाठी. एवढंच. तुमची माहिती आम्ही कधीही विकत नाही, कोणाला देत नाही किंवा जाहिरातीसाठी वापरत नाही, आणि जाहिरात किंवा ट्रॅकिंग कुकीज वापरत नाही.</p>\n<h2>कोण पाहू शकतं</h2><p>फक्त चेतना, आणि त्यांनी जोडलेले कोणतेही शिक्षक, जे फक्त स्वतःच्या बॅचची उपस्थिती, नोंदी आणि सराव पाहू शकतात (पालकांचे नंबर किंवा फी कधीच नाही). नोंदी चेतना यांच्या खात्यातील खाजगी Google Sheet मध्ये, 2-step verification ने सुरक्षित ठेवल्या जातात. मुलाच्या स्वतःच्या लॉगिनमध्ये (पहिलं नाव आणि ४ अंकी PIN) फक्त त्या मुलाचे सरावाचे तारे आणि मिशन दिसतात.</p>\n<h2>लॉगिन न करता सराव</h2><p>मुलं लॉगिन न करता अभ्यास साहित्य, किड्स वर्ल्ड, पुणे राइड आणि सुरुवातीची चाचणी वापरू शकतात. ते निकाल तुमच्याच डिव्हाइसवर राहतात. तुम्ही सुरुवातीच्या चाचणीचे निकाल चेतना यांना पाठवले किंवा डेमो बुक केला, तर ती माहिती पाठपुराव्यासाठी त्यांच्या खाजगी चौकशी यादीतही जाते.</p>\n<h2>तुमची संमती</h2><p>पालक किंवा पालकत्व असलेल्या व्यक्तीने संमती दिल्यानंतरच आम्ही मुलाची नोंद करतो. तुम्ही कधीही संमती मागे घेऊ शकता.</p>\n<h2>पाहा, दुरुस्त करा किंवा काढून टाका</h2><p>आमच्याकडे काय आहे ते पाहण्यासाठी, दुरुस्त करण्यासाठी किंवा काढून टाकण्यासाठी चेतना यांना WhatsApp वर संदेश पाठवा. विनंतीनंतर ७ दिवसांत मुलाची नोंद काढून टाकली जाते. १२ महिन्यांपूर्वी सोडून गेलेल्या मुलांच्या नोंदी (हिशोबासाठी फीच्या नोंदी सोडून), आणि १२ महिन्यांत वर्गात न रूपांतरित झालेल्या चौकशा आपोआप काढून टाकल्या जातात.</p>\n<h2>काही चुकलं तर</h2><p>तुमच्या मुलाची माहिती चुकून कोणी पाहिली असं आढळलं, तर आम्ही तुम्हाला लगेच कळवू आणि त्यावर काय करत आहोत ते सांगू.</p>\n<p class=\"small muted\">शेवटचा बदल: नोव्हेंबर २०२६. काही फरक आढळल्यास इंग्रजी आवृत्ती ग्राह्य.</p>", "hi": "<section class=\"stack\"><h1>गोपनीयता</h1><p class=\"lead\">छोटा और सीधा: हम क्या रखते हैं, क्यों, और उसे कैसे हटवाएँ।</p></section>\n<section class=\"card stack prose\">\n<h2>आपके बच्चे के बारे में हम क्या रखते हैं</h2><p>अच्छी तरह पढ़ाने के लिए जितना ज़रूरी: <b>पहला नाम</b>, कक्षा, बोर्ड और स्कूल, बैच, हाज़िरी, क्लास के नोट्स, इस वेबसाइट पर अभ्यास के अंक, फ़ीस का भुगतान, और टेस्ट पेपर या होमवर्क की फ़ोटो जैसे दस्तावेज़ (चेतना की निजी Google Drive में)। माता-पिता के लिए: आपका नाम और WhatsApp नंबर, रिपोर्ट और याद दिलाने के लिए।</p>\n<p>हम बच्चों के उपनाम, बच्चों की फ़ोटो या वीडियो, घर का पता, आधार या कोई भी पहचान-पत्र नंबर, या बैंक या कार्ड की जानकारी <b>नहीं रखते</b>।</p>\n<h2>क्यों</h2><p>आपके बच्चे की पढ़ाई की योजना, प्रगति का रिकॉर्ड, मासिक रिपोर्ट और फ़ीस के प्रबंधन के लिए। बस इतना ही। हम आपकी जानकारी कभी बेचते नहीं, किसी को देते नहीं, विज्ञापन के लिए इस्तेमाल नहीं करते, और विज्ञापन या ट्रैकिंग कुकीज़ का उपयोग नहीं करते।</p>\n<h2>कौन देख सकता है</h2><p>सिर्फ़ चेतना, और उनके जोड़े हुए कोई भी शिक्षक, जो सिर्फ़ अपने बैच की हाज़िरी, नोट्स और अभ्यास देख सकते हैं (माता-पिता के नंबर या फ़ीस कभी नहीं)। रिकॉर्ड चेतना के खाते की निजी Google Sheet में, 2-step verification से सुरक्षित रखे जाते हैं। बच्चे के अपने लॉगिन में (पहला नाम और 4 अंकों का PIN) सिर्फ़ उसी बच्चे के अभ्यास के सितारे और मिशन दिखते हैं।</p>\n<h2>बिना लॉगिन के अभ्यास</h2><p>बच्चे बिना लॉगिन के पढ़ाई सामग्री, किड्स वर्ल्ड, पुणे राइड और शुरुआती जाँच इस्तेमाल कर सकते हैं। वे नतीजे आपके ही डिवाइस पर रहते हैं। अगर आप शुरुआती जाँच के नतीजे चेतना को भेजते हैं या डेमो बुक करते हैं, तो वह जानकारी संपर्क के लिए उनकी निजी पूछताछ सूची में भी जाती है।</p>\n<h2>आपकी सहमति</h2><p>हम किसी बच्चे को तभी जोड़ते हैं जब माता-पिता या अभिभावक सहमति दें। आप कभी भी सहमति वापस ले सकते हैं।</p>\n<h2>देखें, सुधारें या हटवाएँ</h2><p>हमारे पास क्या है यह देखने, सुधारने या हटवाने के लिए चेतना को WhatsApp पर संदेश भेजें। अनुरोध के 7 दिनों के अंदर बच्चे का रिकॉर्ड हटा दिया जाता है। 12 महीने से पहले छोड़ चुके बच्चों के रिकॉर्ड (हिसाब के लिए फ़ीस की प्रविष्टियों को छोड़कर), और 12 महीनों में क्लास में न बदली पूछताछ अपने-आप हट जाती हैं।</p>\n<h2>अगर कुछ गलत हो</h2><p>अगर हमें पता चले कि आपके बच्चे की जानकारी किसी ऐसे व्यक्ति ने देखी जिसे नहीं देखनी चाहिए थी, तो हम आपको तुरंत बताएँगे और समझाएँगे कि हम क्या कर रहे हैं।</p>\n<p class=\"small muted\">आख़िरी बदलाव: नवंबर 2026। किसी अंतर की स्थिति में अंग्रेज़ी संस्करण मान्य होगा।</p>"};
const PROGS=[
 {t:'School tuition',g:'Grades 1–10',d:'All subjects up to Grade 8, and English, Marathi and Hindi for Grades 9 and 10. Taught from your child’s own textbook and planned around school test dates.',p:['Term roadmap from the school syllabus','Revision before every unit test','Monthly progress report on WhatsApp']},
 {t:'Struggling readers',g:'Grades 1–2',d:'A 6-level phonics programme for children who find reading and writing hard, from hearing sounds to writing full sentences.',p:['10-minute starting check','Level badges parents can see','Reading speed measured every month']},
 {t:'Marathi and Hindi made easy',g:'Grades 1–10',d:'For children from non-Marathi families and anyone who fears the second or third language. Reading, writing, grammar and speaking.',p:['Look-alike letters fixed with simple tricks','Oral and written practice every class','Board-exam language preparation for Grades 9–10']},
 {t:'Maths mastery',g:'Grade 3 and up',d:'From addition to fractions, with the tricks that make numbers easy: tables to 20, speed tricks, LCM and HCF, and fraction operations.',p:['Concept first, then tricks','Real-life word problems','Self-study practice between classes']},
 {t:'Exam sprint',g:'January–February',d:'A short revision batch before final exams, built from each child’s own mistake bank so time goes where it is needed.',p:['Timed mock papers in school format','Personal revision sheet per child','Pre-exam note to parents']},
 {t:'Summer bridge',g:'April–May',d:'Get ready for the next grade: close the gaps from this year and preview next year’s first chapters.',p:['Gap check at the start','Reading and tables boost','Preview of next year’s book']}];
function progCard(x){return `<div class="card stack prog"><span class="pill">${x.g}</span><h3>${x.t}</h3><p>${x.d}</p><ul>${x.p.map(i=>`<li>${i}</li>`).join('')}</ul></div>`}
function programmes(){return `<section class="stack">${L(28)}</section>
<section class="grid">${progsL().map(progCard).join('')}</section>
<section class="card stack">${L(29)}<div class="grid">
<div>${L(30)}</div>
<div>${L(31)}</div>
<div>${L(32)}</div>
<div>${L(33)}</div></div></section>
${contactBlock()}`}
function about(){return `<section class="aboutme"><img class="me" src="img/chetana.jpg" alt="Chetana" width="420" height="525"><div class="stack">${L(34)}</div></section>
<section class="grid">
<div class="card step">${L(35)}</div>
<div class="card step">${L(36)}</div>
<div class="card step">${L(37)}</div>
<div class="card step">${L(38)}</div></section>
<section class="quote">${L(39)}</section>
<section class="card stack">${L(40)}</section>
${contactBlock()}`}
function learn(){return `<a class="kwban" href="#world"><span class="kwban-isl" aria-hidden="true">🏝️</span><span><b>Enter Kids’ World</b><span>The fun way in: a 3D island map for children.</span></span></a>
<section class="stack"><h1>Learning library</h1><p class="muted lead">Free for every student. Pick your name in Quick missions to save stars and progress, so Chetana can see what you have practised.</p></section>
<section class="grid">
<a class="card lib big" href="#phonics"><span class="pill">Grades 1–2</span><b>English reading and writing</b><span>7 chapters, from hearing sounds to writing sentences. Pictures, letter tiles and animations.</span></a>
<a class="card lib big" href="#grammar"><span class="pill">Grade 3 and up</span><b>English grammar</b><span>9 chapters: nouns, pronouns, tenses, adjectives and adverbs, articles, prepositions, agreement, punctuation, conjunctions. 50 questions each.</span></a>
<a class="card lib big" href="#maths"><span class="pill">Grade 3 and up</span><b>Maths</b><span>14 chapters with a concept page and 50 practice questions each, including real-life problems.</span></a>
<a class="card lib big" href="#bhasha"><span class="pill">Beginners, Grade 1 up</span><b>Marathi &amp; Hindi</b><span>10 chapters on the Devanagari script: every vowel and consonant, look-alikes, the full barakhadi, nasal marks, joint letters, words and numbers.</span></a>
<a class="card lib big" href="#mgram"><span class="pill">Grade 3 and up</span><b>Marathi grammar <span class="dev">मराठी व्याकरण</span></b><span>6 chapters: parts of speech, gender (तो/ती/ते), number, opposites, same-meaning words, tense. 50 questions each.</span></a>
<a class="card lib big" href="#hgram"><span class="pill">Grade 3 and up</span><b>Hindi grammar <span class="dev">हिंदी व्याकरण</span></b><span>6 chapters: parts of speech, gender, number, opposites, synonyms, tense. 50 questions each.</span></a>
<a class="card lib big" href="#toys"><span class="pill">All ages</span><b>3D toys</b><span>Turn 3D shapes and count faces, edges and corners; build numbers with place-value blocks; slice a fraction cake.</span></a>
<a class="card lib big" href="#practice"><span class="pill">All ages</span><b>Practice: mistakes and mixed tests</b><span>Fix the questions you got wrong, take a 20-question mixed revision test, and see this week’s quest.</span></a>
<a class="card lib big" href="#kids"><span class="pill">All ages</span><b>Quick missions</b><span>10-question games: times tables, earn and owe, Marathi letters, -ed sounds, magic e.</span></a></section>
<section class="card stack"><h2>For teachers</h2><p class="muted">Each library has a Teacher guide tab with the big idea, how to teach it, and the mistakes to watch for.</p></section>`}
function contactBlock(){return `<section class="contact"><div>${L(41)}<p class="small">WhatsApp: wa.me/919730195429</p></div><div class="row">${L(42)}<a class="btn" href="#guide">${LANG==='mr'?'पालक मार्गदर्शिका':LANG==='hi'?'माता-पिता गाइड':'Parent guide'}</a></div></section>`}

function pad(title,sub,needOk){return `<section class="card stack center"><h2>${esc(title)}</h2>${sub?`<p class="muted">${esc(sub)}</p>`:''}
<div class="dots" role="status" aria-label="${buf.length} digits entered">${'●'.repeat(buf.length)||' '}</div>
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
${kidAssigned()}${tonight()}
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
function next(){sess.i++;sess.input='';if(sess.i>=sess.q.length){sess.phase='done';qev('mission');const d=today();kid.sessions=(kid.sessions||[]).filter(x=>x!==d).concat(d).slice(-90);saveKid()}else sess.phase='ask';render()}
function toast(t,bad){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
  el.textContent=t;el.className=bad?'show bad':'show';clearTimeout(el._t);el._t=setTimeout(()=>{el.className=''},6000)}
function tfail(e){if(/Google sign-in/.test(e.message)){gTok=null;tdata=null;tpin='';msg='Please sign in with Google again.';render();return}const m=e.message==='Wrong PIN'?'Wrong PIN. Try again.':/Too many/.test(e.message)?e.message:e.message==='offline'?'No internet connection. Nothing was lost: check the connection and tap Save again.':'Could not save: '+e.message;
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
  tlock(){tpin='';tdata=null;tsel=null;gTok=null;tTedit=null;tview='today';msg='';try{google.accounts.id.disableAutoSelect()}catch(e){}render()},
  ttab(d){tview=d.t;tsel=null;trm=null;armed=null;msg='';render()},
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
function say(t,lang){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.85;u.lang=lang||'en-IN';
  const vs=speechSynthesis.getVoices();
  if(vs.length&&/^(hi|mr)/.test(u.lang)){const v=(u.lang.startsWith('mr')&&vs.find(x=>/^mr/i.test(x.lang)))||vs.find(x=>/^hi/i.test(x.lang));
    if(v)u.voice=v;else{toast('This phone has no Hindi voice yet. Android: Settings → Text-to-speech → install Hindi. iPhone: Settings → Accessibility → Spoken Content → Voices → Hindi.',true);return}}
  speechSynthesis.speak(u)}catch(e){}}
if('speechSynthesis' in window){try{speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>{}}catch(e){}}
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
/* ====== chapter modules: shared engine ====== */
const MODS={phonics:{name:'Phonics',title:'Phonics: reading and writing',key:'ph',ch:PH,guide:GUIDE,gnote:'A quick reference for teaching reading and writing in Grades 1 and 2. The Kids\u2019 self study chapters follow the same levels. The full guide with printable worksheets is in the Reading &amp; Writing Made Easy document.'},
 maths:{name:'Maths',title:'Maths: from adding to fractions',key:'ma',ch:null,guide:null,src:'mod-maths.js',n:14,gnote:'A quick reference for each maths chapter: the big idea, how to teach it, the tricks, and the mistakes to watch for. The Kids\u2019 self study chapters follow the same order.'}};
let cm='phonics';
/* ====== lesson modules load only when needed ====== */
const modLoading={};
function loadMod(m){const M=MODS[m];if(!M||M.ch)return Promise.resolve();
  return modLoading[m]=modLoading[m]||new Promise((res,rej)=>{const s=document.createElement('script');s.src=M.src;s.onload=res;s.onerror=()=>{delete modLoading[m];rej(Error('offline'))};document.head.appendChild(s)})}
const loadAllMods=()=>Promise.all(Object.keys(MODS).map(loadMod));
window.loadAllMods=loadAllMods;
function needMods(list){const miss=list.filter(m=>MODS[m]&&!MODS[m].ch);if(!miss.length)return true;
  Promise.all(miss.map(loadMod)).then(render).catch(()=>{app.innerHTML='<section class="card"><p>Could not load this part of the site. Check the internet and try again.</p></section>'});return false}

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
function phMark(ok){if(!ok)mxAdd(cm,ps.ch,ps.q[ps.i]);if(ok){ps.right++;ps.phase='ok';render();const cur=ps;setTimeout(()=>{if(ps===cur&&ps.phase==='ok')phNext()},1300)}else{ps.phase='bad';render()}}
function phNext(){ps.i++;ps.built=[];ps.input='';if(ps.i>=ps.q.length){ps.phase='done';phSave()}else ps.phase='ask';render()}
function phSave(){if(ps.set!=null&&ps.right>=7)qev('set');const k=MODS[cm].key+ps.ch+(ps.set!=null?'_'+ps.set:''),up=o=>({b:Math.max((o||{}).b||0,ps.right),n:((o||{}).n||0)+1});
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
  ['What is the learning library?','Free practice on this website: English reading and grammar, Maths, Marathi and Hindi, 3D toys and Kids’ World. Students type their first name and PIN so Chetana can see what they have practised.']]],
 ['Online classes',[
  ['What do we need for online classes?','A laptop, tablet or phone with a camera, a steady internet connection and a quiet corner. Homework is sent as a photo on WhatsApp.'],
  ['Are online classes recorded?','Only with your written permission, and only so Chetana can make class notes and track progress. Recordings are kept briefly and are never shared.']]],
 ['Fees and joining',[
  ['How do fees work?','Simple monthly fees, paid at the start of each month. Ask on WhatsApp for the fee for your child’s grade and subjects.'],
  ['Is there a long-term commitment?','No. You can stop with one month’s notice, and there is no advance payment for more than a month.'],
  ['What happens if my child misses a class?','Chetana shares a short recap or arranges an online catch-up. Fees are not refunded for missed classes.'],
  ['How do we start?','Book a free demo class. Chetana will meet your child, do a short starting check, and suggest the right batch.']]]];
function faq(){return `<section class="stack">${TRL(0)}</section>
${(LANG==='en'?FAQ:FAQ_L[LANG]).map(([g,qs])=>`<section class="stack"><h2>${g}</h2>${qs.map(([q,a])=>`<details class="card qa"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`).join('')}
${contactBlock()}`}
const SUBJ=['English','Marathi','Hindi','Maths','Science','All subjects','Reading help (Grades 1–2)'];
let booked=null;
function book(){if(booked)return `<section class="card stack">${TRL(1)}
<pre class="msg">${esc(booked)}</pre>
<div class="row"><a class="btn go" href="https://wa.me/919730195429?text=${encodeURIComponent(booked)}"${TRL(2)}<button class="btn" data-act="bcopy"${TRL(3)}<span id="bcopied" class="pill ok" hidden>Copied</span></div>
${bookSaved==='ok'?'<p class="pill ok">Saved in Chetana\u2019s enquiry list. Sending it on WhatsApp too gets the quickest reply.</p>':bookSaved==='no'?'<p class="pill bad">Could not save it online, so please send it on WhatsApp.</p>':''}
${TRL(4)}</section>`;
 return `<section class="stack">${TRL(5)}</section>
<form class="card stack" data-form="book" novalidate>
${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}
<div class="row">${TRL(6)} id="bk-parent" required maxlength="40" autocomplete="name"></label>${TRL(7)} id="bk-child" maxlength="20"></label></div>
<div class="row">${TRL(8)}${[1,2,3,4,5,6,7,8,9,10].map(g=>`<option>${g}</option>`).join('')}</select></label>
${TRL(9)}
${TRL(10)} id="bk-school" maxlength="40"></label></div>
<fieldset class="ck">${TRL(11)}${SUBJ.map((x,i)=>`<label class="chk"><input type="checkbox" id="bk-s${i}" value="${x}"> ${LANG==='en'?x:SUBJ_L[LANG][i]}</label>`).join('')}</fieldset>
<fieldset class="ck">${TRL(12)}<label class="chk"><input type="radio" name="bk-mode" value="In person at Sparklet" ${TRL(13)}<label class="chk"><input type="radio" name="bk-mode" ${TRL(14)}<label class="chk"><input type="radio" name="bk-mode" ${TRL(15)}</fieldset>
<div class="row">${TRL(16)}</div>
<div class="row">${TRL(17)} id="bk-phone" type="tel" inputmode="tel" maxlength="16" autocomplete="tel"></label></div>
<label class="hp" aria-hidden="true">Website<input id="bk-web" tabindex="-1" autocomplete="off"></label>
${TRL(18)}
<div class="row">${TRL(19)}`}
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
MODS.bhasha={name:'Marathi & Hindi',title:'Marathi & Hindi: reading and writing',key:'bh',ch:null,guide:null,src:'mod-bhasha.js',n:10,gnote:'A quick reference for teaching Devanagari reading and writing to beginners. The Kids’ self study has 10 chapters in the same order, each with a full concept page and 50 practice questions. Picture words are the same in Marathi and Hindi; the last guide sections cover where the two languages differ.'};

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
MODS.grammar={name:'English grammar',title:'English grammar: Grade 3 and up',key:'gr',ch:null,guide:null,src:'mod-grammar.js',n:9,gnote:'A quick reference for teaching each grammar chapter: how to introduce it, activities, and the mistakes to watch for. The Kids’ self study chapters follow the same order, each with a concept page and 50 practice questions.'};
MODS.mgram={name:'Marathi grammar',title:'Marathi grammar (मराठी व्याकरण)',key:'mg',ch:null,guide:null,src:'mod-mgram.js',n:6,gnote:'Teaching notes for each Marathi grammar chapter. Every chapter has a concept page and 50 practice questions. All word lists are at the top of mod-mgram.js, so they are easy to correct or extend.'};
MODS.hgram={name:'Hindi grammar',title:'Hindi grammar (हिंदी व्याकरण)',key:'hg',ch:null,guide:null,src:'mod-hgram.js',n:6,gnote:'Teaching notes for each Hindi grammar chapter. Every chapter has a concept page and 50 practice questions. All word lists are at the top of mod-hgram.js, so they are easy to correct or extend.'};

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
  ${questCard()}
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
  if(!ck){const last=ls.get('ct_check');return `<section class="card stack ckhero">${TRL(20)}
  ${TRL(21)}
  <ul class="ckpts">${TRL(22)}</ul></section>
  <section class="card stack"><label class="fld">${TRL(23)}<input id="ckname" maxlength="30" autocomplete="off" value="${kid?esc(kid.name):''}"></label>
  <fieldset class="fld">${TRL(24)}<div class="row">${Object.keys(CKB).map((k,i)=>`<label class="ckband"><input type="radio" name="ckb" value="${k}"${i===0?' checked':''}> ${CKB[k].name}</label>`).join('')}</div></fieldset>
  <label class="ckband"><input type="checkbox" id="ckbh"${TRL(25)}
  <p class="small muted">${TRL(26)}</p>
  <button class="btn go big" data-act="ckgo"${TRL(27)}
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
  ${TRL(28)}</section>
  <div class="ckgrid">
   <section class="card stack">${TRL(29)}<ul class="cklist">${li(g,'g')||'<li class="muted">Nothing yet, and that is fine.</li>'}</ul></section>
   <section class="card stack">${TRL(30)}<ul class="cklist">${li(d,'d')||'<li class="muted">None</li>'}</ul></section>
   <section class="card stack">${TRL(31)}<ul class="cklist">${li(w,'w')||'<li class="muted">No weak spots in this check!</li>'}</ul></section></div>
  <section class="card stack ckcta">${TRL(32)}
  <div class="row"><a class="btn go big" href="https://wa.me/919730195429?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" ${TRL(33)}<a class="btn" href="#world">Practise in Kids’ World</a><button class="btn ghost" data-act="ckagain">Check again</button></div></section>`}
Object.assign(acts,{
 ckgo(){const b=(document.querySelector('input[name=ckb]:checked')||{}).value||'g12',bh=document.getElementById('ckbh').checked,nm=(document.getElementById('ckname').value||'').trim().slice(0,30);
 loadAllMods().then(()=>{ckStart(b,bh,nm);render();window.scrollTo(0,0)}).catch(()=>toast('Could not load the questions. Check the internet.',true))},
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
 return `<div class="pz-map"><svg viewBox="0 0 360 480" role="group" aria-label="Map of Pune with ${PSTOPS.length} stops">
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
 pznext(){pz.n++;pz.fb=null;if(pz.n>=5){pz.phase='done';if(pz.right>=4){const pr=pzProg(),s=PSTOPS[pz.i];if(pr.done.indexOf(s.id)<0){pr.done.push(s.id);qev('pune')}pr.at=Math.max(pr.at,Math.min(pz.i+1,PSTOPS.length-1));ls.set('ct_pune',pr);if(kid){kid.stars=(kid.stars||0)+pz.right;saveKid()}}}else pzNewQ();render()},
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
  if(!tdata&&SYNC_URL&&CFG.GOOGLE_CLIENT_ID&&!gTok)return googleGate();
  if(!tdata){const first=!SYNC_URL&&!db().tpin;return pad(first?'Choose a teacher PIN':'Teacher PIN',first?'6 digits or more. Remember it: it protects this page.':'',true)}
  const own=isOwner(),tabs=own?[['today','Today'],['students','Students'],['notes','Notes'],['roadmaps','Roadmaps'],['assign','Assign'],['worksheets','Worksheets'],['cards','Cards'],['batches','Batches'],['fees','Fees'],['enquiries','Leads'],['help','Setup']]:[['today','Today'],['students','Students'],['notes','Notes'],['roadmaps','Roadmaps'],['assign','Assign'],['worksheets','Worksheets'],['cards','Cards'],['help','Help']];
  if(!own&&['batches','fees','enquiries','reports'].indexOf(tview)>=0)tview='today';
  const body=tview==='assign'?assignSection():tview==='worksheets'?worksheetsView():tview==='cards'?cardsView():tview==='notes'?notesView():tview==='roadmaps'?roadmapsView():tview==='reports'?reportsView():tview==='fees'&&treceipt?receiptView():tview==='today'?todayView():tview==='students'?(tsel?(own?studentDetail():teacherStudentDetail()):studentList()):tview==='batches'?batchesView():tview==='fees'?feesView():tview==='enquiries'?enquiries():help();
  return `<section class="stack"><div class="row"><h1 style="margin-right:auto">${own?'Teacher console':'Hello, '+esc(tdata.me.name)}</h1><button class="btn ghost" data-act="tlock">Lock</button></div>
  <div class="tabs tc-tabs">${tabs.map(([k,l])=>`<button class="btn" data-act="ttab" data-t="${k}" aria-pressed="${tview===k||(tview==='reports'&&k==='students')}">${l}</button>`).join('')}</div>
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
  ${(()=>{const hm=hwMissingAll();return hm.length?`<section class="card stack"><h3>\ud83d\udcda Homework missing (last 2 weeks)</h3>${hm.slice(0,8).map(x=>`<p class="small" style="margin:0">${x}</p>`).join('')}</section>`:''})()}
  ${(()=>{const al=rmAlerts();return al.length?`<section class="card stack rmalert"><h3>\u23f0 Roadmap alerts</h3>${al.map(x=>`<p>${x}</p>`).join('')}<button class="btn" data-act="ttab" data-t="roadmaps">Open roadmaps</button></section>`:''})()}
  ${isOwner()?`<section class="tc-stats"><button class="card center tc-stat" data-act="ttab" data-t="fees"><div class="stat">${feeDue.length}</div><div class="muted small">fees pending for ${monthName(m).split(' ')[0]}</div></button>
   <button class="card center tc-stat" data-act="ttab" data-t="enquiries"><div class="stat">${newL.length}</div><div class="muted small">leads to follow up</div></button>
   <button class="card center tc-stat" data-act="ttab" data-t="students"><div class="stat">${active().length}</div><div class="muted small">active students</div></button></section>`:''}
  ${newL.slice(0,3).length?`<section class="card stack"><h3>Follow up today</h3>${newL.slice(0,3).map(e=>{const l=waLink(e.phone,`Hello ${e.parent}, this is Chetana from Chetana’s Tutoring. Following up about classes for your child. When would suit you for a free demo?`);return `<div class="item"><div class="grow"><b>${esc(e.parent)}</b> <span class="small muted">${esc(e.status)} · ${esc(e.date)}</span>${e.note?`<div class="small">${esc(e.note)}</div>`:''}</div>${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`}).join('')}</section>`:''}`}

function classLog(){const b=T('batches').find(x=>x.id===tcls);if(!b){tcls=null;return todayView()}
  const id=clsId(b.id,tdate),c=T('classes').find(x=>x.id===id)||{},ss=inBatch(b),abs=c.absent||[],notes=c.notes||{};
  return `<div class="row"><button class="btn" data-act="tclose">← Today</button></div>
  <form class="card stack" data-form="savecls"><h2>${esc(b.name)}</h2><p class="muted">${prettyDate(tdate)} · ${esc(b.time||'')}</p>
  <fieldset class="fld"><legend>Attendance: tap a name to mark absent</legend><div class="tc-att">${ss.length?ss.map(s=>`<label class="tc-kid"><input type="checkbox" name="att" value="${s.id}" ${abs.indexOf(s.id)<0?'checked':''}><span>${esc(s.name)}</span></label>`).join(''):'<p class="muted">No students in this batch yet. Set the batch on each student’s page.</p>'}</div></fieldset>
  ${hwCheckBlock(b)}
  <label>What I taught<input id="cl-topic" maxlength="120" value="${esc(c.topic||'')}" placeholder="e.g. Fractions: equivalent fractions"></label>
  ${(()=>{const rs=T('roadmaps').filter(r=>r.batch===b.id&&(r.chapters||[]).some(ch=>!ch.done||ch.done===tdate));return rs.length?`<fieldset class="fld"><legend>Chapters finished today (roadmap)</legend>${rs.map(r=>`<div class="row">${r.chapters.map((ch,i)=>!ch.done||ch.done===tdate?`<label class="ckband"><input type="checkbox" name="rmc" value="${r.id}|${i}" ${ch.done===tdate?'checked':''}> ${esc(r.subject)}: ${esc(ch.t)}</label>`:'').join('')}</div>`).join('')}</fieldset>`:''})()}
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
  ${got.map(s=>{const f=feeRec(s,m);return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="pill ok">Paid</span><div class="small muted">${rupee(f.amount)} · ${esc(f.mode)} · ${esc(f.date)}</div></div><button class="btn" data-act="treceipt" data-id="${f.id}">Receipt</button><button class="btn ghost" data-act="tunpaid" data-id="${s.id}">${armed==='f'+s.id?'Tap again to undo':'Undo'}</button></div>`}).join('')}</section>`}

/* ---------- Students ---------- */
function studentList(){const all=T('students').slice().sort((a,b)=>a.name.localeCompare(b.name)),ss=all.filter(s=>s.status!=='left'),left=all.filter(s=>s.status==='left'),m=today().slice(0,7);
  const row=s=>{const tr=tricky(s),b=batchOf(s),f=+s.fee>0?(feeRec(s,m)||{}).paid:null,a=attend(s,m);return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="muted small">Grade ${esc(s.grade||'?')}${s.board?' · '+esc(s.board):''}</span>
   <div class="small muted">${b?esc(b.name):'No batch'} · attended ${a.p}/${a.t} this month · ★ ${s.stars||0}</div></div>
   ${f===false?'<span class="pill bad">Fee due</span>':''}${tr.length?`<span class="pill">${tr.length} tricky</span>`:''}<button class="btn" data-act="tsel" data-id="${esc(s.id)}">Open</button></div>`};
  if(!isOwner())return `<section class="card">${ss.map(row).join('')||'<p class="muted">No students in your batches yet.</p>'}</section>`;
  return `${ss.length?`<div class="row"><button class="btn go" data-act="treports">Weekly updates and monthly reports</button></div>`:''}<section class="card">${ss.length?ss.map(row).join(''):`<p class="muted">No students yet. Add the first one below.</p>`}</section>
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
  {const mf=m+'-01',hs=hwStats(s.id,mf,m+'-31');if(hs.t)lines.push(`Homework this month: ${hs.d} done${hs.l?', '+hs.l+' late':''}${hs.m?', '+hs.m+' missing':''}`);const ml=marksLine(s,mf);if(ml)lines.push(ml)}
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
  <section class="card stack"><h3>Notes</h3>${notesFor(s.id).slice(0,8).map(noteRow).join('')||'<p class="muted small">No notes yet.</p>'}${noteForm(s.id)}</section>
  ${marksSection(s)}
  ${docsSection(s)}
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
function help(){if(!isOwner())return `<section class="card stack"><h3>How to use this</h3><p>After each class, open <b>Today</b>, tap your batch, untick absent children, and note what you taught and the homework. Open a student to update their reading level, note or mistake bank.</p><p>Lock this page when you hand the phone to a child.</p></section>`;
  return `<section class="card stack">${teachersSection()}</section><section class="card stack"><h3>Where the data lives</h3>
  <p>${SYNC_URL?'<span class="pill ok">Synced</span> Saved in your private Google Sheet. Every device sees the same data.':'<span class="pill bad">This device only</span> Saved in this browser only. Clearing the browser deletes it, so download a backup regularly. The README explains the free Google Sheet setup.'}</p>
  <div class="row"><button class="btn" data-act="tbackup">Download a backup</button></div>
  <h3>Put it on your phone like an app</h3><p>Open the website in Chrome on your phone, tap the ⋮ menu, then <b>Add to Home screen</b> (on iPhone: Safari, Share, <b>Add to Home Screen</b>). It opens full-screen, and the Today screen still opens on weak internet.</p>
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
    const ticks=[...document.querySelectorAll('input[name=rmc]')].map(x=>[x.value,x.checked]);tcls=null;
    tPutK('classes',c).then(()=>{const by={};ticks.forEach(([v,on])=>{const[rid,i]=v.split('|'),r=T('roadmaps').find(x=>x.id===rid);if(!r)return;const ch=r.chapters[+i],want=on?tdate:(ch.done===tdate?'':ch.done);if(ch.done!==want){ch.done=want;by[rid]=r}});
      return Promise.all(Object.values(by).map(saveRm))})},
  addenq(){const e={id:newId('e'),parent:val('ae-parent'),child:val('ae-child'),grade:val('ae-grade'),phone:val('ae-phone'),source:val('ae-source'),note:val('ae-note'),status:'New',date:today()};tPutK('enquiries',e)}
});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.change==='tdate'&&t.value){tdate=t.value;tcls=null;render()}if(t.dataset.change==='tmonth'&&t.value){tmonth=t.value;armed=null;render()}});

/* ====== Privacy page ====== */
function privacy(){if(LANG!=='en')return PRIV_L[LANG]+`<div class="row"><a class="btn go" href="${WA}" target="_blank" rel="noopener">${LANG==='mr'?'चेतना यांना संदेश पाठवा':'चेतना को संदेश भेजें'}</a></div></section>`;return `<section class="stack"><h1>Privacy</h1><p class="lead">Short and plain: what we keep, why, and how to get it removed.</p></section>
<section class="card stack prose">
<h2>What we keep about your child</h2>
<p>Only what we need to teach well: <b>first name</b>, grade, board and school, batch, attendance, class notes, practice scores on this website, fee payments, and documents such as test papers or homework photos (kept in Chetana’s private Google Drive). For parents: your name and WhatsApp number, so we can send reports and reminders.</p>
<p>We do <b>not</b> keep surnames of children, photos or videos of children, home addresses, Aadhaar or any ID numbers, or bank or card details.</p>
<h2>Why</h2><p>To plan your child’s lessons, track progress, send you monthly reports, and manage fees. Nothing else. We never sell, share or advertise with your data, and we do not use advertising or tracking cookies.</p>
<h2>Who can see it</h2><p>Only Chetana, and any teacher she adds, who sees only their own batches’ attendance, class notes and practice (never parents’ numbers or fees). The records are kept in a private Google Sheet in her account, protected by 2-step verification. The teacher area of this website opens only with her PIN. A child’s own login (first name and a 4-digit PIN) shows only that child’s practice stars and missions.</p>
<h2>Practice without signing in</h2><p>Children can use the learning library, Kids’ World, Pune Ride and the starting check without any login. Those results stay on your own device only. If you choose to send starting-check results to Chetana, or book a demo, those details also go into her private enquiry list so she can follow up.</p>
<h2>Your consent</h2><p>We add a child only after a parent or guardian agrees. You can withdraw consent at any time.</p>
<h2>See, correct or delete</h2><p>Message Chetana on WhatsApp to see what we hold, correct it, or delete it. We delete a child’s record within 7 days of a request, and we automatically delete records of children who left more than 12 months ago (fee entries are kept for accounts), and enquiries that did not lead to classes after 12 months.</p>
<h2>If something goes wrong</h2><p>If we ever find that your child’s data was seen by someone it shouldn’t have been, we will tell you promptly and explain what we are doing about it.</p>
<p class="small muted">Last updated: November 2026.</p>
<div class="row"><a class="btn go" href="${WA}" target="_blank" rel="noopener">Message Chetana</a></div></section>`}

/* ====== Monthly reports, fee receipts, UPI ====== */
const CFG=window.CT_CONFIG||{};
let treceipt=null,trepm=today().slice(0,7);
function inWords(n){n=Math.round(+n||0);if(!n)return 'Zero';const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],
  b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'],two=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:''),
  three=x=>(x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');
  const parts=[];const cr=Math.floor(n/1e7),lk=Math.floor(n/1e5)%100,th=Math.floor(n/1e3)%100,rest=n%1000;
  if(cr)parts.push(three(cr)+' Crore');if(lk)parts.push(two(lk)+' Lakh');if(th)parts.push(two(th)+' Thousand');if(rest)parts.push(three(rest));return parts.join(' ')}

/* receipt numbers: R + YYMM + running number in that month */
function nextReceipt(month){const used=T('fees').filter(f=>f.month===month&&f.rno).map(f=>+String(f.rno).split('-')[1]||0);return 'R'+month.slice(2,4)+month.slice(5,7)+'-'+String((used.length?Math.max(...used):0)+1).padStart(3,'0')}
function receiptText(f,s){return `*Fee receipt ${f.rno}* – Chetana’s Tutoring\nReceived ${rupee(f.amount)} (Rupees ${inWords(f.amount)} only) for ${s.name}’s tuition, ${monthName(f.month)}.\nPaid by ${f.mode} on ${f.date}.\nThank you!`}
function receiptView(){const f=T('fees').find(x=>x.id===treceipt),s=f&&T('students').find(x=>x.id===f.sid);if(!f||!s){treceipt=null;return feesView()}
  const wl=waLink(s.phone,receiptText(f,s));
  return `<div class="row noprint"><button class="btn" data-act="trclose">← Fees</button></div>
  <section class="card receipt"><div class="rc-head"><img src="img/logo.jpg" alt="" width="56" height="56"><div><b>Chetana’s Tutoring</b><span>Sparklet, Megapolis, Hinjawadi, Pune</span></div><div class="rc-no">Receipt<br><b>${esc(f.rno||'–')}</b></div></div>
  <table class="rc-t"><tr><th>Date</th><td>${esc(f.date)}</td></tr><tr><th>Received from</th><td>${esc(s.parent||'Parent of '+s.name)}</td></tr>
  <tr><th>Student</th><td>${esc(s.name)}${s.grade?', Grade '+esc(s.grade):''}</td></tr><tr><th>For</th><td>Tuition fee, ${monthName(f.month)}</td></tr>
  <tr><th>Paid by</th><td>${esc(f.mode)}</td></tr><tr class="rc-amt"><th>Amount</th><td>${rupee(f.amount)}<small>Rupees ${inWords(f.amount)} only</small></td></tr></table>
  <p class="rc-sign">Received with thanks,<br><b>Chetana</b></p></section>
  <div class="row noprint"><button class="btn go" data-act="tprint">Print or save as PDF</button>${wl?`<a class="btn" href="${wl}" target="_blank" rel="noopener">Send on WhatsApp</a>`:''}</div>`}

/* monthly reports: one list, one tap each */
document.addEventListener('change',e=>{if(e.target.dataset.change==='trepm'&&e.target.value){trepm=e.target.value;render()}});
Object.assign(acts,{
  trclose(){treceipt=null;render()},tprint(){window.print()},
  treceipt(d){treceipt=d.id;render();window.scrollTo(0,0)},
  treports(){tview='reports';trepMode='week';tsel=null;render();window.scrollTo(0,0)},
  tpaid(d){const s=T('students').find(x=>x.id===d.id),id='f_'+s.id+'_'+tmonth;
    tPutK('fees',{id,sid:s.id,month:tmonth,amount:+s.fee,paid:true,mode:d.m,date:today(),rno:nextReceipt(tmonth)}).then(()=>{treceipt=id;render()})}
});

/* ====== Roles (owner / added teacher) and optional Google sign-in ====== */
let gTok=null,gReady=false,tTedit=null;
const isOwner=()=>!tdata||!tdata.me||tdata.me.role==='owner';
function loadGIS(){return window.google&&google.accounts?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function googleGate(){
  loadGIS().then(()=>{if(!gReady){google.accounts.id.initialize({client_id:CFG.GOOGLE_CLIENT_ID,callback:r=>{gTok=r.credential;msg='';render()},auto_select:false});gReady=true}
    const el=document.getElementById('gbtn');if(el)google.accounts.id.renderButton(el,{theme:'filled_blue',size:'large',text:'signin_with',shape:'pill'})})
   .catch(()=>{const el=document.getElementById('gbtn');if(el)el.textContent='Could not load Google sign-in. Check the internet.'});
  return `<section class="card stack center"><h2>Teacher sign-in</h2><p class="muted">Step 1 of 2: sign in with your Google account. Then enter your PIN.</p>
  ${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}<div id="gbtn" class="gbtn"></div></section>`}
function teacherStudentDetail(){const s=T('students').find(x=>x.id===tsel);if(!s){tsel=null;return studentList()}
  const m=today().slice(0,7),a=attend(s,m),hist=T('classes').filter(c=>(c.present||[]).indexOf(s.id)>=0||(c.absent||[]).indexOf(s.id)>=0).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,8);
  return `<div class="row"><button class="btn" data-act="tback">← All students</button></div>
  <form class="card stack" data-form="tsavenotes"><h2>${esc(s.name)}</h2><p class="muted">Grade ${esc(s.grade||'?')} · attended ${a.p} of ${a.t} in ${monthName(m)}</p>
  <label>Reading level<select id="es-level">${LEVELS.map((l,i)=>`<option value="${i}" ${i==(s.level||0)?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>Note for the child and parents<textarea id="es-note" rows="2" maxlength="300">${esc(s.note||'')}</textarea></label><div class="row"><button class="btn navy">Save</button></div></form>
  <section class="card stack"><h3>Notes</h3>${notesFor(s.id).slice(0,8).map(noteRow).join('')||'<p class="muted small">No notes yet.</p>'}${noteForm(s.id)}</section>
  ${marksSection(s)}
  ${docsSection(s)}
  <section class="card stack"><h3>Classes</h3>${hist.map(c=>`<div class="small"><b>${esc(c.date)}</b> ${c.present.indexOf(s.id)>=0?'Present':'Absent'}${c.topic?' · '+esc(c.topic):''}${c.notes&&c.notes[s.id]?' · <i>'+esc(c.notes[s.id])+'</i>':''}</div>`).join('')||'<p class="muted small">No classes logged yet.</p>'}</section>
  <section class="card stack"><h3>Mistake bank from class</h3>
  ${(s.mistakes||[]).map(mm=>`<div class="item"><div class="grow ${mm.fixed?'muted':''}">${mm.fixed?'<s>'+esc(mm.text)+'</s>':esc(mm.text)}</div><button class="btn" data-act="mfix" data-id="${mm.id}">${mm.fixed?'Reopen':'Mark fixed'}</button></div>`).join('')}
  <form class="row" data-form="addmistake"><label class="grow">New mistake<input id="am-text" required maxlength="80"></label><button class="btn navy">Add</button></form></section>`}
function teachersSection(){if(!SYNC_URL)return `<h3>Other teachers</h3><p class="muted">Adding a second teacher needs the Google Sheet connection.</p>`;
  const ts=T('teachers'),bs=T('batches'),e=tTedit&&tTedit!=='new'?ts.find(t=>t.id===tTedit):null;
  if(tTedit){const t=e||{batches:[]};return `<form class="stack" data-form="saveteacher"><h3>${t.id?'Edit teacher':'Add a teacher'}</h3>
   <div class="row"><label class="grow">Name<input id="tt-name" required maxlength="30" value="${esc(t.name||'')}"></label>${CFG.GOOGLE_CLIENT_ID?`<label class="grow">Their Google email<input id="tt-email" type="email" maxlength="80" value="${esc(t.email||'')}" required></label>`:''}</div>
   <label>${t.id?'New PIN (leave empty to keep)':'PIN for this teacher (6 to 8 digits)'}<input id="tt-pin" inputmode="numeric" pattern="[0-9]{6,8}" maxlength="8" ${t.id?'':'required'}></label>
   <fieldset class="fld"><legend>Batches they teach</legend><div class="row">${bs.map(b=>`<label class="ckband"><input type="checkbox" name="tt-b" value="${b.id}" ${(t.batches||[]).indexOf(b.id)>=0?'checked':''}> ${esc(b.name)}</label>`).join('')||'<span class="muted">Add batches first.</span>'}</div></fieldset>
   ${t.id?`<label class="ckband"><input type="checkbox" id="tt-off" ${t.active===false?'checked':''}> Turn off this teacher’s access</label>`:''}
   <div class="row"><button class="btn go">Save teacher</button><button type="button" class="btn" data-act="ttcancel">Cancel</button>${t.id?`<button type="button" class="btn bad" data-act="ttdel">${armed==='t'?'Tap again to delete':'Delete'}</button>`:''}</div>
   <p class="small muted">They see only these batches: attendance, class logs, reading levels and notes. They never see fees, parents’ numbers or leads.</p></form>`}
  return `<h3>Other teachers</h3>${ts.map(t=>`<div class="item"><div class="grow"><b>${esc(t.name)}</b> ${t.active===false?'<span class="pill bad">Off</span>':''}<div class="small muted">${(t.batches||[]).map(id=>{const b=bs.find(x=>x.id===id);return b?esc(b.name):''}).filter(Boolean).join(', ')||'No batches'}</div></div><button class="btn" data-act="ttedit" data-id="${t.id}">Edit</button></div>`).join('')||'<p class="muted small">Only you for now.</p>'}
  <div class="row"><button class="btn" data-act="ttedit" data-id="new">Add a teacher</button></div>`}
Object.assign(acts,{
  ttedit(d){tTedit=d.id;armed=null;render()},ttcancel(){tTedit=null;armed=null;render()},
  ttdel(){if(armed!=='t'){armed='t';render();return}const id=tTedit;call('tTeacherDel',{pin:tpin,id}).then(()=>{tdata.teachers=T('teachers').filter(t=>t.id!==id);tTedit=null;armed=null;render()}).catch(tfail)}
});
Object.assign(forms,{
  saveteacher(){const pin=val('tt-pin'),o={id:tTedit!=='new'?tTedit:'t'+Date.now().toString(36),name:val('tt-name'),email:CFG.GOOGLE_CLIENT_ID?val('tt-email'):'',
      batches:[...document.querySelectorAll('input[name=tt-b]:checked')].map(x=>x.value),active:!(document.getElementById('tt-off')||{}).checked};
    if(pin){if(!/^\d{6,8}$/.test(pin)){toast('Teacher PINs need 6 to 8 digits.',true);return}o.pin=pin}
    call('tTeacherPut',{pin:tpin,o}).then(t=>{tdata.teachers=T('teachers').filter(x=>x.id!==t.id).concat(t);tTedit=null;render();toast('Saved. Tell '+t.name+' their PIN in person.')}).catch(tfail)},
  tsavenotes(){const s=T('students').find(x=>x.id===tsel);putStudent(Object.assign({},s,{level:+val('es-level'),note:val('es-note')}))}
});

/* ====== Practice: My mistakes, mixed tests, weekly quest, Tonight's 10 minutes ====== */
const mxKey=()=>'ct_mx_'+(kid?kid.id:'guest');
const mxList=()=>ls.get(mxKey())||[];
function mxAdd(mod,ch,q){if(!q||q.kind==='build'&&!q.tiles)return;const l=mxList(),sig=JSON.stringify([q.ask,q.show,q.a]);
  if(l.some(x=>x.sig===sig))return;l.push({sig,m:mod,ch,q,ok:0});ls.set(mxKey(),l.slice(-40))}
function mxHit(sig,ok){const l=mxList(),x=l.find(y=>y.sig===sig);if(!x)return;if(ok){x.ok++;if(x.ok>=2){l.splice(l.indexOf(x),1);qev('fix')}}else x.ok=0;ls.set(mxKey(),l)}
/* week quest */
const weekKey=()=>{const d=new Date(),t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+'-W'+String(Math.ceil(((t-y)/864e5+1)/7)).padStart(2,'0')};
const QPOOL=[{ev:'set',n:2,t:'Pass 2 practice sets in any subject',href:'#learn'},{ev:'pune',n:1,t:'Earn a Pune Ride stamp',href:'#pune'},{ev:'mission',n:2,t:'Finish 2 quick missions',href:'#kids'},
  {ev:'fix',n:3,t:'Fix 3 of your mistakes',href:'#practice'},{ev:'mixed',n:1,t:'Score 15 or more in a mixed test',href:'#practice'},{ev:'toy',n:5,t:'Get 5 right in the 3D toys',href:'#toys'}];
function questTasks(){const w=weekKey(),seed=w.split('').reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7),idx=[];let s=seed;
  while(idx.length<3){s=(s*1103515245+12345)>>>0;const i=s%QPOOL.length;if(idx.indexOf(i)<0)idx.push(i)}return idx.map(i=>QPOOL[i])}
function questState(){let q=ls.get('ct_week');if(!q||q.wk!==weekKey())q={wk:weekKey(),ev:{},done:false};return q}
function qev(name){const q=questState();q.ev[name]=(q.ev[name]||0)+1;const all=questTasks().every(t=>(q.ev[t.ev]||0)>=t.n);
  if(all&&!q.done){q.done=true;ls.set('ct_trophies',(ls.get('ct_trophies')||0)+1);setTimeout(()=>toast('🏆 Weekly quest complete! You won a trophy.'),400)}ls.set('ct_week',q)}
function questCard(){const q=questState(),ts=questTasks(),tro=ls.get('ct_trophies')||0;
  return `<section class="card stack quest"><div class="row"><h2 style="margin-right:auto">🗺️ This week’s quest</h2><span class="pill">🏆 ${tro} troph${tro===1?'y':'ies'}</span></div>
  ${ts.map(t=>{const n=Math.min(q.ev[t.ev]||0,t.n),ok=n>=t.n;return `<a class="qt${ok?' ok':''}" href="${t.href}"><span aria-hidden="true">${ok?'✅':'⬜'}</span><span class="grow">${t.t}</span><b>${n}/${t.n}</b></a>`}).join('')}
  <p class="small muted">${q.done?'Quest complete! A new one starts on Monday.':'Finish all three by Sunday to win a trophy.'}</p></section>`}
/* Tonight's 10 minutes */
function tonight(){const out=[],asg=(kid&&kid.assign||[]).filter(a=>!asgDone(a,kid.progress));if(asg.length)out.push(['\ud83d\udccc',asgLabel(asg[0]),'Set by Chetana ma\u2019am','#'+asg[0].mod,'5 min']);const _x=0,mx=mxList().length,prog=kid?(kid.progress||{}):(ls.get('ct_ph')||{});
  if(mx>=3)out.push(['🔁','Fix your mistakes',`${Math.min(mx,10)} questions you got wrong before`,'#practice','3 min']);
  for(const m of Object.keys(MODS)){const M=MODS[m];if(!M.ch)continue;const c=M.ch.find(c=>{const s=chState(prog,m,c);return s.played&&!s.done});
    if(c){out.push(['📘',M.name+': '+c.title,'Carry on where you stopped','#'+m,'4 min']);break}}
  if(kid){const k=GK.find(k=>stat(kid,k).weak.length);if(k)out.push(['⚡',G[k].name,'Your tricky ones are waiting','#kids','3 min'])}
  const pr=pzProg();if(out.length<3&&pr.done.length<PSTOPS.length)out.push(['🛺','Pune Ride: '+PSTOPS[Math.min(pr.at,PSTOPS.length-1)].name,'Next stop on your ride','#pune','3 min']);
  if(out.length<3)out.push(['🧊','3D toys','Shapes, place value or fraction cake','#toys','3 min']);
  return `<section class="card stack tonight"><h2>🌙 Tonight’s 10 minutes</h2>${out.slice(0,3).map(([e,t,s,h,m])=>`<a class="tn" href="${h}"><span aria-hidden="true">${e}</span><span class="grow"><b>${esc(t)}</b><small>${esc(s)}</small></span><em>${m}</em></a>`).join('')}</section>`}
/* a small quiz runner for mistakes and mixed tests */
let qz=null;
function qzStart(kindName,qs,meta){qz={kind:kindName,q:qs,i:0,right:0,phase:'ask',input:'',built:[],meta:meta||{}};render();window.scrollTo(0,0)}
function mixedQs(m,n){const M=MODS[m],prog=kid?(kid.progress||{}):(ls.get('ct_ph')||{});let chs=M.ch.filter(c=>chState(prog,m,c).played);if(chs.length<2)chs=M.ch;
  const out=[];let guard=0;while(out.length<n&&guard++<200){const c=one(chs),qs=c.sets?one(c.sets).make():c.make(),q=one(qs);if(!out.some(x=>x.ask===q.ask&&x.show===q.show&&x.a===q.a))out.push(Object.assign({},q,{_m:m,_ch:c.n}))}return out}
function qzView(){const a=qz.q[qz.i];
  if(qz.phase==='done'){const n=qz.q.length,good=qz.right>=Math.ceil(n*.75);return `<section class="card stack center"><h1>${good?'Brilliant!':'Good effort!'}</h1><div class="stars">${'<span>★</span>'.repeat(Math.min(qz.right,20))}</div><div class="stat">${qz.right} of ${n}</div>
   <p class="muted">${qz.kind==='mx'?'Questions you get right twice leave your mistakes list.':'Wrong answers were added to My mistakes, so you can fix them later.'}</p><div class="row" style="justify-content:center"><button class="btn go" data-act="qzback">Done</button></div></section>`}
  let body;
  if(qz.phase!=='ask')body=qz.phase==='ok'?`<div class="fb ok" role="status"><div class="win">${a.win||a.ah}</div><b>Yes!</b></div><button class="btn go" data-act="qznext">Next</button>`:`<div class="fb bad" role="alert"><b>Not yet. The answer is:</b><div>${a.ah}</div><p>${esc(a.hint||'')}</p></div><button class="btn go" data-act="qznext">Got it</button>`;
  else if(a.kind==='pick')body=`<div class="opts">${a.opts.map(o=>`<button class="btn ${o.cls||''}" data-act="qzans" data-v="${esc(o.v)}">${o.h}</button>`).join('')}</div>`;
  else if(a.kind==='num')body=`<div class="ans" aria-live="polite">${esc(qz.input)||' '}</div><div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="qzd" data-d="${d}">${d}</button>`).join('')}<button class="btn" data-act="qzb" aria-label="Delete">⌫</button><button class="btn" data-act="qzd" data-d="0">0</button><button class="btn go" data-act="qzok">OK</button></div>`;
  else{const left=a.tiles.map((t,i)=>i).filter(i=>qz.built.indexOf(i)<0);body=`<div class="tiles slot">${qz.built.map((i,j)=>`<button class="tile" data-act="qzun" data-j="${j}">${esc(a.tiles[i])}</button>`).join('')||'<span class="muted small">Tap the tiles below</span>'}</div><div class="tiles">${left.map(i=>`<button class="tile" data-act="qztile" data-i="${i}">${esc(a.tiles[i])}</button>`).join('')}</div><button class="btn go" data-act="qzcheck">Check</button>`}
  return `<section class="card stack"><div class="row"><h3 style="margin-right:auto">${qz.kind==='mx'?'My mistakes':'Mixed test: '+esc(MODS[qz.meta.m].name)}</h3><span class="pill">${qz.i+1} of ${qz.q.length}</span><button class="btn ghost" data-act="qzback">Stop</button></div>
  <div class="bar"><i style="width:${qz.i/qz.q.length*100}%"></i></div>${a.show?`<div class="showbox">${a.show}</div>`:''}<div class="ask">${esc(a.ask)} ${canSay&&a.say?`<button class="btn" data-act="qzsay">Hear it</button>`:''}</div>${body}</section>`}
function qzMark(ok){const a=qz.q[qz.i];if(ok)qz.right++;qz.phase=ok?'ok':'bad';
  if(qz.kind==='mx')mxHit(a._sig,ok);else if(!ok)mxAdd(a._m,a._ch,a);render()}
function practice(){if(qz)return qzView();const mx=mxList();
  const mods=Object.keys(MODS).filter(m=>MODS[m].ch);
  return `<section class="stack"><h1>Practice</h1><p class="muted lead">${kid?`Saved for <b>${esc(kid.name)}</b>.`:'Playing as a guest: this is saved on this device.'}</p></section>
  ${tonight()}
  <section class="card stack"><h2>🔁 My mistakes</h2>${mx.length?`<p>${mx.length} question${mx.length===1?'':'s'} to fix. Get each one right twice and it leaves the list.</p><div class="row"><button class="btn go" data-act="mxplay">Fix ${Math.min(10,mx.length)} now</button></div>`:'<p class="muted">Nothing here yet. Questions you get wrong in the chapters land here automatically.</p>'}</section>
  <section class="card stack"><h2>🧩 Mixed revision test</h2><p class="muted">20 questions mixed from the chapters you have practised. Great before a school test.</p>
  <div class="grid">${mods.map(m=>`<button class="btn" data-act="mixplay" data-m="${m}">${esc(MODS[m].name)}</button>`).join('')}</div></section>
  ${questCard()}`}
Object.assign(acts,{
  mxplay(){const l=shuffle(mxList()).slice(0,10).map(x=>Object.assign({},x.q,{_sig:x.sig,_m:x.m,_ch:x.ch}));qzStart('mx',l)},
  mixplay(d){qzStart('mixed',mixedQs(d.m,20),{m:d.m})},
  qzback(){qz=null;render()},
  qzans(d){if(qz.phase==='ask')qzMark(d.v===qz.q[qz.i].a)},
  qzd(d){if(qz.phase==='ask'&&qz.input.length<7){qz.input+=d.d;render()}},qzb(){qz.input=qz.input.slice(0,-1);render()},
  qzok(){if(qz.phase==='ask'&&qz.input)qzMark(String(parseInt(qz.input,10))===qz.q[qz.i].a)},
  qztile(d){if(qz.phase==='ask'){qz.built.push(+d.i);render()}},qzun(d){if(qz.phase==='ask'){qz.built.splice(+d.j,1);render()}},
  qzcheck(){const a=qz.q[qz.i];if(qz.phase==='ask'&&qz.built.length)qzMark(qz.built.map(i=>a.tiles[i]).join('|')===a.target.join('|'))},
  qzsay(){const q=qz.q[qz.i];say(q.say,q.lang)},
  qznext(){qz.i++;qz.input='';qz.built=[];if(qz.i>=qz.q.length){qz.phase='done';if(qz.kind==='mixed'&&qz.right>=15)qev('mixed');if(kid){kid.stars=(kid.stars||0)+qz.right;saveKid()}}else qz.phase='ask';render();window.scrollTo(0,0)}
});

/* ====== 3D toys: shapes explorer, place-value blocks, fraction cake ====== */
const SHAPES=[{k:'cube',n:'Cube',f:6,e:12,v:8,real:'dice, ice cube'},{k:'cuboid',n:'Cuboid',f:6,e:12,v:8,real:'brick, book, lunch box'},
 {k:'cylinder',n:'Cylinder',f:3,e:2,v:0,real:'tin, pipe, glass',fnote:'2 flat + 1 curved'},{k:'cone',n:'Cone',f:2,e:1,v:1,real:'ice-cream cone, funnel',fnote:'1 flat + 1 curved'},
 {k:'sphere',n:'Sphere',f:1,e:0,v:0,real:'ball, globe',fnote:'1 curved'},{k:'pyramid',n:'Square pyramid',f:5,e:8,v:5,real:'pyramids of Egypt, tent'},
 {k:'prism',n:'Triangular prism',f:5,e:9,v:6,real:'tent, Toblerone box'}];
let toy={tab:'shapes',shape:'cube',edges:true,q:null,fb:null,num:347,cake:{n:4,sel:[]},input:''},T3=null;
function toyQ(){const t=toy.tab;
  if(t==='shapes'){const s=one(SHAPES),what=one(['f','e','v','name']);toy.shape=s.k;
    if(what==='name')return{ask:'Which shape is this?',a:s.n,opts:shuffle([s.n,...sample(SHAPES.filter(x=>x!==s).map(x=>x.n),3)])};
    const w={f:'faces',e:'edges',v:'vertices (corners)'}[what],a=s[what];return{ask:`How many ${w} does a ${s.n.toLowerCase()} have?`,a:String(a),opts:[String(a)].concat(shuffle(uniq([a+1,a-1,a+2,a+4,a-2].filter(x=>x>=0&&x!==a).map(String))).slice(0,3)).sort((x,y)=>x-y)}}
  if(t==='place'){const n=rnd(11,999);toy.num=n;const kind=one(['read','h','t','o']);
    if(kind==='read')return{ask:'What number do the blocks show?',a:String(n),num:true};
    const p={h:['hundreds',Math.floor(n/100)],t:['tens',Math.floor(n/10)%10],o:['ones',n%10]}[kind];
    return{ask:`How many ${p[0]} are in ${n}?`,a:String(p[1]),num:true}}
  const n=one([2,3,4,5,6,8]),k=rnd(1,n-1);toy.cake={n,sel:[],target:[k,n]};return{ask:`Tap the slices to make ${k}/${n} of the cake pink.`,a:'cake'}}
function toys(){const s=SHAPES.find(x=>x.k===toy.shape),q=toy.q;
  const tabs=[['shapes','🔷 Shapes'],['place','🧱 Place value'],['cake','🎂 Fraction cake']];
  let side='';
  if(toy.tab==='shapes')side=`<div class="chips toy-pick">${SHAPES.map(x=>`<button class="btn${x.k===toy.shape?' go':''}" data-act="tshape" data-k="${x.k}">${x.n}</button>`).join('')}</div>
   <div class="tw"><table><tr><th>Faces</th><th>Edges</th><th>Vertices</th></tr><tr><td>${s.f}${s.fnote?' <small>('+s.fnote+')</small>':''}</td><td>${s.e}</td><td>${s.v}</td></tr></table></div>
   <p class="small muted">Real life: ${s.real}. Drag to turn it.</p><label class="ckband"><input type="checkbox" data-change="tedges" ${toy.edges?'checked':''}> Show edges and corners</label>`;
  if(toy.tab==='place'){const n=toy.num;side=`<p class="toy-num"><b>${Math.floor(n/100)}</b> hundreds + <b>${Math.floor(n/10)%10}</b> tens + <b>${n%10}</b> ones = <b>${q&&q.num&&!toy.fb?'?':n}</b></p>
   <div class="row"><label>Try your own number<input id="toy-n" inputmode="numeric" maxlength="3" value="${q?'':n}" style="width:7em"></label><button class="btn" data-act="tnum">Show</button></div>
   <p class="small muted">Flat = 100, rod = 10, small cube = 1.</p>`}
  if(toy.tab==='cake'){const c=toy.cake;side=`<div class="row"><span>Slices:</span>${[2,3,4,5,6,8].map(n=>`<button class="btn${c.n===n?' go':''}" data-act="tcake" data-n="${n}">${n}</button>`).join('')}</div>
   <p class="toy-num"><b>${c.sel.length}/${c.n}</b> is pink${c.sel.length&&c.sel.length<c.n&&gcd(c.sel.length,c.n)>1?` = <b>${c.sel.length/gcd(c.sel.length,c.n)}/${c.n/gcd(c.sel.length,c.n)}</b>`:''}. Tap a slice to colour it.</p>`}
  let qhtml='';
  if(q){qhtml=`<div class="ask">${esc(q.ask)}</div>`+(toy.fb?`<div class="fb ${toy.fb[0]?'ok':'bad'}" role="status"><b>${toy.fb[0]?'Yes!':'Not quite.'}</b> ${esc(toy.fb[1])}</div><button class="btn go" data-act="tq">Next question</button>`
    :q.a==='cake'?`<button class="btn go" data-act="tcakecheck">Check my cake</button>`:q.num?`<div class="ans" aria-live="polite">${esc(toy.input)||' '}</div><div class="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="btn" data-act="tqd" data-d="${d}">${d}</button>`).join('')}<button class="btn" data-act="tqb" aria-label="Delete">⌫</button><button class="btn" data-act="tqd" data-d="0">0</button><button class="btn go" data-act="tqok">OK</button></div>`
    :`<div class="opts">${q.opts.map(o=>`<button class="btn txt" data-act="tqans" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`)}
  return `<section class="stack"><h1>3D toys</h1><p class="muted">Turn, tap and count. Then try a question.</p>
  <div class="tabs">${tabs.map(([k,l])=>`<button class="btn" data-act="ttoy" data-t="${k}" aria-pressed="${toy.tab===k}">${l}</button>`).join('')}</div></section>
  <div class="toy-wrap"><div class="kw-stage toy-stage" id="toystage"><canvas id="toyc" role="img" aria-label="3D model"></canvas><p class="kw-flat">3D could not load on this device.</p></div>
  <section class="card stack">${side}${q?qhtml:`<button class="btn go" data-act="tq">Ask me a question</button>`}</section></div>`}
function unmountToys(){if(T3){cancelAnimationFrame(T3.raf);try{T3.ro.disconnect()}catch(e){}try{T3.r.dispose()}catch(e){}T3=null}}
function mountToys(){const st=document.getElementById('toystage');if(!st)return;
  if(T3&&T3.canvas===document.getElementById('toyc')){T3.build();return}unmountToys();
  loadThree().then(()=>{if(view==='toys')toy3d()}).catch(()=>st.classList.add('flat'))}
function toy3d(){const THREE_=THREE,cv=document.getElementById('toyc'),st=document.getElementById('toystage');let r;
  try{r=new THREE_.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){st.classList.add('flat');return}
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));const sc=new THREE_.Scene(),cam=new THREE_.PerspectiveCamera(40,1,.1,100);
  sc.add(new THREE_.HemisphereLight(0xffffff,0x8899aa,.95));const dl=new THREE_.DirectionalLight(0xffffff,.7);dl.position.set(4,8,6);sc.add(dl);
  const g=new THREE_.Group();sc.add(g);const M=c=>new THREE_.MeshLambertMaterial({color:c});const reduce=RM();
  const addEdges=(mesh,col)=>{const e=new THREE_.LineSegments(new THREE_.EdgesGeometry(mesh.geometry,20),new THREE_.LineBasicMaterial({color:col||0x1F3B2D}));mesh.add(e)};
  const dots=(mesh,pts)=>pts.forEach(p=>{const d=new THREE_.Mesh(new THREE_.SphereGeometry(.07,10,8),M(0xE2583E));d.position.copy(p);mesh.add(d)});
  function build(){while(g.children.length)g.remove(g.children[0]);g.rotation.set(-.35,.6,0);let dist=6;
    if(toy.tab==='shapes'){const k=toy.shape;let geo;
      if(k==='cube')geo=new THREE_.BoxGeometry(2,2,2);if(k==='cuboid')geo=new THREE_.BoxGeometry(3,1.4,1.8);if(k==='cylinder')geo=new THREE_.CylinderGeometry(1,1,2.2,40);
      if(k==='cone')geo=new THREE_.ConeGeometry(1.2,2.4,40);if(k==='sphere')geo=new THREE_.SphereGeometry(1.4,40,28);if(k==='pyramid'){geo=new THREE_.ConeGeometry(1.6,2.2,4);geo.rotateY(Math.PI/4)}
      if(k==='prism'){geo=new THREE_.CylinderGeometry(1.3,1.3,2.6,3);geo.rotateZ(Math.PI/2)}
      const m=new THREE_.Mesh(geo,new THREE_.MeshLambertMaterial({color:0xF4A300,transparent:true,opacity:.92}));g.add(m);
      if(toy.edges&&k!=='sphere'){addEdges(m);const pos=geo.attributes.position,seen=[];if(['cube','cuboid','pyramid','prism','cone'].indexOf(k)>=0){
        for(let i=0;i<pos.count;i++){const v=new THREE_.Vector3().fromBufferAttribute(pos,i);if(seen.some(s=>s.distanceTo(v)<.01))continue;seen.push(v)}
        const want={cube:8,cuboid:8,pyramid:5,prism:6,cone:1}[k];let pts=seen;
        if(k==='cone')pts=[seen.reduce((a,b)=>b.y>a.y?b:a)];else if(k==='pyramid')pts=seen.filter(v=>Math.abs(v.y)>.5&&(v.y>0||Math.hypot(v.x,v.z)>1));
        else if(k==='prism')pts=seen.filter(v=>Math.hypot(v.y,v.z)>1);if(pts.length>=want)dots(m,pts.slice(0,want))}}}
    if(toy.tab==='place'){const n=toy.num,h=Math.floor(n/100),t=Math.floor(n/10)%10,o=n%10,u=.2;dist=Math.max(6,2+h*.9);
      const cube=new THREE_.BoxGeometry(u*.92,u*.92,u*.92);let x=-((h*2.3+t*.35+Math.ceil(o/5)*.35))/2;
      for(let i=0;i<h;i++){const f=new THREE_.Mesh(new THREE_.BoxGeometry(u*10,u*10,u),M(0x2F80C0));f.position.set(x+u*5,0,0);addEdges(f,0xffffff);g.add(f);x+=u*10+.3}
      for(let i=0;i<t;i++){const rr=new THREE_.Mesh(new THREE_.BoxGeometry(u,u*10,u),M(0x1E6B3A));rr.position.set(x+u/2,0,0);addEdges(rr,0xffffff);g.add(rr);x+=u+.15}
      for(let i=0;i<o;i++){const c=new THREE_.Mesh(cube,M(0xF4A300));c.position.set(x+Math.floor(i/5)*(u+.08)+u/2,-u*4.5+(i%5)*(u+.04),0);g.add(c)}
      g.rotation.set(-.15,.25,0)}
    if(toy.tab==='cake'){const c=toy.cake,R=2,H=.9;for(let i=0;i<c.n;i++){const a=i*2*Math.PI/c.n,on=c.sel.indexOf(i)>=0;
      const geo=new THREE_.CylinderGeometry(R,R,H,48,1,false,a+.02,2*Math.PI/c.n-.04);const m=new THREE_.Mesh(geo,M(on?0xE2583E:0xF6E7C8));
      const mid=a+Math.PI/c.n;m.position.set(Math.sin(mid)*.06,0,Math.cos(mid)*.06);m.userData.slice=i;addEdges(m,0x8B5E34);g.add(m)}
      const plate=new THREE_.Mesh(new THREE_.CylinderGeometry(R+.4,R+.4,.08,48),M(0xffffff));plate.position.y=-H/2-.05;g.add(plate);g.rotation.set(.75,0,0);dist=7}
    fit()}
  function fit(){const b=new THREE_.Box3().setFromObject(g),sz=b.getSize(new THREE_.Vector3()),c=b.getCenter(new THREE_.Vector3()),R=Math.max(sz.x,sz.y,sz.z)*.5+.3;
    const half=Math.tan(cam.fov*Math.PI/360),d=Math.max(R/half,R/(half*cam.aspect))*1.08;cam.position.set(c.x,c.y,c.z+d);cam.lookAt(c)}
  let drag=null,moved=0;const ray=new THREE_.Raycaster(),pt=new THREE_.Vector2();
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};moved=0;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};moved+=Math.abs(dx)+Math.abs(dy);g.rotation.y+=dx*.01;g.rotation.x=Math.max(-1.4,Math.min(1.4,g.rotation.x+dy*.01))});
  cv.addEventListener('pointerup',e=>{const was=drag;drag=null;if(!was||moved>6||toy.tab!=='cake')return;const b=cv.getBoundingClientRect();pt.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);
    ray.setFromCamera(pt,cam);const hit=ray.intersectObjects(g.children,false).find(h=>h.object.userData.slice!=null);if(!hit)return;const i=hit.object.userData.slice,s=toy.cake.sel,k=s.indexOf(i);if(k<0)s.push(i);else s.splice(k,1);render()});
  const size=()=>{const w=st.clientWidth,h=st.clientHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(g.children.length)fit()};const ro=new ResizeObserver(size);ro.observe(st);size();build();
  const frame=()=>{if(!drag&&!reduce&&toy.tab==='shapes')g.rotation.y+=.004;r.render(sc,cam);T3.raf=requestAnimationFrame(frame)};
  T3={r,ro,raf:0,canvas:cv,build};T3.raf=requestAnimationFrame(frame)}
function toyAnswer(ok,txt){toy.fb=[ok,txt];if(ok)qev('toy');render()}
Object.assign(acts,{
  ttoy(d){toy.tab=d.t;toy.q=null;toy.fb=null;toy.input='';if(d.t==='cake')toy.cake={n:toy.cake.n,sel:[]};render()},
  tshape(d){toy.shape=d.k;toy.q=null;toy.fb=null;render()},
  tnum(){const n=parseInt(val('toy-n'),10);if(n>=1&&n<=999){toy.num=n;toy.q=null;toy.fb=null;render()}else toast('Type a number from 1 to 999.',true)},
  tcake(d){toy.cake={n:+d.n,sel:[]};toy.q=null;toy.fb=null;render()},
  tq(){toy.fb=null;toy.input='';toy.q=toyQ();render()},
  tqans(d){if(toy.fb)return;const q=toy.q,ok=d.v===q.a,s=SHAPES.find(x=>x.k===toy.shape);toyAnswer(ok,ok?'':`The answer is ${q.a}. A ${s.n.toLowerCase()} has ${s.f} faces, ${s.e} edges and ${s.v} vertices.`)},
  tqd(d){if(!toy.fb&&toy.input.length<3){toy.input+=d.d;render()}},tqb(){toy.input=toy.input.slice(0,-1);render()},
  tqok(){if(toy.fb||!toy.input)return;const ok=String(parseInt(toy.input,10))===toy.q.a,n=toy.num;toyAnswer(ok,ok?'':`The answer is ${toy.q.a}: ${Math.floor(n/100)} hundreds, ${Math.floor(n/10)%10} tens, ${n%10} ones = ${n}.`)},
  tcakecheck(){const c=toy.cake,[k,n]=c.target,ok=c.sel.length*n===k*c.n;toyAnswer(ok,ok?'':`${k}/${n} means ${k} of ${n} equal slices. You coloured ${c.sel.length}/${c.n}.`)}
});
document.addEventListener('change',e=>{if(e.target.dataset.change==='tedges'){toy.edges=e.target.checked;if(T3)T3.build()}});

/* ====== parent reviews (from config.js; hidden until real ones are added) ====== */
function reviews(){const R=(CFG.REVIEWS||[]).filter(r=>r&&r.text);if(!R.length)return '';
  return `<section class="stack"><h2>${LANG==='mr'?'पालक काय म्हणतात':LANG==='hi'?'माता-पिता क्या कहते हैं':'What parents say'}</h2><div class="grid reviews">${R.slice(0,6).map(r=>`<figure class="card review"><blockquote>“${esc(r.text)}”</blockquote><figcaption>${esc(r.who||'')}</figcaption></figure>`).join('')}</div></section>`}
/* ====== visitor counts (GoatCounter, cookie-free; off unless set in config.js) ====== */
let gcReady=false;
function gcCount(){if(!CFG.GOATCOUNTER||view==='teacher')return;const go=()=>{try{window.goatcounter.count({path:'/'+(view||'home'),title:view})}catch(e){}};
  if(gcReady)return go();if(document.getElementById('gcjs'))return;const s=document.createElement('script');s.id='gcjs';s.async=true;s.src='https://gc.zgo.at/count.js';
  s.dataset.goatcounter='https://'+String(CFG.GOATCOUNTER).replace(/[^a-z0-9-]/gi,'')+'.goatcounter.com/count';s.dataset.goatcounterSettings='{"no_onload":true}';
  s.onload=()=>{gcReady=true;go()};document.head.appendChild(s)}
/* ====== error reporting to the Sheet's "errors" tab (no personal data) ====== */
let errSent=0;
function reportError(m,src,line){if(!SYNC_URL||errSent>=3)return;errSent++;
  try{call('err',{e:{m:String(m||'').slice(0,200),src:String(src||'').split('/').pop().slice(0,60),line:+line||0,view,ua:navigator.userAgent.slice(0,120)}},0).catch(()=>{})}catch(e){}}
window.addEventListener('error',e=>reportError(e.message,e.filename,e.lineno));
window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&/offline|Wrong PIN|Too many|Google sign-in|Only Chetana/.test(r.message||''))return;reportError('promise: '+(r&&r.message||r),'',0)});

/* ====== Teacher console: notebook, weekly updates, subject roadmaps, documents ====== */
const NTAGS=['Note','Parent call','Concern','Win','Homework','Test result'];
let tnote={sid:'',tag:''},trm=null,trepw=null,trepMode='month';
const mondayOf=d=>{const x=new Date(d+'T00:00'),k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return x.toISOString().slice(0,10)};
const addDays=(d,n)=>{const x=new Date(d+'T00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const prettyShort=d=>new Date(d+'T00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});
/* ---------- Notebook ---------- */
function notesFor(sid){return T('notes').filter(n=>n.sid===sid).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id))}
function noteRow(n){const s=n.sid&&T('students').find(x=>x.id===n.sid),b=n.batch&&T('batches').find(x=>x.id===n.batch);
  return `<div class="item note"><div class="grow"><div class="small muted">${esc(prettyShort(n.date))} · <span class="pill">${esc(n.tag||'Note')}</span> ${s?'· <b>'+esc(s.name)+'</b>':b?'· '+esc(b.name):''}${n.by?' · '+esc(n.by):''}</div><div>${esc(n.text).replace(/\n/g,'<br>')}</div></div>
  <button class="btn ghost" data-act="tndel" data-id="${n.id}">${armed==='n'+n.id?'Tap again':'Delete'}</button></div>`}
function noteForm(sid){return `<form class="stack" data-form="addnote"><div class="row">
  ${sid?`<input type="hidden" id="nt-sid" value="${esc(sid)}">`:`<label>About<select id="nt-sid"><option value="">General</option>${active().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>`}
  <label>Type<select id="nt-tag">${NTAGS.map(t=>`<option>${t}</option>`).join('')}</select></label><label>Date<input id="nt-date" type="date" value="${today()}"></label></div>
  <label>Note<textarea id="nt-text" rows="3" maxlength="1000" required placeholder="e.g. Mother called: wants extra Marathi reading before the unit test"></textarea></label>
  <div class="row"><button class="btn navy">Save note</button></div></form>`}
function notesView(){const f=tnote,list=T('notes').filter(n=>(!f.sid||n.sid===f.sid)&&(!f.tag||n.tag===f.tag)).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  return `<section class="card stack"><h2>Add a note</h2>${noteForm('')}</section>
  <section class="card stack"><div class="row"><h2 style="margin-right:auto">Notebook</h2>
   <select aria-label="Filter by student" data-change="tnsid" style="width:auto"><option value="">Everyone</option>${active().map(s=>`<option value="${s.id}" ${f.sid===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
   <select aria-label="Filter by type" data-change="tntag" style="width:auto"><option value="">All types</option>${NTAGS.map(t=>`<option ${f.tag===t?'selected':''}>${t}</option>`).join('')}</select></div>
  ${list.slice(0,60).map(noteRow).join('')||'<p class="muted">No notes yet.</p>'}</section>`}
/* ---------- Weekly updates ---------- */
function weekReport(s,wk){const end=addDays(wk,6),inW=d=>d>=wk&&d<=end;
  const cs=T('classes').filter(c=>inW(c.date)&&((c.present||[]).indexOf(s.id)>=0||(c.absent||[]).indexOf(s.id)>=0)).sort((a,b)=>a.date.localeCompare(b.date));
  const here=cs.filter(c=>c.present.indexOf(s.id)>=0),L=[`*${s.name}'s week* (${prettyShort(wk)} – ${prettyShort(end)}) – Chetana's Tutoring`];
  L.push(cs.length?`Classes: attended ${here.length} of ${cs.length}`:'No classes this week');
  const topics=uniq(here.map(c=>c.topic).filter(Boolean));if(topics.length)L.push('We covered: '+topics.join('; '));
  const hw=cs.filter(c=>c.homework).map(c=>prettyShort(c.date)+': '+c.homework);if(hw.length)L.push('Homework: '+hw.join(' | '));
  cs.filter(c=>c.notes&&c.notes[s.id]).forEach(c=>L.push('Note ('+prettyShort(c.date)+'): '+c.notes[s.id]));
  T('notes').filter(n=>n.sid===s.id&&inW(n.date)&&['Win','Test result','Homework'].indexOf(n.tag)>=0).forEach(n=>L.push(n.tag+': '+n.text));
  const hs=hwStats(s.id,wk,end);if(hs.t)L.push(`Homework: ${hs.d} done${hs.l?', '+hs.l+' late':''}${hs.m?', '+hs.m+' missing':''}`);
  {const mk=marksFor(s.id).filter(m=>inW(m.date));if(mk.length)L.push('Test marks: '+mk.map(m=>`${m.subject} ${m.test} ${m.score}/${m.outOf}`).join('; '))}
  const days=(s.sessions||[]).filter(inW).length;if(days)L.push('Practised online on '+days+' day'+(days===1?'':'s')+'. ⭐');
  const tr=tricky(s);if(tr.length)L.push('Practise at home: '+tr.slice(0,4).join(', '));
  const up=rmUpcoming(s.batch);if(up)L.push('Coming up: '+up);
  return L.join('\n')}
function reportsView(){const weekly=trepMode==='week',wk=trepw||mondayOf(today()),key=weekly?'ct_wrep_'+wk:'ct_rep_'+trepm,sent=ls.get(key)||[],ss=active().sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="row"><button class="btn" data-act="tback">← Students</button></div>
  <section class="card stack"><div class="tabs"><button class="btn" data-act="trepmode" data-m="week" aria-pressed="${weekly}">Weekly updates</button><button class="btn" data-act="trepmode" data-m="month" aria-pressed="${!weekly}">Monthly reports</button></div>
  <div class="row"><h2 style="margin-right:auto">${weekly?'Week of '+prettyShort(wk):monthName(trepm)}</h2>${weekly?`<button class="btn" data-act="trepwk" data-d="-7" aria-label="Previous week">‹</button><button class="btn" data-act="trepwk" data-d="7" aria-label="Next week">›</button>`:`<input type="month" value="${trepm}" data-change="trepm" aria-label="Report month" style="width:auto">`}</div>
  <p class="muted">${sent.length} of ${ss.length} sent. Tap Send: WhatsApp opens with the message ready; press send there, then come back for the next one.</p>
  ${ss.map(s=>{const t=weekly?weekReport(s,wk):report(s),l=waLink(s.phone,t),done=sent.indexOf(s.id)>=0;return `<details class="item rp${done?' sent':''}"><summary><b>${esc(s.name)}</b> ${done?'<span class="pill ok">Sent</span>':''}${l?'':'<span class="pill bad">No WhatsApp number</span>'}</summary><pre class="msg">${esc(t)}</pre></details>
   ${l?`<a class="btn ${done?'':'go'}" href="${l}" target="_blank" rel="noopener" data-rsent="${s.id}" data-rkey="${key}">${done?'Send again':'Send'}</a>`:''}`}).join('')}</section>`}
/* ---------- Subject roadmaps ---------- */
function rmStats(r){const ch=r.chapters||[],done=ch.filter(c=>c.done).length,t=today(),late=ch.filter(c=>!c.done&&c.plan&&c.plan<t).length,
  nextTest=(r.tests||[]).filter(x=>x.d>=t).sort((a,b)=>a.d.localeCompare(b.d))[0],left=nextTest?ch.filter(c=>!c.done&&(!c.plan||c.plan<=nextTest.d)).length:0;
  return{done,total:ch.length,late,nextTest,left,status:!ch.length?'empty':done===ch.length?'done':late?'behind':'on track'}}
function rmUpcoming(batch){const rs=T('roadmaps').filter(r=>r.batch===batch);const out=[];
  rs.forEach(r=>{const st=rmStats(r);if(st.nextTest)out.push(`${r.subject} ${st.nextTest.name} on ${prettyShort(st.nextTest.d)}`)});return out.join('; ')}
function rmAlerts(){const out=[],t=today(),lim=addDays(t,14);
  T('roadmaps').forEach(r=>{const st=rmStats(r),b=T('batches').find(x=>x.id===r.batch);if(st.nextTest&&st.nextTest.d<=lim&&st.left)out.push(`<b>${esc(b?b.name:'')}</b> ${esc(r.subject)}: ${esc(st.nextTest.name)} on ${prettyShort(st.nextTest.d)}, ${st.left} chapter${st.left===1?'':'s'} still to finish`);
    else if(st.late)out.push(`<b>${esc(b?b.name:'')}</b> ${esc(r.subject)}: ${st.late} chapter${st.late===1?'':'s'} behind plan`)});return out}
function roadmapsView(){if(trm)return roadmapDetail();const rs=T('roadmaps'),bs=T('batches');
  return `<section class="card stack"><h2>Subject roadmaps</h2><p class="muted">One roadmap per batch and subject: chapters from the school syllabus, the week you plan to teach each one, and school test dates. Ticking chapters in the class log keeps it up to date.</p>
  ${rs.map(r=>{const st=rmStats(r),b=bs.find(x=>x.id===r.batch);return `<button class="item rmrow" data-act="trmopen" data-id="${r.id}"><div class="grow"><b>${esc(b?b.name:'?')} · ${esc(r.subject)}</b>
    <div class="bar"><i style="width:${st.total?st.done/st.total*100:0}%"></i></div><div class="small muted">${st.done} of ${st.total} chapters${st.nextTest?' · next: '+esc(st.nextTest.name)+' '+prettyShort(st.nextTest.d):''}</div></div>
    <span class="pill ${st.status==='behind'?'bad':st.status==='done'||st.status==='on track'?'ok':''}">${st.status}</span></button>`}).join('')||''}
  ${isOwner()?`<form class="row" data-form="addrm"><label>Batch<select id="rm-b">${bs.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label><label class="grow">Subject<input id="rm-s" required maxlength="40" placeholder="e.g. Maths"></label><button class="btn go">Create roadmap</button></form>`:''}
  ${bs.length?'':'<p class="muted">Add a batch first.</p>'}</section>`}
function roadmapDetail(){const r=T('roadmaps').find(x=>x.id===trm);if(!r){trm=null;return roadmapsView()}const b=T('batches').find(x=>x.id===r.batch),st=rmStats(r),t=today(),own=isOwner();
  return `<div class="row"><button class="btn" data-act="trmclose">← All roadmaps</button></div>
  <section class="card stack"><div class="row"><h2 style="margin-right:auto">${esc(b?b.name:'')} · ${esc(r.subject)}</h2><span class="pill ${st.status==='behind'?'bad':'ok'}">${st.status}</span></div>
  <div class="bar"><i style="width:${st.total?st.done/st.total*100:0}%"></i></div><p class="small muted">${st.done} of ${st.total} chapters done${st.late?`, ${st.late} behind plan`:''}.</p>
  ${(r.chapters||[]).map((c,i)=>`<div class="item rmch${c.done?' done':c.plan&&c.plan<t?' late':''}"><label class="grow rmtick"><input type="checkbox" data-change="rmdone" data-i="${i}" ${c.done?'checked':''}> <span>${i+1}. ${esc(c.t)}</span></label>
   <span class="small muted">${c.done?'Done '+prettyShort(c.done):c.plan?'Plan: week of '+prettyShort(c.plan):'Not planned'}</span>
   ${own?`<input type="date" value="${esc(c.plan||'')}" data-change="rmplan" data-i="${i}" aria-label="Planned week for ${esc(c.t)}" style="width:auto">`:''}</div>`).join('')||'<p class="muted">No chapters yet.</p>'}</section>
  ${own?`<section class="card stack"><h3>Add chapters</h3><form class="stack" data-form="rmaddch"><label>One chapter per line, in teaching order<textarea id="rm-ch" rows="5" placeholder="Large numbers&#10;Addition and subtraction&#10;Multiplication"></textarea></label><div class="row"><button class="btn navy">Add chapters</button></div></form>
  <form class="row" data-form="rmspread"><label>Start<input id="rm-from" type="date" value="${t}"></label><label>Finish by<input id="rm-to" type="date" required></label><button class="btn">Plan the weeks for me</button></form>
  <p class="small muted">Spreads the unfinished chapters evenly, one week each or more, between the two dates. You can change any week afterwards.</p></section>
  <section class="card stack"><h3>School tests</h3>${(r.tests||[]).slice().sort((a,c)=>a.d.localeCompare(c.d)).map(x=>`<div class="item"><div class="grow"><b>${esc(x.name)}</b> <span class="small muted">${prettyShort(x.d)}</span></div><button class="btn ghost" data-act="rmdeltest" data-d="${esc(x.d)}" data-n="${esc(x.name)}">Remove</button></div>`).join('')||'<p class="muted small">No test dates yet.</p>'}
  <form class="row" data-form="rmtest"><label class="grow">Test<input id="rm-tn" required maxlength="40" placeholder="e.g. Unit test 2"></label><label>Date<input id="rm-td" type="date" required></label><button class="btn navy">Add</button></form></section>
  <div class="row"><button class="btn bad" data-act="trmdel">${armed==='rm'?'Tap again to delete this roadmap':'Delete roadmap'}</button></div>`:''}`}
const saveRm=r=>tPutK('roadmaps',r);
/* ---------- Documents (Drive) ---------- */
const DOC_OK=/^(application\/pdf|image\/(jpeg|png|webp)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/msword)$/;
function docsSection(s){if(!SYNC_URL)return `<section class="card stack"><h3>Documents</h3><p class="muted">Uploading documents needs the Google Sheet connection.</p></section>`;
  const ds=T('docs').filter(d=>d.sid===s.id).sort((a,b)=>b.date.localeCompare(a.date));
  return `<section class="card stack"><h3>Documents</h3><p class="small muted">Test papers, worksheets, photos of homework. Saved privately in your Google Drive, folder “Tutoring documents”. PDF, photo, Word, Excel or PowerPoint, up to 5 MB.</p>
  ${ds.map(d=>`<div class="item"><div class="grow"><a href="https://drive.google.com/file/d/${encodeURIComponent(d.fileId)}/view" target="_blank" rel="noopener"><b>${esc(d.name)}</b></a><div class="small muted">${esc(d.subject||'General')} · ${esc(prettyShort(d.date))} · ${Math.max(1,Math.round(d.size/1024))} KB${d.by?' · '+esc(d.by):''}</div></div>${isOwner()?`<button class="btn ghost" data-act="tdocdel" data-id="${d.id}">${armed==='d'+d.id?'Tap again':'Delete'}</button>`:''}</div>`).join('')||'<p class="muted small">No documents yet.</p>'}
  <form class="row" data-form="docup"><label class="grow">File<input id="doc-f" type="file" accept=".pdf,image/*,.doc,.docx,.xlsx,.pptx" required></label><label>Subject<input id="doc-s" maxlength="30" placeholder="e.g. Maths"></label><button class="btn navy">Upload</button></form>
  ${isOwner()?'':'<p class="small muted">Only Chetana can open the files.</p>'}</section>`}
Object.assign(acts,{
  tndel(d){if(armed!=='n'+d.id){armed='n'+d.id;render();return}tDelK('notes',d.id)},
  trepmode(d){trepMode=d.m;render()},trepwk(d){trepw=addDays(trepw||mondayOf(today()),+d.d);render()},
  trmopen(d){trm=d.id;armed=null;render();window.scrollTo(0,0)},trmclose(){trm=null;armed=null;render()},
  trmdel(){if(armed!=='rm'){armed='rm';render();return}const id=trm;trm=null;tDelK('roadmaps',id)},
  rmdeltest(d){const r=T('roadmaps').find(x=>x.id===trm);r.tests=(r.tests||[]).filter(x=>!(x.d===d.d&&x.name===d.n));saveRm(r)},
  tdocdel(d){if(armed!=='d'+d.id){armed='d'+d.id;render();return}tDelK('docs',d.id)}
});
Object.assign(forms,{
  addnote(){const o={id:newId('n'),sid:val('nt-sid'),tag:val('nt-tag'),date:val('nt-date')||today(),text:val('nt-text'),by:isOwner()?'':(tdata.me||{}).name||''};if(!o.text)return;tPutK('notes',o).then(()=>toast('Note saved.'))},
  addrm(){const o={id:newId('r'),batch:val('rm-b'),subject:val('rm-s'),chapters:[],tests:[]};tPutK('roadmaps',o).then(()=>{trm=o.id;render()})},
  rmaddch(){const r=T('roadmaps').find(x=>x.id===trm),lines=document.getElementById('rm-ch').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,60);if(!lines.length)return;
    r.chapters=(r.chapters||[]).concat(lines.map(t=>({id:newId('c'),t:t.slice(0,80),plan:'',done:''})));saveRm(r)},
  rmspread(){const r=T('roadmaps').find(x=>x.id===trm),from=mondayOf(val('rm-from')||today()),to=val('rm-to'),todo=(r.chapters||[]).filter(c=>!c.done);
    if(!to||to<from||!todo.length){toast('Pick a finish date after the start.',true);return}const weeks=Math.max(1,Math.floor((new Date(to)-new Date(from))/6048e5)+1);
    todo.forEach((c,i)=>{c.plan=addDays(from,7*Math.floor(i*weeks/todo.length))});saveRm(r)},
  rmtest(){const r=T('roadmaps').find(x=>x.id===trm);r.tests=(r.tests||[]).concat({name:val('rm-tn'),d:val('rm-td')});saveRm(r)},
  docup(){const f=document.getElementById('doc-f').files[0],s=T('students').find(x=>x.id===tsel);if(!f||!s)return;
    if(f.size>5*1024*1024){toast('That file is over 5 MB. Try a smaller photo or PDF.',true);return}
    if(!DOC_OK.test(f.type)){toast('Please upload a PDF, photo, Word, Excel or PowerPoint file.',true);return}
    const rd=new FileReader();toast('Uploading…');rd.onload=()=>{const data=String(rd.result).split(',')[1];
      call('tUpload',{pin:tpin,o:{sid:s.id,subject:val('doc-s'),name:f.name.slice(0,80),mime:f.type,data}}).then(d=>{tdata.docs=T('docs').concat(d);toast('Uploaded to Drive.');render()}).catch(tfail)};rd.readAsDataURL(f)}
});
document.addEventListener('click',e=>{const a=e.target.closest('a[data-rkey]');if(!a)return;const k=a.dataset.rkey,l=ls.get(k)||[];if(l.indexOf(a.dataset.rsent)<0){l.push(a.dataset.rsent);ls.set(k,l)}setTimeout(render,300)});
document.addEventListener('change',e=>{const t=e.target,c=t.dataset.change;if(!c)return;
  if(c==='tnsid'){tnote.sid=t.value;render()}if(c==='tntag'){tnote.tag=t.value;render()}
  if(c==='rmdone'||c==='rmplan'){const r=T('roadmaps').find(x=>x.id===trm),ch=r.chapters[+t.dataset.i];if(c==='rmdone')ch.done=t.checked?today():'';else ch.plan=t.value?mondayOf(t.value):'';saveRm(r)}});

/* ====== Parent guide (from the printed Parent Guide), English / Marathi / Hindi ====== */
const GUIDE_P={
en:{t:'Parent guide',sub:'How classes work, how we track progress, and how you can help at home.',
 s:[['Our method',[['Concept','We walk through your child’s textbook and explain the core idea simply.'],['Practice','Oral and written practice in every class, not just reading along.'],['Mastery','We repeat until your child truly understands, then move on.']]],
 ['Every term, run like a project',[['','Chetana brings her engineering and project-management experience into teaching, so nothing is left to the last week before exams.'],['Map','Your child’s syllabus and school test dates become one term roadmap.'],['Chunk','Big chapters are broken into small weekly goals.'],['Play','Each chunk is learned through games, stories and challenges.'],['Review','Weak spots are revised well before every test.']]],
 ['Your child’s own book and exams',[['','We teach from the textbook your child’s school uses, whatever the school.'],['','We plan chapters and revision around the school’s test dates.'],['','State, CBSE and ICSE boards covered.']]],
 ['Progress you can see',[['Starting check','In the first week, so we know where your child stands.'],['Weekly update','Attendance, what we covered, homework, and what is coming up, on WhatsApp.'],['Quick alert','If your child is stuck on a topic, with a 5-minute home tip.'],['Pre-exam note','A week before school tests.'],['Monthly progress report','On WhatsApp.']]],
 ['Speaking, reading and writing',[['','A separate level-based programme for Marathi, Hindi and English, from letters and sounds up to confident writing and speaking. Ideal for children from non-Marathi families.']]],
 ['How you can help at home',[['10 minutes a day','A short, regular slot works better than a long weekend session. The Kids’ Zone shows “Tonight’s 10 minutes”.'],['Ask “teach me”','Ask your child to explain one thing they learned today. Explaining is the best revision.'],['Check the homework, not the answers','Make sure it is done and neat; let mistakes come to class so we can fix them.'],['Tell us early','Message Chetana when school sets a test date or your child seems worried about a subject.']]],
 ['Using the website',[['Learning library','Free chapters with practice that checks itself: English, Maths, Marathi and Hindi, grammar.'],['Kids’ World and Pune Ride','Game-style practice that children enjoy.'],['Child login','Your child types their first name and 4-digit PIN to save stars, so Chetana can see their practice.'],['Starting check','A free 10-minute check you can do at home anytime.']]],
 ['The practical details',[['','Grades 1–10 · All subjects up to Grade 8, languages for Grades 9–10'],['','Small batches · In person at Sparklet, Megapolis or live online'],['','Simple monthly fees · No long-term lock-in']]]],
 cta:'Book a free demo class',print:'Print or save as PDF'},
mr:{t:'पालक मार्गदर्शिका',sub:'वर्ग कसे चालतात, प्रगती कशी पाहतो, आणि तुम्ही घरी कशी मदत करू शकता.',
 s:[['आमची पद्धत',[['संकल्पना','मुलाच्या पाठ्यपुस्तकातून मुख्य संकल्पना सोप्या भाषेत समजावतो.'],['सराव','प्रत्येक वर्गात तोंडी आणि लेखी सराव, फक्त वाचन नाही.'],['पक्की तयारी','मुलाला खरंच समजेपर्यंत पुन्हा करतो, मगच पुढे जातो.']]],
 ['प्रत्येक सत्र, प्रोजेक्टसारखं',[['','चेतना इंजिनिअरिंग आणि प्रोजेक्ट-व्यवस्थापनाचा अनुभव शिकवण्यात आणतात, त्यामुळे परीक्षेआधीच्या शेवटच्या आठवड्यासाठी काहीच उरत नाही.'],['नकाशा','अभ्यासक्रम आणि शाळेच्या परीक्षांच्या तारखांवरून सत्राचा एक आराखडा.'],['छोटे टप्पे','मोठे धडे छोट्या साप्ताहिक उद्दिष्टांमध्ये.'],['खेळ','प्रत्येक टप्पा खेळ, गोष्टी आणि आव्हानांतून.'],['उजळणी','प्रत्येक परीक्षेच्या खूप आधी अवघड भागांची उजळणी.']]],
 ['मुलाचं स्वतःचं पुस्तक आणि परीक्षा',[['','शाळा कोणतीही असो, मुलाच्या शाळेच्या पाठ्यपुस्तकातूनच शिकवतो.'],['','शाळेच्या परीक्षांच्या तारखांनुसार धडे आणि उजळणीचं नियोजन.'],['','स्टेट, CBSE आणि ICSE बोर्ड.']]],
 ['दिसणारी प्रगती',[['सुरुवातीची चाचणी','पहिल्या आठवड्यात, म्हणजे मूल कुठे आहे ते कळतं.'],['साप्ताहिक माहिती','उपस्थिती, काय शिकवलं, गृहपाठ आणि पुढे काय, WhatsApp वर.'],['लगेच सूचना','मूल एखाद्या विषयात अडकलं तर, घरी करण्याच्या ५ मिनिटांच्या टीपसह.'],['परीक्षेआधीची टीप','शाळेच्या परीक्षेच्या एक आठवडा आधी.'],['मासिक प्रगती अहवाल','WhatsApp वर.']]],
 ['बोलणं, वाचन आणि लेखन',[['','मराठी, हिंदी आणि इंग्रजीसाठी स्तरानुसार वेगळा कार्यक्रम, अक्षरं आणि आवाजांपासून आत्मविश्वासाने लिहिण्या-बोलण्यापर्यंत. मराठी नसलेल्या कुटुंबांतील मुलांसाठी उत्तम.']]],
 ['तुम्ही घरी कशी मदत करू शकता',[['रोज १० मिनिटं','आठवड्याच्या शेवटी मोठ्या वेळेपेक्षा रोजचा छोटा, नियमित वेळ जास्त उपयोगी. किड्स झोनमध्ये “आजची १० मिनिटं” दिसतात.'],['“मला शिकव” म्हणा','आज शिकलेली एक गोष्ट मुलाला तुम्हाला समजावून सांगायला सांगा. समजावणं हीच सर्वोत्तम उजळणी.'],['गृहपाठ तपासा, उत्तरं नाही','तो पूर्ण आणि नीट आहे ना एवढं पाहा; चुका वर्गात येऊ द्या, म्हणजे आम्ही त्या दुरुस्त करू.'],['लवकर कळवा','शाळेने परीक्षेची तारीख दिली किंवा मूल एखाद्या विषयाची काळजी करत असेल, तर चेतना यांना संदेश पाठवा.']]],
 ['वेबसाइट कशी वापरायची',[['अभ्यास साहित्य','आपोआप तपासला जाणारा सराव असलेले मोफत धडे: इंग्रजी, गणित, मराठी आणि हिंदी, व्याकरण.'],['किड्स वर्ल्ड आणि पुणे राइड','मुलांना आवडणारा खेळासारखा सराव.'],['मुलाचं लॉगिन','तारे जतन करण्यासाठी मूल आपलं पहिलं नाव आणि ४ अंकी PIN टाइप करतं, त्यामुळे चेतना सराव पाहू शकतात.'],['सुरुवातीची चाचणी','घरी कधीही करता येणारी मोफत १० मिनिटांची चाचणी.']]],
 ['व्यावहारिक माहिती',[['','इयत्ता १–१० · इयत्ता ८ पर्यंत सर्व विषय, इयत्ता ९–१० साठी भाषा'],['','लहान बॅच · स्पार्कलेट, मेगापोलिस येथे प्रत्यक्ष किंवा लाइव्ह ऑनलाइन'],['','साधी मासिक फी · दीर्घ मुदतीचं बंधन नाही']]]],
 cta:'मोफत डेमो वर्ग बुक करा',print:'प्रिंट करा किंवा PDF म्हणून जतन करा'},
hi:{t:'माता-पिता गाइड',sub:'क्लास कैसे चलती हैं, प्रगति कैसे देखते हैं, और आप घर पर कैसे मदद कर सकते हैं।',
 s:[['हमारा तरीका',[['कॉन्सेप्ट','बच्चे की पाठ्यपुस्तक से मुख्य बात आसान तरीके से समझाते हैं।'],['अभ्यास','हर क्लास में मौखिक और लिखित अभ्यास, सिर्फ़ पढ़ना नहीं।'],['पक्की समझ','जब तक बच्चा सच में न समझे, दोहराते हैं, फिर आगे बढ़ते हैं।']]],
 ['हर सत्र, प्रोजेक्ट की तरह',[['','चेतना इंजीनियरिंग और प्रोजेक्ट-मैनेजमेंट का अनुभव पढ़ाने में लाती हैं, ताकि परीक्षा से पहले के आख़िरी हफ़्ते के लिए कुछ न बचे।'],['नक्शा','सिलेबस और स्कूल टेस्ट की तारीखों से पूरे सत्र का एक रोडमैप।'],['छोटे हिस्से','बड़े पाठ छोटे साप्ताहिक लक्ष्यों में।'],['खेल','हर हिस्सा खेल, कहानियों और चुनौतियों से।'],['दोहराई','हर टेस्ट से काफ़ी पहले कमज़ोर हिस्सों की दोहराई।']]],
 ['बच्चे की अपनी किताब और परीक्षा',[['','स्कूल कोई भी हो, बच्चे के स्कूल की पाठ्यपुस्तक से ही पढ़ाते हैं।'],['','स्कूल की टेस्ट तारीखों के हिसाब से पाठ और दोहराई की योजना।'],['','स्टेट, CBSE और ICSE बोर्ड।']]],
 ['दिखने वाली प्रगति',[['शुरुआती जाँच','पहले हफ़्ते में, ताकि पता चले बच्चा कहाँ है।'],['साप्ताहिक जानकारी','हाज़िरी, क्या पढ़ाया, होमवर्क और आगे क्या है, WhatsApp पर।'],['तुरंत सूचना','अगर बच्चा किसी विषय में अटके, घर के लिए 5 मिनट की टिप के साथ।'],['परीक्षा से पहले नोट','स्कूल टेस्ट से एक हफ़्ता पहले।'],['मासिक प्रगति रिपोर्ट','WhatsApp पर।']]],
 ['बोलना, पढ़ना और लिखना',[['','मराठी, हिंदी और अंग्रेज़ी के लिए स्तर के हिसाब से अलग कार्यक्रम, अक्षरों और आवाज़ों से लेकर आत्मविश्वास से लिखने-बोलने तक। गैर-मराठी परिवारों के बच्चों के लिए बढ़िया।']]],
 ['आप घर पर कैसे मदद कर सकते हैं',[['रोज़ 10 मिनट','हफ़्ते के आख़िर के लंबे समय से रोज़ का छोटा, नियमित समय ज़्यादा काम का है। किड्स ज़ोन में “आज के 10 मिनट” दिखते हैं।'],['“मुझे सिखाओ” कहें','बच्चे से आज सीखी एक बात आपको समझाने को कहें। समझाना ही सबसे अच्छी दोहराई है।'],['होमवर्क जाँचें, जवाब नहीं','बस देखें कि वह पूरा और साफ़ है; गलतियाँ क्लास में आने दें, ताकि हम उन्हें सुधार सकें।'],['जल्दी बताएँ','जब स्कूल टेस्ट की तारीख दे या बच्चा किसी विषय से परेशान लगे, तो चेतना को संदेश भेजें।']]],
 ['वेबसाइट कैसे इस्तेमाल करें',[['पढ़ाई सामग्री','अपने-आप जँचने वाले अभ्यास के साथ मुफ़्त पाठ: अंग्रेज़ी, गणित, मराठी और हिंदी, व्याकरण।'],['किड्स वर्ल्ड और पुणे राइड','खेल जैसा अभ्यास जो बच्चों को पसंद आता है।'],['बच्चे का लॉगिन','सितारे सहेजने के लिए बच्चा अपना पहला नाम और 4 अंकों का PIN टाइप करता है, ताकि चेतना अभ्यास देख सकें।'],['शुरुआती जाँच','घर पर कभी भी की जा सकने वाली मुफ़्त 10 मिनट की जाँच।']]],
 ['ज़रूरी जानकारी',[['','कक्षा 1–10 · कक्षा 8 तक सभी विषय, कक्षा 9–10 के लिए भाषाएँ'],['','छोटे बैच · स्पार्कलेट, मेगापोलिस में आमने-सामने या लाइव ऑनलाइन'],['','आसान मासिक फ़ीस · लंबी अवधि का कोई बंधन नहीं']]]],
 cta:'मुफ़्त डेमो क्लास बुक करें',print:'प्रिंट करें या PDF के रूप में सहेजें'}};
function parentGuide(){const g=GUIDE_P[LANG]||GUIDE_P.en;
  return `<section class="stack guide-head"><h1>${g.t}</h1><p class="muted lead">${g.sub}</p><div class="row noprint"><button class="btn" data-act="tprint">${g.print}</button></div></section>
  <div class="guide-grid">${g.s.map(([h,items],i)=>`<section class="card stack guide-sec"><h2><span class="gnum">${i+1}</span>${h}</h2>${items.map(([b,t])=>b?`<p><b>${b}.</b> ${t}</p>`:`<p>${t}</p>`).join('')}</section>`).join('')}</div>
  <section class="contact"><div><h2>${g.cta}</h2><p>Sparklet, Megapolis, Hinjawadi, Pune · ${LANG==='mr'?'ऑनलाइनही':LANG==='hi'?'ऑनलाइन भी':'online too'}</p></div><div class="row noprint"><a class="btn go" href="#book">${g.cta}</a><a class="btn" href="${WA}">WhatsApp</a></div></section>`}

/* ====== Concept card builder (images for WhatsApp / Instagram), teacher console ====== */
const CB_SIZES={square:[1080,1080,'Square post'],story:[1080,1920,'Status / Story'],wide:[1200,630,'Wide']};
const CB_LAYOUTS={cards:'Trick cards',steps:'Numbered steps',compare:'Wrong vs right',quiz:'Quiz question'};
const CB_TEMPLATES=[
 {name:'Open roof (Marathi & Hindi)',layout:'cards',kicker:'Concept of the week · Marathi & Hindi',hook:'Why does your child keep mixing up these letters?',title:'The “open roof” trick',
  intro:'Some letters look like twins. The difference is the roof, the line on top. One twin has a full roof; the other has a gap in it.',
  items:'घ / ध | gha vs dha | घ has a full roof. ध has a gap on the left.\nम / भ | ma vs bha | म has a full roof. भ has a gap on the left.\nख / रव | kha vs ra + va | ख holds hands: its two parts are joined.',
  tryit:'Write the six letters on paper and ask, “Which ones have an open roof?”'},
 {name:'-ed has three sounds (English)',layout:'cards',kicker:'Concept of the week · English',hook:'Did you know “-ed” is not always said the same way?',title:'One spelling, three sounds',
  intro:'The ending changes sound depending on the letter before it. A simple throat test tells you which.',
  items:'/t/ | walked · jumped · washed | After a soft, whispery sound, -ed sounds like t.\n/d/ | played · called · opened | After a buzzing sound or a vowel, -ed sounds like d.\n/id/ | wanted · needed · painted | Only after t or d does -ed add an extra beat.',
  tryit:'Say “jumped”, “played” and “wanted” with a hand on your throat. Which ones buzz?'},
 {name:'Only 6 hard table facts (Maths)',layout:'steps',kicker:'Concept of the week · Maths',hook:'Tables feel like 100 facts to memorise. They are not.',title:'Only 6 hard facts',
  intro:'Learn the tables in this smart order. Since 3 × 7 = 7 × 3, every fact counts twice.',
  items:'×1 ×10 | Free | Same number, or add a zero.\n×2 | Doubles | 2 × 7 = 7 + 7.\n×5 | Half of ×10 | 5 × 8 = half of 80.\n×9 | ×10 minus one | 9 × 7 = 70 − 7.\n×4 | Double, double | 4 × 6: 12, then 24.\n×3 | Double + one more | 3 × 8 = 16 + 8.',
  tryit:'Left to learn: 6×6, 6×7, 6×8, 7×7, 7×8, 8×8. One a day at dinner.'},
 {name:'Earn and owe (integers)',layout:'cards',kicker:'Concept of the week · Maths',hook:'Positive and negative numbers confusing your child?',title:'Think money, not minus signs',
  intro:'Plus means money you earn. Minus means money you owe. Ask: “How much do I have now?”',
  items:'5 + (−3) = 2 | Earn 5, owe 3 | Pay off the debt; 2 is left.\n−4 + 6 = 2 | Owe 4, earn 6 | Clear what you owe; 2 is yours.\n−2 + (−3) = −5 | Owe 2, borrow 3 | Debt plus debt is a bigger debt.',
  tryit:'Give pretend notes for “earn” and paper slips for “owe”. Call out sums and settle the account.'},
 {name:'The percent flip (Maths)',layout:'compare',kicker:'Concept of the week · Maths',hook:'The percentage shortcut most adults never learned',title:'The percent flip',
  intro:'x% of y is always equal to y% of x. When one way looks hard, flip it.',
  items:'8% of 50 | 50% of 8 = 4\n4% of 75 | 75% of 4 = 3\n16% of 25 | 25% of 16 = 4',
  tryit:'Ask “What is 12% of 50?” Then flip it: 50% of 12 = 6.'}];
let cb=null;
const cbBlank=()=>({id:'',name:'',layout:'cards',size:'square',kicker:'Concept of the week',hook:'',title:'',intro:'',items:'',tryit:'',emoji:''});
function cbSaved(){return ls.get('ct_cards')||[]}
function cardsView(){if(!cb)cb=Object.assign(cbBlank(),CB_TEMPLATES[0],{id:''});
  const saved=cbSaved(),ph=cb.layout==='compare'?'Hard way | Easy way (one pair per line)':cb.layout==='quiz'?'Option A\nOption B\nOption C (first line = the right answer; it is shuffled)':'Big text | short label | one-line explanation (one per line)';
  setTimeout(cbDraw,0);
  return `<section class="card stack"><h2>Concept card builder</h2><p class="muted small">Make an image post in Chetana’s style. Type in English, मराठी or हिंदी. Read it once before posting: what you type is what parents see.</p>
  <div class="row"><label class="grow">Start from<select data-change="cbtpl"><option value="">Choose a template…</option>${CB_TEMPLATES.map((t,i)=>`<option value="t${i}">${esc(t.name)}</option>`).join('')}${saved.map(c=>`<option value="${c.id}">Saved: ${esc(c.name||c.title)}</option>`).join('')}</select></label>
   <button class="btn" data-act="cbnew">Blank card</button></div></section>
  <div class="cb-wrap"><section class="card stack cb-form" data-cbform>
   <div class="row"><label>Layout<select data-cb="layout">${Object.entries(CB_LAYOUTS).map(([k,v])=>`<option value="${k}" ${cb.layout===k?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Size<select data-cb="size">${Object.entries(CB_SIZES).map(([k,v])=>`<option value="${k}" ${cb.size===k?'selected':''}>${v[2]}</option>`).join('')}</select></label></div>
   <label>Small heading<input data-cb="kicker" maxlength="50" value="${esc(cb.kicker)}"></label>
   <label>Hook question<input data-cb="hook" maxlength="90" value="${esc(cb.hook)}"></label>
   <label>Big title<input data-cb="title" maxlength="50" value="${esc(cb.title)}"></label>
   <label>${cb.layout==='quiz'?'The question':'Short explanation'}<textarea data-cb="intro" rows="2" maxlength="220">${esc(cb.intro)}</textarea></label>
   <label>${cb.layout==='quiz'?'Answer options':'Items'}<textarea data-cb="items" rows="5" maxlength="700" placeholder="${esc(ph)}">${esc(cb.items)}</textarea></label>
   <label>${cb.layout==='quiz'?'Explanation after the answer':'Try tonight'}<input data-cb="tryit" maxlength="140" value="${esc(cb.tryit)}"></label>
   <label>Big emoji (optional)<input data-cb="emoji" maxlength="4" value="${esc(cb.emoji)}" style="width:6em"></label>
   <div class="row"><label class="grow">Save as<input data-cb="name" maxlength="40" value="${esc(cb.name)}" placeholder="e.g. Week 5 fractions"></label><button class="btn navy" data-act="cbsave">Save</button>${cb.id?`<button class="btn ghost" data-act="cbdel">${armed==='cb'?'Tap again':'Delete'}</button>`:''}</div></section>
  <section class="card stack cb-prev"><canvas id="cbc" class="cbc" role="img" aria-label="Preview of the concept card"></canvas>
   <div class="row"><button class="btn go" data-act="cbdown">Download image</button>${navigator.share?'<button class="btn" data-act="cbshare">Share</button>':''}</div>
   ${cb.layout==='quiz'?'<p class="small muted">Quiz cards come in two images: the question, and the answer to post later.</p><div class="row"><button class="btn" data-act="cbdown" data-ans="1">Download answer image</button></div>':''}</section></div>`}
let cbFontsReady=null;
function cbFonts(){return cbFontsReady=cbFontsReady||Promise.all(['700 60px Kalam','800 40px "Nunito Sans"','600 30px "Nunito Sans"','700 40px "Noto Sans Devanagari"'].map(f=>document.fonts.load(f).catch(()=>{}))).catch(()=>{})}
let cbLogo=null;
function cbDraw(answer){const cv=document.getElementById('cbc');if(!cv||!cb)return Promise.resolve(null);
  return cbFonts().then(()=>new Promise(res=>{if(cbLogo&&cbLogo.complete)return res();cbLogo=new Image();cbLogo.onload=cbLogo.onerror=()=>res();cbLogo.src='img/logo.jpg'})).then(()=>{
  const [W,H]=CB_SIZES[cb.size]||CB_SIZES.square;cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const F=(w,px,fam)=>`${w} ${px}px ${fam==='hand'?'Kalam':'"Nunito Sans"'}, "Noto Sans Devanagari", sans-serif`;
  const wrap=(t,maxW,font)=>{x.font=font;const words=String(t||'').split(/\s+/),lines=[];let cur='';words.forEach(w=>{const tryL=cur?cur+' '+w:w;if(x.measureText(tryL).width>maxW&&cur){lines.push(cur);cur=w}else cur=tryL});if(cur)lines.push(cur);return lines};
  const items=String(cb.items||'').split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(r=>r[0]);
  function layout(k,draw){let y=0;const pad=Math.round(W*.07),inner=W-pad*2,lh=s=>Math.round(s*1.28);
    const text=(t,size,w,fam,color,align,maxW)=>{const f=F(w,Math.round(size*k),fam),ls=wrap(t,maxW||inner,f);ls.forEach(l=>{if(draw){x.font=f;x.fillStyle=color;x.textAlign=align||'left';x.fillText(l,align==='center'?W/2:pad,y+Math.round(size*k))}y+=lh(size*k)});return ls.length};
    y=pad*0.9;
    if(cb.kicker)text(String(cb.kicker).toUpperCase(),26,800,'body','#FFD27A');y+=8*k;
    if(cb.hook)text(cb.hook,34,700,'body','#EEE8DA');y+=10*k;
    const titleTop=y;if(cb.title)text(cb.title,76,700,'hand','#ffffff');
    if(draw&&cb.title){x.strokeStyle='#F4A300';x.lineWidth=Math.max(4,7*k);x.lineCap='round';x.beginPath();x.moveTo(pad,y+4);x.bezierCurveTo(pad+inner*.3,y-6,pad+inner*.6,y+12,pad+Math.min(inner,x.measureText?inner*.85:inner),y)  ;x.stroke()}
    y+=22*k;if(cb.intro)text(cb.layout==='quiz'?cb.intro:cb.intro,32,600,'body','#F3EEE3');y+=18*k;
    if(cb.layout==='quiz'){const opts=items.map(r=>r[0]);const order=opts.map((o,i)=>i).sort((a,b)=>((a*7+3)%opts.length)-((b*7+3)%opts.length));
      order.forEach((i,n)=>{const lab=String.fromCharCode(65+n)+')  '+opts[i],hgt=lh(34*k)+24*k,good=answer&&i===0;if(draw){x.fillStyle=good?'#2E7D4F':'rgba(255,255,255,.1)';rr(pad,y,inner,hgt,18*k);x.fill()}
        const y0=y;y+=12*k;text(lab+(good?'  ✓':''),34,700,'body','#ffffff');y=y0+hgt+14*k});
      if(answer&&cb.tryit){y+=6*k;text(cb.tryit,30,600,'body','#FFD27A')}}
    else if(cb.layout==='compare'){const colW=(inner-24*k)/2;if(draw){x.font=F(800,Math.round(26*k),'body');x.fillStyle='#FFB4A6';x.textAlign='left';x.fillText('✗ THE HARD WAY',pad,y+26*k);x.fillStyle='#A8E6B8';x.fillText('✓ THE EASY WAY',pad+colW+24*k,y+26*k)}y+=44*k;
      items.forEach(r=>{const hgt=Math.max(wrap(r[0],colW-32*k,F(700,Math.round(36*k),'body')).length,wrap(r[1]||'',colW-32*k,F(700,Math.round(36*k),'body')).length)*lh(36*k)+28*k;
        if(draw){x.fillStyle='rgba(226,88,62,.22)';rr(pad,y,colW,hgt,18*k);x.fill();x.fillStyle='rgba(46,125,79,.35)';rr(pad+colW+24*k,y,colW,hgt,18*k);x.fill();
          [[r[0],pad],[r[1]||'',pad+colW+24*k]].forEach(([t,cx])=>{const f=F(700,Math.round(36*k),'body');wrap(t,colW-32*k,f).forEach((l,i)=>{x.font=f;x.fillStyle='#fff';x.textAlign='left';x.fillText(l,cx+16*k,y+14*k+lh(36*k)*(i+1)-8*k)})})}
        y+=hgt+14*k})}
    else{const cols=cb.layout==='steps'?(items.length>3?2:1):1,gap=16*k,cw=(inner-gap*(cols-1))/cols;let rowY=y,col=0,rowH=0;
      items.forEach((r,i)=>{const big=(cb.layout==='steps'?(i+1)+'. ':'')+r[0],bigF=F(800,Math.round((cb.layout==='steps'?38:46)*k),'body'),bodyF=F(600,Math.round(27*k),'body'),labF=F(800,Math.round(26*k),'body');
        const bl=wrap(big,cw-36*k,bigF),ll=r[1]?wrap(r[1],cw-36*k,labF):[],tl=r[2]?wrap(r[2],cw-36*k,bodyF):[],hgt=bl.length*lh((cb.layout==='steps'?38:46)*k)+ll.length*lh(26*k)+tl.length*lh(27*k)+30*k;
        const cx=pad+col*(cw+gap);if(draw){x.fillStyle='rgba(255,255,255,.09)';rr(cx,rowY,cw,hgt,20*k);x.fill();x.fillStyle='#F4A300';rr(cx,rowY,8*k,hgt,4*k);x.fill();
          let ty=rowY+12*k;const put=(ls,f,c,sz)=>ls.forEach(l=>{x.font=f;x.fillStyle=c;x.textAlign='left';ty+=lh(sz*k);x.fillText(l,cx+22*k,ty-8*k)});
          put(bl,bigF,'#ffffff',cb.layout==='steps'?38:46);put(ll,labF,'#FFD27A',26);put(tl,bodyF,'#EEE8DA',27)}
        rowH=Math.max(rowH,hgt);col++;if(col>=cols){col=0;rowY+=rowH+gap;rowH=0}});if(col)rowY+=rowH+gap;y=rowY}
    if(cb.layout!=='quiz'&&cb.tryit){y+=6*k;const f=F(700,Math.round(28*k),'body'),ls=wrap('Try tonight: '+cb.tryit,inner-40*k,f),hgt=ls.length*lh(28*k)+28*k;
      if(draw){x.fillStyle='#F4A300';rr(pad,y,inner,hgt,18*k);x.fill();ls.forEach((l,i)=>{x.font=f;x.fillStyle='#22302A';x.textAlign='left';x.fillText(l,pad+20*k,y+14*k+lh(28*k)*(i+1)-8*k)})}y+=hgt}
    return y}
  function rr(a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
  const footH=Math.round(Math.min(W,H)*.12),room=H-footH-30;let lo=.3,hi=Math.min(1.7,W/1080*1.7);for(let i=0;i<14;i++){const m=(lo+hi)/2;if(layout(m,false)<=room)lo=m;else hi=m}const k=lo;
  x.fillStyle='#1F3B2D';x.fillRect(0,0,W,H);for(let i=-H;i<W;i+=9){x.strokeStyle='rgba(255,255,255,.018)';x.lineWidth=2;x.beginPath();x.moveTo(i,0);x.lineTo(i+H*.47,H);x.stroke()}
  const g=x.createRadialGradient(W*.2,H*.1,10,W*.2,H*.1,W*.8);g.addColorStop(0,'rgba(255,255,255,.07)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle='#8B5E34';x.lineWidth=Math.round(W*.022);x.strokeRect(x.lineWidth/2,x.lineWidth/2,W-x.lineWidth,H-x.lineWidth);
  if(cb.emoji){x.font=`${Math.round(W*.13)}px sans-serif`;x.textAlign='right';x.globalAlpha=.9;x.fillText(cb.emoji,W-W*.06,W*.17);x.globalAlpha=1}
  layout(k,true);
  const fy=H-footH-Math.round(W*.02);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(W*.022,fy,W-W*.044,footH);
  const ls=footH*.7;if(cbLogo&&cbLogo.naturalWidth){x.save();x.beginPath();x.arc(W*.07+ls/2,fy+footH/2,ls/2,0,Math.PI*2);x.clip();x.drawImage(cbLogo,W*.07,fy+footH/2-ls/2,ls,ls);x.restore()}
  x.textAlign='left';x.fillStyle='#fff';x.font=F(700,Math.round(footH*.3),'hand');x.fillText("Chetana's Tutoring",W*.07+ls+18,fy+footH*.45);
  x.font=F(600,Math.round(footH*.2),'body');x.fillStyle='#FFD27A';x.fillText('Grades 1–10 · Hinjawadi & online · palatshahachetana.github.io',W*.07+ls+18,fy+footH*.78);
  return cv})}
function cbBlob(ans){return cbDraw(ans).then(cv=>new Promise(res=>cv?cv.toBlob(res,'image/png'):res(null)))}
function cbFile(ans){return cbBlob(ans).then(b=>b&&new File([b],(cb.name||cb.title||'concept-card').replace(/[^\wऀ-ॿ -]/g,'').slice(0,40).trim().replace(/\s+/g,'-')+(ans?'-answer':'')+'.png',{type:'image/png'}))}
Object.assign(acts,{
  cbnew(){cb=cbBlank();render()},
  cbsave(){const l=cbSaved();if(!cb.id)cb.id=newId('cb');cb.name=cb.name||cb.title||'Card';const i=l.findIndex(c=>c.id===cb.id);if(i<0)l.unshift(Object.assign({},cb));else l[i]=Object.assign({},cb);ls.set('ct_cards',l.slice(0,60));toast('Saved on this device.');render()},
  cbdel(){if(armed!=='cb'){armed='cb';render();return}ls.set('ct_cards',cbSaved().filter(c=>c.id!==cb.id));cb=cbBlank();armed=null;render()},
  cbdown(d){cbFile(!!d.ans).then(f=>{if(!f)return;const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);if(d.ans)cbDraw(false)})},
  cbshare(){cbFile(false).then(f=>{if(!f)return;const data={files:[f],title:cb.title};if(navigator.canShare&&!navigator.canShare(data)){toast('This phone cannot share images from the browser. Use Download instead.',true);return}navigator.share(data).catch(()=>{})})}
});
let cbT=null;
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.cb;if(!k||!cb)return;cb[k]=e.target.value;clearTimeout(cbT);cbT=setTimeout(()=>cbDraw(false),150)});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.cb==='layout'||t.dataset.cb==='size'){cb[t.dataset.cb]=t.value;render()}
  if(t.dataset.change==='cbtpl'&&t.value){if(t.value[0]==='t'&&CB_TEMPLATES[+t.value.slice(1)])cb=Object.assign(cbBlank(),CB_TEMPLATES[+t.value.slice(1)],{id:'',name:''});else{const c=cbSaved().find(x=>x.id===t.value);if(c)cb=Object.assign(cbBlank(),c)}render()}});

/* ====== Homework tracker, school marks, assigned practice, worksheet builder ====== */
const HWS=[['','–','Not checked'],['done','✓','Done'],['late','⏱','Late'],['missing','✗','Missing']];
function prevHwClass(batch,date){return T('classes').filter(c=>c.batch===batch&&c.date<date&&c.homework).sort((a,b)=>b.date.localeCompare(a.date))[0]}
function hwCheckBlock(b){const p=prevHwClass(b.id,tdate);if(!p)return '';const ss=inBatch(b).filter(s=>(p.present||[]).indexOf(s.id)>=0||(p.absent||[]).indexOf(s.id)>=0),hw=p.hw||{};
  return `<fieldset class="fld"><legend>Homework check: “${esc(p.homework)}” (set ${prettyShort(p.date)})</legend><div class="tc-att">${ss.map(s=>{const v=hw[s.id]||'',m=HWS.find(x=>x[0]===v);
    return `<button type="button" class="hwchip hw-${v||'none'}" data-act="hwcycle" data-c="${p.id}" data-s="${s.id}" aria-label="${esc(s.name)}: ${m[2]}">${m[1]} ${esc(s.name)}</button>`}).join('')}</div><p class="small muted">Tap a name to switch: done, late, missing.</p></fieldset>`}
function hwStats(sid,from,to){let d=0,l=0,m=0;T('classes').forEach(c=>{if(!c.hw||!c.hw[sid]||c.date<from||c.date>to)return;const v=c.hw[sid];if(v==='done')d++;else if(v==='late')l++;else if(v==='missing')m++});return{d,l,m,t:d+l+m}}
function hwMissingAll(){const out=[],from=addDays(today(),-14);T('classes').forEach(c=>{if(c.date<from||!c.hw)return;Object.entries(c.hw).forEach(([sid,v])=>{if(v==='missing'){const s=T('students').find(x=>x.id===sid);if(s)out.push(`${esc(s.name)}: “${esc(c.homework)}” (${prettyShort(c.date)})`)}})});return out}
/* marks */
function marksFor(sid){return T('marks').filter(m=>m.sid===sid).sort((a,b)=>a.date.localeCompare(b.date))}
const pct=m=>m.outOf?Math.round(m.score/m.outOf*100):0;
function spark(ms){if(ms.length<2)return '';const w=160,h=40,pts=ms.map((m,i)=>[i*(w/(ms.length-1)),h-4-pct(m)/100*(h-8)]);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="spark" role="img" aria-label="Trend: ${ms.map(pct).join(', ')} percent"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#1E6B3A" stroke-width="3" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#F4A300"/>`).join('')}</svg>`}
function marksSection(s){const ms=marksFor(s.id),subs=uniq(ms.map(m=>m.subject));
  return `<section class="card stack"><h3>School test marks</h3>
  ${subs.map(sub=>{const l=ms.filter(m=>m.subject===sub),last=l[l.length-1],prev=l[l.length-2],diff=prev?pct(last)-pct(prev):0;
    return `<div class="markrow"><div class="grow"><b>${esc(sub)}</b> <span class="small muted">latest ${esc(last.test)}: ${last.score}/${last.outOf} (${pct(last)}%)</span>${prev?` <span class="pill ${diff>=0?'ok':'bad'}">${diff>=0?'▲':'▼'} ${Math.abs(diff)}%</span>`:''}</div>${spark(l)}</div>
    <div class="small muted">${l.map(m=>`${esc(m.test)} ${pct(m)}%`).join(' · ')}</div>`}).join('')||'<p class="muted small">No marks yet.</p>'}
  <form class="row" data-form="addmark"><label>Subject<input id="mk-sub" list="mk-subs" required maxlength="30"><datalist id="mk-subs">${uniq(T('marks').map(m=>m.subject).concat(['Maths','Science','English','Marathi','Hindi'])).map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
   <label>Test<input id="mk-test" required maxlength="30" placeholder="Unit test 1"></label><label>Marks<input id="mk-score" inputmode="decimal" required style="width:5em"></label><label>Out of<input id="mk-out" inputmode="decimal" required value="25" style="width:5em"></label>
   <label>Date<input id="mk-date" type="date" value="${today()}"></label><button class="btn navy">Add</button></form></section>`}
function marksLine(s,from){const ms=marksFor(s.id).filter(m=>!from||m.date>=from);return ms.length?'Test marks: '+ms.map(m=>`${m.subject} ${m.test} ${m.score}/${m.outOf}`).join('; '):''}
/* assigned practice */
function asgFor(s){return T('assign').filter(a=>a.target==='s:'+s.id||a.target==='b:'+s.batch)}
function asgDone(a,prog){const M=MODS[a.mod];if(!M)return false;const k=M.key+a.ch+(a.set!=null&&a.set!==''?'_'+a.set:'');
  if(a.set!==''&&a.set!=null)return((prog||{})[k]||{}).b>=7;const c=(M.ch||[]).find(c=>c.n==a.ch);return c?chState(prog||{},a.mod,c).done:false}
function asgLabel(a){const M=MODS[a.mod],c=M&&M.ch&&M.ch.find(c=>c.n==a.ch);return `${M?M.name:a.mod}: ${c?c.title:'Chapter '+a.ch}${a.set!==''&&a.set!=null&&c&&c.sets?' – '+c.sets[a.set].name:''}`}
function assignSection(){const bs=T('batches'),ss=active();const mods=Object.keys(MODS);const m=asgDraft.mod,M=MODS[m];
  const list=T('assign').slice().sort((a,b)=>(b.due||'').localeCompare(a.due||''));
  return `<section class="card stack"><h2>Assign practice</h2><p class="muted small">It shows on the child’s Kids’ Zone page. You see who has finished it.</p>
  <form class="stack" data-form="addasg"><div class="row"><label>For<select id="as-to">${bs.map(b=>`<option value="b:${b.id}">Batch: ${esc(b.name)}</option>`).join('')}${ss.map(s=>`<option value="s:${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
   <label>Subject<select data-change="asgmod">${mods.map(k=>`<option value="${k}" ${k===m?'selected':''}>${esc(MODS[k].name)}</option>`).join('')}</select></label></div>
   <div class="row"><label class="grow">Chapter<select id="as-ch" data-change="asgch">${(M.ch||[]).map(c=>`<option value="${c.n}" ${c.n==asgDraft.ch?'selected':''}>${c.n}. ${esc(c.title)}</option>`).join('')}</select></label>
   ${(()=>{const c=(M.ch||[]).find(c=>c.n==asgDraft.ch)||(M.ch||[])[0];return c&&c.sets?`<label>Set<select id="as-set"><option value="">Whole chapter</option>${c.sets.map((s2,i)=>`<option value="${i}">${esc(s2.name)}</option>`).join('')}</select></label>`:'<input type="hidden" id="as-set" value="">'})()}
   <label>Due<input id="as-due" type="date" value="${addDays(today(),3)}"></label></div>
   <div class="row"><button class="btn go">Assign</button></div></form>
  ${list.map(a=>{const kids=a.target[0]==='b'?active().filter(s=>s.batch===a.target.slice(2)):active().filter(s=>'s:'+s.id===a.target),done=kids.filter(s=>asgDone(a,s.progress));
    return `<div class="item"><div class="grow"><b>${esc(asgLabel(a))}</b><div class="small muted">Due ${a.due?prettyShort(a.due):'–'} · ${done.length} of ${kids.length} done${kids.length&&done.length<kids.length?' · waiting: '+kids.filter(s=>done.indexOf(s)<0).map(s=>esc(s.name)).join(', '):''}</div></div>
    <button class="btn ghost" data-act="asgdel" data-id="${a.id}">${armed==='a'+a.id?'Tap again':'Remove'}</button></div>`}).join('')}</section>`}
let asgDraft={mod:'maths',ch:1};
function kidAssigned(){const l=(kid&&kid.assign)||[];if(!l.length)return '';const t=today();
  return `<section class="card stack"><h2>📌 From Chetana ma’am</h2>${l.map(a=>{const ok=asgDone(a,kid.progress);return `<a class="tn${ok?' done':''}" href="#${a.mod}" data-act="asggo" data-m="${a.mod}" data-n="${a.ch}"><span aria-hidden="true">${ok?'✅':a.due&&a.due<t?'⏰':'📘'}</span><span class="grow"><b>${esc(asgLabel(a))}</b><small>${ok?'Done!':a.due?'By '+prettyShort(a.due):''}</small></span></a>`}).join('')}</section>`}
/* worksheet builder */
let ws={mod:'maths',chs:[],n:10,title:'',name:true,seed:0,qs:null};
function wsBuild(){const M=MODS[ws.mod];if(!M.ch)return[];const chs=M.ch.filter(c=>ws.chs.indexOf(String(c.n))>=0);if(!chs.length)return[];const out=[];let g=0;
  while(out.length<ws.n&&g++<400){const c=chs[out.length%chs.length],qs=c.sets?one(c.sets).make():c.make(),q=one(qs);if(!out.some(x=>x.ask===q.ask&&x.show===q.show&&x.a===q.a))out.push(q)}return out}
function wsQ(q,i,key){const a=key?(q.ah||esc(q.a)):'';
  if(key)return `<li><span class="wsk">${q.kind==='build'?esc(q.target.join(' ')):q.kind==='pick'?esc(String.fromCharCode(65+q.opts.findIndex(o=>o.v===q.a)))+') ':''}${q.kind==='build'?'':a}</span></li>`;
  return `<li class="wsq">${q.show?`<div class="wss">${q.show}</div>`:''}<div class="wsa">${esc(q.ask)}</div>
   ${q.kind==='pick'?`<div class="wso">${q.opts.map((o,j)=>`<span>${String.fromCharCode(65+j)}) ${o.h}</span>`).join('')}</div>`:q.kind==='build'?`<div class="wso">Letters: ${q.tiles.map(esc).join('  ')}</div><div class="wsl"></div>`:'<div class="wsl"></div>'}</li>`}
function worksheetsView(){const M=MODS[ws.mod];
  return `<section class="card stack noprint"><h2>Worksheet builder</h2><p class="muted small">Make a printable worksheet or class test from the site’s question banks. Every one is different; the answer key prints on its own page.</p>
  <div class="row"><label>Subject<select data-change="wsmod">${Object.keys(MODS).map(k=>`<option value="${k}" ${k===ws.mod?'selected':''}>${esc(MODS[k].name)}</option>`).join('')}</select></label>
   <label>Questions<select data-change="wsn">${[10,15,20,30].map(n=>`<option ${n===ws.n?'selected':''}>${n}</option>`).join('')}</select></label>
   <label class="grow">Title<input data-change="wstitle" value="${esc(ws.title)}" placeholder="${esc(M.name)} worksheet"></label></div>
  <fieldset class="fld"><legend>Chapters</legend><div class="row">${(M.ch||[]).map(c=>`<label class="ckband"><input type="checkbox" data-change="wsch" value="${c.n}" ${ws.chs.indexOf(String(c.n))>=0?'checked':''}> ${c.n}. ${esc(c.title)}</label>`).join('')}</div></fieldset>
  <div class="row"><button class="btn go" data-act="wsmake">Make worksheet</button>${ws.qs?'<button class="btn" data-act="tprint">Print or save as PDF</button><button class="btn" data-act="wsmake">New questions</button>':''}</div></section>
  ${ws.qs?`<div class="ws-print"><section class="ws-page"><div class="ws-head"><img src="img/logo.jpg" alt="" width="44" height="44"><div><b>${esc(ws.title||M.name+' worksheet')}</b><span>Chetana’s Tutoring</span></div><div class="ws-name">Name: ____________ &nbsp; Date: ________ &nbsp; Score: ___ / ${ws.qs.length}</div></div>
   <ol class="ws-list">${ws.qs.map((q,i)=>wsQ(q,i,false)).join('')}</ol></section>
   <section class="ws-page ws-key"><div class="ws-head"><div><b>Answer key</b><span>${esc(ws.title||M.name+' worksheet')}</span></div></div><ol class="ws-list ws-keyl">${ws.qs.map((q,i)=>wsQ(q,i,true)).join('')}</ol></section></div>`:''}`}
Object.assign(acts,{
  hwcycle(d){const c=T('classes').find(x=>x.id===d.c);if(!c)return;c.hw=c.hw||{};const order=['','done','late','missing'],v=c.hw[d.s]||'';c.hw[d.s]=order[(order.indexOf(v)+1)%4];if(!c.hw[d.s])delete c.hw[d.s];tPutK('classes',c)},
  asgdel(d){if(armed!=='a'+d.id){armed='a'+d.id;render();return}tDelK('assign',d.id)},
  asggo(d){ptab='kids';ps={mod:d.m,ch:+d.n,phase:'learn'};cm=d.m;location.hash=d.m},
  wsmake(){loadMod(ws.mod).then(()=>{if(!ws.chs.length){toast('Tick at least one chapter.',true);return}ws.qs=wsBuild();render()})}
});
Object.assign(forms,{
  addmark(){const sc=parseFloat(val('mk-score')),out=parseFloat(val('mk-out'));if(!(out>0)||!(sc>=0)||sc>out){toast('Check the marks: score must be between 0 and the total.',true);return}
    tPutK('marks',{id:newId('mk'),sid:tsel,subject:val('mk-sub'),test:val('mk-test'),score:sc,outOf:out,date:val('mk-date')||today()})},
  addasg(){const ch=val('as-ch'),set=val('as-set');tPutK('assign',{id:newId('as'),target:val('as-to'),mod:asgDraft.mod,ch:+ch,set:set===''?'':+set,due:val('as-due')}).then(()=>toast('Assigned.'))}
});
document.addEventListener('change',e=>{const t=e.target,c=t.dataset.change;if(!c)return;
  if(c==='asgmod'){asgDraft={mod:t.value,ch:1};loadMod(t.value).then(render)}if(c==='asgch'){asgDraft.ch=+t.value;render()}
  if(c==='wsmod'){ws.mod=t.value;ws.chs=[];ws.qs=null;loadMod(t.value).then(render)}if(c==='wsn'){ws.n=+t.value}if(c==='wstitle'){ws.title=t.value}
  if(c==='wsch'){const v=t.value;if(t.checked){if(ws.chs.indexOf(v)<0)ws.chs.push(v)}else ws.chs=ws.chs.filter(x=>x!==v)}});

document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&acts[b.dataset.act]){if(b.tagName==='BUTTON'&&b.type!=='submit'||b.tagName!=='BUTTON')e.preventDefault();acts[b.dataset.act](b.dataset)}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(f){e.preventDefault();forms[f.dataset.form]()}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-change="estatus"]');if(el){const en=tdata.enquiries.find(x=>x.id===el.dataset.id);en.status=el.value;S.tPut(tpin,'enquiries',en).then(render).catch(tfail)}});

function render(){if(view!=='world')unmountWorld();if(view!=='toys')unmountToys();applyLang();const NEED=MODS[view]?[view]:['teacher','kids','world','practice'].indexOf(view)>=0?Object.keys(MODS):[];if(!needMods(NEED)){app.innerHTML='<p class="muted center" role="status">Loading\u2026</p>';return}app.innerHTML=view==='kids'?kids():view==='teacher'?teacher():MODS[view]?modPage():view==='programmes'?programmes():view==='about'?about():view==='learn'?learn():view==='faq'?faq():view==='book'?book():view==='world'?world():view==='check'?check():view==='pune'?pune():view==='privacy'?privacy():view==='practice'?practice():view==='guide'?parentGuide():view==='toys'?toys():home();
  if(LANG!=='en'&&['home','programmes','about','teacher','faq','book','check','privacy','guide'].indexOf(view)<0)app.insertAdjacentHTML('afterbegin',`<p class="langnote" lang="${LANG}">${LANG==='mr'?'हे पान सध्या इंग्रजीत आहे.':'यह पेज अभी अंग्रेज़ी में है।'}</p>`);
  if(view==='world')mountWorld();if(view==='toys')mountToys();const nv=['phonics','maths','kids','bhasha','grammar','pune','mgram','hgram','toys','practice'].indexOf(view)>=0?'learn':view;document.querySelectorAll('.top nav a').forEach(a=>{if(a.getAttribute('href')==='#'+nv)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
function route(){qz=null;const hv=(location.hash||'').slice(1);if(tdata&&['kids','world','pune','toys','practice','check'].indexOf(hv)>=0){tpin='';tdata=null;tsel=null;tcls=null;gTok=null}setTimeout(gcCount,0);const h=(location.hash||'').slice(1);view=['home','kids','teacher','phonics','maths','programmes','about','learn','faq','book','bhasha','grammar','world','check','pune','privacy','mgram','hgram','toys','practice','guide'].indexOf(h)>=0?h:'home';if(MODS[view]){cm=view;if(ps&&ps.mod!==cm)ps=null}msg='';buf='';pick=null;armed=null;render()}
window.addEventListener('hashchange',route);route();

/* ====== installable app: offline support ====== */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});

Object.assign(acts,{lang(d){LANG=d.l;ls.set('ct_lang',LANG);render()}});
/* keyboard: Enter or Space on custom buttons (map stops, etc.) works like a tap */
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const t=e.target;if(t.getAttribute&&t.getAttribute('role')==='button'&&t.dataset&&t.dataset.act&&acts[t.dataset.act]){e.preventDefault();acts[t.dataset.act](t.dataset)}});
