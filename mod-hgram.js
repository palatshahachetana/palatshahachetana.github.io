"use strict";
/* Hindi grammar (हिंदी व्याकरण), Grade 3 and up. Loaded only when needed.
   All word lists are here so Chetana can correct or extend them easily. */
(()=>{
const mq=(sent,ask,correct,wrongs,hint)=>{const w=uniq(wrongs.filter(x=>x&&x!==correct)).slice(0,3);
  return{kind:'pick',show:sent?`<div class="sent gsent dev">${esc(sent).replace('___','<span class="blank">_____</span>')}</div>`:'',ask,say:'',opts:shuffle([correct,...w]).map(v=>({h:esc(v),v,cls:'txt devt'})),a:correct,ah:`<span class="wordbig dev">${esc(correct)}</span>`,hint}};
const others=(list,not,n)=>sample(list.filter(x=>x!==not),n);
const ANV=[['होशियार','लड़का','पढ़ता है'],['लाल','फूल','खिला'],['छोटी','लड़की','हँसती है'],['काला','कुत्ता','भौंकता है'],['मीठा','आम','पका'],['सफ़ेद','बिल्ली','सोई'],
 ['बड़ा','हाथी','चलता है'],['हरा','तोता','बोलता है'],['ठंडी','हवा','चलती है'],['सुंदर','चिड़िया','गाती है'],['छोटा','बच्चा','रोता है'],['बुद्धिमान','राजा','बोला'],
 ['पीली','गेंद','गिरी'],['नीली','नदी','बहती है'],['पुरानी','गाड़ी','रुकी'],['गरम','चाय','उबली'],['तेज़','खरगोश','भागा'],['आलसी','बिल्ली','सोती है'],['नया','घर','बना'],['ऊँचा','पेड़','हिलता है']];
const PRON=[['वह','स्कूल','जाता है'],['मैं','किताब','पढ़ता हूँ'],['हम','क्रिकेट','खेलते हैं'],['तुम','यहाँ','आओ'],['वे','बाज़ार','गए'],['आप','पानी','पीजिए'],['तू','घर','जा']];
const JATI={'संज्ञा':['किताब','स्कूल','माँ','दिल्ली','नदी','घर','गाय','कलम','राम','पहाड़'],'सर्वनाम':['मैं','तुम','वह','हम','वे','आप','तू'],
 'क्रिया':['दौड़ता','लिखती','पढ़ता','खाता','सोती','गाता','तैरता','हँसती'],'विशेषण':['सुंदर','ऊँचा','छोटा','मीठा','होशियार','काला','बड़ा','ठंडा']};
const JNAME={'संज्ञा':'noun','सर्वनाम':'pronoun','क्रिया':'verb','विशेषण':'adjective'};
const LING={'पुल्लिंग':['लड़का','घोड़ा','आम','दीया','पंखा','पहाड़','हाथी','राजा','शेर','सूरज','घर','पेड़','फूल','कमरा','दरवाज़ा'],
 'स्त्रीलिंग':['लड़की','घोड़ी','नदी','कुर्सी','किताब','दीवार','गाय','चिड़िया','रानी','कलम','मेज़','बिल्ली','रोटी','सड़क','हवा']};
const ADJ={'पुल्लिंग':'अच्छा','स्त्रीलिंग':'अच्छी'};
const LPAIR=[['लड़का','लड़की'],['घोड़ा','घोड़ी'],['राजा','रानी'],['शेर','शेरनी'],['मोर','मोरनी'],['बेटा','बेटी'],['भाई','बहन'],['पिता','माता'],['दादा','दादी'],
 ['नाना','नानी'],['चाचा','चाची'],['मामा','मामी'],['अध्यापक','अध्यापिका'],['लेखक','लेखिका'],['हाथी','हथिनी'],['बकरा','बकरी'],['नौकर','नौकरानी'],['देव','देवी']];
const VACH=[['लड़का','लड़के'],['घोड़ा','घोड़े'],['कमरा','कमरे'],['बच्चा','बच्चे'],['केला','केले'],['लड़की','लड़कियाँ'],['नदी','नदियाँ'],['कुर्सी','कुर्सियाँ'],['रोटी','रोटियाँ'],
 ['चिड़िया','चिड़ियाँ'],['गुड़िया','गुड़ियाँ'],['किताब','किताबें'],['बहन','बहनें'],['सड़क','सड़कें'],['रात','रातें'],['माला','मालाएँ'],['कविता','कविताएँ'],
 ['घर','घर'],['फूल','फूल'],['आदमी','आदमी'],['हाथी','हाथी'],['पेड़','पेड़']];
const vWrong=(w,right)=>{const st=/[ाीे]$/.test(w)?w.slice(0,-1):w;return uniq([w,st+'े',w+'ें',st+'ियाँ',w+'ों',st+'ाएँ'].filter(x=>x!==right))};
const VILOM=[['दिन','रात'],['बड़ा','छोटा'],['मोटा','पतला'],['गरम','ठंडा'],['अंदर','बाहर'],['ऊपर','नीचे'],['पास','दूर'],['सुख','दुख'],['सच','झूठ'],['मीठा','कड़वा'],
 ['हँसना','रोना'],['नया','पुराना'],['अमीर','गरीब'],['प्रकाश','अंधकार'],['प्रश्न','उत्तर'],['आगे','पीछे'],['जीत','हार'],['जीवन','मृत्यु'],['आना','जाना'],['सस्ता','महँगा'],
 ['आसान','कठिन'],['स्वर्ग','नरक'],['गुण','दोष'],['लाभ','हानि'],['सुबह','शाम'],['ज्ञान','अज्ञान'],['उदय','अस्त'],['आरंभ','अंत']];
const PARYAY=[['पानी','जल'],['माँ','माता'],['पिता','जनक'],['सूरज','सूर्य'],['चाँद','चंद्रमा'],['घर','गृह'],['फूल','पुष्प'],['आँख','नयन'],['हाथ','हस्त'],['पैर','पाँव'],
 ['दोस्त','मित्र'],['राजा','नृप'],['नदी','सरिता'],['धरती','पृथ्वी'],['आकाश','गगन'],['हवा','पवन'],['बादल','मेघ'],['पेड़','वृक्ष'],['पहाड़','पर्वत'],['समुद्र','सागर'],
 ['आग','अग्नि'],['रात','रात्रि'],['शरीर','देह'],['सोना','स्वर्ण'],['भगवान','ईश्वर']];
const KAAL=[['मैं स्कूल जाता हूँ।','मैं स्कूल गया।','मैं स्कूल जाऊँगा।'],['वह गाना गाती है।','उसने गाना गाया।','वह गाना गाएगी।'],['हम खेलते हैं।','हम खेले।','हम खेलेंगे।'],
 ['पिताजी अख़बार पढ़ते हैं।','पिताजी ने अख़बार पढ़ा।','पिताजी अख़बार पढ़ेंगे।'],['बारिश होती है।','बारिश हुई।','बारिश होगी।'],['माँ खाना बनाती है।','माँ ने खाना बनाया।','माँ खाना बनाएगी।'],
 ['वह पत्र लिखता है।','उसने पत्र लिखा।','वह पत्र लिखेगा।'],['बच्चे पार्क में दौड़ते हैं।','बच्चे पार्क में दौड़े।','बच्चे पार्क में दौड़ेंगे।']];
const KNAME=['वर्तमान काल','भूतकाल','भविष्यत् काल'],KEN=['present','past','future'];
const pairQ=(list,dir,word)=>{const p=one(list),a=dir?p[1]:p[0],q=dir?p[0]:p[1],pool=list.map(x=>dir?x[1]:x[0]).filter(x=>x!==a);
  return mq('',`${word}: ${q} → ?`,a,sample(pool,3),`${p[0]} ↔ ${p[1]}`)};
const mkTable=(rows,h)=>`<div class="tw"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td class="dev">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;

const HG=[
 {n:1,title:'Parts of speech (शब्द भेद)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Every word has a job. Four jobs to know first:</p>
  ${mkTable([['संज्ञा','naming word: person, place, animal, thing','लड़का, दिल्ली, गाय, किताब'],['सर्वनाम','used instead of a noun','मैं, तुम, वह, हम, वे, आप'],['क्रिया','action word','दौड़ता है, लिखती है, खाता है'],['विशेषण','describes a noun','सुंदर, ऊँचा, मीठा, लाल']],['Name','Job','Examples'])}
  ${eg('Example',`<span class="dev">होशियार लड़का पढ़ता है।</span><br><span class="dev">होशियार</span> = विशेषण, <span class="dev">लड़का</span> = संज्ञा, <span class="dev">पढ़ता है</span> = क्रिया.`)}
  ${eg('Trick','Who or what? → संज्ञा. Doing what? → क्रिया. What kind? → विशेषण. Can it replace a name? → सर्वनाम.')}`,
  sets:[SET('Level 1: find the संज्ञा (noun)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}।`,'Which word is the संज्ञा (noun)?',n,[a,v],`${n} names a person, animal or thing.`)}),
   SET('Level 2: find the क्रिया (verb)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}।`,'Which is the क्रिया (action)?',v,[a,n],`${v} tells what is happening.`)}),
   SET('Level 3: find the विशेषण (adjective)',()=>{const[a,n,v]=one(ANV);return mq(`${a} ${n} ${v}।`,'Which word is the विशेषण (describing word)?',a,[n,v],`${a} tells what kind of ${n}.`)}),
   SET('Level 4: find the सर्वनाम (pronoun)',()=>{const[p,b,c]=one(PRON);return mq(`${p} ${b} ${c}।`,'Which word is the सर्वनाम (pronoun)?',p,[b,c],`${p} is used in place of a name.`)}),
   SET('Level 5: which part of speech?',()=>{const j=one(Object.keys(JATI)),w=one(JATI[j]);return mq('',`"${w}" is which part of speech?`,j,Object.keys(JATI),`${w} is a ${j} (${JNAME[j]}).`)})]},
 {n:2,title:'Gender (लिंग)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>Hindi has <b>two</b> genders: पुल्लिंग and स्त्रीलिंग. Every noun has one, even objects, and the describing words and verbs change to match.</p>
  ${mkTable([['पुल्लिंग','अच्छा ___ / ___ आया','अच्छा घर, पेड़ गिरा'],['स्त्रीलिंग','अच्छी ___ / ___ आई','अच्छी किताब, गाड़ी आई']],['Gender','Test','Examples'])}
  ${eg('Watch out','<span class="dev">किताब, कलम, मेज़, सड़क, हवा</span> are स्त्रीलिंग; <span class="dev">घर, पेड़, फूल, पानी</span> are पुल्लिंग.')}
  <h4>Pairs</h4>${mkTable(LPAIR.slice(0,8),['पुल्लिंग','स्त्रीलिंग'])}`,
  sets:[SET('Level 1: name the gender',()=>{const g=one(Object.keys(LING)),w=one(LING[g]);return mq('',`What is the gender of "${w}"?`,g,Object.keys(LING),`We say ${ADJ[g]} ${w}, so it is ${g}.`)}),
   SET('Level 2: अच्छा or अच्छी?',()=>{const g=one(Object.keys(LING)),w=one(LING[g]);return mq(`___ ${w}`,'Which word fits?',ADJ[g],['अच्छा','अच्छी','अच्छे'],`${w} is ${g}: ${ADJ[g]} ${w}.`)}),
   SET('Level 3: make it स्त्रीलिंग',()=>{const p=one(LPAIR);return mq('',`स्त्रीलिंग of "${p[0]}"?`,p[1],others(LPAIR.map(x=>x[1]),p[1],3),`${p[0]} → ${p[1]}`)}),
   SET('Level 4: make it पुल्लिंग',()=>{const p=one(LPAIR);return mq('',`पुल्लिंग of "${p[1]}"?`,p[0],others(LPAIR.map(x=>x[0]),p[0],3),`${p[1]} → ${p[0]}`)}),
   SET('Level 5: mixed',()=>{if(Math.random()<.5){const g=one(Object.keys(LING)),w=one(LING[g]);return mq('',`What is the gender of "${w}"?`,g,Object.keys(LING),`${ADJ[g]} ${w}: ${g}.`)}const p=one(LPAIR);return mq('',`स्त्रीलिंग of "${p[0]}"?`,p[1],others(LPAIR.map(x=>x[1]),p[1],3),`${p[0]} → ${p[1]}`)})]},
 {n:3,title:'Number (वचन)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p><b>एकवचन</b> = one. <b>बहुवचन</b> = more than one.</p>
  ${mkTable([['-आ ending पुल्लिंग → -ए','लड़का → लड़के, केला → केले'],['-ई ending स्त्रीलिंग → -इयाँ','लड़की → लड़कियाँ, नदी → नदियाँ'],['-इया → -इयाँ','चिड़िया → चिड़ियाँ'],['other स्त्रीलिंग → -एँ','किताब → किताबें, बहन → बहनें, माला → मालाएँ'],['Most other पुल्लिंग stay the same','घर → घर, आदमी → आदमी, हाथी → हाथी']],['Rule','Examples'])}
  ${eg('Trick','Say "एक ___, दो ___": एक किताब, दो किताबें.')}`,
  sets:[SET('Level 1: बहुवचन of -आ words',()=>{const p=one(VACH.slice(0,5));return mq('',`बहुवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दो ${p[1]}.`)}),
   SET('Level 2: बहुवचन of -ई and -इया words',()=>{const p=one(VACH.slice(5,11));return mq('',`बहुवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दो ${p[1]}.`)}),
   SET('Level 3: बहुवचन with -एँ',()=>{const p=one(VACH.slice(11,17));return mq('',`बहुवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),`एक ${p[0]}, दो ${p[1]}.`)}),
   SET('Level 4: the tricky ones',()=>{const p=one(VACH);return mq('',`बहुवचन of "${p[0]}"?`,p[1],vWrong(p[0],p[1]),p[0]===p[1]?`${p[0]} stays the same: दो ${p[1]}.`:`एक ${p[0]}, दो ${p[1]}.`)}),
   SET('Level 5: एकवचन or बहुवचन?',()=>{const p=one(VACH.filter(x=>x[0]!==x[1])),pl=Math.random()<.5,w=pl?p[1]:p[0];return mq('',`Is "${w}" एकवचन or बहुवचन?`,pl?'बहुवचन':'एकवचन',['एकवचन','बहुवचन'],`${p[0]} (one) → ${p[1]} (many).`)})]},
 {n:4,title:'Opposites (विलोम शब्द)',level:'Grade 3 and up',
  learn:`<h4>The idea</h4><p>A विलोम शब्द means the opposite.</p>${mkTable(VILOM.slice(0,14),['शब्द','विलोम'])}
  ${eg('Trick','Some opposites just add अ-: ज्ञान → अज्ञान.')}`,
  sets:[SET('Level 1: everyday opposites',()=>pairQ(VILOM.slice(0,10),true,'विलोम')),
   SET('Level 2: more opposites',()=>pairQ(VILOM.slice(10,20),true,'विलोम')),
   SET('Level 3: harder opposites',()=>pairQ(VILOM.slice(18),true,'विलोम')),
   SET('Level 4: the other way round',()=>pairQ(VILOM,false,'विलोम')),
   SET('Level 5: mixed',()=>pairQ(VILOM,Math.random()<.5,'विलोम'))]},
 {n:5,title:'Same meaning (पर्यायवाची शब्द)',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>पर्यायवाची शब्द are different words with the same meaning. Textbook poems often use the formal one.</p>${mkTable(PARYAY.slice(0,14),['शब्द','पर्यायवाची'])}`,
  sets:[SET('Level 1: nature words',()=>pairQ(PARYAY.slice(12,21),true,'पर्यायवाची')),
   SET('Level 2: family and body',()=>pairQ(PARYAY.slice(0,11),true,'पर्यायवाची')),
   SET('Level 3: all words',()=>pairQ(PARYAY,true,'पर्यायवाची')),
   SET('Level 4: the other way round',()=>pairQ(PARYAY,false,'पर्यायवाची')),
   SET('Level 5: mixed',()=>pairQ(PARYAY,Math.random()<.5,'पर्यायवाची'))]},
 {n:6,title:'Tense (काल)',level:'Grade 4 and up',
  learn:`<h4>The idea</h4><p>The verb tells you <b>when</b>.</p>${mkTable(KAAL.slice(0,4),['वर्तमान काल (now)','भूतकाल (past)','भविष्यत् काल (future)'])}
  ${eg('Trick','Present ends in है / हैं / हूँ. Future has -गा, -गी, -गे. Past often has -आ, -ई, -ए, and ने after the doer: उसने, माँ ने.')}`,
  sets:[SET('Level 1: now or past?',()=>{const k=one(KAAL),t=rnd(0,1);return mq(k[t],'Which tense (काल)?',KNAME[t],KNAME.slice(0,2),`${KEN[t]}: ${KNAME[t]}.`)}),
   SET('Level 2: which tense?',()=>{const k=one(KAAL),t=rnd(0,2);return mq(k[t],'Which tense (काल)?',KNAME[t],KNAME,`${KEN[t]}: ${KNAME[t]}.`)}),
   SET('Level 3: change to भूतकाल',()=>{const k=one(KAAL);return mq(k[0],'Change it to the past (भूतकाल).',k[1],[k[0],k[2]],`${k[0]} → ${k[1]}`)}),
   SET('Level 4: change to भविष्यत् काल',()=>{const k=one(KAAL);return mq(k[0],'Change it to the future (भविष्यत् काल).',k[2],[k[0],k[1]],`${k[0]} → ${k[2]}`)}),
   SET('Level 5: mixed',()=>{const k=one(KAAL),t=rnd(0,2);return Math.random()<.5?mq(k[t],'Which tense (काल)?',KNAME[t],KNAME,`${KEN[t]}: ${KNAME[t]}.`):mq(k[0],`Change it to ${KNAME[t]}.`,k[t],k.filter((x,i)=>i!==t),`${k[0]} → ${k[t]}`)})]}];
const HGG=[['Parts of speech','<p>Colour-code: संज्ञा blue, क्रिया red, विशेषण green, सर्वनाम orange. Sort word cards into four boxes.</p>'],
 ['Gender','<p>Teach with अच्छा / अच्छी and the verb (आया / आई). Objects cause the most mistakes for non-Hindi families.</p>'],
 ['Number','<p>Say "एक ___, दो ___" aloud. Group words by ending before the rule.</p>'],
 ['Opposites','<p>Opposite-pairs memory game; act them out.</p>'],
 ['Same meaning','<p>Collect formal words from textbook poems on a word wall.</p>'],
 ['Tense','<p>Timeline: कल (past) – आज – कल (future). Note that कल means both yesterday and tomorrow; the verb decides.</p>']];
MODS.hgram.ch=HG;MODS.hgram.guide=HGG;
})();
