"""Final release: titles, Google details, 404, offline, kids' language, teacher checklist and tips."""
import json, os, re
from test_console6 import pin
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_google_business_details_and_titles(page):
    html = open(os.path.join(ROOT, "index.html")).read()
    data = json.loads(re.search(r'ld\+json">(.*?)</script>', html, re.S).group(1))
    assert data["name"] == "Chetana's Tutoring" and "Hinjawadi" in data["address"]["addressLocality"]
    page.go("check")
    assert page.title().startswith("Free 10-minute starting check")
    page.go("maths", 600)
    assert page.title().startswith("Maths")


def test_not_found_and_offline(page):
    page.go("no-such-page")
    assert "Page not found" in page.locator("h1").first.inner_text()
    page.context.set_offline(True)
    page.evaluate("window.dispatchEvent(new Event('offline'))")
    assert page.locator("#offline").count() == 1
    page.context.set_offline(False)
    page.evaluate("window.dispatchEvent(new Event('online'))")
    assert page.locator("#offline").count() == 0


def test_kids_screens_in_marathi(page):
    page.go("home"); page.click("[data-act=lang][data-l=mr]")
    page.go("kids", 600)
    assert "किड्स झोन" in page.locator("h1").first.inner_text()
    page.go("maths", 600)
    page.click('[data-act=phstart][data-n="1"]'); page.click('[data-act=phset][data-s="0"]')
    assert "थांब" in page.locator("#app").inner_text()
    assert page.locator(".pill").first.inner_text().endswith("पैकी 1")


def test_teacher_checklist_and_tips(page):
    page.go("teacher", 600)
    pin(page, "123456"); page.click("[data-act=po]")
    assert "Getting started: 0 of 7" in page.locator(".setup").inner_text()
    page.click("details.tip summary")
    assert "After each class" in page.locator("details.tip").inner_text()
    page.click("[data-act=setupdone]")
    assert page.locator(".setup").count() == 0


def test_teacher_console_accessibility(browser, base_url):
    axe = open(os.path.join(ROOT, "tests", "axe.min.js")).read()
    problems = []
    for scheme in ["light", "dark"]:
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block", bypass_csp=True, color_scheme=scheme)
        pg = ctx.new_page()
        pg.route("**/config.js", lambda r: r.fulfill(body="window.CT_CONFIG={SYNC_URL:''};", content_type="application/javascript"))
        pg.goto(base_url + "#teacher"); pg.wait_for_timeout(500)
        for d in "123456":
            pg.click(f'[data-act=pd][data-d="{d}"]')
        pg.click("[data-act=po]")
        for tab in ["today", "students", "notes", "roadmaps", "lessons", "assign", "worksheets", "cards", "batches", "fees", "enquiries", "help"]:
            pg.click(f"[data-act=ttab][data-t={tab}]"); pg.wait_for_timeout(250)
            pg.add_script_tag(content=axe)
            problems += [scheme + " " + tab + ": " + v for v in pg.evaluate(
                "axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}).then(r=>r.violations.map(v=>v.id+' x'+v.nodes.length+': '+v.nodes[0].target.join(' ')))")]
        ctx.close()
    assert problems == []
