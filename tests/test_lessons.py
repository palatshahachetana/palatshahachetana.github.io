"""Lesson maker: AI draft (mocked), checks, publish, children can play it, worksheets can use it."""
import json
from test_console6 import pin

AI = {"title": "Simple interest", "subject": "Maths", "intro": "Interest is extra money paid for using money.",
      "sections": [{"heading": "The formula", "body": "SI = P × R × T ÷ 100"}],
      "examples": [{"question": "₹1000 at 10% for 2 years?", "solution": "1000×10×2÷100 = ₹200"}],
      "questions": [{"type": "num", "question": f"SI on ₹{100*(i+1)} at 10% for 1 year?", "answer": str(10*(i+1)), "hint": "P×R×T÷100"} for i in range(8)]
      + [{"type": "mcq", "question": "What does P stand for?", "options": ["Principal", "Price", "Profit", "Percent"], "answer": "Principal", "hint": ""},
         {"type": "mcq", "question": "Rate is written as?", "options": ["a percent", "a fraction", "a percent", "rupees"], "answer": "a percent", "hint": ""},
         {"type": "num", "question": "Bad one", "answer": "-5", "hint": ""}],
      "card": {"kicker": "Concept of the week · Maths", "hook": "Why does the bank pay you?", "title": "Simple interest",
               "intro": "P × R × T ÷ 100", "items": [{"big": "P", "label": "Principal", "text": "the money"}], "tryit": "Try ₹500 at 4%."}}


def test_lesson_maker_end_to_end(page):
    calls = []
    store = {"lessons": []}
    data = {"me": {"role": "owner", "name": "Chetana"}, "students": [], "batches": [], "classes": [], "fees": [], "enquiries": [],
            "teachers": [], "notes": [], "roadmaps": [], "docs": [], "marks": [], "assign": [], "lessons": store["lessons"]}

    def api(route):
        q = json.loads(route.request.post_data); calls.append(q["action"])
        if q["action"] == "tAll": body = {"ok": True, "data": data}
        elif q["action"] == "tGen":
            assert set(q["o"]) == {"topic", "grade", "board", "lang", "nq"}, "only the topic settings may be sent"
            body = {"ok": True, "data": AI}
        elif q["action"] == "tPut":
            store["lessons"][:] = [l for l in store["lessons"] if l["id"] != q["o"]["id"]] + [q["o"]]; body = {"ok": True, "data": q["o"]}
        elif q["action"] == "lessons": body = {"ok": True, "data": [l for l in store["lessons"] if l["status"] == "published"]}
        else: body = {"ok": True, "data": True}
        route.fulfill(body=json.dumps(body), content_type="application/json")
    page.route("**/config.js", lambda r: r.fulfill(body="window.CT_CONFIG={SYNC_URL:'https://script.google.com/macros/s/TEST/exec'};", content_type="application/javascript"))
    page.route("https://script.google.com/**", api)
    page.go("teacher"); pin(page, "123456"); page.click("[data-act=po]"); page.wait_for_selector(".tc-tabs")
    page.click("[data-act=ttab][data-t=lessons]")
    page.fill("#lm-topic", "Simple interest with real-life examples"); page.click("form[data-form=lmgen] button")
    page.wait_for_selector("[data-lmform]")
    chk = page.locator("#lmchk").inner_text()
    assert "Q10: two options are the same" in chk and "Q11: a number answer must be a whole number" in chk
    # publishing is blocked until fixed
    page.click("[data-act=lmsave][data-s=published]")
    assert page.locator("[data-lmform]").count() == 1
    page.fill("[data-lm='questions.9.options']", "a percent\na fraction\na decimal\nrupees")
    page.locator("[data-act=lmdel][data-p=questions]").nth(10).click()
    assert "Every question has exactly one right answer" in page.locator("#lmchk").inner_text()
    page.click("[data-act=lmsave][data-s=published]")
    page.wait_for_selector("text=Live for children", timeout=5000)
    assert "Live for children" in page.locator("#app").inner_text()
    # card builder gets the lesson's card
    page.click("[data-act=lmcard]"); page.wait_for_timeout(300)
    assert page.locator("[data-cb=title]").input_value() == "Simple interest"
    # children see and play it
    page.go("mine", 800)
    assert "Simple interest" in page.locator("#app").inner_text()
    page.click('[data-act=phstart][data-n="1"]')
    assert "SI = P × R × T ÷ 100" in page.locator("#app").inner_text()
    page.click('[data-act=phset][data-s="0"]')
    for _ in range(10):
        q = page.evaluate("ps.q[ps.i]")
        if q["kind"] == "pick":
            page.locator(f'[data-act=phans][data-v="{q["a"]}"]').click()
        else:
            for dgt in q["a"]:
                page.click(f'[data-act=phd][data-d="{dgt}"]')
            page.click("[data-act=phok]")
        page.wait_for_timeout(1400)
    assert "badge earned" in page.locator("section.card h1").first.inner_text().lower()
    assert page.errors == []
