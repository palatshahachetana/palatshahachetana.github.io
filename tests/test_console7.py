"""Parent guide, concept cards, homework, marks, assigned practice, worksheets."""
import datetime
from test_console6 import setup_class, pin


def test_parent_guide_in_three_languages(page):
    page.go("guide")
    assert page.locator("h1").first.inner_text() == "Parent guide"
    assert page.locator(".guide-sec").count() == 8
    page.click("[data-act=lang][data-l=mr]")
    assert page.locator("h1").first.inner_text() == "पालक मार्गदर्शिका"
    assert page.locator(".langnote").count() == 0


def test_concept_card_builder(page):
    setup_class(page)
    page.click("[data-act=ttab][data-t=cards]")
    page.wait_for_timeout(600)
    for i in range(5):
        page.select_option("[data-change=cbtpl]", f"t{i}")
        page.wait_for_timeout(300)
        assert page.evaluate("document.getElementById('cbc').width") > 600
    page.fill("[data-cb=title]", "मराठी शीर्षक")
    page.select_option("[data-cb=size]", "story")
    page.wait_for_timeout(500)
    assert page.evaluate("document.getElementById('cbc').height") == 1920
    with page.expect_download() as d:
        page.click("[data-act=cbdown]")
    assert d.value.suggested_filename.endswith(".png")
    page.fill("[data-cb=name]", "Week 5"); page.click("[data-act=cbsave]")
    assert "Saved: Week 5" in page.locator("[data-change=cbtpl]").inner_text()
    assert page.errors == []


def test_homework_marks_assign_worksheet(page):
    setup_class(page)
    # class 1 with homework, then next class checks it
    page.click("[data-act=ttab][data-t=today]")
    for _ in range(7):
        page.click("[data-act=tday][data-d='-1']")
    page.click("[data-act=topencls]"); page.fill("#cl-hw", "p.12 Q1-5"); page.click("text=Save class log")
    for _ in range(7):
        page.click("[data-act=tday][data-d='1']")
    page.click("[data-act=topencls]")
    chip = page.locator(".hwchip").first
    chip.click(); chip = page.locator(".hwchip").first; chip.click(); page.locator(".hwchip").first.click()
    assert "Aarav" in page.locator(".hwchip.hw-missing").inner_text()
    page.click("[data-act=tclose]")
    assert "p.12 Q1-5" in page.locator("#app").inner_text()
    # marks
    page.click("[data-act=ttab][data-t=students]"); page.locator("[data-act=tsel]").first.click()
    for test, sc in [("UT1", "15"), ("UT2", "21")]:
        page.fill("#mk-sub", "Maths"); page.fill("#mk-test", test); page.fill("#mk-score", sc); page.fill("#mk-out", "25")
        page.click("form[data-form=addmark] button")
    assert page.locator(".spark").count() == 1 and "▲ 24%" in page.locator(".markrow").inner_text()
    # assign practice and see it on the kid's page
    page.click("[data-act=ttab][data-t=assign]")
    page.click("form[data-form=addasg] button")
    assert "0 of 1 done" in page.locator("#app").inner_text()
    page.go("kids"); page.fill("#kn", "Aarav"); page.click("text=Next"); pin(page, "1111"); page.wait_for_timeout(300)
    assert "From Chetana ma’am" in page.locator("#app").inner_text()
    # worksheet
    page.go("teacher")
    if page.locator("[data-act=pd]").count():
        pin(page, "123456"); page.click("[data-act=po]")
    page.click("[data-act=ttab][data-t=worksheets]")
    page.locator("[data-change=wsch]").first.check(); page.locator("[data-change=wsch]").nth(1).check()
    page.click("[data-act=wsmake]"); page.wait_for_selector(".ws-list")
    assert page.locator(".ws-list").first.locator("li").count() == 10
    assert page.locator(".ws-keyl li").count() == 10
    assert page.errors == []
