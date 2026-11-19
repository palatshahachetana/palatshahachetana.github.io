"use strict";
/* Teacher console: loaded only when Teacher login is opened */
/* ====== Teacher console v2: Today, Students, Batches, Fees, Leads ====== */
let tdate=today(),tcls=null,tmonth=today().slice(0,7),tedit=null;
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const BOARDS=['','State','CBSE','ICSE','Other'];

const active=()=>T('students').filter(s=>s.status!=='left');
const waNum=p=>{let d=String(p||'').replace(/\D/g,'');if(d.length===10)d='91'+d;return d.length>=11?d:''};
const waLink=(p,t)=>{const n=waNum(p);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(t):''};

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
  const own=isOwner(),tabs=own?[['today','Today'],['students','Students'],['notes','Notes'],['roadmaps','Roadmaps'],['lessons','Lessons'],['assign','Assign'],['worksheets','Worksheets'],['cards','Cards'],['batches','Batches'],['fees','Fees'],['enquiries','Leads'],['camps','Camps'],['help','Setup']]:[['today','Today'],['students','Students'],['notes','Notes'],['roadmaps','Roadmaps'],['lessons','Lessons'],['assign','Assign'],['worksheets','Worksheets'],['cards','Cards'],['help','Help']];
  if(!own&&['batches','fees','enquiries','reports','camps'].indexOf(tview)>=0)tview='today';
  const body=tview==='camps'?campsAdmin():tview==='lessons'?lessonsView():tview==='assign'?assignSection():tview==='worksheets'?worksheetsView():tview==='cards'?cardsView():tview==='notes'?notesView():tview==='roadmaps'?roadmapsView():tview==='reports'?reportsView():tview==='fees'&&treceipt?receiptView():tview==='today'?todayView():tview==='students'?(tsel?(own?studentDetail():teacherStudentDetail()):studentList()):tview==='batches'?batchesView():tview==='fees'?feesView():tview==='enquiries'?enquiries():help();
  return `<section class="stack"><div class="row"><h1 style="margin-right:auto">${own?'Teacher console':'Hello, '+esc(tdata.me.name)}</h1><button class="btn ghost" data-act="tlock">Lock</button></div>
  <div class="tabs tc-tabs">${tabs.map(([k,l])=>`<button class="btn" data-act="ttab" data-t="${k}" aria-pressed="${tview===k||(tview==='reports'&&k==='students')}">${l}</button>`).join('')}</div>
  ${msg?`<p class="pill bad" role="alert">${esc(msg)}</p>`:''}${tipBox()}</section>${body}`}


/* ---------- first-time checklist and per-tab tips ---------- */
const TIPS={today:'Your classes for the chosen day. After each class tap the batch, untick absent children, note what you taught and the homework, and tick any roadmap chapters you finished.',
 students:'Every child’s page has parent details, attendance, notes, marks, documents and online practice. Use “Weekly updates and monthly reports” to send WhatsApp messages in one tap each.',
 notes:'Quick dated notes: parent calls, concerns, wins, test results. Wins and test results go into the weekly update automatically.',
 roadmaps:'One roadmap per batch and subject. Paste the chapter list, tap “Plan the weeks for me”, and add school test dates. Today warns you when a test is close.',
 lessons:'Type any topic and the AI drafts a lesson; check every answer, fix anything flagged, then Publish. Or write one yourself. Children find them under Learn → Chetana’s lessons.',
 assign:'Set a chapter or one practice set for a batch or a child, with a due date. It shows on the child’s Kids’ Zone page and you see who has finished.',
 worksheets:'Pick chapters and the number of questions, then print or save as PDF. The answer key prints on its own page. Every worksheet is different.',
 cards:'Make image posts for WhatsApp or Instagram. Start from a template, change the text, then Download or Share. Saved cards stay on this phone.',
 batches:'A batch is a group that meets at the same time. Add the days, time and, for online batches, the Google Meet link.',
 fees:'Tap Paid UPI or Cash when a parent pays: a numbered receipt is made. Use Remind for anyone still pending after the 10th.',
 enquiries:'Every enquiry: from the website, the starting check, or one you add. Change the status as you follow up, and tap Make student when they join.',
 help:'Backups, other teachers and privacy settings.'};
function tipBox(){const t=TIPS[tview==='reports'?'students':tview];return t?`<details class="tip"><summary>❓ How this tab works</summary><p>${t}</p></details>`:''}
function setupCard(){if(!isOwner()||ls.get('ct_setup_done'))return '';const a=active();
  const steps=[['Add your first batch',T('batches').length>0,'batches'],['Add students (with parent consent)',a.length>0,'students'],['Put each student in a batch',a.length>0&&a.every(s=>s.batch),'students'],
   ['Set monthly fees',a.some(s=>+s.fee>0),'students'],['Create a subject roadmap',T('roadmaps').length>0,'roadmaps'],['Log your first class',T('classes').length>0,'today'],['Make a concept card',(ls.get('ct_cards')||[]).length>0,'cards']];
  const done=steps.filter(s=>s[1]).length;
  return `<section class="card stack setup"><div class="row"><h2 style="margin-right:auto">Getting started: ${done} of ${steps.length}</h2><button class="btn ghost" data-act="setupdone">Hide</button></div>
  <div class="bar"><i style="width:${done/steps.length*100}%"></i></div>
  ${steps.map(([t,ok,tab])=>`<button class="qt${ok?' ok':''}" data-act="ttab" data-t="${tab}"><span aria-hidden="true">${ok?'✅':'⬜'}</span><span class="grow">${t}</span></button>`).join('')}</section>`}
Object.assign(acts,{setupdone(){ls.set('ct_setup_done',true);render()}});

/* ---------- Today ---------- */
function todayView(){if(tcls)return classLog();const _setup=setupCard();
  const wd=dayOf(tdate),bs=T('batches').filter(b=>(b.days||[]).indexOf(wd)>=0).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const m=tdate.slice(0,7),feeDue=active().filter(s=>+s.fee>0&&!(feeRec(s,m)||{}).paid),newL=T('enquiries').filter(e=>e.status==='New'||e.status==='Demo booked');
  const other=T('batches').filter(b=>bs.indexOf(b)<0);
  return _setup+reengage()+`<section class="card stack"><div class="row"><h2 style="margin-right:auto">${prettyDate(tdate)}</h2>
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
   ${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">WhatsApp</a>`:''}${e.board&&!e.boardDone?`<button class="btn go" data-act="eboard" data-id="${esc(e.id)}">Add ${esc(e.board.name)} to leaderboard (${e.board.s}/10)</button>`:''}${e.status!=='Joined'?`<button class="btn" data-act="econvert" data-id="${esc(e.id)}">Make student</button>`:''}
   <button class="btn bad" data-act="edel" data-id="${esc(e.id)}">${armed===e.id?'Tap again':'Delete'}</button></div>`}).join(''):`<p class="muted">No leads yet. Add each parent who asks, so nobody is forgotten.</p>`}</section>
  ${boardAdmin()}
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


/* ====== Monthly reports, fee receipts, UPI ====== */

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


/* ====== Teacher console: notebook, weekly updates, subject roadmaps, documents ====== */
const NTAGS=['Note','Parent call','Concern','Win','Homework','Test result'];
let tnote={sid:'',tag:''},trm=null,trepw=null,trepMode='month';
const mondayOf=d=>{const x=new Date(d+'T00:00'),k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return x.toISOString().slice(0,10)};
const addDays=(d,n)=>{const x=new Date(d+'T00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};

/* ---------- Notebook ---------- */
function notesFor(sid){return T('notes').filter(n=>n.sid===sid).sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id))}
function noteRow(n){const s=n.sid&&T('students').find(x=>x.id===n.sid),b=n.batch&&T('batches').find(x=>x.id===n.batch);
  return `<div class="item note"><div class="grow"><div class="small muted">${esc(prettyShort(n.date))} · <span class="pill">${esc(n.tag||'Note')}</span> ${s?'· <b>'+esc(s.name)+'</b>':b?'· '+esc(b.name):''}${n.by?' · '+esc(n.by):''}</div><div>${esc(n.text).replace(/\n/g,'<br>')}</div></div>
  <button class="btn ghost" data-act="tndel" data-id="${n.id}">${armed==='n'+n.id?'Tap again':'Delete'}</button></div>`}
function noteForm(sid){return `<form class="stack" data-form="addnote"><div class="row">
  ${sid?`<input type="hidden" id="nt-sid" value="${esc(sid)}">`:`<label>About<select id="nt-sid"><option value="">General</option>${active().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>`}
  <label>Type<select id="nt-tag">${NTAGS.map(t=>`<option>${t}</option>`).join('')}</select></label><label>Date<input id="nt-date" type="date" value="${today()}"></label><label class="chk"><input type="checkbox" id="nt-share"> Show on the parent page</label></div>
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
  addnote(){const o={id:newId('n'),sid:val('nt-sid'),tag:val('nt-tag'),date:val('nt-date')||today(),text:val('nt-text'),share:!!(document.getElementById('nt-share')||{}).checked&&!!val('nt-sid'),by:isOwner()?'':(tdata.me||{}).name||''};if(!o.text)return;tPutK('notes',o).then(()=>toast('Note saved.'))},
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
   <div class="card stack" style="margin-top:.6rem"><b>Society noticeboard poster (A4)</b><p class="small muted">Printable poster with a QR code to the free monthly challenge. No phone number on it.</p><button class="btn" data-act="poster">Download A4 poster</button></div>
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


/* ====== Lesson maker: any topic -> concept page + questions (AI drafts, Chetana approves) ====== */

let lm={view:'list',d:null,busy:false,form:{topic:'',grade:'5',board:'CBSE',lang:'en',nq:20}};
const lmAll=()=>T('lessons').slice().sort((a,b)=>(b.no||0)-(a.no||0));

function lmFromAI(j,f){const qs=(j.questions||[]).map(q=>({type:q.type==='num'?'num':'mcq',question:String(q.question||''),options:q.type==='num'?[]:(q.options||[]).map(String).slice(0,4),answer:String(q.answer==null?'':q.answer),hint:String(q.hint||'')}));
  const c=j.card||{};return{id:'',title:String(j.title||f.topic).slice(0,60),subject:String(j.subject||''),grade:f.grade,board:f.board,lang:f.lang,topic:f.topic,status:'draft',
    learn:{intro:String(j.intro||''),sections:(j.sections||[]).map(s=>({h:String(s.heading||''),b:String(s.body||'')}))},examples:(j.examples||[]).map(e=>({q:String(e.question||''),a:String(e.solution||'')})),questions:qs,
    card:{kicker:String(c.kicker||'Concept of the week'),hook:String(c.hook||''),title:String(c.title||j.title||''),intro:String(c.intro||''),items:(c.items||[]).map(x=>[x.big,x.label,x.text].map(v=>String(v||'').replace(/\|/g,'/')).join(' | ')).join('\n'),tryit:String(c.tryit||'')}}}
function lessonsView(){if(lm.view==='edit'&&lm.d)return lmEditor();const ls_=lmAll(),f=lm.form;
  return `<section class="card stack"><h2>Lesson maker</h2><p class="muted small">Type any topic. The AI drafts a concept page and practice questions; <b>you check and edit everything before children see it</b>. Only the topic is sent to the AI, never any child’s details.</p>
  <form class="stack" data-form="lmgen"><label>Topic, in your own words<textarea id="lm-topic" rows="2" maxlength="300" required placeholder="e.g. Photosynthesis for Grade 5 / Simple interest with real-life examples / समास इयत्ता ७">${esc(f.topic)}</textarea></label>
   <div class="row"><label>Grade<select id="lm-grade">${['1','2','3','4','5','6','7','8','9','10'].map(g=>`<option ${g===f.grade?'selected':''}>${g}</option>`).join('')}</select></label>
   <label>Board<select id="lm-board">${['CBSE','ICSE','State'].map(b=>`<option ${b===f.board?'selected':''}>${b}</option>`).join('')}</select></label>
   <label>Language<select id="lm-lang">${Object.entries(LM_LANGS).map(([k,v])=>`<option value="${k}" ${k===f.lang?'selected':''}>${v}</option>`).join('')}</select></label>
   <label>Questions<select id="lm-nq">${[10,20,30,50].map(n=>`<option ${n==f.nq?'selected':''}>${n}</option>`).join('')}</select></label></div>
   <div class="row"><button class="btn go" ${lm.busy?'disabled':''}>${lm.busy?'Writing the lesson… (about 20 seconds)':'Generate lesson'}</button><button type="button" class="btn" data-act="lmblank">Write one myself</button></div></form>
   ${SYNC_URL?'':'<p class="small muted">The AI needs the Google Sheet connection. You can still write lessons yourself.</p>'}</section>
  <section class="card stack"><h2>Your lessons</h2>${ls_.map(l=>`<div class="item"><div class="grow"><b>${esc(l.title)}</b> <span class="pill ${l.status==='published'?'ok':''}">${l.status==='published'?'Live for children':'Draft'}</span>
   <div class="small muted">Grade ${esc(l.grade)} · ${esc(LM_LANGS[l.lang]||'')} · ${(l.questions||[]).length} questions${l.by?' · '+esc(l.by):''}</div></div>
   <button class="btn" data-act="lmedit" data-id="${l.id}">Edit</button><button class="btn" data-act="lmcard" data-id="${l.id}">Make card</button></div>`).join('')||'<p class="muted">No lessons yet.</p>'}</section>`}
function lmEditor(){const d=lm.d,errs=lmCheck(d);
  return `<div class="row"><button class="btn" data-act="lmback">← All lessons</button></div>
  <section class="card stack" data-lmform><h2>${d.id?'Edit lesson':'New lesson (draft)'}</h2>
  <div class="row"><label class="grow">Title<input data-lm="title" maxlength="60" value="${esc(d.title)}"></label><label>Subject<input data-lm="subject" maxlength="30" value="${esc(d.subject)}"></label><label>Grade<input data-lm="grade" maxlength="3" value="${esc(d.grade)}" style="width:4em"></label></div>
  <label>Introduction<textarea data-lm="learn.intro" rows="3">${esc(d.learn.intro)}</textarea></label>
  ${d.learn.sections.map((s,i)=>`<div class="lm-sec"><label>Section ${i+1} heading<input data-lm="learn.sections.${i}.h" value="${esc(s.h)}"></label><label>Text<textarea data-lm="learn.sections.${i}.b" rows="3">${esc(s.b)}</textarea></label><button type="button" class="btn ghost" data-act="lmdel" data-p="learn.sections" data-i="${i}">Remove section</button></div>`).join('')}
  <button type="button" class="btn" data-act="lmadd" data-p="sec">Add section</button>
  <h3>Worked examples</h3>${d.examples.map((e,i)=>`<div class="lm-sec"><label>Example ${i+1}<input data-lm="examples.${i}.q" value="${esc(e.q)}"></label><label>Solution<textarea data-lm="examples.${i}.a" rows="2">${esc(e.a)}</textarea></label><button type="button" class="btn ghost" data-act="lmdel" data-p="examples" data-i="${i}">Remove</button></div>`).join('')}
  <button type="button" class="btn" data-act="lmadd" data-p="ex">Add example</button></section>
  <section class="card stack"><h2>Questions (${d.questions.length})</h2><p class="small muted">Check every answer. Multiple choice: put each option on its own line and type the right one again in “Right answer”. Number answers must be whole numbers.</p>
  ${d.questions.map((q,i)=>`<div class="lm-q"><div class="row"><b>Q${i+1}</b><select data-lm="questions.${i}.type" aria-label="Type of question ${i+1}" style="width:auto"><option value="mcq" ${q.type!=='num'?'selected':''}>Multiple choice</option><option value="num" ${q.type==='num'?'selected':''}>Number answer</option></select><button type="button" class="btn ghost" data-act="lmdel" data-p="questions" data-i="${i}">Delete</button></div>
   <label>Question<textarea data-lm="questions.${i}.question" rows="2">${esc(q.question)}</textarea></label>
   ${q.type==='num'?'':`<label>Options (one per line)<textarea data-lm="questions.${i}.options" rows="4">${esc((q.options||[]).join('\n'))}</textarea></label>`}
   <div class="row"><label class="grow">Right answer<input data-lm="questions.${i}.answer" value="${esc(q.answer)}"></label><label class="grow">Hint<input data-lm="questions.${i}.hint" value="${esc(q.hint)}"></label></div></div>`).join('')}
  <button type="button" class="btn" data-act="lmadd" data-p="q">Add question</button></section>
  <section class="card stack ${errs.length?'lm-bad':'lm-ok'}" id="lmchk">${lmChkHtml(errs)}</section>
  <div class="row"><button class="btn navy" data-act="lmsave" data-s="draft">Save draft</button><button class="btn go" data-act="lmsave" data-s="published">${d.status==='published'?'Save (stays live)':'Publish for children'}</button>
   ${d.status==='published'?'<button class="btn" data-act="lmsave" data-s="draft">Take offline</button>':''}${d.id?`<button class="btn bad" data-act="lmdelall">${armed==='lm'?'Tap again to delete':'Delete lesson'}</button>`:''}</div>`}
const lmChkHtml=errs=>errs.length?`<h3>Fix before publishing (${errs.length})</h3>${errs.slice(0,12).map(e=>`<p class="small" style="margin:0">• ${esc(e)}</p>`).join('')}`:'<p style="margin:0">✅ Every question has exactly one right answer. Read it once more, then publish.</p>';
function lmSet(path,v){const p=path.split('.');let o=lm.d;for(let i=0;i<p.length-1;i++)o=o[p[i]];const k=p[p.length-1];o[k]=k==='options'?String(v).split('\n').map(x=>x.trim()).filter(Boolean):v}
/* published lessons become a module of chapters */


Object.assign(acts,{
  lmblank(){lm.d={id:'',title:'',subject:'',grade:'5',board:'CBSE',lang:'en',topic:'',status:'draft',learn:{intro:'',sections:[{h:'',b:''}]},examples:[],questions:[],card:null};lm.view='edit';render()},
  lmedit(d){lm.d=JSON.parse(JSON.stringify(T('lessons').find(l=>l.id===d.id)));lm.view='edit';armed=null;render();window.scrollTo(0,0)},
  lmback(){lm.view='list';lm.d=null;armed=null;render()},
  lmadd(d){if(d.p==='sec')lm.d.learn.sections.push({h:'',b:''});if(d.p==='ex')lm.d.examples.push({q:'',a:''});if(d.p==='q')lm.d.questions.push({type:'mcq',question:'',options:[],answer:'',hint:''});render()},
  lmdel(d){const p=d.p.split('.');let o=lm.d;p.forEach(k=>o=o[k]);o.splice(+d.i,1);render()},
  lmsave(d){const x=lm.d;if(d.s==='published'){const e=lmCheck(x);if(e.length){toast('Fix the items listed above first.',true);return}}
    x.status=d.s;if(!x.id){x.id=newId('L');x.no=Math.max(0,...T('lessons').map(l=>l.no||0))+1}x.by=isOwner()?'':(tdata.me||{}).name||'';
    tPutK('lessons',JSON.parse(JSON.stringify(x))).then(()=>{lmApply(T('lessons'));toast(d.s==='published'?'Published: children can find it under Learn → Chetana’s lessons.':'Saved as a draft.');lm.view='list';lm.d=null;render()})},
  lmdelall(){if(armed!=='lm'){armed='lm';render();return}const id=lm.d.id;lm.view='list';lm.d=null;tDelK('lessons',id).then(()=>lmApply(T('lessons')))},
  lmcard(d){const l=T('lessons').find(x=>x.id===d.id);if(!l)return;cb=Object.assign(cbBlank(),l.card||{title:l.title,intro:l.learn.intro},{id:'',name:l.title,layout:'cards'});tview='cards';render();window.scrollTo(0,0)}
});
Object.assign(forms,{lmgen(){const f=lm.form={topic:val('lm-topic'),grade:val('lm-grade'),board:val('lm-board'),lang:val('lm-lang'),nq:+val('lm-nq')};if(!f.topic)return;
  if(!SYNC_URL){toast('The AI needs the Google Sheet connection.',true);return}lm.busy=true;render();
  call('tGen',{pin:tpin,o:f},0).then(j=>{lm.busy=false;lm.d=lmFromAI(j,f);lm.view='edit';render();window.scrollTo(0,0)}).catch(e=>{lm.busy=false;render();tfail(e)})}});
let lmT=null;
document.addEventListener('input',e=>{const p=e.target.dataset&&e.target.dataset.lm;if(!p||!lm.d)return;lmSet(p,e.target.value);clearTimeout(lmT);lmT=setTimeout(()=>{const el=document.getElementById('lmchk');if(el){const er=lmCheck(lm.d);el.className='card stack '+(er.length?'lm-bad':'lm-ok');el.innerHTML=lmChkHtml(er)}},300)});
document.addEventListener('change',e=>{const p=e.target.dataset&&e.target.dataset.lm;if(p&&lm.d&&/\.type$/.test(p)){lmSet(p,e.target.value);render()}});
function posterCanvas(){return new Promise((res,rej)=>{if(window.qrcode)return res();const t=document.createElement('script');t.src='vendor/qrcode.js';t.onload=res;t.onerror=rej;document.head.appendChild(t)}).then(()=>document.fonts.load('700 80px Kalam').catch(()=>{})).then(()=>{
  const W=2480,H=3508,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#FFF8E6';x.fillRect(0,0,W,H);
  x.fillStyle='#2F5A44';x.fillRect(0,0,W,900);x.textAlign='center';x.fillStyle='#fff';x.font='700 190px Kalam, sans-serif';x.fillText('Free Maths Challenge',W/2,400);
  x.font='600 100px "Nunito Sans", sans-serif';x.fillStyle='#FFD27A';x.fillText('for every child in Grades 1–7',W/2,600);x.fillStyle='#fff';x.font='600 80px "Nunito Sans", sans-serif';x.fillText('New questions every month · 2 minutes · on any phone',W/2,760);
  const q=qrcode(0,'M');q.addData('https://palatshahachetana.github.io/#challenge');q.make();const n=q.getModuleCount(),cell=Math.floor(1300/(n+4)),sz=cell*(n+4),ox=(W-sz)/2,oy=1050;
  x.fillStyle='#fff';x.fillRect(ox,oy,sz,sz);x.fillStyle='#111';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect(ox+(k+2)*cell,oy+(r+2)*cell,cell,cell);
  x.fillStyle='#1F3B2D';x.font='700 120px Kalam, sans-serif';x.fillText('Scan to play →',W/2,oy+sz+170);
  x.font='600 78px "Nunito Sans", sans-serif';['🏆  Junior & Senior levels    🐉  Boss battles','🏝️  Build your own island    🎤  Read-aloud stars'].forEach((l,i)=>x.fillText(l,W/2,oy+sz+380+i*120));
  x.fillStyle='#2F5A44';x.fillRect(0,H-520,W,520);x.fillStyle='#fff';x.font='700 130px Kalam, sans-serif';x.fillText("Chetana's Tutoring",W/2,H-330);
  x.font='600 72px "Nunito Sans", sans-serif';x.fillStyle='#FFD27A';x.fillText('Grades 1–10 · Sparklet, Megapolis, Hinjawadi · and online',W/2,H-200);x.fillStyle='#EEE8DA';x.fillText('palatshahachetana.github.io',W/2,H-100);return c})}
Object.assign(acts,{poster(){posterCanvas().then(c=>c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='challenge-poster-A4.png';document.body.appendChild(a);a.click();a.remove()},'image/png'))}});
/* ---------- Leaderboard, camps, re-engagement ---------- */
function boardAdmin(){const m=today().slice(0,7),b=T('board').filter(x=>x.month===m);if(!b.length)return '';
  return `<section class="card stack"><h3>Leaderboard this month</h3><p class="small muted">Shown on the challenge page: first name and society only.</p>${b.sort((x,y)=>y.s-x.s).map(x=>`<div class="item"><div class="grow"><b>${esc(x.name)}</b> <span class="small muted">${esc(x.society||'')} · ${x.level} · ${x.s}/10 · ${x.t}s</span></div><button class="btn ghost" data-act="bdel" data-id="${esc(x.id)}">${armed==='b'+x.id?'Tap again':'Remove'}</button></div>`).join('')}</section>`}
let tcamp=null;
function campsAdmin(){const cs=T('camps').slice().sort((a,b)=>(b.created||'').localeCompare(a.created||'')),c=tcamp&&cs.find(x=>x.id===tcamp)||{};
  return `<section class="card stack"><h2>Holiday camps</h2><p class="small muted">Published camps appear on the website at #camps with a “Reserve a seat” form. Bookings arrive in Leads as “Camp: …”.</p>
  ${cs.map(x=>`<div class="item"><div class="grow"><b>${esc(x.title)}</b> <span class="small muted">${esc(x.dates)} · ${T('enquiries').filter(e=>e.source==='Camp: '+x.title).length} bookings</span></div><span class="pill ${x.status==='published'?'ok':''}">${x.status==='published'?'On the website':'Draft'}</span>
   <button class="btn" data-act="campedit" data-id="${esc(x.id)}">Edit</button><button class="btn" data-act="camppub" data-id="${esc(x.id)}">${x.status==='published'?'Hide':'Publish'}</button><button class="btn bad" data-act="campdel" data-id="${esc(x.id)}">${armed==='c'+x.id?'Tap again':'Delete'}</button></div>`).join('')||'<p class="muted">No camps yet.</p>'}</section>
  <form class="card stack" data-form="campsave"><h3>${c.id?'Edit camp':'New camp'}</h3>
  <label>Title<input id="cp-t" required maxlength="60" value="${esc(c.title||'')}" placeholder="e.g. Summer Maths Booster"></label>
  <div class="row"><label>Dates<input id="cp-d" required maxlength="40" value="${esc(c.dates||'')}" placeholder="e.g. 4–15 May, Mon–Fri"></label><label>Grades<input id="cp-g" maxlength="12" value="${esc(c.grades||'')}" placeholder="e.g. 3–5"></label><label>Time<input id="cp-tm" maxlength="30" value="${esc(c.time||'')}" placeholder="e.g. 10–11:30 am"></label><label>Where<select id="cp-m">${['At Sparklet, Megapolis','Online (Google Meet)','At Sparklet or online'].map(o=>`<option ${o===c.mode?'selected':''}>${o}</option>`).join('')}</select></label></div>
  <label>About the camp<textarea id="cp-a" rows="3" maxlength="500" placeholder="What children will learn, batch size, what to bring">${esc(c.about||'')}</textarea></label>
  <p class="small muted">Tip: don’t put fees or your phone number here. Parents reserve a seat and you reply on WhatsApp.</p>
  <div class="row"><button class="btn navy">Save as draft</button>${c.id?'<button type="button" class="btn ghost" data-act="campnew">New camp instead</button>':''}</div></form>`}
const RE_SNOOZE='ct_reng';
function reengage(){const sn=ls.get(RE_SNOOZE)||{},cut=addDays(today(),-7),t=today();
  const list=active().filter(s=>{const last=(s.sessions||[]).slice(-1)[0];return(!last||last<cut)&&!(sn[s.id]&&sn[s.id]>t)});if(!list.length)return '';
  return `<section class="card stack reng"><h3>Not practising lately (${list.length})</h3><p class="small muted">No practice on the website for 7 days or more. A friendly nudge usually works.</p>
  ${list.slice(0,8).map(s=>{const last=(s.sessions||[]).slice(-1)[0],txt=`Hello! ${s.name.split(' ')[0]} hasn’t practised on Kids’ World this week. Ten minutes tonight keeps the streak going: ${location.origin}${location.pathname}#world — Chetana`,l=s.phone?waLink(s.phone,txt):'';
   return `<div class="item"><div class="grow"><b>${esc(s.name)}</b> <span class="small muted">${last?'last practised '+prettyShort(last):'never practised online'}</span></div>${l?`<a class="btn" href="${l}" target="_blank" rel="noopener">Nudge on WhatsApp</a>`:`<button class="btn" data-act="recopy" data-t="${esc(txt)}">Copy message</button>`}<button class="btn ghost" data-act="resnooze" data-id="${esc(s.id)}">Hide for a week</button></div>`}).join('')}</section>`}
Object.assign(acts,{
  eboard(d){const e=T('enquiries').find(x=>x.id===d.id);if(!e||!e.board)return;const b=Object.assign({id:newId('lb')},e.board);tPutK('board',b).then(()=>tPutK('enquiries',Object.assign({},e,{boardDone:true}))).then(()=>toast('Added to the leaderboard.'))},
  bdel(d){if(armed!=='b'+d.id){armed='b'+d.id;render();return}armed=null;tDelK('board',d.id)},
  campedit(d){tcamp=d.id;render();window.scrollTo(0,document.body.scrollHeight)},campnew(){tcamp=null;render()},
  camppub(d){const c=T('camps').find(x=>x.id===d.id);tPutK('camps',Object.assign({},c,{status:c.status==='published'?'draft':'published'}))},
  campdel(d){if(armed!=='c'+d.id){armed='c'+d.id;render();return}armed=null;tDelK('camps',d.id)},
  recopy(d){navigator.clipboard&&navigator.clipboard.writeText(d.t).then(()=>toast('Message copied.'))},
  resnooze(d){const sn=ls.get(RE_SNOOZE)||{};sn[d.id]=addDays(today(),7);ls.set(RE_SNOOZE,sn);render()}});
Object.assign(forms,{campsave(){const old=tcamp&&T('camps').find(x=>x.id===tcamp)||{};const o=Object.assign({},old,{id:old.id||newId('cp'),title:val('cp-t'),dates:val('cp-d'),grades:val('cp-g'),time:val('cp-tm'),mode:val('cp-m'),about:val('cp-a'),status:old.status||'draft',created:old.created||today()});
  tPutK('camps',o).then(()=>{tcamp=null;toast('Camp saved. Tap Publish to show it on the website.')})}});
window.teacherReady=true;
