"""Run with:  pip install pytest playwright && playwright install chromium && pytest -q tests"""
import datetime, os, re

ROUTES = ["home", "programmes", "about", "learn", "faq", "book", "check", "world", "pune", "privacy",
          "kids", "teacher", "phonics", "maths", "bhasha", "grammar", "mgram", "hgram", "practice", "toys"]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pin(page, digits):
    for d in digits:
        page.click(f'[data-act=pd][data-d="{d}"]')


def teacher_login(page, code="123456"):
    page.go("teacher")
    pin(page, code)
    page.click("[data-act=po]")


# ---------- static checks ----------
def test_no_inline_scripts_and_strict_csp():
    html = open(os.path.join(ROOT, "index.html")).read()
    assert not re.search(r"<script(?![^>]*\bsrc=)[^>]*>", html), "inline <script> found"
    assert not re.search(r"\son[a-z]+=\"", html), "inline event handler found"
    csp = re.search(r'Content-Security-Policy" content="([^"]+)"', html).group(1)
    script_src = re.search(r"script-src ([^;]+)", csp).group(1)
    assert "unsafe-inline" not in script_src and "unsafe-eval" not in script_src


def test_home_does_not_download_lesson_modules(page):
    loaded = []
    page.on("request", lambda r: loaded.append(r.url))
    page.go("home", 600)
    assert not [u for u in loaded if "/mod-" in u]
    page.go("maths", 800)
    assert any("mod-maths.js" in u for u in loaded)


def test_sync_url_lives_only_in_config():
    app = open(os.path.join(ROOT, "app.js")).read()
    assert "script.google.com/macros" not in app


# ---------- every page ----------
def test_all_pages_render_without_errors(page):
    for r in ROUTES:
        page.go(r, 1500 if r == "world" else 250)
        assert page.locator("#app").inner_text().strip(), r
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 2"), f"{r} scrolls sideways on a phone"
    assert page.errors == []


def test_kids_world_3d_loads(page):
    page.go("world", 2500)
    assert "flat" not in (page.get_attribute("#kwstage", "class") or "")
    assert page.locator(".kw-lbl").count() == 6


# ---------- question generators ----------
CHECK_JS = """(()=>{
 const bad=[];
 const ok=(q,where)=>{
  if(!q||!q.kind&&q.a==null){bad.push(where+': empty');return}
  const s=JSON.stringify(q);if(/NaN|undefined/.test(s))bad.push(where+': NaN/undefined');
  if(q.kind==='pick'){const n=q.opts.filter(o=>o.v===q.a).length;if(n!==1)bad.push(where+': '+n+' correct options');
    if(new Set(q.opts.map(o=>o.v)).size!==q.opts.length)bad.push(where+': duplicate options')}
  if(q.kind==='num'&&!/^-?\\d+$/.test(String(q.a)))bad.push(where+': non-numeric answer');
  if(q.kind==='build'){const t=q.tiles.slice();for(const x of q.target){const i=t.indexOf(x);if(i<0){bad.push(where+': tile missing');break}t.splice(i,1)}}
 };
 for(const m of Object.keys(MODS))for(const c of MODS[m].ch){
  if(c.sets)c.sets.forEach((st,i)=>{for(let r=0;r<60;r++)st.make().forEach(q=>ok(q,m+' ch'+c.n+' set'+(i+1)))});
  else for(let r=0;r<60;r++)c.make().forEach(q=>ok(q,m+' ch'+c.n))}
 for(const k of Object.keys(PGAMES)){if(PGAMES[k].jam)continue;for(let r=0;r<300;r++){const q=PGAMES[k].make();
  if(q.a==null||/NaN/.test(String(q.a)))bad.push('pune '+k);if(q.opts&&q.opts.filter(o=>o===q.a).length!==1)bad.push('pune '+k+' options')}}
 return [...new Set(bad)].slice(0,20)})()"""


def test_every_question_has_exactly_one_right_answer(page):
    page.go("home")
    page.evaluate("loadAllMods()")
    assert page.evaluate(CHECK_JS) == []


# ---------- kids ----------
def test_starting_check_runs_end_to_end(page):
    for band in ["g12", "g34", "g5"]:
        page.go("check")
        if page.locator("[data-act=ckagain]").count():
            page.click("[data-act=ckagain]")
        page.check(f"input[value={band}]")
        page.click("[data-act=ckgo]")
        page.wait_for_selector("[data-act=ckskip]")
        while page.locator("[data-act=ckskip]").count():
            page.click("[data-act=ckskip]")
        assert page.locator(".ckring b").inner_text() == "0"
    assert page.errors == []


def test_pune_ride_stop_can_be_won(page):
    page.go("pune")
    page.locator('.pz-stop[data-i="0"]').click()
    page.wait_for_timeout(900)
    page.click("[data-act=pzplay]")
    for _ in range(5):
        a = page.evaluate("String(pz.q.a)")
        page.click(f'[data-act=pzans][data-v="{a}"]')
        page.click("[data-act=pznext]")
    assert "stamp earned" in page.locator("h1").first.inner_text()


# ---------- teacher console ----------
def test_teacher_console_full_day(page):
    page.go("teacher")
    pin(page, "1234")
    page.click("[data-act=po]")
    assert "6 digits" in page.locator("[role=alert]").inner_text()
    pin(page, "56")
    page.click("[data-act=po]")
    # batch on today's weekday
    page.click("[data-act=ttab][data-t=batches]")
    page.click("[data-act=tbedit][data-id=new]")
    page.fill("#bt-name", "Grade 4 Maths")
    page.fill("#bt-time", "17:00")
    page.check(f'input[name=bday][value="{datetime.date.today().isoweekday() % 7}"]')
    page.click("text=Save batch")
    # students need consent
    page.click("[data-act=ttab][data-t=students]")
    for name, code in [("Aarav", "1111"), ("Siya", "2222")]:
        page.fill("#as-name", name); page.fill("#as-pin", code)
        page.select_option("#as-batch", index=1); page.fill("#as-fee", "1500")
        page.check("#as-ok")
        page.click("text=Add student")
    assert page.locator("[data-act=tsel]").count() == 2
    # attendance
    page.click("[data-act=ttab][data-t=today]")
    page.click("[data-act=topencls]")
    page.locator(".tc-kid").nth(1).click()
    page.fill("#cl-topic", "Fractions")
    page.click("text=Save class log")
    assert "1/2 present" in page.locator(".tc-class").inner_text()
    # fees
    page.click("[data-act=ttab][data-t=fees]")
    page.locator("[data-act=tpaid][data-m=UPI]").first.click()
    page.wait_for_selector(".receipt")
    page.click("[data-act=trclose]")
    assert "₹1,500" in page.locator(".stat").first.inner_text()
    # leaving sets leftOn and hides from kids login
    page.click("[data-act=ttab][data-t=students]")
    page.locator("[data-act=tsel]").first.click()
    page.select_option("#es-status", "left")
    page.click("text=Save")
    data = page.evaluate("JSON.parse(localStorage.getItem('ct_data'))")
    left = [s for s in data["students"].values() if s.get("status") == "left"]
    assert left and left[0]["leftOn"] == datetime.date.today().isoformat()
    assert page.errors == []


def test_kid_logs_in_by_typing_name(page):
    teacher_login(page)
    page.click("[data-act=ttab][data-t=students]")
    page.fill("#as-name", "Kabir"); page.fill("#as-pin", "4321"); page.check("#as-ok")
    page.click("text=Add student")
    page.go("kids")
    assert "Kabir" not in page.locator("#app").inner_text(), "names must not be listed publicly"
    page.fill("#kn", "kabir "); page.click("text=Next"); pin(page, "4320")
    page.wait_for_timeout(200)
    assert "don’t match" in page.locator("[role=alert]").inner_text()
    page.fill("#kn", "Kabir"); page.click("text=Next"); pin(page, "4321")
    page.wait_for_timeout(200)
    assert page.locator("h1").first.inner_text() == "Hi Kabir!"


def test_booking_becomes_a_lead(page):
    page.go("book")
    page.fill("#bk-parent", "Ritu Shah"); page.select_option("#bk-grade", "3"); page.fill("#bk-phone", "9822012345")
    page.click("text=Continue")
    page.wait_for_timeout(300)
    assert "Saved in Chetana" in page.locator("#app").inner_text()
    data = page.evaluate("JSON.parse(localStorage.getItem('ct_data'))")
    leads = list(data["enquiries"].values())
    assert leads[0]["parent"] == "Ritu Shah" and leads[0]["source"] == "Website"


def test_spam_trap_drops_bot_bookings(page):
    page.go("book")
    page.fill("#bk-parent", "Bot"); page.select_option("#bk-grade", "3")
    page.evaluate("document.getElementById('bk-web').value='http://spam'")
    page.click("text=Continue")
    page.wait_for_timeout(300)
    data = page.evaluate("JSON.parse(localStorage.getItem('ct_data')||'{}')")
    assert not (data.get("enquiries") or {})
