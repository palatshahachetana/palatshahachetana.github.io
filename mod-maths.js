"use strict";
/* Maths lessons (loaded only when needed) */
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
MODS.maths.ch=MA;MODS.maths.guide=MGUIDE;
