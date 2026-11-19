"""Teacher console: notebook, weekly updates, subject roadmaps, documents."""
import datetime, json


def pin(page, digits):
    for d in digits:
        page.click(f'[data-act=pd][data-d="{d}"]')


def setup_class(page):
    page.go("teacher")
    pin(page, "123456"); page.click("[data-act=po]")
    page.click("[data-act=ttab][data-t=batches]"); page.click("[data-act=tbedit][data-id=new]")
    page.fill("#bt-name", "Grade 4 Maths"); page.fill("#bt-time", "17:00")
    page.check(f'input[name=bday][value="{datetime.date.today().isoweekday() % 7}"]'); page.click("text=Save batch")
    page.click("[data-act=ttab][data-t=students]")
    page.fill("#as-name", "Aarav"); page.fill("#as-pin", "1111"); page.select_option("#as-batch", index=1); page.check("#as-ok")
    page.click("text=Add student")
    page.locator("[data-act=tsel]").first.click()
    page.fill("#es-phone", "9876543210"); page.click("text=Save")


def test_notebook(page):
    setup_class(page)
    page.fill("#nt-text", "Mother called about Marathi reading"); page.select_option("#nt-tag", "Parent call")
    page.click("text=Save note")
    assert "Mother called" in page.locator(".note").first.inner_text()
    page.click("[data-act=ttab][data-t=notes]")
    page.select_option("[data-change=tntag]", "Win")
    assert page.locator(".note").count() == 0
    page.select_option("[data-change=tntag]", "")
    assert page.locator(".note").count() == 1
    assert page.errors == []


def test_roadmap_and_weekly_update(page):
    setup_class(page)
    page.click("[data-act=ttab][data-t=roadmaps]")
    page.fill("#rm-s", "Maths"); page.click("text=Create roadmap")
    page.fill("#rm-ch", "Large numbers\nFractions\nDecimals\nGeometry"); page.click("form[data-form=rmaddch] button")
    assert page.locator(".rmch").count() == 4
    t = datetime.date.today()
    page.fill("#rm-to", (t + datetime.timedelta(days=28)).isoformat()); page.click("form[data-form=rmspread] button")
    assert page.locator(".rmch").first.inner_text().count("Plan: week of") == 1
    page.fill("#rm-tn", "Unit test 1"); page.fill("#rm-td", (t + datetime.timedelta(days=10)).isoformat()); page.click("form[data-form=rmtest] button")
    # alert on Today, tick a chapter in the class log
    page.click("[data-act=ttab][data-t=today]")
    assert "Unit test 1" in page.locator(".rmalert").inner_text()
    page.click("[data-act=topencls]")
    page.fill("#cl-topic", "Large numbers"); page.fill("#cl-hw", "p.12 Q1-5")
    page.locator("input[name=rmc]").first.check()
    page.click("text=Save class log")
    page.wait_for_timeout(300)
    page.click("[data-act=ttab][data-t=roadmaps]")
    assert "1 of 4 chapters" in page.locator(".rmrow").inner_text()
    # weekly update includes topic and homework
    page.click("[data-act=ttab][data-t=students]")
    page.click("[data-act=treports]")
    txt = page.locator("pre.msg").first.text_content()
    assert "Large numbers" in txt and "p.12 Q1-5" in txt and "Unit test 1" in txt
    assert page.locator("a[data-rsent]").first.get_attribute("href").startswith("https://wa.me/919876543210")
    assert page.errors == []


def test_document_upload_goes_to_the_sheet_script(page, tmp_path):
    calls = []
    data = {"me": {"role": "owner", "name": "Chetana"}, "students": [{"id": "k1", "name": "Myra", "status": "active"}],
            "batches": [], "classes": [], "fees": [], "enquiries": [], "teachers": [], "notes": [], "roadmaps": [], "docs": []}

    def api(route):
        q = json.loads(route.request.post_data); calls.append(q)
        if q["action"] == "tAll": body = {"ok": True, "data": data}
        elif q["action"] == "tUpload": body = {"ok": True, "data": {"id": "d1", "sid": "k1", "name": q["o"]["name"], "fileId": "F1", "size": 12, "date": "2026-11-18", "subject": q["o"]["subject"]}}
        else: body = {"ok": True, "data": q.get("o")}
        route.fulfill(body=json.dumps(body), content_type="application/json")
    page.route("**/config.js", lambda r: r.fulfill(body="window.CT_CONFIG={SYNC_URL:'https://script.google.com/macros/s/TEST/exec'};", content_type="application/javascript"))
    page.route("https://script.google.com/**", api)
    page.go("teacher"); pin(page, "123456"); page.click("[data-act=po]"); page.wait_for_selector(".tc-tabs")
    page.click("[data-act=ttab][data-t=students]"); page.click("[data-act=tsel]")
    f = tmp_path / "unit test.pdf"; f.write_bytes(b"%PDF-1.4 test")
    page.set_input_files("#doc-f", str(f)); page.fill("#doc-s", "Maths"); page.click("form[data-form=docup] button")
    page.wait_for_selector("a[href*='drive.google.com/file/d/F1']")
    up = [c for c in calls if c["action"] == "tUpload"][0]
    assert up["o"]["mime"] == "application/pdf" and up["o"]["data"]
