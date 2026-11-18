"""Grammar modules, practice (mistakes, mixed tests, quest), 3D toys, translations, reviews."""
import json


def test_marathi_and_hindi_grammar_play(page):
    for mod in ["mgram", "hgram"]:
        page.go(mod, 800)
        page.click('[data-act=phstart][data-n="1"]')
        page.click('[data-act=phset][data-s="0"]')
        for _ in range(10):
            a = page.evaluate("ps.q[ps.i].a")
            page.locator(f'[data-act=phans][data-v="{a}"]').click()
            page.wait_for_timeout(1400)
        assert "passed" in page.locator("section.card h1").first.inner_text().lower()
    assert page.errors == []


def test_wrong_answers_become_mistakes_and_can_be_fixed(page):
    page.go("maths", 800)
    page.click('[data-act=phstart][data-n="10"]')
    page.click('[data-act=phset][data-s="0"]')
    for _ in range(3):
        q = page.evaluate("ps.q[ps.i]")
        if q["kind"] == "pick":
            wrong = [o["v"] for o in q["opts"] if o["v"] != q["a"]][0]
            page.locator(f'[data-act=phans][data-v="{wrong}"]').click()
        else:
            page.click('[data-act=phd][data-d="0"]'); page.click("[data-act=phok]")
        page.click("[data-act=phnext]")
    page.go("practice", 600)
    assert "3 questions to fix" in page.locator("#app").inner_text()
    page.click("[data-act=mxplay]")
    for _ in range(3):
        a = page.evaluate("qz.q[qz.i].a")
        if page.locator("[data-act=qzans]").count():
            page.locator(f'[data-act=qzans][data-v="{a}"]').click()
        else:
            for d in a:
                page.click(f'[data-act=qzd][data-d="{d}"]')
            page.click("[data-act=qzok]")
        page.click("[data-act=qznext]")
    assert page.evaluate("mxList().every(x=>x.ok===1)")


def test_mixed_test_and_weekly_quest(page):
    page.go("practice", 800)
    page.click("[data-act=mixplay][data-m=grammar]")
    for _ in range(20):
        a = page.evaluate("qz.q[qz.i].a")
        page.locator(f'[data-act=qzans][data-v="{a}"]').first.click()
        page.click("[data-act=qznext]")
    assert page.locator(".stat").inner_text() == "20 of 20"
    page.click("[data-act=qzback]")
    assert page.evaluate("questState().ev.mixed") == 1
    assert page.locator(".quest .qt").count() == 3
    assert page.locator(".tonight .tn").count() >= 1


def test_3d_toys(page):
    page.go("toys", 2000)
    assert "flat" not in (page.get_attribute("#toystage", "class") or "")
    page.click("[data-act=tq]")
    a = page.evaluate("toy.q.a")
    page.locator(f'[data-act=tqans][data-v="{a}"]').click()
    assert "Yes" in page.locator(".fb").inner_text()
    page.click("[data-act=ttoy][data-t=place]")
    page.fill("#toy-n", "407"); page.click("[data-act=tnum]")
    assert "4 hundreds + 0 tens + 7 ones" in page.locator(".toy-num").inner_text()
    page.click("[data-act=ttoy][data-t=cake]")
    page.click("[data-act=tq]")
    page.evaluate("const[k,n]=toy.cake.target;toy.cake.sel=[...Array(k).keys()];render()")
    page.click("[data-act=tcakecheck]")
    assert "Yes" in page.locator(".fb").inner_text()
    assert page.errors == []


def test_translated_parent_pages(page):
    page.go("home")
    page.click("[data-act=lang][data-l=mr]")
    for route, text in [("faq", "पालकांचे प्रश्न"), ("book", "मोफत डेमो वर्ग बुक करा"), ("check", "मोफत सुरुवातीची चाचणी"), ("privacy", "गोपनीयता")]:
        page.go(route)
        assert text in page.locator("h1").first.inner_text(), route
        assert page.locator(".langnote").count() == 0
    page.click("[data-act=lang][data-l=hi]")
    page.go("faq")
    assert page.locator("details.qa").count() == 15


def test_reviews_hidden_until_added(page, base_url):
    page.go("home")
    assert page.locator(".review").count() == 0
    page.unroute("**/config.js")
    page.route("**/config.js", lambda r: r.fulfill(
        body="window.CT_CONFIG={SYNC_URL:'',REVIEWS:[{text:'Great teacher',who:'Neha, Grade 4 parent'}]};", content_type="application/javascript"))
    page.reload(); page.wait_for_timeout(400)
    assert page.locator(".review").count() == 1


def test_toy_questions_always_include_the_answer(page):
    page.go("home")
    bad = page.evaluate("""(()=>{let bad=0;for(const t of ['shapes','place','cake'])for(let i=0;i<500;i++){toy.tab=t;const q=toyQ();
      if(q.opts&&q.opts.filter(o=>o===q.a).length!==1)bad++;if(q.a==null)bad++}return bad})()""")
    assert bad == 0
