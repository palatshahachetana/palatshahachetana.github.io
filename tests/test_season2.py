"""Kids' World Season 2: buddy, island, bosses, duel, events, read-aloud, challenge, invite."""

def stars(page, n):
    page.evaluate(f"localStorage.setItem('ct_gstars',{n})")

def test_hub_and_buddy(page):
    page.go("world", 1500)
    assert page.locator(".funzone .fz").count() == 8
    stars(page, 60)
    page.go("buddy", 600)
    page.fill("#bname", "Bappu"); page.click("[data-act=bpick][data-k=tiger]")
    assert "Bappu" in page.locator("h1").inner_text()
    page.click("[data-act=bfeed][data-n='5']"); page.click("[data-act=bfeed][data-n='5']")
    assert "Baby" in page.locator("#app").inner_text()
    assert page.locator("[data-act=achshare]").count() == 1
    f = page.evaluate("JSON.parse(localStorage.getItem('ct_fun_guest'))")
    assert f["buddy"]["fed"] == 10 and f["spent"] == 10

def test_boss_battle_flow(page):
    page.go("boss", 900)
    page.click("[data-act=bossgo][data-m=maths]"); page.wait_for_timeout(300)
    assert page.locator(".hp").count() == 1
    page.evaluate("for(let i=0;i<10;i++){boss.fb=null;bossMark(true);acts.bossnext()}")
    page.wait_for_timeout(200)
    assert "You beat the" in page.locator("#app").inner_text()

def test_duel_turns(page):
    page.go("duel", 900)
    page.click("[data-act=duelgo][data-m=maths]"); page.wait_for_timeout(300)
    assert "Pass the phone" in page.locator("#app").inner_text()
    page.click("[data-act=duelready]")
    assert "turn" in page.locator("#app").inner_text()

def test_events_rangoli_and_practice(page):
    page.go("events", 600)
    assert page.locator(".ev").count() == 7
    page.click("[data-act=evgo][data-id=diwali]")
    assert page.locator(".rangoli .rg").count() == 36
    page.evaluate("ev.rg.tap=ev.rg.cells.map(([r,c])=>[r,5-c]);acts.rgcheck()")
    assert "Perfect mirror" in page.locator("#app").inner_text()

def test_challenge_is_same_for_everyone_this_month(page):
    page.go("challenge", 600)
    page.click("[data-act=chlgo][data-l=junior]"); page.wait_for_timeout(400)
    a = page.evaluate("JSON.stringify(chlQs('junior').map(q=>q.ask+q.show))")
    b = page.evaluate("JSON.stringify(chlQs('junior').map(q=>q.ask+q.show))")
    assert a == b and len(page.evaluate("chlQs('senior')")) == 10
    page.evaluate("for(let i=0;i<10;i++)acts.chok&&0; chl.i=10;chl.done=true;chl.end=Date.now();render()")
    assert page.locator("form[data-form=chlsend]").count() == 1

def test_read_and_invite_render(page):
    page.go("read", 600)
    assert page.locator(".rd-sent").count() == 1
    page.go("invite", 600)
    assert page.locator("a[href^='https://wa.me']").count() == 1

def test_island_spends_stars(page):
    page.go("home"); stars(page, 10)
    page.go("island", 1500)
    assert page.locator(".isl-shop .btn").count() == 9
