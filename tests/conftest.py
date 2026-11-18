import functools, http.server, os, shutil, socketserver, threading
import pytest
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session")
def base_url():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a: None
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield "http://127.0.0.1:%d/" % srv.server_address[1]
    srv.shutdown()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        exe = os.environ.get("CHROME") or shutil.which("google-chrome")
        kw = {"executable_path": exe} if exe and os.path.exists(exe) else {}
        b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], **kw)
        yield b
        b.close()


@pytest.fixture
def page(browser, base_url):
    """A phone-sized page in device-only mode (the Google Sheet is never called in tests)."""
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.route("**/config.js", lambda r: r.fulfill(body="window.CT_CONFIG={SYNC_URL:''};", content_type="application/javascript"))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body="", content_type="text/css"))
    pg.base = base_url
    pg.go = lambda route, wait=250: (pg.goto(base_url + "#" + route), pg.wait_for_timeout(wait))
    yield pg
    ctx.close()
