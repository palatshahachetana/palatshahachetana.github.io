"""Receipts, UPI, monthly reports, second-teacher view, languages, installable app, accessibility."""
import datetime, json, os
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AXE = open(os.path.join(ROOT, "tests", "axe.min.js")).read()
ROUTES = ["home", "programmes", "about", "learn", "faq", "book", "check", "world", "pune", "privacy",
          "kids", "teacher", "phonics", "maths", "bhasha", "grammar", "mgram", "hgram", "practice", "toys"]
AXE_RUN = ("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})"
           ".then(r=>r.violations.map(v=>v.id+' x'+v.nodes.length+': '+v.nodes[0].target.join(' ')))")


def pin(page, digits):
    for d in digits:
        page.click(f'[data-act=pd][data-d="{d}"]')


def owner_with_student(page):
    page.route("**/config.js", lambda r: r.fulfill(
        body="window.CT_CONFIG={SYNC_URL:''};", content_type="application/javascript"))
    page.go("teacher")
    pin(page, "123456"); page.click("[data-act=po]")
    page.click("[data-act=ttab][data-t=students]")
    page.fill("#as-name", "Aarav"); page.fill("#as-pin", "1111"); page.fill("#as-fee", "1500"); page.check("#as-ok")
    page.click("text=Add student")
    page.locator("[data-act=tsel]").first.click()
    page.fill("#es-parent", "Neha"); page.fill("#es-phone", "9876543210"); page.click("text=Save")


def test_numbered_receipt_and_no_upi(page):
    owner_with_student(page)
    page.click("[data-act=ttab][data-t=fees]")
    assert page.locator("[data-act=tqr]").count() == 0
    page.locator("[data-act=tpaid][data-m=UPI]").first.click()
    page.wait_for_selector(".receipt")
    m = datetime.date.today()
    assert page.locator(".rc-no b").inner_text() == f"R{m:%y%m}-001"
    assert "One Thousand Five Hundred" in page.locator(".rc-amt").inner_text()
    assert page.errors == []


def test_monthly_reports_list(page):
    owner_with_student(page)
    page.click("[data-act=ttab][data-t=students]")
    page.click("[data-act=treports]")
    href = page.locator("a[data-rsent]").first.get_attribute("href")
    assert href.startswith("https://wa.me/919876543210?text=")


def test_second_teacher_sees_a_limited_console(page):
    wd = datetime.date.today().isoweekday() % 7
    data = {"me": {"role": "teacher", "name": "Asha", "batches": ["bA"]},
            "batches": [{"id": "bA", "name": "Grade 3", "days": [wd], "time": "17:00", "mode": "inperson"}],
            "students": [{"id": "k1", "name": "Myra", "grade": "3", "batch": "bA", "status": "active"}],
            "classes": [], "fees": [], "enquiries": [], "teachers": []}

    def api(route):
        q = json.loads(route.request.post_data)
        body = {"ok": True, "data": data} if q["action"] == "tAll" else {"ok": True, "data": q.get("o")}
        route.fulfill(body=json.dumps(body), content_type="application/json")
    page.route("**/config.js", lambda r: r.fulfill(
        body="window.CT_CONFIG={SYNC_URL:'https://script.google.com/macros/s/TEST/exec'};", content_type="application/javascript"))
    page.route("https://script.google.com/**", api)
    page.go("teacher")
    pin(page, "135790"); page.click("[data-act=po]")
    page.wait_for_selector(".tc-tabs")
    assert page.locator(".tc-tabs .btn").all_inner_texts() == ["Today", "Students", "Help"]
    assert page.locator(".tc-stats").count() == 0
    page.click("[data-act=ttab][data-t=students]")
    assert page.locator("[data-form=addstudent]").count() == 0
    page.click("[data-act=tsel]")
    assert page.locator("#es-phone").count() == 0 and page.locator("#es-fee").count() == 0


def test_google_sign_in_gate_shows_first_when_configured(page):
    page.route("**/config.js", lambda r: r.fulfill(
        body="window.CT_CONFIG={SYNC_URL:'https://script.google.com/macros/s/TEST/exec',GOOGLE_CLIENT_ID:'x.apps.googleusercontent.com'};",
        content_type="application/javascript"))
    page.route("https://accounts.google.com/**", lambda r: r.abort())
    page.go("teacher", 600)
    assert "Teacher sign-in" in page.locator("h2").first.inner_text()
    assert page.locator("[data-act=pd]").count() == 0


def test_marathi_and_hindi_switch(page):
    page.go("home")
    page.click("[data-act=lang][data-l=mr]")
    assert "शिकणं आनंदाचं" in page.locator("h1").first.inner_text()
    assert page.evaluate("document.documentElement.lang") == "mr"
    page.click("[data-act=lang][data-l=hi]")
    page.go("programmes")
    assert page.locator("h1").first.inner_text() == "कक्षाएँ"
    page.go("learn")
    assert page.locator(".langnote").count() == 1
    page.click("[data-act=lang][data-l=en]")
    assert page.locator(".langnote").count() == 0


def test_installable_app_files():
    m = json.load(open(os.path.join(ROOT, "manifest.webmanifest")))
    assert m["display"] == "standalone" and {i["sizes"] for i in m["icons"]} == {"192x192", "512x512"}
    for f in ["sw.js", "img/app-192.png", "img/app-512.png"]:
        assert os.path.exists(os.path.join(ROOT, f)), f
    sw = open(os.path.join(ROOT, "sw.js")).read()
    assert "u.origin !== location.origin" in sw, "service worker must never cache Google Sheet calls"


@pytest.mark.parametrize("scheme", ["light", "dark"])
def test_accessibility_wcag_aa(browser, base_url, scheme):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block", bypass_csp=True, color_scheme=scheme)
    pg = ctx.new_page()
    pg.route("**/config.js", lambda r: r.fulfill(body="window.CT_CONFIG={SYNC_URL:''};", content_type="application/javascript"))
    problems = []
    for r in ROUTES:
        pg.goto(base_url + "#" + r); pg.wait_for_timeout(1200 if r == "world" else 300)
        pg.add_script_tag(content=AXE)
        problems += [r + ": " + v for v in pg.evaluate(AXE_RUN)]
    ctx.close()
    assert problems == []
