"use strict";
/* Marathi grammar (मराठी व्याकरण), Grade 3 and up. Loaded only when needed.
   All word lists are here so Chetana can correct or extend them easily. */
(()=>{
const mq=(sent,ask,correct,wrongs,hint)=>{const w=uniq(wrongs.filter(x=>x&&x!==correct)).slice(0,3);
  return{kind:'pick',show:sent?`<div class="sent gsent dev">${esc(sent).replace('___','<span class="blank">_____</span>')}</div>`:'',ask,say:'',opts:shuffle([correct,...w]).map(v=>({h:esc(v),v,cls:'txt devt'})),a:correct,ah:`<span class="wordbig dev">${esc(correct)}</span>`,hint}};
const others=(list,not,n)=>sample(list.filter(x=>x!==not),n);
/* ---------- word lists ---------- */
const ANV=[['हुशार','मुलगा','अभ्यास करतो'],['लाल','फूल','फुलले'],['छोटी','मुलगी','हसते'],['काळा','कुत्रा','भुंकतो'],['उंच','झाड','डोलते'],['गोड','आंबा','पिकला'],
 ['पांढरी','मांजर','झोपली'],['मोठा','हत्ती','चालतो'],['हिरवा','पोपट','बोलतो'],['थंड','वारा','वाहतो'],['सुंदर','पक्षी','गातो'],['लहान','बाळ','रडते'],['शहाणा','राजा','बोलला'],
 ['पिवळा','चेंडू','पडला'],['निळी','नदी','वाहते'],['जुनी','गाडी','थांबली'],['गरम','चहा','उकळतो'],['चपळ','ससा','पळाला'],['आळशी','मांजर','झोपते'],['नवीन','घड्याळ','चालते']];
const PRON=[['तो','शाळेत','जातो'],['ती','गाणे','गाते'],['मी','पुस्तक','वाचतो'],['आम्ही','क्रिकेट','खेळतो'],['तुम्ही','इकडे','या'],['ते','बाजारात','गेले'],['तू','पाणी','पी'],['आपण','उद्या','भेटू']];
const JATI={'नाम':['पुस्तक','शाळा','आई','पुणे','नदी','घर','गाय','पेन्सिल','सचिन','डोंगर'],'सर्वनाम':['मी','तू','तो','ती','आम्ही','ते','आपण','तुम्ही'],
 'क्रियापद':['धावतो','लिहिते','वाचतो','खातो','झोपते','गातो','पोहतो','हसते'],'विशेषण':['सुंदर','उंच','लहान','गोड','हुशार','काळा','मोठा','थंड']};
const JNAME={'नाम':'noun','सर्वनाम':'pronoun','क्रियापद':'verb','विशेषण':'adjective'};
const LING={'पुल्लिंग':['मुलगा','घोडा','आंबा','दिवा','पंखा','डोंगर','हत्ती','राजा','वाघ','सूर्य','चेंडू','कावळा','ससा'],
 'स्त्रीलिंग':['मुलगी','घोडी','नदी','खुर्ची','शाळा','भिंत','मांजर','गाय','पेन्सिल','बाहुली','चिमणी','वही','राणी'],
 'नपुंसकलिंग':['घर','पुस्तक','झाड','फूल','पाणी','बाळ','पान','शेत','दार','कपाट','गाव','फळ','वासरू']};
const LPRON={'पुल्लिंग':'तो','स्त्रीलिंग':'ती','नपुंसकलिंग':'ते'};
const LPAIR=[['मुलगा','मुलगी'],['घोडा','घोडी'],['राजा','राणी'],['वाघ','वाघीण'],['सिंह','सिंहीण'],['बैल','गाय'],['कुत्रा','कुत्री'],['बाबा','आई'],['भाऊ','बहीण'],
 ['काका','काकू'],['मामा','मामी'],['आजोबा','आजी'],['शिक्षक','शिक्षिका'],['लेखक','लेखिका'],['मोर','लांडोर'],['हत्ती','हत्तीण']];
const VACH=[['मुलगा','मुलगे'],['घोडा','घोडे'],['आंबा','आंबे'],['दिवा','दिवे'],['पंखा','पंखे'],['कावळा','कावळे'],['मुलगी','मुली'],['नदी','नद्या'],['खुर्ची','खुर्च्या'],
 ['भिंत','भिंती'],['वही','वह्या'],['पुस्तक','पुस्तके'],['घर','घरे'],['झाड','झाडे'],['फूल','फुले'],['पान','पाने'],['फळ','फळे'],['गाय','गायी'],['बाहुली','बाहुल्या'],
 ['चिमणी','चिमण्या'],['केळे','केळी'],['वाघ','वाघ'],['डोंगर','डोंगर'],['मोर','मोर'],['शाळा','शाळा']];
const vWrong=(w,right)=>{const st=/[ाीेू]$/.test(w)?w.slice(0,-1):w;return uniq([w,st+'े',st+'ी',st+'ा',st+'या',w+'े'].filter(x=>x!==right))};
const VIRUDDHA=[['दिवस','रात्र'],['उंच','ठेंगणा'],['मोठा','लहान'],['जाड','बारीक'],['गरम','थंड'],['सुरुवात','शेवट'],['आत','बाहेर'],['वर','खाली'],['जवळ','लांब'],['आनंद','दुःख'],
 ['खरे','खोटे'],['गोड','कडू'],['हसणे','रडणे'],['जुना','नवा'],['श्रीमंत','गरीब'],['उजेड','अंधार'],['प्रश्न','उत्तर'],['पुढे','मागे'],['जय','पराजय'],['स्वच्छ','घाणेरडा'],
 ['लवकर','उशिरा'],['ओले','कोरडे'],['सोपे','कठीण'],['होकार','नकार'],['पूर्व','पश्चिम'],['ज्ञान','अज्ञान'],['यश','अपयश'],['आठवण','विसर']];
const SAMA=[['पाणी','जल'],['आई','माता'],['वडील','पिता'],['सूर्य','रवी'],['चंद्र','शशी'],['घर','सदन'],['फूल','पुष्प'],['डोळा','नयन'],['हात','हस्त'],['पाय','चरण'],
 ['मित्र','सखा'],['राजा','नृप'],['नदी','सरिता'],['पृथ्वी','धरणी'],['आकाश','गगन'],['वारा','पवन'],['ढग','मेघ'],['झाड','वृक्ष'],['डोंगर','पर्वत'],['समुद्र','सागर'],
 ['आग','अग्नी'],['रात्र','निशा'],['शरीर','देह'],['सोने','सुवर्ण'],['आनंद','हर्ष'],['देव','ईश्वर']];
const KAAL=[['मी शाळेत जातो.','मी शाळेत गेलो.','मी शाळेत जाईन.'],['ती गाणे गाते.','तिने गाणे गायले.','ती गाणे गाईल.'],['आम्ही खेळतो.','आम्ही खेळलो.','आम्ही खेळू.'],
 ['बाबा पेपर वाचतात.','बाबांनी पेपर वाचला.','बाबा पेपर वाचतील.'],['पाऊस पडतो.','पाऊस पडला.','पाऊस पडेल.'],['आई स्वयंपाक करते.','आईने स्वयंपाक केला.','आई स्वयंपाक करेल.'],
 ['तो पत्र लिहितो.','त्याने पत्र लिहिले.','तो पत्र लिहील.'],['मुले मैदानात धावतात.','मुले मैदानात धावली.','मुले मैदानात धावतील.']];
const KNAME=['वर्तमानकाळ','भूतकाळ','भविष्यकाळ'],KEN=['present','past','future'];
const pairQ=(list,dir,word)=>{const p=one(list),a=dir?p[1]:p[0],q=dir?p[0]:p[1],pool=list.map(x=>dir?x[1]:x[0]).filter(x=>x!==a);
  return mq('',`${word}: ${q} → ?`,a,sample(pool,3),`${p[0]} ↔ ${p[1]}`)};
const mkTable=(rows,h)=>`<div class="tw"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td class="dev">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;

const MG=[
 {n:1,title:'Parts of speech (शब्दांच्या जाती)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Every word has a job. Four jobs to know first:</p>
  ${mkTable([['नाम','naming word: person, place, animal, thing','मुलगा, पुणे, गाय, पुस्तक'],['सर्वनाम','used instead of a noun','मी, तू, तो, ती, आम्ही, ते'],['क्रियापद','action word','धावतो, लिहिते, खातो'],['विशेषण','describes a noun','सुंदर, उंच, गोड, लाल']],['Name','Job','Examples'])}
  ${eg('Example',`<span class="dev">हुशार मुलगा अभ्यास करतो.</span><br><span class="dev">हुशार</span> = विशेषण (describes the boy), <span class="dev">मुलगा</span> = नाम, <span class="dev">करतो</span> = क्रियापद.`)}
  ${eg('Trick','Ask: who or what? → नाम. Doing what? → क्रियापद. What kind? → विशेषण. Can I put it in place of a name? → सर्वनाम.')}`,
  sets:[SET('Level 1: find the नाम (noun)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}.`,'Which word is the नाम (noun)?',n,[a,v],`${n} names a person, animal or thing.`)}),
   SET('Level 2: find the क्रियापद (verb)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}.`,'Which word is the क्रियापद (action)?',v,[a,n],`${v} tells what is happening.`)}),
   SET('Level 3: find the विशेषण (adjective)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}.`,'Which word is the विशेषण (describing word)?',a,[n,v],`${a} tells what kind of ${n}.`)}),
   SET('Level 4: find the सर्वनाम (pronoun)',()=>{const[p,b,c]=one(PRON);return mq(`${p} ${b} ${c}.`,'Which word is the सर्वनाम (pronoun)?',p,[b,c],`${p} is used in place of a name.`)}),
   SET('Level 5: which part of speech?',()=>{const j=one(Object.keys(JATI)),w=one(JATI[j]);return mq('',`"${w}" is which part of speech?`,j,Object.keys(JATI),`${w} is a ${j} (${JNAME[j]}).`)})]},
 {n:2,title:'Gender (लिंग)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Marathi has <b>three</b> genders. Test a word by putting <span class="dev">तो, ती</span> or <span class="dev">ते</span> before it.</p>
  ${mkTable([['पुल्लिंग','तो','तो मुलगा, तो आंबा, तो वाघ'],['स्त्रीलिंग','ती','ती मुलगी, ती नदी, ती खुर्ची'],['नपुंसकलिंग','ते','ते घर, ते पुस्तक, ते झाड']],['Gender','Test word','Examples'])}
  ${eg('Watch out','<span class="dev">मांजर</span> is स्त्रीलिंग in Marathi (ती मांजर), and <span class="dev">बाळ</span> is नपुंसकलिंग (ते बाळ).')}
  <h4>Pairs</h4>${mkTable(LPAIR.slice(0,8),['पुल्लिंग','स्त्रीलिंग'])}`,
  sets:[SET('Level 1: तो or ती?',()=>{const g=one(['पुल्लिंग','स्त्रीलिंग']),w=one(LING[g]);return mq(`___ ${w}`,'Which word fits: तो or ती?',LPRON[g],['तो','ती'],`${LPRON[g]} ${w}: ${w} is ${g}.`)}),
   SET('Level 2: तो, ती or ते?',()=>{const g=one(Object.keys(LING)),w=one(LING[g]);return mq(`___ ${w}`,'Which word fits?',LPRON[g],['तो','ती','ते'],`${LPRON[g]} ${w}: ${w} is ${g}.`)}),
   SET('Level 3: name the gender',()=>{const g=one(Object.keys(LING)),w=one(LING[g]);return mq('',`What is the gender of "${w}"?`,g,Object.keys(LING),`We say ${LPRON[g]} ${w}, so it is ${g}.`)}),
   SET('Level 4: make it स्त्रीलिंग',()=>{const p=one(LPAIR);return mq('',`स्त्रीलिंग of "${p[0]}"?`,p[1],others(LPAIR.map(x=>x[1]),p[1],3),`${p[0]} → ${p[1]}`)}),
   SET('Level 5: make it पुल्लिंग',()=>{const p=one(LPAIR);return mq('',`पुल्लिंग of "${p[1]}"?`,p[0],others(LPAIR.map(x=>x[0]),p[0],3),`${p[1]} → ${p[0]}`)})]},
 {n:3,title:'Number (वचन)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p><b>एकवचन</b> = one. <b>अनेकवचन</b> = more than one. The ending changes with the gender:</p>
  ${mkTable([['-आ ending पुल्लिंग → -ए','मुलगा → मुलगे, आंबा → आंबे'],['-ई ending स्त्रीलिंग → -या','नदी → नद्या, खुर्ची → खुर्च्या'],['other स्त्रीलिंग → -ई','भिंत → भिंती, गाय → गायी'],['नपुंसकलिंग → -ए','घर → घरे, पुस्तक → पुस्तके, फूल → फुले'],['Some stay the same','वाघ → वाघ, डोंगर → डोंगर, शाळा → शाळा']],['Rule','Examples'])}
  ${eg('Trick','Say "एक ___, दोन ___": एक घर, दोन घरे. Your ear usually knows the answer.')}`,
  sets:[SET('Level 1: अनेकवचन of -आ words',()=>{const p=one(VACH.slice(0,6));return mq('',`अनेकवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दोन ${p[1]}.`)}),
   SET('Level 2: अनेकवचन of स्त्रीलिंग words',()=>{const p=one(VACH.slice(6,11).concat([VACH[17],VACH[18],VACH[19]]));return mq('',`अनेकवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दोन ${p[1]}.`)}),
   SET('Level 3: अनेकवचन of नपुंसकलिंग words',()=>{const p=one(VACH.slice(11,17).concat([VACH[20]]));return mq('',`अनेकवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दोन ${p[1]}.`)}),
   SET('Level 4: the tricky ones',()=>{const p=one(VACH);return mq('',`अनेकवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),p[0]===p[1]?`${p[0]} stays the same: दोन ${p[1]}.`:`एक ${p[0]}, दोन ${p[1]}.`)}),
   SET('Level 5: एकवचन or अनेकवचन?',()=>{const p=one(VACH.filter(x=>x[0]!==x[1])),pl=Math.random()<.5,w=pl?p[1]:p[0];return mq('',`Is "${w}" एकवचन or अनेकवचन?`,pl?'अनेकवचन':'एकवचन',['एकवचन','अनेकवचन'],`${p[0]} (one) → ${p[1]} (many).`)})]},
 {n:4,title:'Opposites (विरुद्धार्थी शब्द)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A विरुद्धार्थी शब्द means the opposite.</p>${mkTable(VIRUDDHA.slice(0,14).map(([a,b])=>[a,b]),['शब्द','विरुद्धार्थी'])}
  ${eg('Trick','Some opposites just add अ- or अप-: ज्ञान → अज्ञान, यश → अपयश.')}`,
  sets:[SET('Level 1: everyday opposites',()=>{const L=VIRUDDHA.slice(0,10);return pairQ(L,true,'विरुद्धार्थी')}),
   SET('Level 2: more opposites',()=>pairQ(VIRUDDHA.slice(10,20),true,'विरुद्धार्थी')),
   SET('Level 3: harder opposites',()=>pairQ(VIRUDDHA.slice(18),true,'विरुद्धार्थी')),
   SET('Level 4: the other way round',()=>pairQ(VIRUDDHA,false,'विरुद्धार्थी')),
   SET('Level 5: mixed',()=>pairQ(VIRUDDHA,Math.random()<.5,'विरुद्धार्थी'))]},
 {n:5,title:'Same meaning (समानार्थी शब्द)',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>समानार्थी शब्द are different words with the same meaning. Books and poems often use the second, more formal word.</p>${mkTable(SAMA.slice(0,14),['शब्द','समानार्थी'])}`,
  sets:[SET('Level 1: nature words',()=>pairQ(SAMA.slice(13,22),true,'समानार्थी')),
   SET('Level 2: family and body',()=>pairQ(SAMA.slice(0,11),true,'समानार्थी')),
   SET('Level 3: all words',()=>pairQ(SAMA,true,'समानार्थी')),
   SET('Level 4: the other way round',()=>pairQ(SAMA,false,'समानार्थी')),
   SET('Level 5: mixed',()=>pairQ(SAMA,Math.random()<.5,'समानार्थी'))]},
 {n:6,title:'Tense (काळ)',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>The verb ending tells you <b>when</b>.</p>${mkTable(KAAL.slice(0,4),['वर्तमानकाळ (now)','भूतकाळ (past)','भविष्यकाळ (future)'])}
  ${eg('Trick','Future verbs often end in -ईन, -ईल, -ऊ, -तील. Past verbs often have -ला, -ली, -ले, and sometimes -ने before the object: तिने, आईने.')}`,
  sets:[SET('Level 1: now or past?',()=>{const k=one(KAAL),t=rnd(0,1);return mq(k[t],'Which tense (काळ)?',KNAME[t],KNAME.slice(0,2),`"${k[t]}" is ${KEN[t]}: ${KNAME[t]}.`)}),
   SET('Level 2: which tense?',()=>{const k=one(KAAL),t=rnd(0,2);return mq(k[t],'Which tense (काळ)?',KNAME[t],KNAME,`"${k[t]}" is ${KEN[t]}: ${KNAME[t]}.`)}),
   SET('Level 3: change to भूतकाळ',()=>{const k=one(KAAL);return mq(k[0],'Change it to the past (भूतकाळ).',k[1],[k[0],k[2]],`${k[0]} → ${k[1]}`)}),
   SET('Level 4: change to भविष्यकाळ',()=>{const k=one(KAAL);return mq(k[0],'Change it to the future (भविष्यकाळ).',k[2],[k[0],k[1]],`${k[0]} → ${k[2]}`)}),
   SET('Level 5: mixed',()=>{const k=one(KAAL),t=rnd(0,2);return Math.random()<.5?mq(k[t],'Which tense (काळ)?',KNAME[t],KNAME,`${KEN[t]}: ${KNAME[t]}.`):mq(k[0],`Change it to ${KNAME[t]}.`,k[t],k.filter((x,i)=>i!==t),`${k[0]} → ${k[t]}`)})]}];
const MGG=[['Parts of speech','<p>Colour-code words on the board: नाम blue, क्रियापद red, विशेषण green, सर्वनाम orange. Children sort word cards into four boxes.</p><p><b>Watch for:</b> children calling the whole verb phrase the noun (अभ्यास करतो).</p>'],
 ['Gender','<p>Always teach with तो / ती / ते. Non-Marathi families mix these up most with मांजर, बाळ and objects.</p>'],
 ['Number','<p>Say "एक ___, दोन ___" aloud. Group words by ending before teaching the rule.</p>'],
 ['Opposites','<p>Play opposite-pairs memory with cards. Act them out: उंच/ठेंगणा, हसणे/रडणे.</p>'],
 ['Same meaning','<p>Point out the formal words in the school textbook poems. Make a class "word wall".</p>'],
 ['Tense','<p>Use a timeline: काल (past), आज (now), उद्या (future). Change one sentence across all three.</p>']];
MODS.mgram.ch=MG;MODS.mgram.guide=MGG;
})();
