"""Parent progress page, exam mode, leaderboard, holiday camps, re-engagement nudges."""
from test_console6 import pin

SEED = """(()=>{const t=today(),d=JSON.parse(localStorage.getItem('ct_data')||'{}');
d.tpin='123456';d.students={s1:{id:'s1',name:'Meera',pin:'4321',batch:'b1',status:'active',phone:'9876543210',stars:12,sessions:[addDaysC(t,-10)]}};
d.batches={b1:{id:'b1',name:'Grade 4',days:[]}};
d.notes={n1:{id:'n1',sid:'s1',text:'Great reading this week',share:true,date:t},n2:{id:'n2',sid:'s1',text:'Private',date:t}};
d.roadmaps={r1:{id:'r1',batch:'b1',subject:'Maths',chapters:[{t:'Fractions',done:t},{t:'Decimals'}],tests:[{name:'Unit test 2',d:addDaysC(t,5)}]}};
d.marks={m1:{id:'m1',sid:'s1',subject:'Maths',test:'UT1',score:18,outOf:20,date:t}};
d.classes={c1:{id:'c1',batch:'b1',date:t,present:['s1'],homework:'p.12 Q1-5',hw:{s1:'done'}}};
localStorage.setItem('ct_data',JSON.stringify(d))})()"""

def test_parent_page(page):
    page.go("home"); page.evaluate(SEED)
    page.go("parent", 400)
    page.fill("#pv-n", "meera"); page.fill("#pv-p", "0000"); page.click("form[data-form=pvlogin] button")
    assert "don’t match" in page.locator("#app").inner_text()
    page.fill("#pv-p", "4321"); page.click("form[data-form=pvlogin] button"); page.wait_for_timeout(200)
    t = page.locator("#app").inner_text()
    assert "Great reading" in t and "Private" not in t and "18/20" in t and "Unit test 2" in t and "Fractions" in t and "100%" in t
    assert page.errors == []

def test_exam_card_for_kid(page):
    page.go("home"); page.evaluate(SEED)
    page.evaluate("localStorage.setItem('ct_kid',JSON.stringify({id:'s1',pin:'4321'}))")
    page.go("kids", 800)
    assert "Unit test 2" in page.locator("#app").inner_text()

def test_camps_publish_and_book(page):
    page.go("home"); page.evaluate(SEED)
    page.go("teacher", 600); pin(page, "123456"); page.click("[data-act=po]"); page.wait_for_timeout(300)
    page.click("[data-act=ttab][data-t=camps]")
    page.fill("#cp-t", "Summer Maths"); page.fill("#cp-d", "4–15 May"); page.click("form[data-form=campsave] button.navy")
    page.click("[data-act=camppub]"); page.click("[data-act=tlock]")
    page.go("camps", 500)
    assert "Summer Maths" in page.locator("#app").inner_text()
    cid = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('ct_data')).camps)[0]")
    page.fill(f"#cb-p-{cid}", "Asha"); page.fill(f"#cb-w-{cid}", "9876543210"); page.click("form[data-form=campbook] button")
    assert "Thank you" in page.locator("#app").inner_text()
    src = page.evaluate("Object.values(JSON.parse(localStorage.getItem('ct_data')).enquiries).map(e=>e.source)")
    assert "Camp: Summer Maths" in src

def test_nudge_and_leaderboard(page):
    page.go("home"); page.evaluate(SEED)
    page.evaluate("Local.lead({id:'zz12345678',child:'Meera Rao',phone:'9',source:'Monthly challenge',board:{society:'Megapolis',level:'junior',s:9,t:40}})")
    page.go("teacher", 600); pin(page, "123456"); page.click("[data-act=po]"); page.wait_for_timeout(300)
    assert "Not practising lately" in page.locator("#app").inner_text()
    assert page.locator(".reng a[href^='https://wa.me']").count() == 1
    page.click("[data-act=ttab][data-t=enquiries]"); page.click("[data-act=eboard]"); page.wait_for_timeout(200)
    page.click("[data-act=tlock]")
    page.go("challenge", 900)
    t = page.locator("#app").inner_text()
    assert "Meera" in t and "Megapolis" in t
    assert page.errors == []
